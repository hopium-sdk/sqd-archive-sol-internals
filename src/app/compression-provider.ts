import { decode, encode } from "@msgpack/msgpack";
import type { PackedBlockList } from "../main/types/packed-block";
import { createWriteStream, existsSync, mkdirSync, } from "fs";
import { exists, rm, mkdir } from "fs/promises";
import { spawn } from "child_process";
import { pipeline } from "stream/promises";
import path from "path";

type T_COMPRESSION_PROVIDER = {
    tempDir?: string;
}

export class CompressionProvider {
    public readonly TEMP_DIR: string;
    public readonly fileExtension: string = ".xz";

    constructor(private readonly opts: T_COMPRESSION_PROVIDER) {
        this.TEMP_DIR = opts.tempDir ?? path.join(process.cwd(), "src/.temp/packed/");

        if (!existsSync(this.TEMP_DIR)) {
            mkdirSync(this.TEMP_DIR, { recursive: true });
        }
    }

    public async jsonToXzBuffer({ json }: { json: any }): Promise<Uint8Array> {
        const msgpackBuffer = encode(replaceBigIntWithString(json));
        const proc = spawn("xz", ["-c", "-9"], { stdio: ["pipe", "pipe", "inherit"] });

        proc.stdin.end(msgpackBuffer);

        const chunks: Buffer[] = [];
        for await (const chunk of proc.stdout) {
            chunks.push(chunk as Buffer);
        }

        const code = await new Promise<number>((res, rej) => {
            proc.on("error", rej);
            proc.on("close", res);
        });
        if (code !== 0) throw new Error(`xz exited with code ${code}`);

        return Buffer.concat(chunks);
    }

    public async xzBufferToJson({ xzBuffer }: { xzBuffer: Uint8Array }): Promise<any> {
        const proc = spawn("xz", ["-d", "-c"], { stdio: ["pipe", "pipe", "inherit"] });

        proc.stdin.end(Buffer.from(xzBuffer));

        const chunks: Buffer[] = [];
        for await (const chunk of proc.stdout) {
            chunks.push(chunk as Buffer);
        }

        const code = await new Promise<number>((res, rej) => {
            proc.on("error", rej);
            proc.on("close", res);
        });
        if (code !== 0) throw new Error(`xz exited with code ${code}`);

        const msgpackBuffer = Buffer.concat(chunks);
        return replaceStringWithBigInt(decode(msgpackBuffer));
    }

    public async blockListToFile({ blockList, fileName }: { blockList: PackedBlockList, fileName: string }): Promise<void> {
        const filePath = this.TEMP_DIR + `${fileName}${this.fileExtension}`;
        const msgpackBuffer = encode(replaceBigIntWithString(blockList));

        const proc = spawn("xz", ["-c", "-9"], {
            stdio: ["pipe", "pipe", "inherit"],
        });

        proc.stdin.write(msgpackBuffer);
        proc.stdin.end();

        await pipeline(proc.stdout, createWriteStream(filePath));
    }

    public async fileToBlockList({ fileName }: { fileName: string }): Promise<PackedBlockList> {
        const filePath = this.TEMP_DIR + `${fileName}${this.fileExtension}`;
        const msgpackBuffer = await this.decompressXzToBuffer({ filePath });
        const decoded = replaceStringWithBigInt(decode(msgpackBuffer));

        return decoded as PackedBlockList;
    }

    public async fileBufferToBlockList({ fileBuffer }: { fileBuffer: Uint8Array }): Promise<PackedBlockList> {
        const msgpackBuffer = await this.decompressXzBufferToBuffer({ fileBuffer });
        const decoded = replaceStringWithBigInt(decode(msgpackBuffer));

        return decoded as PackedBlockList;
    }

    private async decompressXzToBuffer({ filePath }: { filePath: string }): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const proc = spawn("xz", ["-d", "-c", filePath]);
            const chunks: Buffer[] = [];
            proc.stdout.on("data", (chunk) => chunks.push(chunk));
            proc.stderr.on("data", (err) => console.error("stderr:", err.toString()));
            proc.on("error", reject);
            proc.on("close", (code) => {
                if (code === 0) {
                    resolve(Buffer.concat(chunks));
                } else {
                    reject(new Error(`xz exited with code ${code}`));
                }
            });
        });
    }

    private async decompressXzBufferToBuffer({ fileBuffer }: { fileBuffer: Uint8Array }): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const proc = spawn("xz", ["-d", "-c"]);
            proc.stdin.end(fileBuffer);
            const chunks: Buffer[] = [];
            proc.stdout.on("data", (chunk) => chunks.push(chunk));
            proc.stderr.on("data", (err) => console.error("stderr:", err.toString()));
            proc.on("error", reject);
            proc.on("close", (code) => {
                if (code === 0) {
                    resolve(Buffer.concat(chunks));
                } else {
                    reject(new Error(`xz exited with code ${code}`));
                }
            });
        });
    }

    public async cleanTempDir(): Promise<void> {
        if (await exists(this.TEMP_DIR)) {
            await rm(this.TEMP_DIR, { recursive: true, force: true });
        }
        await mkdir(this.TEMP_DIR, { recursive: true });
    }
}

function replaceBigIntWithString(obj: any): any {
    if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
        return obj;
    }
    if (typeof obj === "bigint") {
        return obj.toString();
    }
    if (Array.isArray(obj)) {
        return obj.map((el) => replaceBigIntWithString(el));
    }
    if (obj !== null && typeof obj === "object") {
        const out: any = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = replaceBigIntWithString(v);
        }
        return out;
    }
    return obj;
}

function replaceStringWithBigInt(obj: any): any {
    if (Buffer.isBuffer(obj) || obj instanceof Uint8Array) {
        return obj;
    }
    if (typeof obj === "string") {
        if (/^-?\d+$/.test(obj)) {
            return BigInt(obj);
        }
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map((el) => replaceStringWithBigInt(el));
    }
    if (obj !== null && typeof obj === "object") {
        const out: any = {};
        for (const [k, v] of Object.entries(obj)) {
            out[k] = replaceStringWithBigInt(v);
        }
        return out;
    }
    return obj;
}
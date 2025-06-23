import { S3Client, type BunFile, type S3File } from "bun";
import type { T_STATUS } from "../main/types/status.types";
import { readdir } from "fs/promises";
import path from "path";
import { Logger } from "@hopium-sdk/logger";
import type { CompressionProvider } from "./compression-provider";

type T_S3_PROVIDER = {
    client: S3Client;
    compressionProvider: CompressionProvider;
}

export class S3Provider {
    private readonly lib: string = "S3-PROVIDER";
    private readonly s3: S3Client;
    private readonly S3_DIR: string = "archive/sol";
    private readonly S3_FILES_PATH: string = `${this.S3_DIR}/files`;
    private readonly S3_STATUS_PATH: string = `${this.S3_DIR}/status.xz`;

    constructor(private readonly opts: T_S3_PROVIDER) {
        this.s3 = opts.client;
    }

    public async getStatus(): Promise<T_STATUS> {
        const statusFile: S3File = this.s3.file(this.S3_STATUS_PATH);

        if (!(await statusFile.exists())) {
            return {
                lastEpoch: null,
                lastSlot: null,
                files: [],
            };
        }

        const compressedStatus = await statusFile.arrayBuffer();
        return await this.opts.compressionProvider.xzBufferToJson({ xzBuffer: new Uint8Array(compressedStatus) });
    }

    public async updateStatus({ status }: { status: T_STATUS }): Promise<void> {
        const statusFile: S3File = this.s3.file(this.S3_STATUS_PATH, {
            type: "application/x-xz",
        });

        const compressedStatus = await this.opts.compressionProvider.jsonToXzBuffer({ json: status });
        await statusFile.write(compressedStatus);
    }

    public async flushEpoch({ tempDir, updatedStatus }: { tempDir: string, updatedStatus: T_STATUS }): Promise<void> {
        const files = (await readdir(tempDir)).filter((file) => file.endsWith(".xz"));

        if (files.length === 0) {
            await this.updateStatus({ status: updatedStatus });
            return;
        }

        for (const file of files) {
            Logger.info({ lib: this.lib, message: `-- Flushing ${file} (${files.indexOf(file) + 1}/${files.length}) to S3` });

            const localFilePath = path.join(tempDir, file);
            const localFile: BunFile = Bun.file(localFilePath);
            const s3File: S3File = this.s3.file(`${this.S3_FILES_PATH}/${file}`, {
                storageClass: "GLACIER_IR",
                type: "application/x-xz",
            });

            for await (const chunk of localFile.stream()) {
                await s3File.write(chunk);
            }
        }

        await this.updateStatus({ status: updatedStatus });
        await this.opts.compressionProvider.cleanTempDir();
    }

    public async cleanS3(): Promise<void> {
        const allObjects = await this.s3.list({
            prefix: this.S3_DIR,
        });

        if (!allObjects.contents) {
            return;
        }

        await Promise.all(allObjects.contents.map((object) => this.s3.file(object.key).delete()));
    }
}
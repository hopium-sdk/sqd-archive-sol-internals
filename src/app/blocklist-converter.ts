import { PackedBlockSchema, type PackedBlockList, type PackedEncodeKey, PackedKeyIndexSchema } from "../main/types/packed-block";
import { SqdBlockSchema } from "../main/types/sqd-block";
import { type Block as SqdBlock } from "@subsquid/solana-normalization";
import bs58 from "bs58";
import z, { ZodError } from "zod";

export class BlocklistConverter {

    public toPackedBlockList = ({ blocks }: { blocks: SqdBlock[] }): PackedBlockList => {

        const keysMap = new Map<string, number>();

        const getKeyIndex = (key: string): number => {
            if (!keysMap.has(key)) {
                let value = keysMap.size;
                keysMap.set(key, value);
                return value;
            }
            return keysMap.get(key)!;
        }

        const intermediate = blocks.map((block) => {
            return {
                ...block,
                transactions: block.transactions.map((tx) => {
                    return {
                        ...tx,
                        err: tx.err ? JSON.stringify(tx.err) : "",
                        version: tx.version === "legacy" ? -1 : tx.version,
                    }
                }),
            }
        });

        const blocksWithKeys = z.array(PackedBlockSchema).parse(intermediate.map((block) => this.replaceStringWithKey(block, getKeyIndex)));

        return {
            encodedKeys: Array.from(keysMap.keys()).map(this.getEncodedKey),
            blocks: blocksWithKeys,
        }
    }

    public toBlocks = ({ packedBlockList }: { packedBlockList: PackedBlockList }): SqdBlock[] => {
        const decodedKeys = packedBlockList.encodedKeys.map((key) => this.getDecodedKey(key));
        const blocks = packedBlockList.blocks.map((block) => this.replaceKeyWithString(block, decodedKeys));

        const intermediate = blocks.map((block) => {
            return {
                ...block,
                transactions: block.transactions.map((tx: any) => {
                    return {
                        ...tx,
                        err: tx.err == "" ? null : JSON.parse(tx.err),
                        version: tx.version === -1 ? "legacy" : tx.version,
                    }
                }),
            }
        })

        try {
            return z.array(SqdBlockSchema).parse(intermediate);
        } catch (e) {
            if (
                e instanceof ZodError
                && e.errors.length > 0
                && e.errors[0]?.path.includes("transactions")
                && e.errors[0]?.path.includes("err")
                && e.errors[0]?.message.includes("Expected object, received string")
            ) {
                return intermediate as SqdBlock[];
            }
            throw e;
        }
    }

    private getEncodedKey = (value: string): PackedEncodeKey => {
        try {
            return {
                data: bs58.decode(value),
                type: 0,
            }
        } catch (e) {
            if (value == "") {
                return {
                    data: this.emptyUint8Array,
                    type: 1,
                }
            }
            return {
                data: this.stringToUint8Array(value),
                type: 1,
            }
        }
    }

    private getDecodedKey = (key: PackedEncodeKey): string => {
        if (key.type == 0) {
            return bs58.encode(key.data);
        }

        if (key.type == 1) {
            if (key.data.length == 0) {
                return "";
            }
            return this.uint8ArrayToString(key.data);
        }

        throw new Error("Invalid key type");
    }

    private replaceStringWithKey = (obj: any, getKeyIndex: (key: string) => number): any => {
        if (typeof obj === "string") {
            return { i: getKeyIndex(obj) }
        }
        if (Array.isArray(obj)) {
            return obj.map((el) => this.replaceStringWithKey(el, getKeyIndex));
        }
        if (obj !== null && typeof obj === "object") {
            const out: any = {};
            for (const [k, v] of Object.entries(obj)) {
                out[k] = this.replaceStringWithKey(v, getKeyIndex);
            }
            return out;
        }

        return obj;
    }

    private replaceKeyWithString = (obj: any, decodedKeys: string[]): any => {
        if (Array.isArray(obj)) {
            return obj.map((el) => this.replaceKeyWithString(el, decodedKeys));
        }

        if (obj !== null && typeof obj === "object") {
            if (PackedKeyIndexSchema.safeParse(obj).success) {
                return decodedKeys[obj.i];
            }
            const out: any = {};
            for (const [k, v] of Object.entries(obj)) {
                out[k] = this.replaceKeyWithString(v, decodedKeys);
            }
            return out;
        }

        return obj;
    }

    private emptyUint8Array = new Uint8Array(0);

    public stringToUint8Array = (str: string): Uint8Array => {
        return new Uint8Array(Buffer.from(str, "utf8"));
    }

    public uint8ArrayToString = (uint8Array: Uint8Array): string => {
        return Buffer.from(uint8Array).toString("utf8");
    }
}
import { z } from "zod";

export const PackedKeyIndexSchema = z.object({
    i: z.number(),
})
const PackedBase58ValueSchema = PackedKeyIndexSchema;
const PackedUint8ArrayValueSchema = PackedKeyIndexSchema;

const PackedAddressTableLookupSchema = z.object({
    accountKey: PackedBase58ValueSchema,
    readonlyIndexes: z.array(z.number()),
    writableIndexes: z.array(z.number()),
})

const PackedBlockHeaderSchema = z.object({
    hash: PackedBase58ValueSchema,
    height: z.number(),
    slot: z.number(),
    parentSlot: z.number(),
    parentHash: PackedBase58ValueSchema,
    timestamp: z.number(),
})

const PackedTransactionSchema = z.object({
    transactionIndex: z.number(),
    version: z.number(),
    accountKeys: z.array(PackedBase58ValueSchema),
    addressTableLookups: z.array(PackedAddressTableLookupSchema),
    numReadonlySignedAccounts: z.number(),
    numReadonlyUnsignedAccounts: z.number(),
    numRequiredSignatures: z.number(),
    recentBlockhash: PackedBase58ValueSchema,
    signatures: z.array(PackedBase58ValueSchema),
    err: PackedUint8ArrayValueSchema,
    computeUnitsConsumed: z.bigint(),
    fee: z.bigint(),
    loadedAddresses: z.object({
        readonly: z.array(PackedBase58ValueSchema),
        writable: z.array(PackedBase58ValueSchema),
    }),
    hasDroppedLogMessages: z.boolean()
})

const PackedInstructionSchema = z.object({
    transactionIndex: z.number(),
    instructionAddress: z.array(z.number()),
    programId: PackedBase58ValueSchema,
    accounts: z.array(PackedBase58ValueSchema),
    data: PackedBase58ValueSchema,
    computeUnitsConsumed: z.bigint().optional(),
    error: PackedUint8ArrayValueSchema.optional(),
    isCommitted: z.boolean(),
    hasDroppedLogMessages: z.boolean()
})

const PackedLogMessageSchema = z.object({
    transactionIndex: z.number(),
    logIndex: z.number(),
    instructionAddress: z.array(z.number()),
    programId: PackedBase58ValueSchema,
    kind: PackedUint8ArrayValueSchema,
    message: PackedUint8ArrayValueSchema
})

const PackedBalanceSchema = z.object({
    transactionIndex: z.number(),
    account: PackedBase58ValueSchema,
    pre: z.bigint(),
    post: z.bigint(),
})

const PackedTokenBalanceSchema = z.object({
    transactionIndex: z.number(),
    account: PackedBase58ValueSchema,
    preProgramId: PackedBase58ValueSchema.optional(),
    preMint: PackedBase58ValueSchema.optional(),
    preDecimals: z.number().optional(),
    preOwner: PackedBase58ValueSchema.optional(),
    preAmount: z.bigint().optional(),
    postProgramId: PackedBase58ValueSchema.optional(),
    postMint: PackedBase58ValueSchema.optional(),
    postDecimals: z.number().optional(),
    postOwner: PackedBase58ValueSchema.optional(),
    postAmount: z.bigint().optional(),
})

const PackedRewardSchema = z.object({
    pubkey: PackedBase58ValueSchema,
    lamports: z.bigint(),
    postBalance: z.bigint(),
    rewardType: PackedUint8ArrayValueSchema.optional(),
    commission: z.number().optional(),
})

export const PackedBlockSchema = z.object({
    header: PackedBlockHeaderSchema,
    transactions: z.array(PackedTransactionSchema),
    instructions: z.array(PackedInstructionSchema),
    logs: z.array(PackedLogMessageSchema),
    balances: z.array(PackedBalanceSchema),
    tokenBalances: z.array(PackedTokenBalanceSchema),
    rewards: z.array(PackedRewardSchema),
})

export const PackedEncodeKeySchema = z.object({
    data: z.instanceof(Uint8Array<ArrayBufferLike>),
    type: z.number(),
})

export const PackedBlockListSchema = z.object({
    encodedKeys: z.array(PackedEncodeKeySchema),
    blocks: z.array(PackedBlockSchema),
})

export type PackedBlockList = z.infer<typeof PackedBlockListSchema>
export type PackedEncodeKey = z.infer<typeof PackedEncodeKeySchema>
export type PackedBlock = z.infer<typeof PackedBlockSchema>

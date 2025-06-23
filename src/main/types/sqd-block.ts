import { z } from "zod";

const base58BytesSchema = z.string();

const SqdBlockHeaderSchema = z.object({
  hash: base58BytesSchema,
  height: z.number(),
  slot: z.number(),
  parentSlot: z.number(),
  parentHash: base58BytesSchema,
  timestamp: z.number(),
});

const SqdAddressTableLookupSchema = z.object({
  accountKey: base58BytesSchema,
  readonlyIndexes: z.array(z.number()),
  writableIndexes: z.array(z.number()),
});

const SqdInstructionSchema = z.object({
  transactionIndex: z.number(),
  instructionAddress: z.array(z.number()),
  programId: base58BytesSchema,
  accounts: z.array(base58BytesSchema),
  data: base58BytesSchema,
  computeUnitsConsumed: z.bigint().optional(),
  error: z.string().optional(),
  isCommitted: z.boolean(),
  hasDroppedLogMessages: z.boolean(),
});

const SqdLogMessageSchema = z.object({
  transactionIndex: z.number(),
  logIndex: z.number(),
  instructionAddress: z.array(z.number()),
  programId: base58BytesSchema,
  kind: z.union([z.literal("log"), z.literal("data"), z.literal("other")]),
  message: z.string(),
});

const SqdBalanceSchema = z.object({
  transactionIndex: z.number(),
  account: base58BytesSchema,
  pre: z.bigint(),
  post: z.bigint(),
});

const SqdPreTokenBalanceSchema = z.object({
  transactionIndex: z.number(),
  account: base58BytesSchema,
  preProgramId: base58BytesSchema.optional(),
  preMint: base58BytesSchema,
  preDecimals: z.number(),
  preOwner: base58BytesSchema.optional(),
  preAmount: z.bigint(),
  postProgramId: z.undefined().optional(),
  postMint: z.undefined().optional(),
  postDecimals: z.undefined().optional(),
  postOwner: z.undefined().optional(),
  postAmount: z.undefined().optional(),
});

const SqdPostTokenBalanceSchema = z.object({
  transactionIndex: z.number(),
  account: base58BytesSchema,
  preProgramId: z.undefined().optional(),
  preMint: z.undefined().optional(),
  preDecimals: z.undefined().optional(),
  preOwner: z.undefined().optional(),
  preAmount: z.undefined().optional(),
  postProgramId: base58BytesSchema.optional(),
  postMint: base58BytesSchema,
  postDecimals: z.number(),
  postOwner: base58BytesSchema.optional(),
  postAmount: z.bigint(),
});

const SqdPrePostTokenBalanceSchema = z.object({
  transactionIndex: z.number(),
  account: base58BytesSchema,
  preProgramId: base58BytesSchema.optional(),
  preMint: base58BytesSchema,
  preDecimals: z.number(),
  preOwner: base58BytesSchema.optional(),
  preAmount: z.bigint(),
  postProgramId: base58BytesSchema.optional(),
  postMint: base58BytesSchema,
  postDecimals: z.number(),
  postOwner: base58BytesSchema.optional(),
  postAmount: z.bigint(),
});

const SqdRewardSchema = z.object({
  pubkey: base58BytesSchema,
  lamports: z.bigint(),
  postBalance: z.bigint(),
  rewardType: z.string().optional(),
  commission: z.number().optional(),
});

const SqdTransactionSchema = z.object({
  transactionIndex: z.number(),
  version: z.union([z.literal("legacy"), z.number()]),
  accountKeys: z.array(base58BytesSchema),
  addressTableLookups: z.array(SqdAddressTableLookupSchema),
  numReadonlySignedAccounts: z.number(),
  numReadonlyUnsignedAccounts: z.number(),
  numRequiredSignatures: z.number(),
  recentBlockhash: base58BytesSchema,
  signatures: z.array(base58BytesSchema),
  err: z.record(z.any()).nullable(),
  computeUnitsConsumed: z.bigint(),
  fee: z.bigint(),
  loadedAddresses: z.object({
    readonly: z.array(base58BytesSchema),
    writable: z.array(base58BytesSchema),
  }),
  hasDroppedLogMessages: z.boolean(),
});

const SqdTokenBalanceSchema = z.union([
  SqdPreTokenBalanceSchema,
  SqdPostTokenBalanceSchema,
  SqdPrePostTokenBalanceSchema,
]);

export const SqdBlockSchema = z.object({
  header: SqdBlockHeaderSchema,
  transactions: z.array(SqdTransactionSchema),
  instructions: z.array(SqdInstructionSchema),
  logs: z.array(SqdLogMessageSchema),
  balances: z.array(SqdBalanceSchema),
  tokenBalances: z.array(SqdTokenBalanceSchema),
  rewards: z.array(SqdRewardSchema),
});

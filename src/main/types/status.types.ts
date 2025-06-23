
export type T_FILE_STATUS = {
    fileIndex: number;
    minHeight: number;
    maxHeight: number;
}

export type T_STATUS = {
    lastEpoch: number | null;
    lastSlot: number | null;
    files: T_FILE_STATUS[];
}

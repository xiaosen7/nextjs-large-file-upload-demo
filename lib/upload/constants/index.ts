import { IS_VERCEL } from "@/shared/constants";

export const COMBINED_FILE_NAME = "merged";
export const CHUNKS_DIR = "chunks";
export const CHUNK_SIZE = IS_VERCEL ? 100 * 1024 : 5 * 1024 * 1024; // 5MB
export const CONCURRENCY = IS_VERCEL ? 1 : 3;

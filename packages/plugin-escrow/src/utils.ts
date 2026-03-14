import { existsSync, readFileSync, writeFileSync } from "fs";

const ESCROW_FILE = ".escrow-store.json";

export function loadEscrows(): Record<string, any> {
  try {
    if (existsSync(ESCROW_FILE)) {
      return JSON.parse(readFileSync(ESCROW_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

export function saveEscrows(escrows: Record<string, any>): void {
  try {
    writeFileSync(ESCROW_FILE, JSON.stringify(escrows, null, 2), "utf-8");
  } catch {}
}

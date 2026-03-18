import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import type { MemoryEntry, MemoryStore } from "./types";

/**
 * File-based memory store — persists to a single JSON file on disk.
 * Zero external dependencies. Works with both Bun and Node.js.
 */
export class FileMemoryStore implements MemoryStore {
  private filePath: string;

  constructor(filePath: string = ".agent-memory.json") {
    this.filePath = resolve(filePath);
  }

  private compositeKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private isExpired(entry: MemoryEntry): boolean {
    if (!entry.expiresAt) return false;
    return new Date(entry.expiresAt).getTime() <= Date.now();
  }

  private readAll(): Record<string, MemoryEntry> {
    try {
      if (!existsSync(this.filePath)) return {};
      const raw = readFileSync(this.filePath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  private writeAll(data: Record<string, MemoryEntry>): void {
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async get(namespace: string, key: string): Promise<MemoryEntry | null> {
    const data = this.readAll();
    const ck = this.compositeKey(namespace, key);
    const entry = data[ck];
    if (!entry) return null;
    if (this.isExpired(entry)) {
      delete data[ck];
      this.writeAll(data);
      return null;
    }
    return entry;
  }

  async set(namespace: string, key: string, value: string, ttlSeconds?: number): Promise<void> {
    const data = this.readAll();
    const now = new Date();
    const entry: MemoryEntry = {
      key,
      namespace,
      value,
      savedAt: now.toISOString(),
    };
    if (ttlSeconds !== undefined) {
      entry.expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
    }
    data[this.compositeKey(namespace, key)] = entry;
    this.writeAll(data);
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    const data = this.readAll();
    const ck = this.compositeKey(namespace, key);
    if (!(ck in data)) return false;
    delete data[ck];
    this.writeAll(data);
    return true;
  }

  async list(namespace: string, prefix?: string): Promise<MemoryEntry[]> {
    const data = this.readAll();
    const nsPrefix = `${namespace}:`;
    const results: MemoryEntry[] = [];
    let dirty = false;
    for (const [ck, entry] of Object.entries(data)) {
      if (!ck.startsWith(nsPrefix)) continue;
      if (this.isExpired(entry)) {
        delete data[ck];
        dirty = true;
        continue;
      }
      if (prefix && !entry.key.startsWith(prefix)) continue;
      results.push(entry);
    }
    if (dirty) this.writeAll(data);
    return results;
  }

  async clear(namespace: string): Promise<void> {
    const data = this.readAll();
    const nsPrefix = `${namespace}:`;
    for (const ck of Object.keys(data)) {
      if (ck.startsWith(nsPrefix)) {
        delete data[ck];
      }
    }
    this.writeAll(data);
  }
}

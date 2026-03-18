import type { MemoryEntry, MemoryStore } from "./types";

/**
 * In-memory store — data lost on restart.
 * Use for tests only.
 */
export class InMemoryStore implements MemoryStore {
  private data = new Map<string, MemoryEntry>();

  private compositeKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private isExpired(entry: MemoryEntry): boolean {
    if (!entry.expiresAt) return false;
    return new Date(entry.expiresAt).getTime() <= Date.now();
  }

  async get(namespace: string, key: string): Promise<MemoryEntry | null> {
    const ck = this.compositeKey(namespace, key);
    const entry = this.data.get(ck);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.data.delete(ck);
      return null;
    }
    return entry;
  }

  async set(namespace: string, key: string, value: string, ttlSeconds?: number): Promise<void> {
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
    this.data.set(this.compositeKey(namespace, key), entry);
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    return this.data.delete(this.compositeKey(namespace, key));
  }

  async list(namespace: string, prefix?: string): Promise<MemoryEntry[]> {
    const nsPrefix = `${namespace}:`;
    const results: MemoryEntry[] = [];
    for (const [ck, entry] of this.data) {
      if (!ck.startsWith(nsPrefix)) continue;
      if (this.isExpired(entry)) {
        this.data.delete(ck);
        continue;
      }
      if (prefix && !entry.key.startsWith(prefix)) continue;
      results.push(entry);
    }
    return results;
  }

  async clear(namespace: string): Promise<void> {
    const nsPrefix = `${namespace}:`;
    for (const ck of this.data.keys()) {
      if (ck.startsWith(nsPrefix)) {
        this.data.delete(ck);
      }
    }
  }
}

import type { MemoryEntry, MemoryStore } from "./types";

/**
 * Minimal interface for the Redis client.
 * Compatible with @upstash/redis, ioredis, and most Redis clients.
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number }): Promise<any>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

/**
 * Redis-backed memory store — for production deployments.
 * Uses Redis native TTL for expiration.
 */
export class RedisMemoryStore implements MemoryStore {
  private client: RedisClient;
  private prefix: string;

  constructor(client: RedisClient, prefix: string = "agent-memory") {
    this.client = client;
    this.prefix = prefix;
  }

  private redisKey(namespace: string, key: string): string {
    return `${this.prefix}:${namespace}:${key}`;
  }

  async get(namespace: string, key: string): Promise<MemoryEntry | null> {
    const raw = await this.client.get(this.redisKey(namespace, key));
    if (!raw) return null;
    return JSON.parse(raw) as MemoryEntry;
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
    const serialized = JSON.stringify(entry);
    if (ttlSeconds !== undefined) {
      await this.client.set(this.redisKey(namespace, key), serialized, { ex: ttlSeconds });
    } else {
      await this.client.set(this.redisKey(namespace, key), serialized);
    }
  }

  async delete(namespace: string, key: string): Promise<boolean> {
    const count = await this.client.del(this.redisKey(namespace, key));
    return count > 0;
  }

  async list(namespace: string, prefix?: string): Promise<MemoryEntry[]> {
    const pattern = prefix
      ? `${this.prefix}:${namespace}:${prefix}*`
      : `${this.prefix}:${namespace}:*`;
    const keys = await this.client.keys(pattern);
    const results: MemoryEntry[] = [];
    for (const rk of keys) {
      const raw = await this.client.get(rk);
      if (!raw) continue;
      const entry = JSON.parse(raw) as MemoryEntry;
      results.push(entry);
    }
    return results;
  }

  async clear(namespace: string): Promise<void> {
    const keys = await this.client.keys(`${this.prefix}:${namespace}:*`);
    for (const rk of keys) {
      await this.client.del(rk);
    }
  }
}

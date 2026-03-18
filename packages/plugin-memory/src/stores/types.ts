export interface MemoryEntry {
  key: string;
  namespace: string;
  value: string;
  savedAt: string;
  expiresAt?: string;
}

export interface MemoryStore {
  get(namespace: string, key: string): Promise<MemoryEntry | null>;
  set(namespace: string, key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(namespace: string, key: string): Promise<boolean>;
  list(namespace: string, prefix?: string): Promise<MemoryEntry[]>;
  clear(namespace: string): Promise<void>;
}

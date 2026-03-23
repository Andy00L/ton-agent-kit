// wallet-store.ts
// Encrypted storage for user wallets and API keys.
// Uses AES-256-GCM with per-user derived keys.
// Stores data in SQLite (data/wallets.db).

import Database from "bun:sqlite";
import crypto from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, readdirSync, rmdirSync } from "fs";
import { dirname, join } from "path";

// ── Provider config ──

export interface ProviderConfig {
  name: string;
  baseURL: string | undefined;
  keyUrl: string;
  models: Array<{ id: string; label: string }>;
}

export const LLM_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    baseURL: undefined,
    keyUrl: "https://platform.openai.com/api-keys",
    models: [
      { id: "gpt-4o", label: "GPT-4o (best)" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini (cheap)" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 Nano (fastest)" },
    ],
  },
  openrouter: {
    name: "OpenRouter",
    baseURL: "https://openrouter.ai/api/v1",
    keyUrl: "https://openrouter.ai/keys",
    models: [
      { id: "openai/gpt-4o", label: "GPT-4o" },
      { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
      { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
    ],
  },
  groq: {
    name: "Groq",
    baseURL: "https://api.groq.com/openai/v1",
    keyUrl: "https://console.groq.com/keys",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (best)" },
      { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B (fast)" },
      { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    ],
  },
  together: {
    name: "Together",
    baseURL: "https://api.together.xyz/v1",
    keyUrl: "https://api.together.xyz/settings/api-keys",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", label: "Qwen 2.5 72B Turbo" },
    ],
  },
  mistral: {
    name: "Mistral",
    baseURL: "https://api.mistral.ai/v1",
    keyUrl: "https://console.mistral.ai/api-keys",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "mistral-small-latest", label: "Mistral Small" },
    ],
  },
};

// ── Server secret ──

export function ensureServerSecret(): string {
  const envPath = ".env";
  let content = "";
  try {
    content = readFileSync(envPath, "utf-8");
  } catch {
    content = "";
  }

  const match = content.match(/^WALLET_ENCRYPTION_KEY=([0-9a-fA-F]{64})$/m);
  if (match) return match[1];

  // Remove any existing incomplete key line
  const lines = content.split("\n").filter(l => !l.startsWith("WALLET_ENCRYPTION_KEY="));

  const secret = crypto.randomBytes(32).toString("hex");
  lines.push(`WALLET_ENCRYPTION_KEY=${secret}`);
  writeFileSync(envPath, lines.join("\n"));
  return secret;
}

// ── SecretStore ──

export class SecretStore {
  private db: Database;
  private serverSecret: string;

  constructor(dbPath: string, serverSecret: string) {
    this.serverSecret = serverSecret;

    // Ensure parent directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    this.db = new Database(dbPath);
    this.db.exec("PRAGMA journal_mode=WAL;");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        uid INTEGER PRIMARY KEY,
        blob TEXT NOT NULL,
        address TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_api_keys (
        uid INTEGER PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        blob TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  // ── Wallet methods ──

  saveWallet(uid: number, mnemonic: string, address: string): void {
    const blob = this.encrypt(uid, "wallet:", mnemonic);
    this.db.run(
      `INSERT OR REPLACE INTO user_wallets (uid, blob, address, created_at) VALUES (?, ?, ?, ?)`,
      [uid, blob, address, Date.now()],
    );
  }

  loadWallet(uid: number): { mnemonic: string; address: string } | null {
    const row = this.db.query("SELECT blob, address FROM user_wallets WHERE uid = ?").get(uid) as any;
    if (!row) return null;
    return { mnemonic: this.decrypt(uid, "wallet:", row.blob), address: row.address };
  }

  deleteWallet(uid: number): void {
    this.db.run("DELETE FROM user_wallets WHERE uid = ?", [uid]);
  }

  hasWallet(uid: number): boolean {
    const row = this.db.query("SELECT 1 FROM user_wallets WHERE uid = ? LIMIT 1").get(uid);
    return !!row;
  }

  getWalletAddress(uid: number): string | null {
    const row = this.db.query("SELECT address FROM user_wallets WHERE uid = ?").get(uid) as any;
    return row?.address ?? null;
  }

  // ── API key methods ──

  saveApiKey(uid: number, provider: string, model: string, apiKey: string): void {
    const blob = this.encrypt(uid, "apikey:", apiKey);
    this.db.run(
      `INSERT OR REPLACE INTO user_api_keys (uid, provider, model, blob, created_at) VALUES (?, ?, ?, ?, ?)`,
      [uid, provider, model, blob, Date.now()],
    );
  }

  loadApiKey(uid: number): { provider: string; model: string; apiKey: string } | null {
    const row = this.db.query("SELECT provider, model, blob FROM user_api_keys WHERE uid = ?").get(uid) as any;
    if (!row) return null;
    return { provider: row.provider, model: row.model, apiKey: this.decrypt(uid, "apikey:", row.blob) };
  }

  deleteApiKey(uid: number): void {
    this.db.run("DELETE FROM user_api_keys WHERE uid = ?", [uid]);
  }

  hasApiKey(uid: number): boolean {
    const row = this.db.query("SELECT 1 FROM user_api_keys WHERE uid = ? LIMIT 1").get(uid);
    return !!row;
  }

  getApiKeyInfo(uid: number): { provider: string; model: string } | null {
    const row = this.db.query("SELECT provider, model FROM user_api_keys WHERE uid = ?").get(uid) as any;
    if (!row) return null;
    return { provider: row.provider, model: row.model };
  }

  updateModel(uid: number, model: string): void {
    this.db.run("UPDATE user_api_keys SET model = ? WHERE uid = ?", [model, uid]);
  }

  getDb(): Database { return this.db; }

  // ── Encryption (private) ──

  private deriveKey(uid: number, prefix: string): Buffer {
    return crypto.createHmac("sha256", this.serverSecret)
      .update(prefix + uid.toString())
      .digest();
  }

  private encrypt(uid: number, prefix: string, plaintext: string): string {
    const key = this.deriveKey(uid, prefix);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return iv.toString("base64") + "." + tag.toString("base64") + "." + encrypted.toString("base64");
  }

  private decrypt(uid: number, prefix: string, blob: string): string {
    const parts = blob.split(".");
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    const key = this.deriveKey(uid, prefix);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}

// ── FileStore ──

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_USER_STORAGE = 50 * 1024 * 1024;
export const FILE_TTL = 48 * 60 * 60;

export class FileStore {
  private db: Database;
  private basePath: string;

  constructor(db: Database, basePath: string) {
    this.db = db;
    this.basePath = basePath;
    if (!existsSync(basePath)) mkdirSync(basePath, { recursive: true });

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_files (
        id TEXT PRIMARY KEY,
        uid INTEGER NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        source TEXT,
        description TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);
    try {
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_files_uid ON user_files(uid)");
      this.db.exec("CREATE INDEX IF NOT EXISTS idx_files_expires ON user_files(expires_at)");
    } catch {}
  }

  private generateId(): string {
    return crypto.randomBytes(4).toString("hex");
  }

  private getExtension(contentType: string, filename: string): string {
    const dotIdx = filename.lastIndexOf(".");
    if (dotIdx > 0) return filename.slice(dotIdx + 1).toLowerCase();
    const map: Record<string, string> = {
      "application/json": "json", "text/plain": "txt", "text/html": "html", "text/csv": "csv",
      "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif",
      "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/ogg": "ogg", "audio/wav": "wav",
      "application/pdf": "pdf",
    };
    return map[contentType] || "bin";
  }

  save(uid: number, filename: string, contentType: string, buffer: Buffer, source?: string, description?: string): string {
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB). Max ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
    }
    const currentUsage = this.getUserStorage(uid);
    if (currentUsage + buffer.length > MAX_USER_STORAGE) {
      throw new Error(`Storage full (${(currentUsage / 1024 / 1024).toFixed(1)} / ${MAX_USER_STORAGE / 1024 / 1024} MB). Delete old files first.`);
    }

    const id = this.generateId();
    const now = Math.floor(Date.now() / 1000);
    const userDir = join(this.basePath, uid.toString());
    if (!existsSync(userDir)) mkdirSync(userDir, { recursive: true });

    const ext = this.getExtension(contentType, filename);
    const diskName = `${id}.${ext}`;
    writeFileSync(join(userDir, diskName), buffer);

    this.db.prepare(
      "INSERT INTO user_files (id, uid, filename, content_type, size, source, description, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, uid, filename, contentType, buffer.length, source || null, description || null, now, now + FILE_TTL);
    return id;
  }

  getFile(id: string): { path: string; filename: string; contentType: string; size: number; uid: number } | null {
    const row = this.db.prepare("SELECT uid, filename, content_type, size FROM user_files WHERE id = ?").get(id) as any;
    if (!row) return null;
    const ext = this.getExtension(row.content_type, row.filename);
    const path = join(this.basePath, row.uid.toString(), `${id}.${ext}`);
    if (!existsSync(path)) return null;
    return { path, filename: row.filename, contentType: row.content_type, size: row.size, uid: row.uid };
  }

  getFileBuffer(id: string): Buffer | null {
    const file = this.getFile(id);
    if (!file) return null;
    try { return readFileSync(file.path); } catch { return null; }
  }

  listFiles(uid: number, offset = 0, limit = 5): Array<{
    id: string; filename: string; contentType: string; size: number;
    source: string | null; description: string | null; createdAt: number; expiresAt: number;
  }> {
    const rows = this.db.prepare(
      "SELECT id, filename, content_type, size, source, description, created_at, expires_at FROM user_files WHERE uid = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).all(uid, limit, offset) as any[];
    return (rows || []).map((r: any) => ({
      id: r.id, filename: r.filename, contentType: r.content_type, size: r.size,
      source: r.source, description: r.description, createdAt: r.created_at, expiresAt: r.expires_at,
    }));
  }

  countFiles(uid: number): number {
    const row = this.db.prepare("SELECT COUNT(*) as cnt FROM user_files WHERE uid = ?").get(uid) as any;
    return row?.cnt || 0;
  }

  getUserStorage(uid: number): number {
    const row = this.db.prepare("SELECT COALESCE(SUM(size), 0) as total FROM user_files WHERE uid = ?").get(uid) as any;
    return row?.total || 0;
  }

  deleteFile(id: string): boolean {
    const file = this.getFile(id);
    if (!file) return false;
    try { unlinkSync(file.path); } catch {}
    this.db.prepare("DELETE FROM user_files WHERE id = ?").run(id);
    try {
      const userDir = join(this.basePath, file.uid.toString());
      const remaining = readdirSync(userDir);
      if (remaining.length === 0) rmdirSync(userDir);
    } catch {}
    return true;
  }

  deleteAllFiles(uid: number): number {
    const files = this.db.prepare("SELECT id FROM user_files WHERE uid = ?").all(uid) as any[];
    let count = 0;
    for (const f of files || []) { if (this.deleteFile(f.id)) count++; }
    return count;
  }

  cleanupExpired(): number {
    const now = Math.floor(Date.now() / 1000);
    const expired = this.db.prepare("SELECT id FROM user_files WHERE expires_at < ?").all(now) as any[];
    let count = 0;
    for (const f of expired || []) { if (this.deleteFile(f.id)) count++; }
    return count;
  }
}

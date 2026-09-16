// wallet-store.ts
// Encrypted storage for user wallets and API keys.
// Uses AES-256-GCM with per-user derived keys.
// Stores data in SQLite (data/wallets.db).

import Database from "bun:sqlite";
import crypto from "crypto";
import { appendFileSync, chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from "fs";
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

/** Name of the variable holding the master key, in the environment and in .env. */
const ENCRYPTION_KEY_VARIABLE = "WALLET_ENCRYPTION_KEY";

/** The key is 32 random bytes rendered as 64 hex characters. */
const ENCRYPTION_KEY_FORMAT = /^[0-9a-fA-F]{64}$/;

/**
 * Matches the key in a .env file, tolerating the shapes a human or a secrets
 * tool writes: a leading `export`, spaces around `=`, single or double quotes.
 * The strict original missed all of them, and every miss minted a new key.
 */
const ENCRYPTION_KEY_LINE =
  /^[ \t]*(?:export[ \t]+)?WALLET_ENCRYPTION_KEY[ \t]*=[ \t]*["']?([0-9a-fA-F]{64})["']?[ \t]*$/m;

/**
 * Resolve the master key that every stored mnemonic is encrypted under.
 *
 * Resolution order: the environment, then the file, then mint a new one. A
 * platform-injected secret (Docker, Kubernetes, Fly) must win over anything
 * on disk, which is why the environment is read first.
 *
 * This function refuses to mint a key whenever it cannot prove that none
 * exists. Nothing in an encrypted blob says which key produced it and there is
 * no rotation path, so generating a key over one still in use makes every
 * stored wallet permanently unreadable and the funds behind those mnemonics
 * unrecoverable. A read error that is not "file absent", or a key present in a
 * shape this function cannot parse, is a hard failure rather than a reason to
 * generate.
 *
 * @param envPath - Where the .env file lives. Defaults to `.env` relative to
 * the current working directory, so a service that can start from more than
 * one directory should pass an absolute path.
 * @since 1.1.0
 */
export function ensureServerSecret(envPath: string = ".env"): string {
  const fromEnvironment = process.env[ENCRYPTION_KEY_VARIABLE]?.trim();
  if (fromEnvironment) {
    if (!ENCRYPTION_KEY_FORMAT.test(fromEnvironment)) {
      throw new Error(
        `[ensureServerSecret] ${ENCRYPTION_KEY_VARIABLE} is set but is not 64 hex characters.`,
      );
    }
    return fromEnvironment;
  }

  let content: string | null = null;
  try {
    content = readFileSync(envPath, "utf-8");
  } catch (caught: unknown) {
    const code = (caught as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      throw new Error(
        `[ensureServerSecret] Could not read ${envPath} (${code}). Refusing to generate a new key: ` +
          `if one is already in that file, replacing it would make every stored wallet unreadable.`,
      );
    }
  }

  if (content !== null) {
    const match = content.match(ENCRYPTION_KEY_LINE);
    if (match) return match[1];
    if (content.includes(ENCRYPTION_KEY_VARIABLE)) {
      throw new Error(
        `[ensureServerSecret] ${envPath} declares ${ENCRYPTION_KEY_VARIABLE} but the value is not 64 hex ` +
          `characters. Fix it by hand. Generating a new key here would orphan every wallet encrypted ` +
          `under the old one.`,
      );
    }
  }

  const secret = crypto.randomBytes(32).toString("hex");
  // Append. The previous version rebuilt the whole file from a possibly empty
  // string, which erased every other variable in it, TON_MNEMONIC included.
  const separator = content && !content.endsWith("\n") ? "\n" : "";
  appendFileSync(envPath, `${separator}${ENCRYPTION_KEY_VARIABLE}=${secret}\n`, { mode: 0o600 });
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

    // The database holds the ciphertext of every mnemonic. Created with the
    // default mode it is world-readable, which hands a local attacker the data
    // the encryption exists to protect. WAL mode adds -wal and -shm siblings,
    // so they get the same treatment. No-op on Windows, correct everywhere else.
    for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
      try {
        if (existsSync(path)) chmodSync(path, 0o600);
      } catch (caught: unknown) {
        console.error(
          `[SecretStore] Could not restrict permissions on ${path}: ${caught instanceof Error ? caught.message : String(caught)}`,
        );
      }
    }
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

  /**
   * Store a wallet for a user.
   *
   * Refuses to overwrite an existing one. The previous version used
   * `INSERT OR REPLACE`, so a retried request or a second "create wallet"
   * click silently replaced a funded wallet's mnemonic with no error and no
   * way to recover it. Replacing one now takes an explicit `deleteWallet`
   * first, which makes the destruction a decision rather than an accident.
   *
   * @throws When a wallet already exists for `uid`.
   */
  saveWallet(uid: number, mnemonic: string, address: string): void {
    if (this.hasWallet(uid)) {
      throw new Error(
        `[SecretStore] A wallet already exists for uid ${uid}. Call deleteWallet first to replace it.`,
      );
    }
    const blob = this.encrypt(uid, "wallet:", mnemonic);
    this.db.run(
      `INSERT INTO user_wallets (uid, blob, address, created_at) VALUES (?, ?, ?, ?)`,
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
    // Pin the tag length. Without it GCM accepts any legal size down to 4
    // bytes, so anyone who can write to the database can forge against 32 bits
    // of authentication instead of 128.
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  }
}

// ── FileStore ──

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const MAX_USER_STORAGE = 50 * 1024 * 1024;
export const FILE_TTL = 48 * 60 * 60;

/** The columns of user_files needed to locate a stored blob on disk. */
interface StoredFileRow {
  id: string;
  uid: number;
  filename: string;
  content_type: string;
}

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

  /** The columns needed to locate a stored blob on disk. */
  private selectRows(sql: string, parameter: number | string): StoredFileRow[] {
    return this.db.prepare(sql).all(parameter) as StoredFileRow[];
  }

  /** Where a stored file lives on disk. */
  private pathOf(row: StoredFileRow): string {
    return join(this.basePath, String(row.uid), `${row.id}.${this.getExtension(row.content_type, row.filename)}`);
  }

  /** Remove a user's directory once nothing is left in it. */
  private pruneUserDirectory(uid: number): void {
    try {
      const userDir = join(this.basePath, String(uid));
      if (readdirSync(userDir).length === 0) rmdirSync(userDir);
    } catch {
      // The directory is already gone, or another process is writing into it.
    }
  }

  deleteFile(id: string): boolean {
    const [row] = this.selectRows(
      "SELECT id, uid, filename, content_type FROM user_files WHERE id = ?",
      id,
    );
    if (!row) return false;

    // The row goes first. It used to go last, behind a getFile() that answered
    // null whenever the blob was missing from disk, so a row whose file had
    // vanished could never be deleted: it held part of the user's 50 MB quota
    // forever and cleanupExpired re-selected it on every sweep and returned 0.
    this.db.prepare("DELETE FROM user_files WHERE id = ?").run(id);
    try { unlinkSync(this.pathOf(row)); } catch {}
    this.pruneUserDirectory(row.uid);
    return true;
  }

  deleteAllFiles(uid: number): number {
    const rows = this.selectRows(
      "SELECT id, uid, filename, content_type FROM user_files WHERE uid = ?",
      uid,
    );
    if (rows.length === 0) return 0;

    // One DELETE and one directory scan, not one of each per file. The previous
    // loop called deleteFile per id, and deleteFile reads the whole user
    // directory, so removing n files read n directories of shrinking size.
    this.db.prepare("DELETE FROM user_files WHERE uid = ?").run(uid);
    for (const row of rows) {
      try { unlinkSync(this.pathOf(row)); } catch {}
    }
    this.pruneUserDirectory(uid);
    return rows.length;
  }

  cleanupExpired(): number {
    const now = Math.floor(Date.now() / 1000);
    const rows = this.selectRows(
      "SELECT id, uid, filename, content_type FROM user_files WHERE expires_at < ?",
      now,
    );
    if (rows.length === 0) return 0;

    this.db.prepare("DELETE FROM user_files WHERE expires_at < ?").run(now);
    const touchedUsers = new Set<number>();
    for (const row of rows) {
      try { unlinkSync(this.pathOf(row)); } catch {}
      touchedUsers.add(row.uid);
    }
    for (const uid of touchedUsers) this.pruneUserDirectory(uid);
    return rows.length;
  }
}

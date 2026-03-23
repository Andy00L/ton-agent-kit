# @ton-agent-kit/wallet-store

Encrypted storage for user wallets, API keys, and temporary files. AES-256-GCM with per-user derived keys. SQLite backend via bun:sqlite.

## Usage
```typescript
import { SecretStore, ensureServerSecret, FileStore, LLM_PROVIDERS } from "@ton-agent-kit/wallet-store";

const secret = ensureServerSecret();
const store = new SecretStore("data/wallets.db", secret);

// Wallet (AES-256-GCM encrypted)
store.saveWallet(uid, mnemonic, address);
const wallet = store.loadWallet(uid); // { mnemonic, address }

// API Key (AES-256-GCM encrypted, separate derived key)
store.saveApiKey(uid, "groq", "llama-3.3-70b", apiKey);
const key = store.loadApiKey(uid); // { provider, model, apiKey }

// File storage (48h TTL, 10MB/file, 50MB/user)
const fileStore = new FileStore(store.getDb(), "data/files");
const fileId = fileStore.save(uid, "data.json", "application/json", buffer, "get_price");
fileStore.cleanupExpired();
```

## LLM Providers

5 pre-configured providers: OpenAI, OpenRouter, Groq, Together, Mistral. Each with name, baseURL, keyUrl, and suggested models.

## Security

- Per-user key derivation: HMAC-SHA256(serverSecret, prefix + uid)
- Separate prefixes for wallets ("wallet:") and API keys ("apikey:")
- Server secret auto-generated on first run (64 hex chars)
- SQLite with prepared statements (no SQL injection)

## Requires

Bun 1.3+ (uses bun:sqlite)

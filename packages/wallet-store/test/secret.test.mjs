// Regression checks for the master key and the wallet write path.
//
//   bun packages/wallet-store/test/secret.test.mjs
//
// Needs Bun: the module imports bun:sqlite. No network, no framework.
//
// Every check below failed before the 2026-09-16 audit. The key ones are not
// subtle: the old ensureServerSecret rewrote .env from a possibly empty string,
// so a single unreadable read erased TON_MNEMONIC along with the key that every
// stored wallet was encrypted under.

import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureServerSecret, SecretStore } from "../src/index.ts";

// Bun auto-loads the project's .env, so clear the variable first: otherwise the
// environment branch short-circuits every file-based check below.
delete process.env.WALLET_ENCRYPTION_KEY;

const dir = mkdtempSync(join(tmpdir(), "wallet-store-test-"));
const KEY = "a".repeat(64);
let failures = 0;
let total = 0;
function check(name, passed) {
  total++;
  if (!passed) failures++;
  console.log(`  ${passed ? "pass" : "FAIL"}  ${name}`);
}

// A key written with quotes, or with `export`, or with spaces around `=`, used
// to miss the strict regex. Every miss minted a new key over a live one.
const quoted = join(dir, "quoted.env");
writeFileSync(quoted, `DATABASE_URL=postgres://x\nWALLET_ENCRYPTION_KEY="${KEY}"\n`);
check("a quoted key is found, not replaced", ensureServerSecret(quoted) === KEY);

const exported = join(dir, "exported.env");
writeFileSync(exported, `export WALLET_ENCRYPTION_KEY = ${KEY}\n`);
check("an exported key with spaces is found", ensureServerSecret(exported) === KEY);

// Minting appends. It used to rebuild the file and drop everything else in it.
const fresh = join(dir, "fresh.env");
writeFileSync(fresh, "TON_MNEMONIC=word word word\nOPENAI_API_KEY=sk-test\n");
const minted = ensureServerSecret(fresh);
const afterMint = readFileSync(fresh, "utf-8");
check("minting keeps TON_MNEMONIC", afterMint.includes("TON_MNEMONIC=word word word"));
check("minting keeps OPENAI_API_KEY", afterMint.includes("OPENAI_API_KEY=sk-test"));
check("the minted key is found again on the next call", ensureServerSecret(fresh) === minted);

// A key present but unparseable must stop the process. Generating over it
// orphans every wallet encrypted under the old one.
const broken = join(dir, "broken.env");
writeFileSync(broken, "WALLET_ENCRYPTION_KEY=not-hex\n");
let threwOnMalformed = false;
try { ensureServerSecret(broken); } catch { threwOnMalformed = true; }
check("a malformed key throws instead of minting over it", threwOnMalformed);

// A platform-injected secret wins over anything on disk.
process.env.WALLET_ENCRYPTION_KEY = "b".repeat(64);
check("the environment wins over the file", ensureServerSecret(quoted) === "b".repeat(64));
delete process.env.WALLET_ENCRYPTION_KEY;

// saveWallet used to INSERT OR REPLACE, overwriting a funded wallet in silence.
const store = new SecretStore(join(dir, "wallets.db"), KEY);
store.saveWallet(1, "first mnemonic", "EQ_first");
let threwOnOverwrite = false;
try { store.saveWallet(1, "second mnemonic", "EQ_second"); } catch { threwOnOverwrite = true; }
check("saveWallet refuses to overwrite an existing wallet", threwOnOverwrite);
check("the original mnemonic survived", store.loadWallet(1)?.mnemonic === "first mnemonic");

// A wrong key must fail closed, never return plausible garbage.
const otherStore = new SecretStore(join(dir, "wallets.db"), "c".repeat(64));
let threwOnWrongKey = false;
try { otherStore.loadWallet(1); } catch { threwOnWrongKey = true; }
check("a wrong master key fails closed", threwOnWrongKey);

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

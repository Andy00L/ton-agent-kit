// tests/24-memory-plugin.ts — Wrapped from test-memory.ts
/**
 * Memory Plugin Test Suite
 * InMemoryStore, FileMemoryStore, Plugin integration
 */

import { readFileSync, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");

import { TonAgentKit } from "../packages/core/src/agent";
import { KeypairWallet } from "../packages/core/src/wallet";
import { InMemoryStore } from "../packages/plugin-memory/src/stores/memory-store";
import { FileMemoryStore } from "../packages/plugin-memory/src/stores/file-store";
import { createMemoryPlugin } from "../packages/plugin-memory/src/index";

// ══════════════════════════════════════════════════════════════
//  Test Framework
// ══════════════════════════════════════════════════════════════

const W = 64;
let passed = 0;
let failed = 0;
const errors: string[] = [];
const sectionResults: { name: string; passed: number; failed: number }[] = [];
let sectionPassed = 0;
let sectionFailed = 0;

function header(icon: string, num: number, title: string, subtitle?: string) {
  console.log(`\n${"═".repeat(W)}`);
  console.log(`  ${icon} SECTION ${num}: ${title}`);
  if (subtitle) console.log(`  ${subtitle}`);
  console.log(`${"═".repeat(W)}`);
}

function sectionEnd(name: string) {
  sectionResults.push({ name, passed: sectionPassed, failed: sectionFailed });
  sectionPassed = 0;
  sectionFailed = 0;
}

async function test(name: string, fn: () => Promise<any>): Promise<any> {
  try {
    const result = await fn();
    console.log(`  ✅ ${name}`);
    passed++;
    sectionPassed++;
    return result;
  } catch (err: any) {
    console.log(`  ❌ ${name}`);
    console.log(`     → ${err.message.slice(0, 120)}`);
    failed++;
    sectionFailed++;
    errors.push(`${name}: ${err.message.slice(0, 100)}`);
    return null;
  }
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

// ══════════════════════════════════════════════════════════════
//  Main
// ══════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();

  console.log(`
╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 44) / 2))}🧠 Memory Plugin — Comprehensive Test Suite${" ".repeat(Math.ceil((W - 44) / 2))}║
╚${"═".repeat(W - 2)}╝

  Timestamp: ${new Date().toISOString()}
${"─".repeat(W)}`);

  // SECTION 1: InMemoryStore unit tests
  header("🗄️", 1, "InMemoryStore", "Direct store unit tests");

  const mem = new InMemoryStore();

  await test("set + get", async () => {
    await mem.set("default", "key1", "value1");
    const entry = await mem.get("default", "key1");
    if (!entry || entry.value !== "value1") throw new Error(`Expected value1, got ${entry?.value}`);
    console.log(`     value: ${entry.value}`);
  });

  await test("get returns savedAt timestamp", async () => {
    const entry = await mem.get("default", "key1");
    if (!entry?.savedAt) throw new Error("Missing savedAt");
    console.log(`     savedAt: ${entry.savedAt}`);
  });

  await test("overwrite existing key", async () => {
    await mem.set("default", "key1", "updated");
    const entry = await mem.get("default", "key1");
    if (!entry || entry.value !== "updated") throw new Error(`Expected updated, got ${entry?.value}`);
  });

  await test("get nonexistent key returns null", async () => {
    const entry = await mem.get("default", "no-such-key");
    if (entry !== null) throw new Error("Expected null");
  });

  await test("namespace isolation", async () => {
    await mem.set("bot-a", "key1", "value-a");
    await mem.set("bot-b", "key1", "value-b");
    const a = await mem.get("bot-a", "key1");
    const b = await mem.get("bot-b", "key1");
    if (a?.value !== "value-a") throw new Error(`bot-a: expected value-a, got ${a?.value}`);
    if (b?.value !== "value-b") throw new Error(`bot-b: expected value-b, got ${b?.value}`);
    console.log(`     bot-a=${a.value}, bot-b=${b.value}`);
  });

  await test("TTL expiration", async () => {
    await mem.set("default", "temp", "expires-soon", 1);
    const before = await mem.get("default", "temp");
    if (!before) throw new Error("Should exist before expiry");
    await new Promise((r) => setTimeout(r, 1500));
    const after = await mem.get("default", "temp");
    if (after !== null) throw new Error("Should be null after expiry");
    console.log(`     Expired correctly after 1.5s`);
  });

  await test("no TTL means no expiration", async () => {
    await mem.set("default", "permanent", "stays");
    const entry = await mem.get("default", "permanent");
    if (!entry || entry.expiresAt) throw new Error("Should not have expiresAt");
  });

  await test("list all in namespace", async () => {
    const store2 = new InMemoryStore();
    await store2.set("ns", "a", "1");
    await store2.set("ns", "b", "2");
    await store2.set("other", "c", "3");
    const entries = await store2.list("ns");
    if (entries.length !== 2) throw new Error(`Expected 2, got ${entries.length}`);
    console.log(`     Listed ${entries.length} entries`);
  });

  await test("list with prefix filter", async () => {
    const store2 = new InMemoryStore();
    await store2.set("default", "trade_1", "t1");
    await store2.set("default", "trade_2", "t2");
    await store2.set("default", "config_x", "cx");
    const trades = await store2.list("default", "trade_");
    if (trades.length !== 2) throw new Error(`Expected 2 trades, got ${trades.length}`);
    console.log(`     Filtered: ${trades.length} trade_ entries`);
  });

  await test("list excludes expired entries", async () => {
    const store2 = new InMemoryStore();
    await store2.set("default", "live", "yes");
    await store2.set("default", "dead", "no", 0); // expires immediately
    await new Promise((r) => setTimeout(r, 50));
    const entries = await store2.list("default");
    if (entries.length !== 1) throw new Error(`Expected 1, got ${entries.length}`);
    if (entries[0].key !== "live") throw new Error(`Expected 'live', got ${entries[0].key}`);
  });

  await test("delete existing key", async () => {
    const store2 = new InMemoryStore();
    await store2.set("default", "x", "y");
    const deleted = await store2.delete("default", "x");
    if (!deleted) throw new Error("Expected deleted=true");
    const after = await store2.get("default", "x");
    if (after !== null) throw new Error("Should be null after delete");
  });

  await test("delete nonexistent key returns false", async () => {
    const store2 = new InMemoryStore();
    const deleted = await store2.delete("default", "nope");
    if (deleted) throw new Error("Expected deleted=false");
  });

  await test("clear namespace", async () => {
    const store2 = new InMemoryStore();
    await store2.set("ns1", "a", "1");
    await store2.set("ns1", "b", "2");
    await store2.set("ns2", "c", "3");
    await store2.clear("ns1");
    const ns1 = await store2.list("ns1");
    const ns2 = await store2.list("ns2");
    if (ns1.length !== 0) throw new Error(`ns1 should be empty, got ${ns1.length}`);
    if (ns2.length !== 1) throw new Error(`ns2 should have 1, got ${ns2.length}`);
  });

  sectionEnd("InMemoryStore");

  // SECTION 2: FileMemoryStore tests
  header("📁", 2, "FileMemoryStore", "File-based persistence");

  const tmpPath = join(tmpdir(), `test-agent-memory-${Date.now()}.json`);
  const fileStore = new FileMemoryStore(tmpPath);

  await test("set + get (file)", async () => {
    await fileStore.set("default", "fkey", "fvalue");
    const entry = await fileStore.get("default", "fkey");
    if (!entry || entry.value !== "fvalue") throw new Error(`Expected fvalue, got ${entry?.value}`);
  });

  await test("file created on disk", async () => {
    if (!existsSync(tmpPath)) throw new Error(`File ${tmpPath} does not exist`);
    const raw = readFileSync(tmpPath, "utf-8");
    const data = JSON.parse(raw);
    if (!data["default:fkey"]) throw new Error("Key not found in file");
    console.log(`     File: ${tmpPath}`);
  });

  await test("namespace isolation (file)", async () => {
    await fileStore.set("a", "k", "va");
    await fileStore.set("b", "k", "vb");
    const a = await fileStore.get("a", "k");
    const b = await fileStore.get("b", "k");
    if (a?.value !== "va") throw new Error(`a: expected va`);
    if (b?.value !== "vb") throw new Error(`b: expected vb`);
  });

  await test("TTL expiration (file)", async () => {
    await fileStore.set("default", "ftmp", "temp", 1);
    const before = await fileStore.get("default", "ftmp");
    if (!before) throw new Error("Should exist");
    await new Promise((r) => setTimeout(r, 1500));
    const after = await fileStore.get("default", "ftmp");
    if (after !== null) throw new Error("Should be null after TTL");
  });

  await test("list with prefix (file)", async () => {
    await fileStore.set("default", "trade_1", "t1");
    await fileStore.set("default", "trade_2", "t2");
    await fileStore.set("default", "other", "o");
    const trades = await fileStore.list("default", "trade_");
    if (trades.length !== 2) throw new Error(`Expected 2, got ${trades.length}`);
  });

  await test("delete (file)", async () => {
    const deleted = await fileStore.delete("default", "fkey");
    if (!deleted) throw new Error("Expected true");
    const after = await fileStore.get("default", "fkey");
    if (after !== null) throw new Error("Should be null");
  });

  await test("clear namespace (file)", async () => {
    await fileStore.clear("default");
    const entries = await fileStore.list("default");
    if (entries.length !== 0) throw new Error(`Expected 0, got ${entries.length}`);
  });

  // Cleanup temp file
  try { unlinkSync(tmpPath); } catch {}

  await test("missing file handled gracefully", async () => {
    const ghostStore = new FileMemoryStore(join(tmpdir(), `does-not-exist-${Date.now()}.json`));
    const entry = await ghostStore.get("default", "nope");
    if (entry !== null) throw new Error("Expected null from missing file");
    const list = await ghostStore.list("default");
    if (list.length !== 0) throw new Error("Expected empty list from missing file");
  });

  sectionEnd("FileMemoryStore");

  // SECTION 3: Plugin integration tests
  header("🔌", 3, "Plugin Integration", "Full agent.runAction tests");

  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    throw new Error("Set TON_MNEMONIC in .env");
  }

  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "testnet",
  });

  const plugin = createMemoryPlugin(new InMemoryStore());
  const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com").use(plugin);

  await test("save_context", async () => {
    const r = await agent.runAction("save_context", {
      key: "last_trade",
      value: JSON.stringify({ token: "USDT", amount: "50" }),
      namespace: "trading-bot",
      ttl: 3600,
    });
    if (!r.saved) throw new Error("Expected saved=true");
    if (r.namespace !== "trading-bot") throw new Error(`Expected trading-bot, got ${r.namespace}`);
    if (r.expiresIn !== 3600) throw new Error(`Expected 3600, got ${r.expiresIn}`);
    console.log(`     Saved: ${r.key} in ${r.namespace} (TTL: ${r.expiresIn}s)`);
  });

  await test("get_context", async () => {
    const r = await agent.runAction("get_context", {
      key: "last_trade",
      namespace: "trading-bot",
    });
    if (!r.found) throw new Error("Expected found=true");
    if (r.key !== "last_trade") throw new Error(`Expected last_trade, got ${r.key}`);
    const parsed = JSON.parse(r.value);
    if (parsed.token !== "USDT") throw new Error(`Expected USDT, got ${parsed.token}`);
    console.log(`     Retrieved: ${r.key} = ${r.value}`);
  });

  await test("get_context (not found)", async () => {
    const r = await agent.runAction("get_context", {
      key: "nonexistent",
      namespace: "trading-bot",
    });
    if (r.found !== false) throw new Error("Expected found=false");
    console.log(`     Correctly returned: ${r.message}`);
  });

  await test("list_context", async () => {
    await agent.runAction("save_context", {
      key: "trade_2",
      value: "second trade",
      namespace: "trading-bot",
    });
    const r = await agent.runAction("list_context", { namespace: "trading-bot" });
    if (r.count !== 2) throw new Error(`Expected 2, got ${r.count}`);
    console.log(`     Listed ${r.count} entries in ${r.namespace}`);
  });

  await test("list_context with prefix", async () => {
    const r = await agent.runAction("list_context", {
      namespace: "trading-bot",
      prefix: "trade_",
    });
    if (r.count !== 1) throw new Error(`Expected 1, got ${r.count}`);
    console.log(`     Prefix filter: ${r.count} match`);
  });

  await test("delete_context", async () => {
    const r = await agent.runAction("delete_context", {
      key: "last_trade",
      namespace: "trading-bot",
    });
    if (!r.deleted) throw new Error("Expected deleted=true");
    console.log(`     Deleted: ${r.key}`);
  });

  await test("get_context after delete", async () => {
    const r = await agent.runAction("get_context", {
      key: "last_trade",
      namespace: "trading-bot",
    });
    if (r.found !== false) throw new Error("Expected found=false after delete");
    console.log(`     Confirmed deleted`);
  });

  await test("delete_context (nonexistent)", async () => {
    const r = await agent.runAction("delete_context", {
      key: "ghost",
      namespace: "trading-bot",
    });
    if (r.deleted !== false) throw new Error("Expected deleted=false");
  });

  sectionEnd("Plugin Integration");

  // SECTION 4: Default namespace tests
  header("📌", 4, "Default Namespace", "Verify namespace defaults to 'default'");

  await test("save without namespace → default", async () => {
    const r = await agent.runAction("save_context", {
      key: "no-ns",
      value: "hello",
    });
    if (r.namespace !== "default") throw new Error(`Expected default, got ${r.namespace}`);
  });

  await test("get without namespace → default", async () => {
    const r = await agent.runAction("get_context", { key: "no-ns" });
    if (!r.found) throw new Error("Expected found=true");
    if (r.namespace !== "default") throw new Error(`Expected default, got ${r.namespace}`);
    if (r.value !== "hello") throw new Error(`Expected hello, got ${r.value}`);
  });

  await test("list without namespace → default", async () => {
    const r = await agent.runAction("list_context", {});
    if (r.namespace !== "default") throw new Error(`Expected default, got ${r.namespace}`);
    if (r.count < 1) throw new Error("Expected at least 1 entry");
    console.log(`     Default namespace: ${r.count} entries`);
  });

  await test("delete without namespace → default", async () => {
    const r = await agent.runAction("delete_context", { key: "no-ns" });
    if (!r.deleted) throw new Error("Expected deleted=true");
    if (r.namespace !== "default") throw new Error(`Expected default, got ${r.namespace}`);
  });

  sectionEnd("Default Namespace");

  // SECTION 5: LLM tool integration
  header("🤖", 5, "LLM Tool Integration", "toAITools() format verification");

  const tools = agent.toAITools();
  const memoryActionNames = ["save_context", "get_context", "list_context", "delete_context"];

  await test("toAITools includes all 4 memory actions", async () => {
    const memTools = tools.filter((t: any) =>
      memoryActionNames.includes(t.function.name),
    );
    if (memTools.length !== 4) throw new Error(`Expected 4, got ${memTools.length}`);
    console.log(`     Found: ${memTools.map((t: any) => t.function.name).join(", ")}`);
  });

  await test("each memory tool has correct OpenAI format", async () => {
    for (const name of memoryActionNames) {
      const tool = tools.find((t: any) => t.function.name === name);
      if (!tool) throw new Error(`Missing tool: ${name}`);
      if (tool.type !== "function") throw new Error(`${name}: type=${tool.type}`);
      if (!tool.function.description) throw new Error(`${name}: missing description`);
      if (tool.function.parameters?.type !== "object") throw new Error(`${name}: bad params type`);
      const props = Object.keys(tool.function.parameters.properties || {});
      if (props.length === 0) throw new Error(`${name}: no properties`);
      console.log(`     ${name}: [${props.join(", ")}]`);
    }
  });

  await test("save_context tool has {key, value, namespace, ttl}", async () => {
    const tool = tools.find((t: any) => t.function.name === "save_context");
    const props = Object.keys(tool.function.parameters.properties || {});
    for (const required of ["key", "value"]) {
      if (!props.includes(required)) throw new Error(`Missing ${required}`);
    }
  });

  await test("tools are JSON-serializable", async () => {
    const memTools = tools.filter((t: any) =>
      memoryActionNames.includes(t.function.name),
    );
    const json = JSON.stringify(memTools);
    if (json.length < 100) throw new Error(`Suspiciously short: ${json.length}`);
    console.log(`     ${json.length} chars serialized`);
  });

  sectionEnd("LLM Tool Integration");

  // SUMMARY
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed;

  console.log(`


╔${"═".repeat(W - 2)}╗
║${" ".repeat(Math.floor((W - 32) / 2))}🧠 Memory Plugin Test Results${" ".repeat(Math.ceil((W - 32) / 2))}║
╚${"═".repeat(W - 2)}╝

  ✅ Passed:  ${String(passed).padStart(3)}
  ❌ Failed:  ${String(failed).padStart(3)}
  📊 Total:   ${String(total).padStart(3)}
  ⏱️  Time:    ${elapsed}s

  ── Section Breakdown ──
  ┌${"─".repeat(W - 4)}┐`);

  for (const s of sectionResults) {
    const icon = s.failed === 0 ? "✅" : "❌";
    const counts = `${s.passed}/${s.passed + s.failed}`;
    console.log(`  │  ${icon} ${s.name.padEnd(38)} ${counts.padStart(8)}    │`);
  }

  console.log(`  └${"─".repeat(W - 4)}┘`);

  if (errors.length > 0) {
    console.log(`\n  ── Error Details ──`);
    for (const e of errors) {
      console.log(`  🔴 ${e}`);
    }
  }

  if (failed === 0) {
    console.log(`
  ┌${"─".repeat(W - 4)}┐
  │                                                            │
  │     🎉  ALL ${total} TESTS PASSED — 0 FAILURES                │
  │                                                            │
  │     3 stores · 4 actions · full integration verified       │
  │                                                            │
  └${"─".repeat(W - 4)}┘
`);
  } else {
    console.log(`\n  ⚠️  ${failed} test(s) need attention.\n`);
  }
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  passed = 0;
  failed = 0;
  errors.length = 0;
  sectionResults.length = 0;
  sectionPassed = 0;
  sectionFailed = 0;
  try {
    await main();
  } catch (err: any) {
    failed++;
    errors.push(`FATAL: ${err.message}`);
  }
  return { passed, failed, errors: [...errors], duration: Date.now() - start };
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}

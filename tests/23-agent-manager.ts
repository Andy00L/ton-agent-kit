// tests/23-agent-manager.ts — Wrapped from test-agent-manager.ts
/**
 * Agent Lifecycle Manager Test Suite
 */
import { readFileSync } from "fs";
const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent.split("\n").find((l) => l.startsWith(key + "="))?.slice(key.length + 1).trim() || "";
process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");

import { TonAgentKit } from "../packages/core/src/agent";
import { KeypairWallet } from "../packages/core/src/wallet";
import TokenPlugin from "../packages/plugin-token/src/index";
import { AgentManager } from "../packages/orchestrator/src/agent-manager";

const W = 64;
let passed = 0, failed = 0;
const errors: string[] = [];
const sectionResults: { name: string; passed: number; failed: number }[] = [];
let sp = 0, sf = 0;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function header(num: number, title: string) {
  console.log(`\n${"=".repeat(W)}\n  SECTION ${num}: ${title}\n${"=".repeat(W)}`);
}
function sectionEnd(name: string) { sectionResults.push({ name, passed: sp, failed: sf }); sp = 0; sf = 0; }

async function test(name: string, fn: () => Promise<any>): Promise<any> {
  await delay(100);
  try { const r = await fn(); console.log(`  [PASS] ${name}`); passed++; sp++; return r; }
  catch (e: any) { console.log(`  [FAIL] ${name}\n     -> ${e.message?.slice(0, 120)}`); failed++; sf++; errors.push(`${name}: ${e.message?.slice(0, 100)}`); return null; }
}

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

async function main() {
  const startTime = Date.now();
  const mnemonic = getEnv("TON_MNEMONIC");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), { version: "V5R1", network: "testnet" });
  const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com", {}, "testnet").use(TokenPlugin);

  console.log(`\n${"=".repeat(W)}\n  Agent Lifecycle Manager Tests\n${"=".repeat(W)}`);

  // SECTION 1: Constructor & Deploy
  header(1, "Constructor & Deploy");

  await test("Constructor creates empty manager", async () => {
    const m = new AgentManager();
    if (m.summary().total !== 0) throw new Error("Not empty");
  });

  await test("Deploy adds agent with deployed state", async () => {
    const m = new AgentManager();
    m.deploy("a1", agent);
    if (m.status("a1").state !== "deployed") throw new Error("Wrong state");
  });

  await test("Deploy with full config", async () => {
    const m = new AgentManager();
    m.deploy("a2", agent, { autoRestart: true, maxRestarts: 5, maxRuntime: "1h", healthCheck: "5m", metadata: { x: 1 } });
    const s = m.status("a2");
    if (s.maxRestarts !== 5) throw new Error("maxRestarts wrong");
    if (s.metadata?.x !== 1) throw new Error("metadata wrong");
  });

  await test("Deploy duplicate throws", async () => {
    const m = new AgentManager();
    m.deploy("dup", agent);
    try { m.deploy("dup", agent); throw new Error("No throw"); } catch (e: any) { if (!e.message.includes("already")) throw e; }
  });

  await test("Deploy is chainable", async () => {
    const m = new AgentManager();
    if (m.deploy("c1", agent).deploy("c2", agent) !== m) throw new Error("Not chainable");
    if (m.summary().total !== 2) throw new Error("Count wrong");
  });

  sectionEnd("Constructor & Deploy");

  // SECTION 2: Start & Stop
  header(2, "Start & Stop");

  await test("Start sets running", async () => {
    const m = new AgentManager();
    m.deploy("s1", agent);
    await m.start("s1");
    if (m.status("s1").state !== "running") throw new Error("Not running");
    await m.stop("s1");
  });

  await test("Start already running throws", async () => {
    const m = new AgentManager();
    m.deploy("s2", agent);
    await m.start("s2");
    try { await m.start("s2"); throw new Error("No throw"); } catch (e: any) { if (!e.message.includes("already running")) throw e; }
    await m.stop("s2");
  });

  await test("Stop sets stopped", async () => {
    const m = new AgentManager();
    m.deploy("s3", agent);
    await m.start("s3");
    await m.stop("s3");
    if (m.status("s3").state !== "stopped") throw new Error("Not stopped");
  });

  await test("Stop records stoppedAt", async () => {
    const m = new AgentManager();
    m.deploy("s4", agent);
    await m.start("s4");
    await m.stop("s4");
    if (!m.status("s4").stoppedAt) throw new Error("No stoppedAt");
  });

  await test("Stop records startedAt", async () => {
    const m = new AgentManager();
    m.deploy("s5", agent);
    await m.start("s5");
    if (!m.status("s5").startedAt) throw new Error("No startedAt");
    await m.stop("s5");
  });

  sectionEnd("Start & Stop");

  // SECTION 3: Restart
  header(3, "Restart");

  await test("Restart increments counter", async () => {
    const m = new AgentManager();
    m.deploy("r1", agent);
    await m.start("r1");
    await m.restart("r1");
    if (m.status("r1").restarts !== 1) throw new Error("Count wrong");
    await m.stop("r1");
  });

  await test("Restart running agent", async () => {
    const m = new AgentManager();
    m.deploy("r2", agent);
    await m.start("r2");
    await m.restart("r2");
    if (m.status("r2").state !== "running") throw new Error("Not running after restart");
    await m.stop("r2");
  });

  await test("Restart stopped agent", async () => {
    const m = new AgentManager();
    m.deploy("r3", agent);
    await m.start("r3");
    await m.stop("r3");
    await m.restart("r3");
    if (m.status("r3").state !== "running") throw new Error("Not running");
    await m.stop("r3");
  });

  await test("Multiple restarts tracked", async () => {
    const m = new AgentManager();
    m.deploy("r4", agent);
    await m.start("r4");
    await m.restart("r4");
    await m.restart("r4");
    await m.restart("r4");
    if (m.status("r4").restarts !== 3) throw new Error(`Got ${m.status("r4").restarts}`);
    await m.stop("r4");
  });

  sectionEnd("Restart");

  // SECTION 4: List & Summary
  header(4, "List & Summary");

  await test("List returns all agents", async () => {
    const m = new AgentManager();
    m.deploy("l1", agent).deploy("l2", agent).deploy("l3", agent);
    if (m.list().length !== 3) throw new Error("Wrong count");
  });

  await test("List includes correct states", async () => {
    const m = new AgentManager();
    m.deploy("ls1", agent).deploy("ls2", agent);
    await m.start("ls1");
    const states = m.list().map(a => a.state);
    if (!states.includes("running") || !states.includes("deployed")) throw new Error(`States: ${states}`);
    await m.stopAll();
  });

  await test("Summary counts by state", async () => {
    const m = new AgentManager();
    m.deploy("sm1", agent).deploy("sm2", agent).deploy("sm3", agent);
    await m.start("sm1"); await m.start("sm2");
    const s = m.summary();
    if (s.running !== 2 || s.deployed !== 1) throw new Error(`${JSON.stringify(s)}`);
    await m.stopAll();
  });

  await test("Empty summary", async () => {
    const m = new AgentManager();
    const s = m.summary();
    if (s.total !== 0) throw new Error("Not empty");
  });

  sectionEnd("List & Summary");

  // SECTION 5: Max Runtime
  header(5, "Max Runtime");

  await test("Auto-stop after maxRuntime", async () => {
    const m = new AgentManager();
    m.deploy("mr1", agent, { maxRuntime: "2s" });
    await m.start("mr1");
    await delay(3000);
    if (m.status("mr1").state !== "stopped") throw new Error("Not stopped");
    console.log(`     Auto-stopped after 2s`);
  });

  await test("onMaxRuntime hook fires", async () => {
    let fired = false;
    const m = new AgentManager({ onMaxRuntime: () => { fired = true; } });
    m.deploy("mr2", agent, { maxRuntime: "1s" });
    await m.start("mr2");
    await delay(2000);
    if (!fired) throw new Error("Hook not fired");
  });

  sectionEnd("Max Runtime");

  // SECTION 6: Event Hooks
  header(6, "Event Hooks");

  await test("onDeploy fires", async () => {
    let id = "";
    const m = new AgentManager({ onDeploy: (i) => { id = i; } });
    m.deploy("h1", agent);
    if (id !== "h1") throw new Error("Not fired");
  });

  await test("onStart fires", async () => {
    let id = "";
    const m = new AgentManager({ onStart: (i) => { id = i; } });
    m.deploy("h2", agent);
    await m.start("h2");
    if (id !== "h2") throw new Error("Not fired");
    await m.stop("h2");
  });

  await test("onStop fires with reason", async () => {
    let reason = "";
    const m = new AgentManager({ onStop: (_, r) => { reason = r; } });
    m.deploy("h3", agent);
    await m.start("h3");
    await m.stop("h3", "test-reason");
    if (reason !== "test-reason") throw new Error(`Got: ${reason}`);
  });

  await test("onRestart fires with attempt", async () => {
    let attempt = 0;
    const m = new AgentManager({ onRestart: (_, a) => { attempt = a; } });
    m.deploy("h4", agent);
    await m.start("h4");
    await m.restart("h4");
    if (attempt !== 1) throw new Error(`Got: ${attempt}`);
    await m.stop("h4");
  });

  sectionEnd("Event Hooks");

  // SECTION 7: Edge Cases
  header(7, "Edge Cases");

  await test("Remove running agent auto-stops", async () => {
    const m = new AgentManager();
    m.deploy("ec1", agent);
    await m.start("ec1");
    await m.remove("ec1");
    if (m.summary().total !== 0) throw new Error("Not removed");
  });

  await test("StopAll stops everything", async () => {
    const m = new AgentManager();
    m.deploy("sa1", agent).deploy("sa2", agent).deploy("sa3", agent);
    await m.start("sa1"); await m.start("sa2"); await m.start("sa3");
    await m.stopAll("shutdown");
    if (m.summary().running !== 0) throw new Error("Still running");
  });

  await test("Status of deployed-only agent", async () => {
    const m = new AgentManager();
    m.deploy("do1", agent);
    const s = m.status("do1");
    if (s.uptime !== 0) throw new Error("Uptime should be 0");
    if (s.startedAt !== null) throw new Error("Should not be started");
  });

  await test("getAgent returns underlying instance", async () => {
    const m = new AgentManager();
    m.deploy("ga1", agent);
    if (m.getAgent("ga1") !== agent) throw new Error("Wrong instance");
  });

  sectionEnd("Edge Cases");

  // SECTION 8: Integration with Real Agent
  header(8, "Real Agent Integration");

  await test("Health check with real get_balance", async () => {
    let healthy = false;
    const m = new AgentManager({ onHealthCheck: (_, h) => { healthy = h; } });
    m.deploy("real1", agent, { healthCheck: "1s", healthAction: "get_balance" });
    await m.start("real1");
    await delay(2500);
    const s = m.status("real1");
    if (s.healthStatus !== "healthy") throw new Error(`Status: ${s.healthStatus}`);
    if (!s.lastHealthCheck) throw new Error("No health check recorded");
    if (s.lastAction !== "get_balance") throw new Error(`Last action: ${s.lastAction}`);
    console.log(`     Health: ${s.healthStatus} | Last: ${s.lastAction}`);
    await m.stop("real1");
  });

  await test("Uptime increases", async () => {
    const m = new AgentManager();
    m.deploy("real2", agent);
    await m.start("real2");
    await delay(1500);
    const u1 = m.status("real2").uptime;
    await delay(1000);
    const u2 = m.status("real2").uptime;
    if (u2 <= u1) throw new Error(`u2=${u2} should be > u1=${u1}`);
    console.log(`     ${m.status("real2").uptimeFormatted}`);
    await m.stop("real2");
  });

  await test("formatDuration", async () => {
    const m = new AgentManager();
    m.deploy("fmt", agent);
    await m.start("fmt");
    await delay(2500);
    const s = m.status("fmt");
    if (!s.uptimeFormatted.includes("s")) throw new Error(`Bad format: ${s.uptimeFormatted}`);
    console.log(`     ${s.uptimeFormatted}`);
    await m.stop("fmt");
  });

  sectionEnd("Real Agent Integration");

  // SUMMARY
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const total = passed + failed;
  console.log(`\n\n${"=".repeat(W)}\n  Agent Manager Results\n${"=".repeat(W)}`);
  console.log(`\n  Passed:  ${passed}\n  Failed:  ${failed}\n  Total:   ${total}\n  Time:    ${elapsed}s\n`);
  for (const s of sectionResults) {
    const icon = s.failed === 0 ? "OK" : "FAIL";
    console.log(`  [${icon}] ${s.name.padEnd(30)} ${s.passed}/${s.passed + s.failed}`);
  }
  if (errors.length > 0) { console.log("\n  Errors:"); for (const e of errors) console.log(`  - ${e}`); }
  if (failed === 0) console.log(`\n  ALL ${total} TESTS PASSED\n`);
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  passed = 0;
  failed = 0;
  errors.length = 0;
  sectionResults.length = 0;
  sp = 0;
  sf = 0;
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

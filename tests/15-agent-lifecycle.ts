// tests/15-agent-lifecycle.ts — Section 14: Agent Lifecycle Manager
import { createTestnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  const { AgentManager } = require("../packages/orchestrator/src/index");

  await test("AgentManager constructor", async () => {
    const m = new AgentManager();
    if (m.summary().total !== 0) throw new Error("Should start empty");
  });

  await test("Deploy agent", async () => {
    const m = new AgentManager();
    m.deploy("t1", agent, { autoRestart: true, maxRestarts: 3, metadata: { role: "tester" } });
    const s = m.status("t1");
    if (s.state !== "deployed") throw new Error(`Got ${s.state}`);
    console.log(`     State: ${s.state}`);
  });

  await test("Deploy duplicate → error", async () => {
    const m = new AgentManager();
    m.deploy("dup", agent);
    try { m.deploy("dup", agent); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("already")) throw e; }
  });

  await test("Start + stop", async () => {
    const m = new AgentManager();
    m.deploy("ss", agent);
    await m.start("ss");
    if (m.status("ss").state !== "running") throw new Error("Not running");
    await m.stop("ss");
    if (m.status("ss").state !== "stopped") throw new Error("Not stopped");
    console.log(`     Start→Running→Stop→Stopped`);
  });

  await test("Restart increments counter", async () => {
    const m = new AgentManager();
    m.deploy("rs", agent);
    await m.start("rs");
    await m.restart("rs");
    if (m.status("rs").restarts !== 1) throw new Error("Restarts should be 1");
    await m.stop("rs");
  });

  await test("List + summary", async () => {
    const m = new AgentManager();
    m.deploy("l1", agent); m.deploy("l2", agent);
    await m.start("l1");
    const s = m.summary();
    if (s.total !== 2 || s.running !== 1 || s.deployed !== 1) throw new Error(`Bad: ${JSON.stringify(s)}`);
    console.log(`     Total: ${s.total} | Running: ${s.running} | Deployed: ${s.deployed}`);
    await m.stopAll();
  });

  await test("StopAll", async () => {
    const m = new AgentManager();
    m.deploy("sa1", agent); m.deploy("sa2", agent);
    await m.start("sa1"); await m.start("sa2");
    await m.stopAll();
    if (m.summary().running !== 0) throw new Error("All should be stopped");
  });

  await test("Remove agent", async () => {
    const m = new AgentManager();
    m.deploy("rem", agent);
    await m.remove("rem");
    try { m.status("rem"); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("not found")) throw e; }
  });

  await test("Uptime tracking", async () => {
    const m = new AgentManager();
    m.deploy("ut", agent);
    await m.start("ut");
    await new Promise(r => setTimeout(r, 1500));
    const s = m.status("ut");
    if (s.uptime < 1000) throw new Error(`Too low: ${s.uptime}ms`);
    console.log(`     Uptime: ${s.uptimeFormatted}`);
    await m.stop("ut");
  });

  await test("Event hooks fire", async () => {
    let d = false, st = false, sp = false;
    const m = new AgentManager({ onDeploy: () => { d = true; }, onStart: () => { st = true; }, onStop: () => { sp = true; } });
    m.deploy("hk", agent);
    await m.start("hk");
    await m.stop("hk");
    if (!d || !st || !sp) throw new Error(`Hooks: d=${d} st=${st} sp=${sp}`);
  });

  await test("Max runtime auto-stop", async () => {
    const m = new AgentManager();
    m.deploy("mr", agent, { maxRuntime: "2s" });
    await m.start("mr");
    await new Promise(r => setTimeout(r, 3000));
    if (m.status("mr").state !== "stopped") throw new Error("Should auto-stop");
    console.log(`     Auto-stopped after maxRuntime`);
  });

  await test("getAgent returns instance", async () => {
    const m = new AgentManager();
    m.deploy("ga", agent);
    if (typeof m.getAgent("ga").runAction !== "function") throw new Error("Not a TonAgentKit");
  });

  await test("Nonexistent → error", async () => {
    const m = new AgentManager();
    try { m.status("nope"); throw new Error("Should throw"); } catch (e: any) { if (!e.message.includes("not found")) throw e; }
  });

  await test("Metadata preserved", async () => {
    const m = new AgentManager();
    m.deploy("md", agent, { metadata: { role: "trader" } });
    if (m.status("md").metadata?.role !== "trader") throw new Error("Metadata lost");
  });

  await test("Deploy chainable", async () => {
    const m = new AgentManager();
    const r = m.deploy("c1", agent).deploy("c2", agent);
    if (r !== m) throw new Error("Not chainable");
    if (m.summary().total !== 2) throw new Error("Should have 2");
  });

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}

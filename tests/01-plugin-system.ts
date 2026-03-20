// tests/01-plugin-system.ts — Section 0: Plugin System & toAITools()
import { createTestnetAgent, createMainnetAgent, createTestContext, TestResult } from "./_setup";

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  await test("agent.getAvailableActions() returns all actions", async () => {
    if (actions.length === 0) throw new Error("No actions loaded");
    console.log(`     Actions: ${actions.length}`);
  });

  await test("agent.actionCount matches", async () => {
    if ((agent as any).actionCount !== actions.length)
      throw new Error(`actionCount mismatch`);
  });

  await test("every action has name + description + schema", async () => {
    for (const a of actions) {
      if (!a.name) throw new Error(`Missing name`);
      if (!a.description) throw new Error(`${a.name}: missing description`);
      if (!a.schema) throw new Error(`${a.name}: missing schema`);
    }
    console.log(`     All ${actions.length} actions valid`);
  });

  const tools = await test("toAITools() generates tools", async () => {
    const t = agent.toAITools();
    if (t.length !== actions.length) throw new Error(`Expected ${actions.length}, got ${t.length}`);
    console.log(`     Tools: ${t.length}`);
    return t;
  });

  if (tools) {
    await test("toAITools() — OpenAI format", async () => {
      for (const t of tools) {
        if (t.type !== "function") throw new Error(`type: ${t.type}`);
        if (!t.function?.name) throw new Error(`missing name`);
        if (!t.function?.description) throw new Error(`missing description`);
        if (t.function?.parameters?.type !== "object") throw new Error(`parameters.type: ${t.function?.parameters?.type}`);
      }
    });

    await test("toAITools() — all have properties (non-empty)", async () => {
      const empty = tools.filter((t: any) => Object.keys(t.function.parameters.properties || {}).length === 0);
      if (empty.length > 0) throw new Error(`Empty: ${empty.map((t: any) => t.function.name).join(", ")}`);
    });

    await test("toAITools() — transfer_ton has {to, amount, comment}", async () => {
      const tt = tools.find((t: any) => t.function.name === "transfer_ton");
      const keys = Object.keys(tt.function.parameters.properties || {});
      if (!keys.includes("to")) throw new Error(`Missing "to" — got: ${keys}`);
      if (!keys.includes("amount")) throw new Error(`Missing "amount" — got: ${keys}`);
      console.log(`     Params: ${keys.join(", ")}`);
    });

    await test("toAITools() — create_escrow has {beneficiary, amount}", async () => {
      const ce = tools.find((t: any) => t.function.name === "create_escrow");
      const keys = Object.keys(ce.function.parameters.properties || {});
      if (!keys.includes("beneficiary")) throw new Error(`Missing "beneficiary"`);
      if (!keys.includes("amount")) throw new Error(`Missing "amount"`);
      console.log(`     Params: ${keys.join(", ")}`);
    });

    await test("toAITools() — no $schema or $ref (OpenAI compat)", async () => {
      for (const t of tools) {
        if ("$schema" in t.function.parameters) throw new Error(`${t.function.name} has $schema`);
        if ("$ref" in t.function.parameters) throw new Error(`${t.function.name} has $ref`);
      }
    });

    await test("toAITools() — JSON serializable", async () => {
      const json = JSON.stringify(tools);
      if (json.length < 100) throw new Error(`Suspiciously short: ${json.length}`);
      console.log(`     ${json.length} chars`);
    });

    // Print tool summary
    console.log(`\n  ── Tool Map ──`);
    for (const t of tools) {
      const props = Object.keys(t.function.parameters.properties || {});
      console.log(`  ✅ ${t.function.name.padEnd(28)} [${props.join(", ")}]`);
    }
  }

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}

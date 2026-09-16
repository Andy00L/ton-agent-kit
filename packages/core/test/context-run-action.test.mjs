// Regression checks for AgentContext.runAction. Thirteen call sites across
// plugin-escrow, plugin-identity and plugin-payments reached for it through
// `(agent as any).runAction(...)`. The context never carried it, so every call
// was a TypeError swallowed by an empty catch: delivery proofs were never
// stored, escrow ratings were never queued, and get_delivery_proof always
// answered { found: false }. The cast is what hid it from the compiler.
//
// Runs under Bun because packages/core/src imports siblings without a file
// extension, which Node's ES resolver refuses.
//
//   bun packages/core/test/context-run-action.test.mjs

import assert from "node:assert/strict";
import { z } from "zod";
import { defineAction, definePlugin, ReadOnlyWallet, TonAgentKit } from "../src/index.ts";

/** A funded testnet contract, used here only as a well-formed address. */
const SOME_ADDRESS = "0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9";

let failures = 0;
let total = 0;
async function check(name, run) {
  total++;
  try {
    await run();
    console.log(`  pass  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

// A two-action plugin: one stores a value, the other reaches it through the
// context exactly as the shipped plugins do.
const storedValues = new Map();

const rememberAction = defineAction({
  name: "remember_value",
  description: "Store a value under a key.",
  schema: z.object({ key: z.string(), value: z.string() }),
  handler: async (_agent, params) => {
    storedValues.set(params.key, params.value);
    return { stored: true, key: params.key };
  },
});

const recallThroughContextAction = defineAction({
  name: "recall_through_context",
  description: "Read a value back by calling another action through the context.",
  schema: z.object({ key: z.string() }),
  handler: async (agent, params) => {
    if (typeof agent.runAction !== "function") {
      return { reachable: false, value: null };
    }
    const stored = await agent.runAction("read_value", { key: params.key });
    return { reachable: true, value: stored.value };
  },
});

const readAction = defineAction({
  name: "read_value",
  description: "Read a stored value.",
  schema: z.object({ key: z.string() }),
  handler: async (_agent, params) => ({ value: storedValues.get(params.key) ?? null }),
});

const testPlugin = definePlugin({
  name: "context-bridge-test",
  actions: [rememberAction, recallThroughContextAction, readAction],
});

const buildAgent = () =>
  new TonAgentKit(new ReadOnlyWallet(SOME_ADDRESS)).use(testPlugin);

console.log("AgentContext.runAction");

await check("a handler can reach another action through the context", async () => {
  const agent = buildAgent();
  await agent.runAction("remember_value", { key: "proof", value: "delivered" });
  const recalled = await agent.runAction("recall_through_context", { key: "proof" });

  // Before the fix this answered { reachable: false }, because the context
  // carried no runAction at all.
  assert.equal(recalled.reachable, true, "the context did not carry runAction");
  assert.equal(recalled.value, "delivered");
});

await check("an unknown action name rejects rather than failing silently", async () => {
  const agent = buildAgent();
  await assert.rejects(() => agent.runAction("no_such_action", {}), /no_such_action/);
});

await check("the shipped plugins no longer cast the context", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const packagesDir = fileURLToPath(new URL("../../", import.meta.url));
  const callSites = [
    "plugin-escrow/src/actions/auto-release-escrow.ts",
    "plugin-escrow/src/actions/refund-escrow.ts",
    "plugin-escrow/src/actions/release-escrow.ts",
    "plugin-identity/src/actions/process-pending-ratings.ts",
    "plugin-payments/src/index.ts",
  ];
  for (const relativePath of callSites) {
    const source = readFileSync(packagesDir + relativePath, "utf8");
    assert.ok(
      !source.includes("as any).runAction"),
      `${relativePath} still casts the context to reach runAction`,
    );
    assert.ok(
      source.includes("agent.runAction?."),
      `${relativePath} no longer calls runAction through the context`,
    );
  }
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

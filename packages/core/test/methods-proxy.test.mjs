// Regression checks for `agent.methods`. The proxy's get trap answered a
// function for every key, including `then`, which made the proxy a thenable.
// Awaiting it, or returning it from an async function, called the trap with
// (resolve, reject): runAction("then", resolve) rejected and called neither
// callback, so it surfaced as an unhandled rejection that ends the process
// rather than an error a caller can catch.
//
// Runs under Bun because packages/core/src imports siblings without a file
// extension, which Node's ES resolver refuses.
//
//   bun packages/core/test/methods-proxy.test.mjs

import assert from "node:assert/strict";
import { ReadOnlyWallet, TonAgentKit } from "../src/index.ts";

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

const buildAgent = () => new TonAgentKit(new ReadOnlyWallet(SOME_ADDRESS));

console.log("agent.methods proxy");

await check("the proxy is not a thenable", () => {
  const agent = buildAgent();
  assert.equal(typeof agent.methods.then, "undefined");
  assert.equal(typeof agent.methods.catch, "function", "catch is a plausible action name, so it stays");
});

await check("awaiting the proxy does not take the process down", async () => {
  const agent = buildAgent();
  // Before the fix this never settled and left an unhandled rejection behind.
  const awaited = await agent.methods;
  assert.ok(awaited);
});

await check("returning the proxy from an async function is safe", async () => {
  const agent = buildAgent();
  const handOut = async () => agent.methods;
  assert.ok(await handOut());
});

await check("symbols do not become action names", () => {
  const agent = buildAgent();
  assert.equal(agent.methods[Symbol.iterator], undefined);
  assert.equal(agent.methods[Symbol.toPrimitive], undefined);
  assert.doesNotThrow(() => String(Object.keys(agent.methods)));
});

await check("an unknown action still rejects with a catchable error", async () => {
  const agent = buildAgent();
  await assert.rejects(
    () => agent.methods.no_such_action({}),
    /no_such_action/,
  );
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

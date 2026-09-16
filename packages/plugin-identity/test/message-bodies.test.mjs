// Regression checks for the message bodies this plugin sends to the Reputation
// contract. Before the 2026-09-16 audit the bodies were built from opcode
// constants copied by hand into reputation-helpers.ts, and the one for Rate had
// drifted: it carried 2804297358 while the contract answers to 1335410632, so
// every on-chain rating reached a receiver that does not exist.
//
// The bodies are now built with the generated storeX serializers. These checks
// re-parse each body with the matching generated loadX, which is the same code
// path the contract compiles from, so a future drift fails here instead of
// on chain.
//
//   node --experimental-strip-types packages/plugin-identity/test/message-bodies.test.mjs

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { beginCell } from "@ton/core";
import {
  storeRate,
  loadRate,
  storeRegister,
  loadRegister,
  storeWithdraw,
  loadWithdraw,
} from "../src/contracts/Reputation_Reputation.ts";

// The opcode the deployed contract answers to for a Rate message, read from the
// ABI header map of the generated bindings.
// sourceRef: packages/plugin-identity/src/contracts/Reputation_Reputation.ts
const RATE_OPCODE = 1335410632;

let failures = 0;
let total = 0;
function check(name, run) {
  total++;
  try {
    run();
    console.log(`  pass  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  }
}

console.log("plugin-identity message bodies");

check("a Rate body carries the opcode the contract answers to", () => {
  const body = beginCell()
    .store(
      storeRate({
        $$type: "Rate",
        agentName: "price-oracle",
        success: true,
        dealIndex: 7n,
      }),
    )
    .endCell();
  assert.equal(body.beginParse().loadUint(32), RATE_OPCODE);
});

check("a Rate body round-trips through the contract's own parser", () => {
  const body = beginCell()
    .store(
      storeRate({
        $$type: "Rate",
        agentName: "price-oracle",
        success: false,
        dealIndex: 42n,
      }),
    )
    .endCell();
  const parsed = loadRate(body.beginParse());
  assert.equal(parsed.agentName, "price-oracle");
  assert.equal(parsed.success, false);
  assert.equal(parsed.dealIndex, 42n);
});

check("a Register body round-trips", () => {
  const body = beginCell()
    .store(
      storeRegister({
        $$type: "Register",
        name: "market-data",
        capabilities: "price_feed,analytics",
        available: true,
      }),
    )
    .endCell();
  const parsed = loadRegister(body.beginParse());
  assert.equal(parsed.name, "market-data");
  assert.equal(parsed.capabilities, "price_feed,analytics");
  assert.equal(parsed.available, true);
});

check("a Withdraw body round-trips", () => {
  const body = beginCell().store(storeWithdraw({ $$type: "Withdraw" })).endCell();
  assert.equal(loadWithdraw(body.beginParse()).$$type, "Withdraw");
});

check("no source file rebuilds a contract opcode by hand", () => {
  // Drift is only possible when an opcode is written out somewhere other than
  // the generated bindings, either as a literal in the builder call or as a
  // named constant beside it. Both forms shipped here. Every body must come
  // from the generated serializers instead.
  const HAND_WRITTEN_OPCODE = /storeUint\(\s*\d{9,10}\s*,\s*32\s*\)|(?:const|let)\s+OP_[A-Z0-9_]+\s*=\s*\d{9,10}/g;
  const sources = [
    "src/reputation-helpers.ts",
    "src/actions/register-agent.ts",
    "src/actions/get-agent-reputation.ts",
    "src/actions/withdraw-reputation-fees.ts",
    "src/actions/trigger-cleanup.ts",
  ];
  for (const relativePath of sources) {
    const text = readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
    const handWritten = text.match(HAND_WRITTEN_OPCODE) ?? [];
    assert.deepEqual(
      handWritten,
      [],
      `${relativePath} builds an opcode by hand: ${handWritten.join(", ")}`,
    );
  }
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

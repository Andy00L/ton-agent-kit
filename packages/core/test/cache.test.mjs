// Regression checks for the action cache. Both properties failed before the
// 2026-09-16 audit, and both decide whether a caller gets its own result.
//
//   node --experimental-strip-types packages/core/test/cache.test.mjs

import assert from "node:assert/strict";
import { ActionCache } from "../src/cache.ts";

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

// The key used JSON.stringify's replacer-array form, which flattens every
// nested object to {}, so two different requests shared one entry.
check("params differing only inside a nested object get different entries", () => {
  const cache = new ActionCache();
  cache.set("get_price", { token: "TON", filters: { currency: "usd" } }, { price: "3.42" });
  const eur = cache.get("get_price", { token: "TON", filters: { currency: "eur" } });
  assert.equal(eur, null, "a different nested value must miss");
  const usd = cache.get("get_price", { token: "TON", filters: { currency: "usd" } });
  assert.deepEqual(usd, { price: "3.42" }, "the original must still hit");
});

check("key order does not change the entry", () => {
  const cache = new ActionCache();
  cache.set("get_price", { token: "TON", currency: "usd" }, { price: "3.42" });
  assert.deepEqual(cache.get("get_price", { currency: "usd", token: "TON" }), { price: "3.42" });
});

// Cacheability is an allowlist now. It used to be a denylist, so anything the
// list had not been taught was cached, including actions that mutate.
check("an action with no TTL is not cacheable", () => {
  const cache = new ActionCache();
  assert.equal(cache.isCacheable("delete_context"), false);
  assert.equal(cache.isCacheable("close_x402_endpoint"), false);
  assert.equal(cache.isCacheable("some_third_party_action"), false);
});

check("a read action with a TTL is cacheable", () => {
  const cache = new ActionCache();
  assert.equal(cache.isCacheable("get_balance"), true);
  assert.equal(cache.isCacheable("resolve_domain"), true);
});

// get_agent_reputation sends an on-chain Rate message when addTask is set, so
// a cached second call silently drops a rating.
check("get_agent_reputation is not cacheable", () => {
  const cache = new ActionCache();
  assert.equal(cache.isCacheable("get_agent_reputation"), false);
});

check("fund-moving actions stay uncacheable", () => {
  const cache = new ActionCache();
  for (const name of ["transfer_ton", "swap_best_price", "release_escrow", "stake_ton"]) {
    assert.equal(cache.isCacheable(name), false, name);
  }
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

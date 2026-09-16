// Regression checks for the two properties the paywall's safety rests on.
// Both failed before the 2026-09-16 audit, and both are cheap to break again.
//
//   node --experimental-strip-types packages/x402-middleware/test/verification.test.mjs
//
// No network, no framework, no test runner. Node and the source are enough.

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import {
  FileReplayStore,
  MemoryReplayStore,
  minimumAcceptableNanoton,
} from "../src/index.ts";

const NANOTONS_PER_TON = 1e9;
const checks = [];
function check(name, run) {
  checks.push({ name, run });
}

// A flat fee waiver larger than the price pushed the acceptance floor below
// zero, so a transfer of 0 TON cleared any endpoint priced under 0.005 TON.
// The middleware's own documented example charges 0.001 TON.
check("a zero-value payment never satisfies a price", async () => {
  for (const price of ["0.0001", "0.001", "0.005", "0.01", "0.5", "10"]) {
    const expected = Math.round(parseFloat(price) * NANOTONS_PER_TON);
    assert.ok(
      minimumAcceptableNanoton(expected) > 0,
      `floor must stay positive at ${price} TON`,
    );
    assert.ok(
      0 < minimumAcceptableNanoton(expected),
      `0 nanoton must not satisfy ${price} TON`,
    );
  }
});

// The waiver still has to cover a real forward fee, or honest payers are
// rejected. TON deducts roughly 0.0005 to 0.001 TON.
check("a payment short by one forward fee is still accepted", async () => {
  const price = Math.round(0.05 * NANOTONS_PER_TON);
  const paid = price - 1_000_000;
  assert.ok(paid >= minimumAcceptableNanoton(price));
});

// has() followed by add() let every concurrent request carrying the same
// payment through. claim() is one atomic step, so exactly one is served.
check("concurrent claims on one hash produce exactly one winner", async () => {
  for (const store of [new MemoryReplayStore(), new FileReplayStore(".x402-test-store.json")]) {
    const results = await Promise.all(
      Array.from({ length: 50 }, () => store.claim("0xdeadbeef")),
    );
    assert.equal(results.filter(Boolean).length, 1);
  }
  await rm(".x402-test-store.json", { force: true });
});

// A store that cannot persist must say so. Serving a resource for a payment
// that was not recorded makes that payment replayable after a restart.
check("add() rejects when it cannot persist", async () => {
  const store = new FileReplayStore("./no/such/directory/store.json");
  await assert.rejects(() => store.add("0xfeed"));
});

let failed = 0;
for (const { name, run } of checks) {
  try {
    await run();
    console.log(`  pass  ${name}`);
  } catch (error) {
    failed++;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error.message}`);
  }
}
console.log(`\n${checks.length - failed}/${checks.length} passed`);
process.exit(failed === 0 ? 0 : 1);

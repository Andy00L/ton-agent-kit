// Regression checks for the two properties the paywall's safety rests on.
// Both failed before the 2026-09-16 audit, and both are cheap to break again.
//
//   node --experimental-strip-types packages/x402-middleware/test/verification.test.mjs
//
// No network, no framework, no test runner. Node and the source are enough.

import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import {
  createPaymentServer,
  defaultReplayStore,
  FileReplayStore,
  MemoryReplayStore,
  minimumAcceptableNanoton,
  tonPaywall,
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

// A payment whose hash cleared verification was cached for proofTTL seconds so
// a client that lost the response could retry. Nothing counted the uses, so one
// 0.001 TON payment served every request carrying its hash for five minutes.
check("one verified payment serves a bounded number of responses", async () => {
  const RECIPIENT = "0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9";
  const PAYMENT_HASH = "a".repeat(64);
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      utime: Math.floor(Date.now() / 1000),
      out_msgs: [
        {
          value: String(Math.round(0.001 * NANOTONS_PER_TON)),
          destination: { address: RECIPIENT },
        },
      ],
    }),
  });

  try {
    const paywall = tonPaywall({
      amount: "0.001",
      recipient: RECIPIENT,
      replayStore: new MemoryReplayStore(),
    });

    let served = 0;
    const statuses = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      await new Promise((resolve) => {
        const request = { headers: { "x-payment-hash": PAYMENT_HASH } };
        const response = {
          status(code) {
            statuses.push(code);
            return this;
          },
          json() {
            resolve();
          },
          setHeader() {},
        };
        paywall(request, response, () => {
          served++;
          resolve();
        });
      });
    }

    assert.equal(served, 3, `one payment served ${served} responses`);
    assert.deepEqual(statuses, [402, 402, 402]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// The default store was `new FileReplayStore()` as a destructuring default, so
// it was built once per tonPaywall() call. A server with four paid routes had
// four stores over one file, each with its own in-memory set, and every write
// erased the other three.
check("the default replay store is one instance per file path", async () => {
  assert.equal(defaultReplayStore(), defaultReplayStore());
  assert.notEqual(defaultReplayStore(".a.json"), defaultReplayStore(".b.json"));
});

check("two independent stores over one file erase each other", async () => {
  const path = ".x402-erase-check.json";
  await rm(path, { force: true });
  try {
    const routeA = new FileReplayStore(path);
    const routeB = new FileReplayStore(path);
    await routeA.add("hash-paid-on-route-a");
    await routeB.add("hash-paid-on-route-b");

    // routeB wrote its own set over the file, so a restart forgets route A's
    // payment and it becomes replayable. This is the mechanism the shared
    // default store above exists to prevent.
    const afterRestart = new FileReplayStore(path);
    assert.equal(await afterRestart.has("hash-paid-on-route-a"), false);
    assert.equal(await afterRestart.has("hash-paid-on-route-b"), true);
  } finally {
    await rm(path, { force: true });
  }
});

// createPaymentServer reached for require() inside a module Node parses as ESM,
// where require is undefined, so every call threw ReferenceError.
check("createPaymentServer builds an app instead of throwing on require", async () => {
  const app = createPaymentServer({
    recipient: "0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9",
    replayStore: new MemoryReplayStore(),
    routes: [
      {
        path: "/api/price",
        amount: "0.001",
        handler: (_request, response) => response.json({ price: 1 }),
      },
    ],
  });
  assert.equal(typeof app.listen, "function");
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

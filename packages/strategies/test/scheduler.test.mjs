// Regression checks for strategy scheduling. Until the 2026-09-16 audit this
// package had no tsconfig and no build script, so `npm run build --workspaces
// --if-present` skipped all 1125 lines and none of this was ever checked.
//
//   node --experimental-strip-types packages/strategies/test/scheduler.test.mjs

import assert from "node:assert/strict";
import { parseSchedule, StrategyScheduler } from "../src/scheduler.ts";
import { readNumber } from "../src/step-results.ts";

/** 2^31-1, the longest delay Node's timers accept. */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

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

console.log("strategy scheduling");

await check("a schedule past the 32-bit timer limit is refused, not silently 1 ms", () => {
  // 30 days is 2,592,000,000 ms. Node cannot hold that in a 32-bit signed
  // field, so it substituted 1 ms: a monthly DCA fired about 100 times a
  // second. Measured at 28 ticks in 402 ms before this check existed.
  assert.ok(30 * 24 * 60 * 60 * 1000 > MAX_TIMER_DELAY_MS);
  assert.throws(() => parseSchedule("every 30d"), /past the .* ms Node timers accept/);
  assert.throws(() => parseSchedule("every 25d"), /Node timers accept/);
});

await check("the largest schedule Node can actually hold is still accepted", () => {
  const interval = parseSchedule("every 24d");
  assert.equal(interval, 24 * 24 * 60 * 60 * 1000);
  assert.ok(interval <= MAX_TIMER_DELAY_MS);
});

await check("a zero interval is refused", () => {
  for (const schedule of ["every 0s", "every 0ms", "every 0d"]) {
    assert.throws(() => parseSchedule(schedule), /zero/, schedule);
  }
});

await check("the ordinary schedules are unchanged", () => {
  assert.equal(parseSchedule("once"), null);
  assert.equal(parseSchedule("every 500ms"), 500);
  assert.equal(parseSchedule("every 30s"), 30_000);
  assert.equal(parseSchedule("every 5m"), 300_000);
  assert.equal(parseSchedule("every 1h"), 3_600_000);
  assert.equal(parseSchedule("every 1d"), 86_400_000);
  assert.throws(() => parseSchedule("daily"), /Invalid schedule/);
});

await check("a tick that outruns its interval does not start again on top of itself", async () => {
  const scheduler = new StrategyScheduler();
  let started = 0;
  let concurrent = 0;
  let maxConcurrent = 0;

  scheduler.start("slow", 10, async () => {
    started++;
    concurrent++;
    maxConcurrent = Math.max(maxConcurrent, concurrent);
    await new Promise((resolve) => setTimeout(resolve, 60));
    concurrent--;
  });

  await new Promise((resolve) => setTimeout(resolve, 260));
  scheduler.stop("slow");

  // Ticks fire every 10 ms while each run takes 60 ms, so without the guard
  // several runs of one strategy would share its context at the same time.
  assert.equal(maxConcurrent, 1, `${maxConcurrent} runs overlapped`);
  assert.ok(started >= 2, `expected the schedule to fire more than once, got ${started}`);
});

await check("stop() clears the interval", async () => {
  const scheduler = new StrategyScheduler();
  let ticks = 0;
  scheduler.start("counter", 10, () => {
    ticks++;
  });
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(scheduler.stop("counter"), true);
  const afterStop = ticks;
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(ticks, afterStop);
  assert.equal(scheduler.stop("counter"), false);
});

console.log("\nstep results");

await check("readNumber takes the value, the named field, or a numeric string", () => {
  assert.equal(readNumber(5, "price"), 5);
  assert.equal(readNumber({ price: 2.5 }, "price"), 2.5);
  assert.equal(readNumber({ price: "2.5" }, "price"), 2.5);
  assert.equal(readNumber("7", "price"), 7);
});

await check("readNumber answers null rather than guessing", () => {
  for (const value of [null, undefined, {}, { price: null }, { price: "abc" }, [], "", "  ", Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(readNumber(value, "price"), null, JSON.stringify(value) ?? String(value));
  }
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

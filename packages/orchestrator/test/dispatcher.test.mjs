// Regression checks for task dispatch. Before the 2026-09-16 audit a task
// naming an agent that is not registered made executeTask reject, and the
// parallel branch turned every rejection into taskId "unknown". Nothing then
// removed the real id from the pending set, so the while loop re-selected the
// same tasks forever with no await between iterations. Measured at 148 s of CPU
// and 1.15 GB of memory before it was killed by hand.
//
//   node --experimental-strip-types packages/orchestrator/test/dispatcher.test.mjs

import assert from "node:assert/strict";
import { Dispatcher } from "../src/dispatcher.ts";
import { EventBus } from "../src/events.ts";

/** Longest a dispatch of three trivial tasks may take before it counts as hung. */
const HANG_THRESHOLD_MS = 5000;

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

const silentEvents = () => new EventBus({ verbose: false });

/** An agent whose runAction answers with whatever it was given. */
const echoAgent = {
  getAvailableActions: () => [{ name: "echo", schema: undefined }],
  runAction: async (action, params) => ({ action, params }),
};

console.log("task dispatch");

await check("a task naming a missing agent finishes instead of spinning", async () => {
  const dispatcher = new Dispatcher({ parallel: true, maxRetries: 0 }, silentEvents());
  const tasks = [
    { id: "a", agent: "ghost", action: "echo", params: {} },
    { id: "b", agent: "ghost", action: "echo", params: {} },
  ];

  const started = Date.now();
  const results = await Promise.race([
    dispatcher.dispatch(tasks, new Map()),
    new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error("dispatch did not return")), HANG_THRESHOLD_MS),
    ),
  ]);
  assert.ok(Date.now() - started < HANG_THRESHOLD_MS);

  assert.equal(results.length, 2, `expected one result per task, got ${results.length}`);
  assert.deepEqual(
    results.map((result) => result.taskId).sort(),
    ["a", "b"],
    "every result must carry the id of the task it came from",
  );
  for (const result of results) {
    assert.match(result.error, /not found/);
  }
});

await check("the sequential branch reports the same failure the parallel one does", async () => {
  const dispatcher = new Dispatcher({ parallel: false, maxRetries: 0 }, silentEvents());
  const results = await dispatcher.dispatch(
    [{ id: "only", agent: "ghost", action: "echo", params: {} }],
    new Map(),
  );
  assert.equal(results.length, 1);
  assert.equal(results[0].taskId, "only");
  assert.match(results[0].error, /not found/);
});

await check("a mixed plan still runs the tasks whose agent exists", async () => {
  const dispatcher = new Dispatcher({ parallel: true, maxRetries: 0 }, silentEvents());
  const agents = new Map([["real", { name: "real", role: "echoes", agent: echoAgent }]]);
  const results = await dispatcher.dispatch(
    [
      { id: "ok", agent: "real", action: "echo", params: { value: 1 } },
      { id: "ghost", agent: "missing", action: "echo", params: {} },
    ],
    agents,
  );

  const byId = new Map(results.map((result) => [result.taskId, result]));
  assert.equal(byId.size, 2);
  assert.equal(byId.get("ok").error, undefined);
  assert.deepEqual(byId.get("ok").result, { action: "echo", params: { value: 1 } });
  assert.match(byId.get("ghost").error, /not found/);
});

await check("a handler that throws does not lose its task id", async () => {
  const throwingAgent = {
    getAvailableActions: () => [{ name: "boom", schema: undefined }],
    runAction: async () => {
      throw new Error("handler exploded");
    },
  };
  const dispatcher = new Dispatcher({ parallel: true, maxRetries: 0 }, silentEvents());
  const results = await dispatcher.dispatch(
    [
      { id: "one", agent: "bomb", action: "boom", params: {} },
      { id: "two", agent: "bomb", action: "boom", params: {} },
    ],
    new Map([["bomb", { name: "bomb", role: "throws", agent: throwingAgent }]]),
  );
  assert.deepEqual(results.map((result) => result.taskId).sort(), ["one", "two"]);
  for (const result of results) {
    assert.equal(result.error, "handler exploded");
  }
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

// Regression checks for the TVM stack parsers. Every on-chain number this
// package reads goes through them.
//
// Until 2026-09-16 parseBigNum handled a negative value by moving the sign:
// `"-" + "-0x10".slice(1)` rebuilds `"-0x10"`, the exact string BigInt had
// already refused, so the catch below swallowed it and every negative number
// read as zero. The JSDoc above it described the fix it was not performing.
//
//   node --experimental-strip-types packages/plugin-agent-comm/test/stack-parsers.test.mjs

import assert from "node:assert/strict";
import { parseBigNum, parseNum, parseBool } from "../src/stack-parsers.ts";

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

console.log("TVM stack parsers");

check("a negative hex number keeps its sign and its magnitude", () => {
  for (const [literal, expected] of [
    ["-0x10", -16n],
    ["-0X10", -16n],
    ["-0x1f4", -500n],
    ["-0x1", -1n],
  ]) {
    assert.equal(parseBigNum({ type: "num", num: literal }), expected, literal);
  }
});

check("the arithmetic that used to stand here really does produce zero", () => {
  // Kept so the check states what it is guarding against, not just the fix.
  const previous = (raw) => {
    const literal = raw.startsWith("-0x") ? "-" + raw.slice(1) : raw;
    try {
      return BigInt(literal);
    } catch {
      return 0n;
    }
  };
  assert.equal(previous("-0x10"), 0n);
  assert.notEqual(parseBigNum({ type: "num", num: "-0x10" }), previous("-0x10"));
});

check("positive numbers are unchanged", () => {
  assert.equal(parseBigNum({ type: "num", num: "0x10" }), 16n);
  assert.equal(parseBigNum({ type: "num", num: "42" }), 42n);
  assert.equal(parseBigNum({ type: "num", num: "0" }), 0n);
});

check("anything that is not a readable number reads as zero", () => {
  for (const item of [undefined, {}, { type: "cell", cell: "abc" }, { type: "num" }, { type: "num", num: "zz" }]) {
    assert.equal(parseBigNum(item), 0n, JSON.stringify(item) ?? "undefined");
  }
});

check("parseNum narrows to a JavaScript number, sign included", () => {
  assert.equal(parseNum({ type: "num", num: "-0x1f4" }), -500);
  assert.equal(parseNum({ type: "num", num: "0x1f4" }), 500);
  assert.equal(parseNum(undefined), 0);
});

check("a bool stack item is read as a bool, not as a missing number", () => {
  // TONAPI answers `{ type: "bool", value: true }` for a boolean getter. The
  // parser used to fall through to parseBigNum, which sees no `num` field and
  // answers 0n, so every true read as false.
  assert.equal(parseBool({ type: "bool", value: true }), true);
  assert.equal(parseBool({ type: "bool", value: false }), false);
  assert.equal(parseBool({ type: "num", num: "1" }), true);
  assert.equal(parseBool({ type: "num", num: "0" }), false);
  assert.equal(parseBool({ type: "num", num: "-0x1" }), true, "a negative value is still non-zero");
  assert.equal(parseBool(undefined), false);
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

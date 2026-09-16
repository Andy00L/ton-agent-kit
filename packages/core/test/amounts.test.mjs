// Regression checks for token amount conversion. Before the 2026-09-16 audit
// every jetton amount in the kit was built with `parseFloat(amount) * 1e9`,
// which assumes nine decimals for every token. USDT on TON declares six
// (https://tonapi.io/v2/jettons/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
// answers `"decimals": "6"`), so `transfer_jetton` sent a thousand times the
// requested amount and `swap_best_price` reported a thousandth of the quote.
//
//   node --experimental-strip-types packages/core/test/amounts.test.mjs

import assert from "node:assert/strict";
import { fromBaseUnits, toBaseUnits } from "../src/amounts.ts";

const USDT_DECIMALS = 6;

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

console.log("token amount conversion");

check("100 USDT is 100000000 base units, not the old 100000000000", () => {
  const converted = toBaseUnits("100", USDT_DECIMALS);
  assert.equal(converted.ok, true);
  assert.equal(converted.value, 100_000_000n);

  // What the deleted arithmetic produced for the same input.
  const previous = BigInt(Math.floor(parseFloat("100") * 1e9));
  assert.equal(previous, 100_000_000_000n);
  assert.equal(previous / converted.value, 1000n);
});

check("a 38.5 USDT quote formats as 38.5, not 0.0385", () => {
  const askUnits = 38_500_000n;
  assert.equal(fromBaseUnits(askUnits, USDT_DECIMALS), "38.5");
  assert.equal(fromBaseUnits(askUnits, 9), "0.0385");
});

check("conversion is exact past the float boundary", () => {
  const units = 1_234_567_890_123_456_789n;
  assert.equal(fromBaseUnits(units, 9), "1234567890.123456789");
  // Number() drops the last digits well before this magnitude.
  assert.notEqual(String(Number(units) / 1e9), "1234567890.123456789");
});

check("a small balance does not come back in scientific notation", () => {
  assert.equal(fromBaseUnits(1n, 9), "0.000000001");
  assert.notEqual(String(1 / 1e9), "0.000000001");
});

check("every amount round-trips", () => {
  for (const [amount, decimals] of [
    ["0", 9],
    ["1", 0],
    ["100.5", 6],
    ["0.000000001", 9],
    ["1234567890.123456789", 9],
  ]) {
    const converted = toBaseUnits(amount, decimals);
    assert.equal(converted.ok, true, `${amount} at ${decimals} decimals`);
    assert.equal(fromBaseUnits(converted.value, decimals), amount);
  }
});

check("an amount that is not a plain decimal is refused, not guessed", () => {
  for (const amount of ["1e3", "-1", "0.1abc", "", " ", "NaN", "0x10", "1,5"]) {
    const converted = toBaseUnits(amount, 9);
    assert.equal(converted.ok, false, `"${amount}" should be refused`);
    assert.match(converted.reason, /^\[toBaseUnits\]/);
  }
});

check("more decimal places than the token declares is refused", () => {
  // 0.0000001 USDT does not exist: the token carries six places.
  const converted = toBaseUnits("0.0000001", USDT_DECIMALS);
  assert.equal(converted.ok, false);
  assert.match(converted.reason, /7 decimal places but the token declares 6/);
});

check("an impossible decimals value is refused", () => {
  for (const decimals of [-1, 1.5, 37, Number.NaN]) {
    assert.equal(toBaseUnits("1", decimals).ok, false, `decimals ${decimals}`);
  }
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

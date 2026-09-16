// Token amount conversion. Kept free of imports so it can be exercised
// directly by node --experimental-strip-types, and because none of it
// depends on a client, a wallet, or the network.

/**
 * Upper bound on jetton decimals this SDK converts. TEP-64 carries `decimals`
 * as a metadata string and states no ceiling, so this is our own bound: it sits
 * far above every jetton in circulation and keeps the resulting bigint finite.
 */
const MAX_TOKEN_DECIMALS = 36;

/** A plain positive decimal amount, the only form a token amount may take. */
const TOKEN_AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

/** The outcome of converting a human-written amount to base units. */
export type TokenAmountResult =
  | { ok: true; value: bigint }
  | { ok: false; reason: string };

/**
 * Convert a human-readable token amount to its base-unit `bigint`, exactly.
 *
 * Use this for jettons instead of `tonToNano`. Jetton decimals are declared per
 * token (USDT on TON declares 6, most jettons declare 9), so the caller reads
 * the value off the jetton master rather than assuming one. The conversion runs
 * on the decimal string: `parseFloat("1234567890.123456789") * 1e9` has already
 * dropped the last digits before the multiplication happens.
 *
 * @param amount - The amount as a plain decimal string (e.g. `"100.5"`).
 * @param decimals - Decimals the token declares.
 * @returns The value in base units, or the reason it could not be converted.
 *
 * @example
 * ```typescript
 * toBaseUnits("100", 6);   // { ok: true, value: 100000000n }
 * toBaseUnits("1e3", 9);   // { ok: false, reason: "..." }
 * ```
 *
 * @since 1.4.0
 */
export function toBaseUnits(amount: string, decimals: number): TokenAmountResult {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_TOKEN_DECIMALS) {
    return {
      ok: false,
      reason: `[toBaseUnits] decimals must be a whole number between 0 and ${MAX_TOKEN_DECIMALS}, received ${decimals}`,
    };
  }
  const trimmed = amount.trim();
  if (!TOKEN_AMOUNT_PATTERN.test(trimmed)) {
    return {
      ok: false,
      reason: `[toBaseUnits] "${amount}" is not a plain decimal amount. Scientific notation, signs and units are not accepted.`,
    };
  }
  const [whole, fraction = ""] = trimmed.split(".");
  if (fraction.length > decimals) {
    return {
      ok: false,
      reason: `[toBaseUnits] "${amount}" carries ${fraction.length} decimal places but the token declares ${decimals}`,
    };
  }
  return { ok: true, value: BigInt(whole + fraction.padEnd(decimals, "0")) };
}

/**
 * Format a base-unit token amount as a decimal string, exactly.
 *
 * The inverse of {@link toBaseUnits}. Never goes through `Number`, so a balance
 * above 2^53 keeps every digit and a small balance does not come back in
 * scientific notation.
 *
 * @param units - The amount in base units.
 * @param decimals - Decimals the token declares.
 *
 * @example
 * ```typescript
 * fromBaseUnits(38500000n, 6); // "38.5"
 * ```
 *
 * @since 1.4.0
 */
export function fromBaseUnits(units: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = units / divisor;
  const fraction = (units % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

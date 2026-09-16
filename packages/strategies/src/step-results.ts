// Readers for the values a step left in the context. A step result is whatever
// the action returned, so nothing here assumes a shape: each reader checks at
// run time and answers null when the value is not what the caller needs.

/**
 * Read a number out of a step result.
 *
 * Accepts the result itself when it is a number, the named field when the
 * result is an object, and a numeric string in either position, which is how
 * most actions in this kit report amounts.
 *
 * @param result - The value `StrategyContext.getResult` returned.
 * @param field - Field to read when the result is an object.
 * @returns The number, or null when the value is absent or not numeric.
 *
 * @since 1.1.0
 */
export function readNumber(result: unknown, field: string): number | null {
  const direct = toFiniteNumber(result);
  if (direct !== null) return direct;
  if (result === null || typeof result !== "object") return null;
  return toFiniteNumber(Reflect.get(result, field));
}

/** A finite number, or null for anything else including NaN and Infinity. */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

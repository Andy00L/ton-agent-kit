import { Address, Cell } from "@ton/core";

/**
 * One entry of a TVM stack as the TON HTTP APIs serialize it. The value lives
 * under the key named by `type`, so every field is optional.
 */
export interface TvmStackItem {
  type?: string;
  num?: string;
  cell?: string;
  slice?: string;
  tuple?: TvmStackItem[];
}

/**
 * Read a `num` entry as a JavaScript number.
 *
 * TVM serializes negative numbers as `-0x...`, which `BigInt` refuses, so the
 * sign is moved in front of the `0x` prefix before parsing.
 */
export function parseNum(item: TvmStackItem | undefined): number {
  const value = parseBigNum(item);
  return Number(value);
}

/** Read a `num` entry as a bigint. Anything else reads as `0n`. */
export function parseBigNum(item: TvmStackItem | undefined): bigint {
  if (item?.type !== "num" || !item.num) return 0n;
  const literal = item.num.startsWith("-0x")
    ? "-" + item.num.slice(1)
    : item.num;
  try {
    return BigInt(literal);
  } catch {
    return 0n;
  }
}

/** Read a `num` entry as a boolean. Anything non-zero is true. */
export function parseBool(item: TvmStackItem | undefined): boolean {
  return parseBigNum(item) !== 0n;
}

/**
 * Read a `cell` entry as its string tail. The cell arrives hex-encoded from
 * some endpoints and base64-encoded from others, so both are attempted.
 */
export function parseString(item: TvmStackItem | undefined): string {
  if (item?.type !== "cell" || !item.cell) return "";
  for (const encoding of ["hex", "base64"] as const) {
    try {
      const cell = Cell.fromBoc(Buffer.from(item.cell, encoding))[0];
      return cell.beginParse().loadStringTail();
    } catch {
      // Try the next encoding.
    }
  }
  return "";
}

/**
 * Read an address, whether it arrives as a `slice` string or inside a `cell`.
 * An unreadable value comes back as the empty string rather than throwing.
 */
export function parseAddress(item: TvmStackItem | undefined): string {
  if (!item) return "";

  if (item.type === "slice" && item.slice) {
    try {
      return Address.parse(item.slice).toRawString();
    } catch {
      return item.slice;
    }
  }

  if (item.type === "cell" && item.cell) {
    for (const encoding of ["hex", "base64"] as const) {
      try {
        const cell = Cell.fromBoc(Buffer.from(item.cell, encoding))[0];
        const address = cell.beginParse().loadAddress();
        return address ? address.toRawString() : "";
      } catch {
        // Try the next encoding.
      }
    }
  }

  return "";
}

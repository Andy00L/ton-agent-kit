import { beginCell, Cell, Address } from "@ton/core";
import { createHash } from "crypto";

// Opcodes from the compiled Tact wrapper (contracts/output/Reputation_Reputation.ts)
const OP_REGISTER = 950051591;
const OP_RATE = 2804297358;
const OP_UPDATE_AVAILABILITY = 1424124491;
const OP_WITHDRAW = 593874976;

/**
 * Compute the SHA-256 hash of a name, matching Tact's `sha256()` function.
 * Used to look up agents by name in the on-chain reputation contract.
 *
 * @param name - The agent name to hash.
 * @returns 256-bit unsigned integer as bigint.
 *
 * @example
 * ```typescript
 * const hash = computeNameHash("price-oracle");
 * // Use with agentIndexByNameHash getter
 * ```
 *
 * @since 1.0.0
 */
export function computeNameHash(name: string): bigint {
  const hash = createHash("sha256").update(name).digest("hex");
  return BigInt("0x" + hash);
}

/**
 * Build a Register message body for the Reputation contract.
 *
 * @param name - Agent name to register.
 * @param capabilities - Comma-separated list of capabilities (e.g. "price_feed,analytics").
 * @param available - Whether the agent is currently available for work.
 * @returns Encoded Cell ready to send as a message body.
 * @since 1.0.0
 */
export function buildRegisterBody(name: string, capabilities: string, available: boolean): Cell {
  const b = beginCell();
  b.storeUint(OP_REGISTER, 32);
  b.storeStringRefTail(name);
  b.storeStringRefTail(capabilities);
  b.storeBit(available);
  return b.endCell();
}

/**
 * Build a Rate message body for the Reputation contract.
 * FIX 3: Added dealIndex parameter for deal-based rating authorization.
 *
 * @param agentName - Name of the agent being rated.
 * @param success - Whether the task was successful.
 * @param dealIndex - The deal index from SettleDeal that authorizes this rating.
 */
export function buildRateBody(agentName: string, success: boolean, dealIndex: number = 0): Cell {
  const b = beginCell();
  b.storeUint(OP_RATE, 32);
  b.storeStringRefTail(agentName);
  b.storeBit(success);
  b.storeUint(dealIndex, 32);
  return b.endCell();
}

/**
 * Build an UpdateAvailability message body.
 */
export function buildUpdateAvailabilityBody(name: string, available: boolean): Cell {
  const b = beginCell();
  b.storeUint(OP_UPDATE_AVAILABILITY, 32);
  b.storeStringRefTail(name);
  b.storeBit(available);
  return b.endCell();
}

/**
 * Build a Withdraw message body.
 */
export function buildWithdrawBody(): Cell {
  const b = beginCell();
  b.storeUint(OP_WITHDRAW, 32);
  return b.endCell();
}

/**
 * Call a getter on any smart contract via the TONAPI `/v2/blockchain/accounts/{address}/methods/{method}` endpoint.
 *
 * @param apiBase - TONAPI base URL (e.g. "https://testnet.tonapi.io/v2").
 * @param contractAddress - Raw contract address (e.g. "0:abc...").
 * @param method - Getter method name (e.g. "agentCount", "escrowData").
 * @param args - Optional array of string arguments to pass to the getter.
 * @param tonapiKey - Optional TONAPI Bearer token for higher rate limits.
 * @returns Parsed JSON response with `stack` array, or null on error.
 * @since 1.0.0
 */
export async function callContractGetter(
  apiBase: string,
  contractAddress: string,
  method: string,
  args?: string[],
  tonapiKey?: string,
): Promise<any> {
  const headers: Record<string, string> = {};
  if (tonapiKey) {
    headers["Authorization"] = `Bearer ${tonapiKey}`;
  }

  let url = `${apiBase}/blockchain/accounts/${encodeURIComponent(contractAddress)}/methods/${encodeURIComponent(method)}`;
  if (args && args.length > 0) {
    url += "?" + args.map((a) => `args=${encodeURIComponent(a)}`).join("&");
  }

  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Look up an agent's on-chain index by name. Computes sha256(name) and calls
 * the `agentIndexByNameHash` getter on the reputation contract.
 *
 * @param apiBase - TONAPI base URL.
 * @param contractAddress - Reputation contract address.
 * @param agentName - Agent name to look up.
 * @param tonapiKey - Optional TONAPI key.
 * @returns The agent index (0-based), or null if not found.
 * @since 1.0.0
 */
export async function lookupAgentIndex(
  apiBase: string,
  contractAddress: string,
  agentName: string,
  tonapiKey?: string,
): Promise<number | null> {
  const nameHash = computeNameHash(agentName);
  const res = await callContractGetter(
    apiBase, contractAddress, "agentIndexByNameHash",
    ["0x" + nameHash.toString(16)], tonapiKey,
  );
  return parseOptionalNum(res?.stack);
}

/**
 * Parse an AgentData struct from a TONAPI getter response stack.
 * Handles both tuple-wrapped and flat stack formats, and both slice and cell address types.
 *
 * @param stack - The raw TONAPI stack array from a getter response.
 * @returns Parsed agent data with owner, available, totalTasks, successes, registeredAt — or null.
 * @since 1.0.0
 */
export function parseAgentDataFromStack(stack: any[]): any | null {
  if (!stack || stack.length === 0) return null;

  const first = stack[0];
  if (!first || first.type === "null") return null;

  // agentData returns AgentData? — an optional tuple
  let items: any[];
  if (first.type === "tuple" && first.tuple) {
    items = first.tuple;
  } else {
    items = stack;
  }

  if (items.length < 5) return null;
  try {
    return {
      owner: parseStackAddress(items[0]),
      available: parseStackBool(items[1]),
      totalTasks: parseStackNum(items[2]),
      successes: parseStackNum(items[3]),
      registeredAt: parseStackNum(items[4]),
    };
  } catch {
    return null;
  }
}

/**
 * Parse an optional Int from TONAPI getter stack.
 * Tact optional: tuple is present or null type on stack.
 */
export function parseOptionalNum(stack: any[]): number | null {
  if (!stack || stack.length === 0) return null;
  const item = stack[0];
  if (!item || item.type === "null") return null;
  if (item.type === "num" && item.num) {
    return Number(BigInt(item.num));
  }
  return null;
}

/** Parse a TONAPI num string to bigint (handles "-0x1" format) */
function parseBigInt(s: string): bigint {
  if (s.startsWith("-0x") || s.startsWith("-0X")) {
    return -BigInt(s.slice(1));
  }
  return BigInt(s);
}

function parseStackNum(item: any): number {
  if (!item) return 0;
  if (item.type === "num") {
    return Number(parseBigInt(item.num));
  }
  return 0;
}

function parseStackBool(item: any): boolean {
  if (!item) return false;
  if (item.type === "num") {
    return parseBigInt(item.num) !== 0n;
  }
  if (item.type === "bool") {
    return !!item.value;
  }
  return false;
}

function parseStackAddress(item: any): string {
  if (!item) return "";
  if (item.type === "slice" && item.slice) {
    try {
      return Address.parse(item.slice).toRawString();
    } catch {
      return item.slice;
    }
  }
  // TONAPI returns addresses in tuples as cells (BOC format)
  if (item.type === "cell" && item.cell) {
    try {
      const cell = Cell.fromBoc(Buffer.from(item.cell, "hex"))[0];
      const slice = cell.beginParse();
      const addr = slice.loadAddress();
      return addr ? addr.toRawString() : "";
    } catch {
      // Try base64 encoding as fallback
      try {
        const cell = Cell.fromBoc(Buffer.from(item.cell, "base64"))[0];
        const slice = cell.beginParse();
        const addr = slice.loadAddress();
        return addr ? addr.toRawString() : "";
      } catch {}
      return "";
    }
  }
  return "";
}

/**
 * Parse a DisputeInfo struct from a TONAPI getter response stack.
 *
 * @param stack - The raw TONAPI stack array.
 * @returns Parsed dispute data with escrowAddress, depositor, beneficiary, amount, votingDeadline, settled — or null.
 * @since 1.0.0
 */
export function parseDisputeData(stack: any[]): any | null {
  if (!stack || stack.length === 0) return null;

  const first = stack[0];
  if (!first || first.type === "null") return null;

  let items: any[];
  if (first.type === "tuple" && first.tuple) {
    items = first.tuple;
  } else {
    items = stack;
  }

  if (items.length < 6) return null;
  try {
    return {
      escrowAddress: parseStackAddress(items[0]),
      depositor: parseStackAddress(items[1]),
      beneficiary: parseStackAddress(items[2]),
      amount: parseStackNum(items[3]),
      votingDeadline: parseStackNum(items[4]),
      settled: parseStackBool(items[5]),
    };
  } catch {
    return null;
  }
}

/**
 * Compute the SHA-256 hash of a capability name for indexed on-chain lookup.
 * Matches Tact's `sha256()` function output.
 *
 * @param capability - Capability name (e.g. "price_feed", "analytics").
 * @returns 256-bit unsigned integer as bigint.
 * @since 1.0.0
 */
export function computeCapabilityHash(capability: string): bigint {
  const hash = createHash("sha256").update(capability).digest("hex");
  return BigInt("0x" + hash);
}

/**
 * Parse a linked-list Cell into an array of indexes. Used for both the capability
 * index (`agentsByCapability`) and intent service index (`intentsByServiceHash`).
 * Each node stores a uint32 index + 1-bit hasNext flag + optional ref to the next node.
 *
 * @param cellHex - Hex-encoded BOC string from the TONAPI getter response.
 * @returns Array of parsed uint32 indexes.
 * @since 1.0.0
 */
export function parseIndexCell(cellHex: string): number[] {
  const indexes: number[] = [];
  try {
    const cell = Cell.fromBoc(Buffer.from(cellHex, "hex"))[0];
    let slice = cell.beginParse();
    while (true) {
      indexes.push(slice.loadUint(32));
      if (slice.remainingBits >= 1 && slice.loadBit()) {
        slice = slice.loadRef().beginParse();
      } else {
        break;
      }
    }
  } catch {}
  return indexes;
}

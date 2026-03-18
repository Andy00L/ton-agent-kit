/**
 * Estimate gas needed for a contract operation.
 * Adds a 0.1 TON safety buffer on top of the estimated cost.
 * The contract refunds unused gas, so overestimating is safe and preferred.
 * No maximum cap. Better to send too much (refunded) than too little (TX fails).
 *
 * @param operation - Operation type (e.g. "register", "broadcast_intent")
 * @param state - Optional contract state for precise estimation
 * @returns Gas amount in TON as string
 * @since 1.2.0
 */
export function estimateGas(
  operation: string,
  state?: { agentCount?: number; intentCount?: number; disputeCount?: number },
): string {
  const BUFFER = 0.1;
  const PER_ENTRY = 0.002;

  const agents = state?.agentCount || 0;
  const intents = state?.intentCount || 0;
  const disputes = state?.disputeCount || 0;

  let estimated = 0;

  switch (operation) {
    case "register":
    case "rate":
      estimated = 0.02 + agents * PER_ENTRY;
      break;
    case "broadcast_intent":
      estimated = 0.02 + intents * PER_ENTRY * 0.5;
      break;
    case "send_offer":
    case "accept_offer":
    case "settle_deal":
    case "cancel_intent":
      estimated = 0.03;
      break;
    case "cleanup":
      estimated = 0.03 + (agents + intents) * PER_ENTRY;
      break;
    case "open_dispute":
    case "join_dispute":
    case "vote":
      estimated = 0.02 + disputes * PER_ENTRY * 0.3;
      break;
    case "deposit":
    case "release":
    case "refund":
      estimated = 0.02;
      break;
    default:
      estimated = 0.02;
  }

  const total = estimated + BUFFER;
  return total.toFixed(4);
}

/** Default gas for simple contract calls (0.12 TON). Excess is refunded. */
export const DEFAULT_GAS = "0.12";

/** Gas for cross-contract notifications (0.15 TON). Covers both contracts. Excess refunded. */
export const CROSS_CONTRACT_GAS = "0.15";

import { z } from "zod";
import { fetchJson } from "./http";

/** Only the field this module reads off the account events endpoint. */
const AccountEventsResponse = z.object({
  events: z.array(z.object({ event_id: z.string().optional() })).optional(),
});

/**
 * Only the fields this module reads off a trace. `compute_phase.exit_code` is
 * what tells a rejected contract call apart from a successful one.
 */
const TraceResponse = z.object({
  children: z
    .array(
      z.object({
        bounced: z.boolean().optional(),
        transaction: z
          .object({
            bounced: z.boolean().optional(),
            compute_phase: z
              .object({ exit_code: z.number().optional() })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

/** Delay between two trace polls, in milliseconds. */
const TRACE_POLL_INTERVAL_MS = 2000;

/**
 * Verification result for a contract transaction.
 * @since 1.2.1
 */
export interface VerifyResult {
  /** Whether the contract processed the message successfully. */
  verified: boolean;
  /** The contract's compute phase exit code (0 = success). */
  contractExitCode: number | null;
  /** Whether the message was bounced back by the contract. */
  bounced: boolean;
  /** Human-readable error message, or null if successful. */
  error: string | null;
}

/**
 * After sending a transaction to a contract, verify the contract actually
 * processed it by checking the transaction trace via TONAPI.
 *
 * Polls the TONAPI `/v2/traces/{hash}` endpoint until the child transactions
 * appear, then checks exit codes and bounce status.
 *
 * @param walletAddress - The sender's raw address (to find the TX)
 * @param apiBase - TONAPI base URL (e.g. "https://testnet.tonapi.io")
 * @param tonapiKey - Optional TONAPI bearer token
 * @param timeoutMs - Max wait time (default 12000ms)
 * @returns Verification result with exit code and bounce info
 *
 * @example
 * ```typescript
 * await sendTransaction(agent, [message]);
 * const v = await verifyContractExecution(agent.wallet.address.toRawString(), apiBase);
 * if (!v.verified) console.log("Contract rejected:", v.error);
 * ```
 *
 * @since 1.2.1
 */
export async function verifyContractExecution(
  walletAddress: string,
  apiBase: string,
  tonapiKey?: string,
  timeoutMs = 12000,
): Promise<VerifyResult> {
  const headers: Record<string, string> = {};
  if (tonapiKey) headers["Authorization"] = `Bearer ${tonapiKey}`;

  const startTime = Date.now();

  // First, get the latest event to find the TX hash
  const latestEvents = await fetchJson(
    `${apiBase}/v2/accounts/${encodeURIComponent(walletAddress)}/events?limit=1`,
    AccountEventsResponse,
    { headers },
  );
  const txHash = latestEvents.ok
    ? (latestEvents.value.events?.[0]?.event_id ?? null)
    : null;

  if (!txHash) {
    return { verified: false, contractExitCode: null, bounced: false, error: "Could not find recent transaction" };
  }

  // Poll the trace until children appear or timeout
  while (Date.now() - startTime < timeoutMs) {
    const trace = await fetchJson(
      `${apiBase}/v2/traces/${txHash}`,
      TraceResponse,
      { headers },
    );

    if (trace.ok) {
      const children = trace.value.children ?? [];

      for (const child of children) {
        const transaction = child.transaction;
        if (!transaction) continue;

        const compute = transaction.compute_phase;
        if (compute?.exit_code !== undefined && compute.exit_code !== 0) {
          return {
            verified: false,
            contractExitCode: compute.exit_code,
            bounced: false,
            error: `Contract exit code ${compute.exit_code}${compute.exit_code === -14 ? " (out of gas)" : ""}`,
          };
        }

        if (transaction.bounced || child.bounced) {
          return {
            verified: false,
            contractExitCode: compute?.exit_code ?? null,
            bounced: true,
            error: "Message bounced by contract",
          };
        }
      }

      if (children.length > 0) {
        return { verified: true, contractExitCode: 0, bounced: false, error: null };
      }
    }

    await new Promise((resolveAfterDelay) =>
      setTimeout(resolveAfterDelay, TRACE_POLL_INTERVAL_MS),
    );
  }

  return { verified: false, contractExitCode: null, bounced: false, error: "Verification timed out" };
}

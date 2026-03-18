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
  let txHash: string | null = null;
  try {
    const evResp = await fetch(
      `${apiBase}/v2/accounts/${encodeURIComponent(walletAddress)}/events?limit=1`,
      { headers },
    );
    if (evResp.ok) {
      const evData = await evResp.json();
      txHash = evData?.events?.[0]?.event_id || null;
    }
  } catch {}

  if (!txHash) {
    return { verified: false, contractExitCode: null, bounced: false, error: "Could not find recent transaction" };
  }

  // Poll the trace until children appear or timeout
  while (Date.now() - startTime < timeoutMs) {
    try {
      const resp = await fetch(`${apiBase}/v2/traces/${txHash}`, { headers });
      if (resp.ok) {
        const trace = await resp.json();
        const children = trace?.children || [];

        for (const child of children) {
          const tx = child?.transaction;
          if (!tx) continue;

          const compute = tx?.compute_phase;
          if (compute && compute.exit_code !== undefined && compute.exit_code !== 0) {
            return {
              verified: false,
              contractExitCode: compute.exit_code,
              bounced: false,
              error: `Contract exit code ${compute.exit_code}${compute.exit_code === -14 ? " (out of gas)" : ""}`,
            };
          }

          if (tx?.bounced || child?.bounced) {
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
    } catch {}

    await new Promise((r) => setTimeout(r, 2000));
  }

  return { verified: false, contractExitCode: null, bounced: false, error: "Verification timed out" };
}

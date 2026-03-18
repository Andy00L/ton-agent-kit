import { toNano, fromNano } from "@ton/core";

export interface EmulationResult {
  success: boolean;
  gasUsed: string;
  estimatedFee: string;
  balanceChange: string;
  destinationBalanceChange: string;
  risk: string;
  message: string;
  error?: string;
}

/**
 * Send a base64-encoded BOC to TONAPI's wallet emulation endpoint
 * and return a parsed, LLM-friendly result.
 *
 * Never throws — returns { success: false, ... } on any error.
 */
export async function emulateTransaction(
  boc: string,
  network: "testnet" | "mainnet",
  amount: string,
  toRawAddress: string,
  tonapiKey?: string,
): Promise<EmulationResult> {
  try {
    const apiBase =
      network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (tonapiKey) {
      headers["Authorization"] = `Bearer ${tonapiKey}`;
    }

    const response = await fetch(`${apiBase}/wallet/emulate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ boc }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Emulation request failed (${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMsg = errorJson.error || errorJson.message || errorMsg;
      } catch {}

      return {
        success: false,
        error: errorMsg,
        gasUsed: "0",
        estimatedFee: "0",
        balanceChange: "0",
        destinationBalanceChange: "0",
        risk: "request_failed",
        message: `Simulation failed: ${errorMsg}`,
      };
    }

    const data = await response.json();
    return parseEmulationResponse(data, amount, toRawAddress);
  } catch (err: any) {
    return {
      success: false,
      error: err.message,
      gasUsed: "0",
      estimatedFee: "0",
      balanceChange: "0",
      destinationBalanceChange: "0",
      risk: "error",
      message: `Simulation failed: ${err.message}`,
    };
  }
}

/**
 * Parse the TONAPI emulation response into a clean result.
 */
function parseEmulationResponse(
  data: any,
  amount: string,
  toRawAddress: string,
): EmulationResult {
  const trace = data.trace;
  const risk = data.risk;

  // Extract transaction success from trace
  const tx = trace?.transaction;
  const success = tx?.success ?? false;

  // Extract fees (in nanotons)
  const totalFeesNano = BigInt(tx?.total_fees ?? 0);
  const estimatedFee = fromNano(totalFeesNano);

  // Extract gas used from compute phase
  const gasUsed = tx?.compute_phase?.gas_used
    ? tx.compute_phase.gas_used.toString()
    : estimatedFee;

  // Calculate balance changes
  const amountNano = toNano(amount);
  let balanceChange: string;
  let destinationBalanceChange: string;

  if (success) {
    // Use risk.ton if available (most accurate — includes amount + all fees)
    if (risk?.ton !== undefined) {
      const riskTonNano = BigInt(risk.ton);
      // risk.ton is the amount the wallet loses (positive = loss)
      balanceChange = fromNano(-riskTonNano);
    } else {
      // Fallback: sender loses amount + fees
      balanceChange = fromNano(0n - amountNano - totalFeesNano);
    }
    destinationBalanceChange = `+${amount}`;
  } else {
    // Failed — only fees consumed (or nothing)
    balanceChange = totalFeesNano > 0n ? fromNano(-totalFeesNano) : "0";
    destinationBalanceChange = "0";
  }

  // Parse risk assessment
  let riskLevel = "none";
  if (!success) {
    riskLevel = "transaction_failed";
  } else if (risk?.transfer_all_remaining_balance) {
    riskLevel = "transfer_all_remaining_balance";
  }

  // Build human-readable message
  let message: string;
  if (success) {
    message = `Simulation successful. Sending ${amount} TON to ${toRawAddress.slice(0, 8)}... would cost ~${estimatedFee} TON in fees.`;
  } else {
    const exitCode = tx?.compute_phase?.exit_code;
    const actionResultCode = tx?.action_phase?.result_code;
    let reason = "transaction would fail";
    if (exitCode && exitCode !== 0) {
      reason = `compute phase exit code ${exitCode}`;
    } else if (actionResultCode && actionResultCode !== 0) {
      reason = `action phase result code ${actionResultCode}`;
    }
    message = `Simulation failed: ${reason}.`;
  }

  return {
    success,
    gasUsed,
    estimatedFee,
    balanceChange,
    destinationBalanceChange,
    risk: riskLevel,
    message,
  };
}

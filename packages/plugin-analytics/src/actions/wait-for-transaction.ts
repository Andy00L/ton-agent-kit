import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";

export const waitForTransactionAction = defineAction({
  name: "wait_for_transaction",
  description:
    "Wait for the next transaction on an address using real-time streaming. Blocks until a transaction arrives or timeout expires. Use this to react to on-chain events instead of polling.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Address to watch. Defaults to the agent's own wallet."),
    timeout: z.coerce
      .number()
      .optional()
      .describe("Maximum seconds to wait. Defaults to 30. Max 300 (5 minutes)."),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();
    const timeoutSec = Math.min(params.timeout || 30, 300);
    const timeoutMs = timeoutSec * 1000;

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    // SSE endpoints use query param auth, not headers
    let sseUrl = `${apiBase}/sse/accounts/transactions?accounts=${encodeURIComponent(addr)}`;
    if (agent.config.TONAPI_KEY) {
      sseUrl += `&token=${encodeURIComponent(agent.config.TONAPI_KEY)}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(sseUrl, {
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });

      if (!response.ok) {
        clearTimeout(timeoutId);
        return {
          found: false,
          error: `TONAPI SSE returned ${response.status}`,
          message: `Failed to connect to TONAPI SSE: HTTP ${response.status}`,
        };
      }

      const reader = response.body?.getReader();
      if (!reader) {
        clearTimeout(timeoutId);
        return {
          found: false,
          error: "No response body stream available",
          message: "Failed to connect to TONAPI SSE: no readable stream.",
        };
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let txHash: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          let event: any;
          try {
            event = JSON.parse(jsonStr);
          } catch {
            continue;
          }

          // Got a transaction event — extract the hash
          txHash = event.tx_hash || event.hash || null;

          // Clean up SSE connection
          clearTimeout(timeoutId);
          try { reader.cancel(); } catch {}

          // Fetch full transaction details via REST for reliable parsing
          if (txHash) {
            return await fetchAndFormatTx(apiBase, txHash, addr, agent);
          }

          // Fallback: parse directly from SSE event
          return formatSseEvent(event, addr, agent);
        }
      }

      // Stream ended without data
      clearTimeout(timeoutId);
      return {
        found: false,
        address: addr,
        timeoutSeconds: timeoutSec,
        message: `No transactions received within ${timeoutSec} seconds.`,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return {
          found: false,
          address: addr,
          timeoutSeconds: timeoutSec,
          message: `No transactions received within ${timeoutSec} seconds.`,
        };
      }
      return {
        found: false,
        error: err.message,
        message: `Failed to connect to TONAPI SSE: ${err.message}`,
      };
    }
  },
});

/**
 * Fetch full transaction details from TONAPI REST and format the result.
 */
async function fetchAndFormatTx(
  apiBase: string,
  txHash: string,
  watchedAddr: string,
  agent: any,
) {
  try {
    const headers: Record<string, string> = {};
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    const res = await fetch(
      `${apiBase}/blockchain/transactions/${encodeURIComponent(txHash)}`,
      { headers },
    );

    if (!res.ok) {
      // Fallback: return minimal result with just the hash
      return {
        found: true,
        txHash,
        sender: null,
        recipient: null,
        amount: null,
        timestamp: Math.floor(Date.now() / 1000),
        comment: null,
        type: "unknown",
        explorerUrl: explorerLink(txHash, agent.network),
        message: `Transaction detected: ${txHash}`,
      };
    }

    const tx = await res.json();

    const inMsg = tx.in_msg;
    const sender = inMsg?.source?.address || null;
    const recipient = inMsg?.destination?.address || null;
    const valueNano = inMsg?.value != null ? Number(inMsg.value) : 0;
    const amount = valueNano > 0 ? (valueNano / 1e9).toString() : "0";
    const comment = inMsg?.decoded_body?.text || inMsg?.message || null;
    const timestamp = tx.utime || Math.floor(Date.now() / 1000);

    const normalizedWatched = normed(watchedAddr);
    const isIncoming = recipient && normed(recipient) === normalizedWatched;
    const type = isIncoming ? "incoming" : "outgoing";

    const timeStr = new Date(timestamp * 1000).toISOString();
    const direction = isIncoming ? "Received" : "Sent";
    const counterparty = isIncoming ? sender : recipient;

    return {
      found: true,
      txHash,
      sender,
      recipient,
      amount,
      timestamp,
      comment,
      type,
      explorerUrl: explorerLink(txHash, agent.network),
      message: `${direction} ${amount} TON ${isIncoming ? "from" : "to"} ${counterparty || "unknown"} at ${timeStr}`,
    };
  } catch {
    return {
      found: true,
      txHash,
      sender: null,
      recipient: null,
      amount: null,
      timestamp: Math.floor(Date.now() / 1000),
      comment: null,
      type: "unknown",
      explorerUrl: explorerLink(txHash, agent.network),
      message: `Transaction detected: ${txHash}`,
    };
  }
}

/**
 * Fallback: format directly from the SSE event payload.
 */
function formatSseEvent(event: any, watchedAddr: string, agent: any) {
  const txHash = event.tx_hash || event.hash || "unknown";
  const sender = event.in_msg?.source?.address || null;
  const recipient = event.in_msg?.destination?.address || null;
  const valueNano = event.in_msg?.value != null ? Number(event.in_msg.value) : 0;
  const amount = valueNano > 0 ? (valueNano / 1e9).toString() : "0";
  const timestamp = event.utime || event.now || Math.floor(Date.now() / 1000);

  const normalizedWatched = normed(watchedAddr);
  const isIncoming = recipient && normed(recipient) === normalizedWatched;
  const type = isIncoming ? "incoming" : "outgoing";

  return {
    found: true,
    txHash,
    sender,
    recipient,
    amount,
    timestamp,
    comment: null,
    type,
    explorerUrl: explorerLink(txHash, agent.network),
    message: `Transaction detected: ${txHash}`,
  };
}

function explorerLink(txHash: string, network: string): string {
  const base = network === "testnet" ? "https://testnet.tonviewer.com" : "https://tonviewer.com";
  return `${base}/transaction/${txHash}`;
}

function normed(addr: string): string {
  try {
    return Address.parse(addr).toRawString();
  } catch {
    return addr;
  }
}

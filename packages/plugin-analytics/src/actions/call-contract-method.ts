import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction } from "@ton-agent-kit/core";

const EXIT_CODE_MESSAGES: Record<number, string> = {
  0: "success",
  11: "unknown method (method not found on contract)",
  [-13]: "out of gas",
  [-14]: "out of stack",
};

export const callContractMethodAction = defineAction({
  name: "call_contract_method",
  description:
    "Call any get-method on any smart contract on TON. Returns the TVM stack result. Works with wallets (seqno), jetton masters (get_jetton_data), NFT collections, DEX pools, DAOs, or any custom contract.",
  schema: z.object({
    address: z
      .string()
      .describe("Smart contract address to call (raw, EQ, or UQ format)"),
    method: z
      .string()
      .describe("Get-method name to execute (e.g., 'get_wallet_data', 'get_jetton_data', 'get_pool_data', 'seqno')"),
    args: z
      .array(z.string())
      .optional()
      .describe("Optional arguments to pass to the method. Each arg is a string (numbers as decimal or hex with 0x prefix)."),
  }),
  handler: async (agent, params) => {
    // Validate address
    let addressRaw: string;
    try {
      addressRaw = Address.parse(params.address).toRawString();
    } catch (err: any) {
      return {
        success: false,
        address: params.address,
        method: params.method,
        exitCode: null,
        error: `Invalid address: ${err.message}`,
        message: `Invalid address "${params.address}": ${err.message}`,
      };
    }

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const headers: Record<string, string> = {};
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    // Build URL with optional args
    let url = `${apiBase}/blockchain/accounts/${encodeURIComponent(addressRaw)}/methods/${encodeURIComponent(params.method)}`;
    if (params.args && params.args.length > 0) {
      const argsQuery = params.args.map((a) => `args=${encodeURIComponent(a)}`).join("&");
      url += `?${argsQuery}`;
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `TONAPI returned ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch {}

        return {
          success: false,
          address: addressRaw,
          method: params.method,
          exitCode: null,
          error: errorMsg,
          message: `Method ${params.method} on ${params.address.slice(0, 16)}... failed: ${errorMsg}`,
        };
      }

      const data = await response.json();
      const exitCode = data.exit_code ?? 0;

      if (exitCode !== 0 && data.success === false) {
        const codeDesc = EXIT_CODE_MESSAGES[exitCode] || "method execution failed";
        return {
          success: false,
          address: addressRaw,
          method: params.method,
          exitCode,
          error: codeDesc,
          message: `Method ${params.method} on ${params.address.slice(0, 16)}... failed: exit code ${exitCode} (${codeDesc})`,
        };
      }

      const rawStack = data.stack || [];
      const stack = rawStack.map(processStackItem);

      return {
        success: true,
        address: addressRaw,
        method: params.method,
        exitCode,
        stack,
        rawStack,
        decoded: data.decoded || null,
        resultCount: stack.length,
        message: `Called ${params.method} on ${params.address.slice(0, 16)}...: ${stack.length} value${stack.length !== 1 ? "s" : ""} returned (exit code ${exitCode})`,
      };
    } catch (err: any) {
      return {
        success: false,
        address: addressRaw,
        method: params.method,
        exitCode: null,
        error: err.message,
        message: `Failed to call ${params.method}: ${err.message}`,
      };
    }
  },
});

/**
 * Process a single TVM stack item into a human-readable value.
 */
function processStackItem(item: any): any {
  if (!item || !item.type) return item;

  switch (item.type) {
    case "num": {
      const hex = item.num as string;
      if (!hex) return "0";
      try {
        if (hex.startsWith("-")) {
          return "-" + BigInt(hex.slice(1)).toString();
        }
        return BigInt(hex).toString();
      } catch {
        return hex;
      }
    }

    case "cell":
      return { type: "cell", boc: item.cell };

    case "slice":
      return { type: "slice", raw: item.slice };

    case "tuple":
      return {
        type: "tuple",
        items: (item.tuple || []).map(processStackItem),
      };

    case "null":
      return null;

    default:
      return item;
  }
}

import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

export const subscribeWebhookAction = defineAction({
  name: "subscribe_webhook",
  description:
    "Register a webhook with TONAPI to receive POST notifications when transactions occur on a watched address. Requires a TONAPI key and a publicly accessible HTTPS callback URL.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Address to watch. Defaults to the agent's own wallet."),
    callbackUrl: z
      .string()
      .describe("Publicly accessible HTTPS URL that will receive POST notifications when events occur."),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();

    // Validate HTTPS
    if (!params.callbackUrl.startsWith("https://")) {
      return {
        subscribed: false,
        error: "Callback URL must use HTTPS",
        message: "Webhook registration failed: callback URL must start with https://. HTTP endpoints are not accepted for security reasons.",
      };
    }

    // Require TONAPI key
    if (!agent.config.TONAPI_KEY) {
      return {
        subscribed: false,
        error: "TONAPI_KEY required",
        message: "Webhook registration requires a TONAPI API key. Set TONAPI_KEY in your agent config.",
      };
    }

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    try {
      const response = await fetch(`${apiBase}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${agent.config.TONAPI_KEY}`,
        },
        body: JSON.stringify({
          endpoint: params.callbackUrl,
          accounts: [{ account_id: addr }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `TONAPI returned ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorJson.message || errorMsg;
        } catch {}

        return {
          subscribed: false,
          error: errorMsg,
          message: `Failed to register webhook: ${errorMsg}`,
        };
      }

      const data = await response.json();

      return {
        subscribed: true,
        address: addr,
        callbackUrl: params.callbackUrl,
        webhookId: data.webhook_id || data.id || null,
        message: `Webhook registered. TONAPI will POST to ${params.callbackUrl} when transactions occur on ${addr.slice(0, 12)}...`,
      };
    } catch (err: any) {
      return {
        subscribed: false,
        error: err.message,
        message: `Failed to register webhook: ${err.message}`,
      };
    }
  },
});

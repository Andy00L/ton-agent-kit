import { z } from "zod";
import { defineAction, fetchJson } from "@ton-agent-kit/core";

/** TonAPI answers a webhook registration with an id under either key. */
const WebhookResponse = z.object({
  webhook_id: z.union([z.string(), z.number()]).optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

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

    const response = await fetchJson(`${apiBase}/webhook`, WebhookResponse, {
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
      return {
        subscribed: false,
        error: response.reason,
        message: `Failed to register webhook: ${response.reason}`,
      };
    }

    return {
      subscribed: true,
      address: addr,
      callbackUrl: params.callbackUrl,
      webhookId: response.value.webhook_id ?? response.value.id ?? null,
      message: `Webhook registered. TONAPI will POST to ${params.callbackUrl} when transactions occur on ${addr.slice(0, 12)}...`,
    };
  },
});

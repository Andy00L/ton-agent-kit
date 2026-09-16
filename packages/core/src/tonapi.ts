import { z } from "zod";
import { fetchJson } from "./http";
import type { TonNetwork } from "./types";

/**
 * TonAPI v2 base URLs, one per network.
 *
 * Five packages were each rebuilding this ternary inline, sixteen times in
 * total. It lives here beside RPC_ENDPOINTS so a host change is one edit.
 */
export const TONAPI_ENDPOINTS: Record<TonNetwork, string> = {
  mainnet: "https://tonapi.io/v2",
  testnet: "https://testnet.tonapi.io/v2",
};

/** The TonAPI base URL for a network. */
export function tonapiBase(network: TonNetwork): string {
  return TONAPI_ENDPOINTS[network];
}

/** Bearer header for TonAPI, empty when no key is configured. */
export function tonapiHeaders(apiKey?: string): Record<string, string> {
  return apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
}

/**
 * The fields read off `GET /v2/jettons/{address}`.
 *
 * TonAPI returns `decimals` as a decimal **string**, verified against
 * https://tonapi.io/v2/jettons/EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
 * which answers `"decimals": "6"` for USDT on TON.
 */
const JettonMetadataResponse = z.object({
  metadata: z
    .object({
      name: z.string().optional(),
      symbol: z.string().optional(),
      decimals: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
});

/** What a jetton master declares about itself. */
export interface JettonMetadata {
  decimals: number;
  symbol: string;
  name: string;
}

export type JettonMetadataResult =
  | { ok: true; value: JettonMetadata }
  | { ok: false; reason: string };

/** Upper bound accepted for a declared decimals value. */
const MAX_DECLARED_DECIMALS = 36;

/**
 * Read a jetton's declared decimals, symbol and name from its master address.
 *
 * Decimals vary per token, so no caller may assume 9: USDT on TON declares 6,
 * and treating it as 9 moves a thousand times the intended amount. This returns
 * a reason rather than a default, because guessing here moves real funds.
 *
 * @param apiBase - TonAPI base URL for the network in use, from {@link tonapiBase}.
 * @param jettonAddress - The jetton master address, in any TON address form.
 * @param apiKey - Optional TonAPI bearer token, for the higher rate limit.
 *
 * @since 1.4.0
 */
export async function fetchJettonMetadata(
  apiBase: string,
  jettonAddress: string,
  apiKey?: string,
): Promise<JettonMetadataResult> {
  const response = await fetchJson(
    `${apiBase}/jettons/${encodeURIComponent(jettonAddress)}`,
    JettonMetadataResponse,
    { headers: tonapiHeaders(apiKey) },
  );
  if (!response.ok) {
    return {
      ok: false,
      reason: `[fetchJettonMetadata] could not read ${jettonAddress}: ${response.reason}`,
    };
  }

  const declared = response.value.metadata?.decimals;
  if (declared === undefined) {
    return {
      ok: false,
      reason: `[fetchJettonMetadata] ${jettonAddress} declares no decimals, so an amount cannot be converted`,
    };
  }

  const decimals = typeof declared === "number" ? declared : Number(declared);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_DECLARED_DECIMALS) {
    return {
      ok: false,
      reason: `[fetchJettonMetadata] ${jettonAddress} declares decimals "${declared}", which is not a usable value`,
    };
  }

  return {
    ok: true,
    value: {
      decimals,
      symbol: response.value.metadata?.symbol ?? "JETTON",
      name: response.value.metadata?.name ?? "Jetton",
    },
  };
}

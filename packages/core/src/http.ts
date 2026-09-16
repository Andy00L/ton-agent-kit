import type { ZodType } from "zod";
import { describeError } from "./errors";

/**
 * Outcome of a JSON request. Network failures, non-2xx responses, unparseable
 * bodies and unexpected shapes all arrive as `{ ok: false }` so that callers
 * branch on the result instead of wrapping every call in try/catch.
 *
 * @since 1.3.0
 */
export type JsonResult<Value> =
  | { ok: true; value: Value }
  | { ok: false; reason: string };

/** How much of a failed response body to keep in the failure reason. */
const MAX_ERROR_BODY_CHARS = 300;

/**
 * Fetch a URL and validate the JSON body against a zod schema.
 *
 * This is the single boundary where an HTTP response becomes typed data. Keep
 * schemas narrow: describe only the fields the caller reads, and mark anything
 * the upstream API may omit as optional, so that a new field upstream never
 * turns into a failed request here.
 *
 * @param url - The absolute URL to request.
 * @param schema - The zod schema the response body must satisfy.
 * @param init - Optional fetch settings (headers, method, body, signal).
 * @returns The parsed value, or the reason the request could not be used.
 *
 * @example
 * ```typescript
 * const BalanceResponse = z.object({ balance: z.string().optional() });
 * const result = await fetchJson(`${apiBase}/v2/accounts/${address}`, BalanceResponse);
 * if (!result.ok) return { success: false, message: result.reason };
 * const balance = result.value.balance ?? "0";
 * ```
 *
 * @since 1.3.0
 */
export async function fetchJson<Value>(
  url: string,
  schema: ZodType<Value>,
  init?: RequestInit,
): Promise<JsonResult<Value>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (cause) {
    return {
      ok: false,
      reason: `[fetchJson] request failed: ${describeError(cause)}`,
    };
  }

  if (!response.ok) {
    // The body usually carries the upstream error message, which is the only
    // useful part of a failed call. Truncated so a large HTML error page does
    // not end up inside an action result.
    const body = await response.text().catch(() => "");
    const detail = body.trim().slice(0, MAX_ERROR_BODY_CHARS);
    return {
      ok: false,
      reason: `[fetchJson] upstream returned HTTP ${response.status}${detail ? `: ${detail}` : ""}`,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (cause) {
    return {
      ok: false,
      reason: `[fetchJson] response body was not JSON: ${describeError(cause)}`,
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      reason: `[fetchJson] response shape did not match: ${parsed.error.message}`,
    };
  }

  return { ok: true, value: parsed.data };
}

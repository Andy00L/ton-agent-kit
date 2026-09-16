import { z } from "zod";

/**
 * Shapes of the TonAPI v2 responses this plugin reads.
 *
 * Every field is optional on purpose. TonAPI omits fields rather than sending
 * nulls, and a missing field must degrade the result, never fail the request.
 * Only the fields the actions actually read are declared here.
 *
 * sourceRef: https://tonapi.io/api-v2
 */

/** One party of a TON transfer. */
const TransferParty = z.object({
  address: z.string().optional(),
});

/** The TonTransfer payload carried by an account event action. */
const TonTransferAction = z.object({
  amount: z.union([z.string(), z.number()]).optional(),
  sender: TransferParty.optional(),
  recipient: TransferParty.optional(),
  comment: z.string().optional(),
});

/** One action inside an account event. An event can carry several. */
export const AccountEventAction = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  TonTransfer: TonTransferAction.optional(),
});

/** One account event, as returned by `/v2/accounts/{id}/events`. */
export const AccountEvent = z.object({
  event_id: z.string().optional(),
  timestamp: z.number().optional(),
  actions: z.array(AccountEventAction).optional(),
});

export const AccountEventsResponse = z.object({
  events: z.array(AccountEvent).optional(),
});

/** The balance field of `/v2/accounts/{id}`, in nanotons. */
export const AccountBalanceResponse = z.object({
  balance: z.union([z.string(), z.number()]).optional(),
});

/** Nanotons in one TON. */
export const NANOTONS_PER_TON = 1e9;

/** Convert a nanoton amount that may arrive as a string or a number to TON. */
export function nanotonsToTonNumber(
  amount: string | number | undefined,
): number {
  return Number(amount ?? 0) / NANOTONS_PER_TON;
}

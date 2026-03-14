import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadEscrows, saveEscrows } from "../utils";

export const createEscrowAction = defineAction({
  name: "create_escrow",
  description:
    "Create a new escrow deal. Tracks the escrow locally and returns an ID. The beneficiary receives funds when released. " +
    "Deadline can be set via deadlineTimestamp (exact Unix timestamp), deadlineDays, deadlineHours, or deadlineMinutes. " +
    "Priority: timestamp > days > hours > minutes. Defaults to 60 minutes if none provided.",
  schema: z.object({
    beneficiary: z
      .string()
      .describe("Address of the beneficiary (who receives funds)"),
    amount: z.string().describe("Amount of TON to escrow"),
    description: z.string().optional().describe("Description of the deal"),
    deadlineTimestamp: z.coerce
      .number()
      .optional()
      .describe("Exact deadline as Unix timestamp (seconds). Takes highest priority."),
    deadlineDays: z.coerce
      .number()
      .optional()
      .describe("Deadline in days from now (e.g., 90 for ~3 months)"),
    deadlineHours: z.coerce
      .number()
      .optional()
      .describe("Deadline in hours from now (e.g., 24 for 1 day)"),
    deadlineMinutes: z.coerce
      .number()
      .optional()
      .describe("Deadline in minutes from now (e.g., 60 for 1 hour). Default if nothing else set."),
  }),
  handler: async (agent, params) => {
    const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Math.floor(Date.now() / 1000);

    let deadline: number;
    if (params.deadlineTimestamp) {
      deadline = params.deadlineTimestamp;
    } else if (params.deadlineDays) {
      deadline = now + params.deadlineDays * 86400;
    } else if (params.deadlineHours) {
      deadline = now + params.deadlineHours * 3600;
    } else {
      deadline = now + (params.deadlineMinutes || 60) * 60;
    }

    const escrow = {
      id: escrowId,
      depositor: agent.wallet.address.toRawString(),
      beneficiary: params.beneficiary,
      arbiter: agent.wallet.address.toRawString(), // Agent is arbiter by default
      amount: params.amount,
      deadline,
      deadlineISO: new Date(deadline * 1000).toISOString(),
      description: params.description || "",
      status: "created", // created → funded → released | refunded
      depositTxHash: null as string | null,
      settleTxHash: null as string | null,
      createdAt: new Date().toISOString(),
    };

    // Save to escrow store
    const escrows = loadEscrows();
    escrows[escrowId] = escrow;
    saveEscrows(escrows);

    return {
      escrowId,
      status: "created",
      beneficiary: params.beneficiary,
      friendlyBeneficiary: toFriendlyAddress(Address.parse(params.beneficiary), agent.network),
      amount: params.amount + " TON",
      deadline: escrow.deadlineISO,
      description: params.description || "",
      nextStep: `Deposit ${params.amount} TON using deposit_to_escrow with escrowId: ${escrowId}`,
    };
  },
});

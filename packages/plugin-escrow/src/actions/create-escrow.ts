import { z } from "zod";
import { Address, toNano } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import {
  loadEscrows,
  saveEscrows,
  deployEscrowContract,
  registerEscrowOnReputation,
  type EscrowRecord,
} from "../utils";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";

export const createEscrowAction = defineAction<
  {
    beneficiary: string;
    amount: string;
    minArbiters?: number;
    minStake?: string;
    description?: string;
    deadlineTimestamp?: number;
    deadlineDays?: number;
    deadlineHours?: number;
    deadlineMinutes?: number;
  },
  any
>({
  name: "create_escrow",
  description:
    "Create a new on-chain escrow deal. Deploys a Tact Escrow contract to TON. " +
    "No arbiters needed upfront — they self-select by staking during disputes. " +
    "minArbiters sets the minimum arbiters needed for voting (default 3). " +
    "minStake sets the minimum stake per arbiter in TON (default 0.5).",
  schema: z.object({
    beneficiary: z
      .string()
      .describe("Address of the beneficiary (who receives funds)"),
    amount: z.string().describe("Amount of TON to escrow"),
    minArbiters: z.coerce.number().optional().describe("Minimum arbiters for dispute voting. Default 3."),
    minStake: z.string().optional().describe("Minimum stake per arbiter in TON. Default 0.5."),
    requireRepCollateral: z.boolean().optional().describe("Require reputation-based collateral from seller. Default false."),
    minRepScore: z.coerce.number().optional().describe("Minimum rep score for seller (0-100). Default 30. Only if requireRepCollateral=true."),
    baseSellerStake: z.string().optional().describe("Base seller stake in TON before rep adjustment. Default 0.5. Only if requireRepCollateral=true."),
    description: z.string().optional().describe("Description of the deal"),
    deadlineTimestamp: z.coerce.number().optional().describe("Exact deadline as Unix timestamp (seconds)."),
    deadlineDays: z.coerce.number().optional().describe("Deadline in days from now"),
    deadlineHours: z.coerce.number().optional().describe("Deadline in hours from now"),
    deadlineMinutes: z.coerce.number().optional().describe("Deadline in minutes from now. Default 60."),
  }) as any,
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

    const depositor = agent.wallet.address;
    const beneficiary = Address.parse(params.beneficiary);
    const minArbiters = params.minArbiters || 3;
    const minStakeNano = toNano(params.minStake || "0.5");

    // Layer 3+4: Rep collateral
    const requireRepCollateral = params.requireRepCollateral || false;
    const minRepScore = params.minRepScore || 30;
    const baseSellerStake = params.baseSellerStake || "0.5";
    const baseSellerStakeNano = toNano(baseSellerStake);

    // Resolve reputation contract for cross-contract notifications
    const repAddr = resolveContractAddress(undefined, agent.network);
    const reputationContract = repAddr ? Address.parse(repAddr) : depositor; // fallback

    const contractAddress = await deployEscrowContract(
      agent,
      depositor,
      beneficiary,
      BigInt(deadline),
      BigInt(minArbiters),
      minStakeNano,
      reputationContract,
      requireRepCollateral,
      BigInt(minRepScore),
      baseSellerStakeNano,
    );

    // FIX 2: register escrow in reputation whitelist so dispute notifications are accepted
    if (repAddr) {
      await registerEscrowOnReputation(agent, reputationContract, contractAddress);
    }

    const escrow: EscrowRecord = {
      id: escrowId,
      contractAddress: contractAddress.toRawString(),
      depositor: depositor.toRawString(),
      beneficiary: params.beneficiary,
      amount: params.amount,
      deadline,
      deadlineISO: new Date(deadline * 1000).toISOString(),
      minArbiters,
      minStake: params.minStake || "0.5",
      description: params.description || "",
      status: "created",
      createdAt: new Date().toISOString(),
    };

    const escrows = loadEscrows();
    escrows[escrowId] = escrow;
    saveEscrows(escrows);

    return {
      escrowId,
      status: "created (contract deployed on-chain)",
      contractAddress: contractAddress.toRawString(),
      friendlyContract: toFriendlyAddress(contractAddress, agent.network),
      beneficiary: params.beneficiary,
      friendlyBeneficiary: toFriendlyAddress(beneficiary, agent.network),
      minArbiters,
      minStake: params.minStake || "0.5",
      amount: params.amount + " TON",
      deadline: escrow.deadlineISO,
      requireRepCollateral,
      minRepScore: requireRepCollateral ? minRepScore : "disabled",
      baseSellerStake: requireRepCollateral ? baseSellerStake + " TON" : "not required",
      description: params.description || "",
      nextStep: requireRepCollateral
        ? `Seller must stake first using seller_stake_escrow, then deposit ${params.amount} TON`
        : `Deposit ${params.amount} TON using deposit_to_escrow with escrowId: ${escrowId}`,
    };
  },
});

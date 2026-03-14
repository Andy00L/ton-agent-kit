import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import {
  loadEscrows,
  saveEscrows,
  depositToContract,
  getLatestTxHash,
} from "../utils";

export const depositToEscrowAction = defineAction<{ escrowId: string }, any>({
  name: "deposit_to_escrow",
  description:
    "Deposit TON into an on-chain escrow contract. Sends TON to the deployed Escrow smart contract.",
  schema: z.object({
    escrowId: z.string().describe("Escrow ID from create_escrow"),
  }) as any,
  handler: async (agent, params) => {
    const escrows = loadEscrows();
    const escrow = escrows[params.escrowId];
    if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
    if (escrow.status !== "created")
      throw new Error(`Escrow already ${escrow.status}`);

    const contractAddress = Address.parse(escrow.contractAddress);

    // Send Deposit message with TON to the escrow contract
    await depositToContract(agent, contractAddress, escrow.amount);

    // Wait for confirmation
    await new Promise((r) => setTimeout(r, 10000));

    const txHash = await getLatestTxHash(
      agent.wallet.address.toRawString(),
      agent.network,
    );

    // Update index
    escrow.status = "funded";
    saveEscrows(escrows);

    return {
      escrowId: params.escrowId,
      status: "funded (on-chain)",
      contractAddress: escrow.contractAddress,
      friendlyContract: toFriendlyAddress(contractAddress, agent.network),
      amount: escrow.amount + " TON",
      depositTxHash: txHash,
      beneficiary: escrow.beneficiary,
      friendlyBeneficiary: toFriendlyAddress(Address.parse(escrow.beneficiary), agent.network),
      deadline: escrow.deadlineISO,
    };
  },
});

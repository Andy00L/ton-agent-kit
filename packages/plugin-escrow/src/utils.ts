import { existsSync, readFileSync, writeFileSync } from "fs";
import { Address, internal, toNano, beginCell } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import type { AgentContext } from "@ton-agent-kit/core";
import {
  Escrow,
  storeDeploy,
  storeDeposit,
  storeRelease,
  storeRefund,
  storeDeliveryConfirmed,
  storeAutoRelease,
  storeOpenDispute,
  storeJoinDispute,
  storeVoteRelease,
  storeVoteRefund,
  storeClaimReward,
  storeFallbackSettle,
  storeSellerStake,
} from "./contracts/Escrow_Escrow";
import { sendTransaction } from "@ton-agent-kit/core";

const ESCROW_FILE = ".escrow-store.json";

export interface EscrowRecord {
  id: string;
  contractAddress: string;
  depositor: string;
  beneficiary: string;
  amount: string;
  deadline: number;
  deadlineISO: string;
  minArbiters: number;
  minStake: string;
  description: string;
  status: string;
  createdAt: string;
}

export function loadEscrows(): Record<string, EscrowRecord> {
  try {
    if (existsSync(ESCROW_FILE)) {
      return JSON.parse(readFileSync(ESCROW_FILE, "utf-8"));
    }
  } catch (err: any) {
    console.error(`Failed to load escrow store: ${err.message}`);
  }
  return {};
}

export function saveEscrows(escrows: Record<string, EscrowRecord>): void {
  try {
    writeFileSync(ESCROW_FILE, JSON.stringify(escrows, null, 2), "utf-8");
  } catch (err: any) {
    console.error(`Failed to save escrow store: ${err.message}`);
  }
}

// ── On-chain helpers ──

export async function deployEscrowContract(
  agent: AgentContext,
  depositor: Address,
  beneficiary: Address,
  deadline: bigint,
  minArbiters: bigint,
  minStake: bigint,
  reputationContract: Address,
  requireRepCollateral: boolean,
  minRepScore: bigint,
  baseSellerStake: bigint,
): Promise<Address> {
  const escrow = await Escrow.fromInit(depositor, beneficiary, deadline, minArbiters, minStake, reputationContract, requireRepCollateral, minRepScore, baseSellerStake);
  const deployBody = beginCell()
    .store(storeDeploy({ $$type: "Deploy", queryId: 0n }))
    .endCell();

  await sendTransaction(agent, [
    internal({
      to: escrow.address,
      value: toNano("0.05"),
      bounce: false,
      init: escrow.init!,
      body: deployBody,
    }),
  ]);
  return escrow.address;
}

export async function depositToContract(agent: AgentContext, contractAddress: Address, amount: string): Promise<void> {
  const body = beginCell().store(storeDeposit({ $$type: "Deposit", queryId: 0n })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano(amount), bounce: true, body })]);
}

export async function releaseContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeRelease({ $$type: "Release", queryId: 0n })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function refundContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeRefund({ $$type: "Refund", queryId: 0n })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function confirmDeliveryOnContract(agent: AgentContext, contractAddress: Address, x402TxHash: string): Promise<void> {
  const body = beginCell().store(storeDeliveryConfirmed({ $$type: "DeliveryConfirmed", x402TxHash })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function autoReleaseOnContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeAutoRelease({ $$type: "AutoRelease" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function openDisputeOnContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeOpenDispute({ $$type: "OpenDispute" })).endCell();
  // 0.05 TON: 0.02 escrow gas + 0.03 for cross-contract notification to reputation
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.05"), bounce: true, body })]);
}

export async function joinDisputeOnContract(agent: AgentContext, contractAddress: Address, stakeAmount: string): Promise<void> {
  const body = beginCell().store(storeJoinDispute({ $$type: "JoinDispute" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano(stakeAmount), bounce: true, body })]);
}

export async function voteReleaseOnContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeVoteRelease({ $$type: "VoteRelease" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function voteRefundOnContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeVoteRefund({ $$type: "VoteRefund" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function claimRewardOnContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeClaimReward({ $$type: "ClaimReward" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function fallbackSettleOnContract(agent: AgentContext, contractAddress: Address): Promise<void> {
  const body = beginCell().store(storeFallbackSettle({ $$type: "FallbackSettle" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano("0.02"), bounce: true, body })]);
}

export async function sellerStakeOnContract(agent: AgentContext, contractAddress: Address, stakeAmount: string): Promise<void> {
  const body = beginCell().store(storeSellerStake({ $$type: "SellerStake" })).endCell();
  await sendTransaction(agent, [internal({ to: contractAddress, value: toNano(stakeAmount), bounce: true, body })]);
}

export async function getContractState(agent: AgentContext, contractAddress: Address) {
  const client = new TonClient4({ endpoint: agent.rpcUrl });
  const contract = client.open(Escrow.fromAddress(contractAddress));
  const data = await contract.getEscrowData();
  const balance = await contract.getBalance();
  return { ...data, balance };
}

export async function getLatestTxHash(address: string, network: "testnet" | "mainnet"): Promise<string> {
  const apiBase = network === "testnet" ? "https://testnet.tonapi.io/v2" : "https://tonapi.io/v2";
  try {
    const res = await fetch(`${apiBase}/accounts/${encodeURIComponent(address)}/events?limit=1`);
    const data = await res.json();
    return data.events?.[0]?.event_id || "pending";
  } catch {
    return "pending";
  }
}

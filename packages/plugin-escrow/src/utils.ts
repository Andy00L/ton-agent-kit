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
} from "../../../contracts/output/Escrow_Escrow";
import { sendTransaction } from "@ton-agent-kit/core";

const ESCROW_FILE = ".escrow-store.json";

// ── JSON index (escrowId → metadata + contract address) ───────────────────

export interface EscrowRecord {
  id: string;
  contractAddress: string;
  depositor: string;
  beneficiary: string;
  arbiter: string;
  amount: string;
  deadline: number;
  deadlineISO: string;
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

// ── On-chain helpers ──────────────────────────────────────────────────────

/**
 * Deploy a new Escrow contract instance and return the contract address.
 */
export async function deployEscrowContract(
  agent: AgentContext,
  depositor: Address,
  beneficiary: Address,
  arbiter: Address,
  deadline: bigint,
): Promise<Address> {
  const escrow = await Escrow.fromInit(depositor, beneficiary, arbiter, deadline);

  const deployBody = beginCell()
    .store(storeDeploy({ $$type: "Deploy", queryId: BigInt(0) }))
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

/**
 * Send a Deposit message (with TON attached) to an escrow contract.
 */
export async function depositToContract(
  agent: AgentContext,
  contractAddress: Address,
  amount: string,
): Promise<void> {
  const body = beginCell()
    .store(storeDeposit({ $$type: "Deposit", queryId: BigInt(0) }))
    .endCell();

  await sendTransaction(agent, [
    internal({
      to: contractAddress,
      value: toNano(amount),
      bounce: true,
      body,
    }),
  ]);
}

/**
 * Send a Release message to an escrow contract.
 */
export async function releaseContract(
  agent: AgentContext,
  contractAddress: Address,
): Promise<void> {
  const body = beginCell()
    .store(storeRelease({ $$type: "Release", queryId: BigInt(0) }))
    .endCell();

  await sendTransaction(agent, [
    internal({
      to: contractAddress,
      value: toNano("0.02"),
      bounce: true,
      body,
    }),
  ]);
}

/**
 * Send a Refund message to an escrow contract.
 */
export async function refundContract(
  agent: AgentContext,
  contractAddress: Address,
): Promise<void> {
  const body = beginCell()
    .store(storeRefund({ $$type: "Refund", queryId: BigInt(0) }))
    .endCell();

  await sendTransaction(agent, [
    internal({
      to: contractAddress,
      value: toNano("0.02"),
      bounce: true,
      body,
    }),
  ]);
}

/**
 * Read on-chain escrow state via get method.
 */
export async function getContractState(agent: AgentContext, contractAddress: Address) {
  const client = new TonClient4({ endpoint: agent.rpcUrl });
  const contract = client.open(Escrow.fromAddress(contractAddress));
  const data = await contract.getEscrowData();
  const balance = await contract.getBalance();
  return { ...data, balance };
}

/**
 * Look up the latest tx hash for an address via TonAPI.
 */
export async function getLatestTxHash(
  address: string,
  network: "testnet" | "mainnet",
): Promise<string> {
  const apiBase =
    network === "testnet"
      ? "https://testnet.tonapi.io/v2"
      : "https://tonapi.io/v2";
  try {
    const res = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(address)}/events?limit=1`,
    );
    const data = await res.json();
    return data.events?.[0]?.event_id || "pending";
  } catch {
    return "pending";
  }
}

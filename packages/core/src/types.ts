import type { Address, MessageRelaxed } from "@ton/core";
import type { TonClient, TonClient4 } from "@ton/ton";
import { z } from "zod";

// ============================================================
// Wallet Provider
// ============================================================

/**
 * Abstract wallet interface for signing and sending TON transactions.
 * Implemented by {@link KeypairWallet} and {@link ReadOnlyWallet}.
 * @since 1.0.0
 */
export interface WalletProvider {
  /** The wallet's address on TON */
  address: Address;
  /** Send one or more messages (the reliable way to transact on TON) */
  sendTransfer(messages: MessageRelaxed[]): Promise<void>;
  /** Sign arbitrary data (optional, for identity proofs) */
  sign?(data: Buffer): Promise<Buffer>;
}

// ============================================================
// Action — a single autonomous operation an agent can perform
// ============================================================

/**
 * A single blockchain operation that an agent can execute.
 * Actions are the building blocks of the SDK — each plugin registers one or more actions.
 * Created with {@link defineAction}.
 *
 * @typeParam TInput - The Zod-validated input type.
 * @typeParam TOutput - The return type of the handler.
 * @since 1.0.0
 */
export interface Action<TInput = any, TOutput = any> {
  /** Unique identifier, e.g. "transfer_ton" */
  name: string;
  /** Human-readable description (used as LLM tool description) */
  description: string;
  /** Zod schema for validating and describing inputs */
  schema: z.ZodType<TInput>;
  /** Execute the action */
  handler: (agent: AgentContext, params: TInput) => Promise<TOutput>;
  /** Optional examples for better LLM understanding */
  examples?: Array<{
    input: TInput;
    output: TOutput;
    description?: string;
  }>;
}

// ============================================================
// Plugin — a collection of related actions
// ============================================================

/**
 * A collection of related {@link Action}s that can be registered on a {@link TonAgentKit} instance.
 * Created with {@link definePlugin}. Registered with `agent.use(plugin)`.
 * @since 1.0.0
 */
export interface Plugin {
  /** Plugin name, e.g. "token", "defi" */
  name: string;
  /** Actions provided by this plugin */
  actions: Action[];
  /** Optional initialization hook */
  initialize?: (agent: AgentContext) => Promise<void>;
}

// ============================================================
// Agent Context — what actions receive to interact with TON
// ============================================================

/**
 * Runtime context passed to every action handler. Provides access to the wallet,
 * blockchain client, network configuration, and API keys.
 * @since 1.0.0
 */
export interface AgentContext {
  /** TON blockchain client */
  connection: TonClient4 | TonClient;
  /** Wallet provider for signing transactions */
  wallet: WalletProvider;
  /** Network: mainnet or testnet */
  network: TonNetwork;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Optional config (API keys, etc.) */
  config: Record<string, string>;
}

// ============================================================
// Agent Kit Configuration
// ============================================================

/**
 * Configuration object passed to the TonAgentKit constructor.
 * Supports arbitrary string keys for API keys and custom settings.
 * @since 1.0.0
 */
export interface TonAgentKitConfig {
  /** Optional API keys for LLMs or services */
  OPENAI_API_KEY?: string;
  TONAPI_KEY?: string;
  [key: string]: string | undefined;
}

/** TON network identifier. Affects RPC endpoints, address formats, and explorer URLs. @since 1.0.0 */
export type TonNetwork = "mainnet" | "testnet";

// ============================================================
// Action Result Types
// ============================================================

/** Result of a write transaction (transfer, swap, deploy, etc.). @since 1.0.0 */
export interface TransactionResult {
  /** Transaction hash */
  txHash: string;
  /** Human-readable status */
  status: "sent" | "confirmed" | "failed";
  /** Optional explorer link */
  explorerUrl?: string;
  /** Fee paid */
  fee?: string;
}

/** Result of a balance query. @since 1.0.0 */
export interface BalanceResult {
  /** Balance in TON (human-readable) */
  balance: string;
  /** Balance in nanoton */
  balanceRaw: string;
  /** Address queried */
  address: string;
}

/** Result of a Jetton (fungible token) balance query. @since 1.0.0 */
export interface JettonBalanceResult {
  /** Balance in token units */
  balance: string;
  /** Balance in raw units */
  balanceRaw: string;
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Decimals */
  decimals: number;
}

/** Result of a DEX swap operation. @since 1.0.0 */
export interface SwapResult extends TransactionResult {
  /** Amount sent */
  fromAmount: string;
  /** Token sent */
  fromToken: string;
  /** Amount received (estimated) */
  toAmount: string;
  /** Token received */
  toToken: string;
  /** DEX used */
  dex: "dedust" | "stonfi";
}

/** Metadata for a Jetton (fungible token) on TON. @since 1.0.0 */
export interface JettonInfo {
  /** Jetton master address */
  address: string;
  /** Token name */
  name: string;
  /** Token symbol */
  symbol: string;
  /** Decimals */
  decimals: number;
  /** Total supply */
  totalSupply: string;
  /** Description */
  description?: string;
  /** Image URL */
  image?: string;
}

/** Metadata for an NFT on TON. @since 1.0.0 */
export interface NftInfo {
  /** NFT address */
  address: string;
  /** NFT index in collection */
  index: number;
  /** Owner address */
  owner: string;
  /** Collection address */
  collection?: string;
  /** Metadata */
  metadata?: Record<string, any>;
}

/** Result of a TON DNS domain lookup. @since 1.0.0 */
export interface DnsInfo {
  /** Domain name */
  domain: string;
  /** Resolved address */
  address?: string;
  /** Expiration timestamp */
  expiresAt?: number;
}

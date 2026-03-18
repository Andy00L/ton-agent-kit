// ============================================================
// @ton-agent-kit/core
// Connect any AI agent to TON protocols
// ============================================================

/** Agent — main entry point and autonomous loop */
export { TonAgentKit } from "./agent";
export type { RunLoopOptions, RunLoopResult } from "./agent";

/** Cache — TTL-based caching for read actions */
export { ActionCache } from "./cache";
export type { CacheConfig, CacheEntry } from "./cache";

/** Plugin system — define and register plugins and actions */
export { defineAction, definePlugin, PluginRegistry } from "./plugin";

/** Wallets — keypair-based and read-only wallet providers */
export { KeypairWallet, ReadOnlyWallet } from "./wallet";
export type { WalletConfig, WalletVersion } from "./wallet";

/** Core type definitions — actions, plugins, contexts, and result shapes */
export type {
  Action,
  AgentContext,
  BalanceResult,
  DnsInfo,
  JettonBalanceResult,
  JettonInfo,
  NftInfo,
  Plugin,
  SwapResult,
  TonAgentKitConfig,
  TonNetwork,
  TransactionResult,
  WalletProvider,
} from "./types";

/** Utility functions — address formatting, unit conversion, transaction helpers */
export {
  explorerAddressUrl,
  explorerUrl,
  nanoToTon,
  parseAddress,
  retry,
  RPC_ENDPOINTS,
  sendTransaction,
  sleep,
  toFriendlyAddress,
  TONCENTER_ENDPOINTS,
  tonToNano,
} from "./utils";

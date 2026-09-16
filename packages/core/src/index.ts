// ============================================================
// @ton-agent-kit/core
// Connect any AI agent to TON protocols
// ============================================================

/** Agent: main entry point and autonomous loop */
export { TonAgentKit } from "./agent";
export type { RunLoopOptions, RunLoopResult } from "./agent";

/** Cache: TTL-based caching for read actions */
export { ActionCache } from "./cache";
export type { CacheConfig, CacheEntry } from "./cache";

/** Plugin system: define and register plugins and actions */
export { defineAction, definePlugin, PluginRegistry } from "./plugin";

/** Wallets: keypair-based and read-only wallet providers */
export {
  createWalletContract,
  DEFAULT_SEND_MODE,
  isSigningWallet,
  KeypairWallet,
  openWalletContract,
  ReadOnlyWallet,
  sendFromWalletContract,
} from "./wallet";
export type { SigningWallet, WalletConfig, WalletVersion } from "./wallet";

/** Validated JSON over HTTP, the single boundary for upstream API responses */
export { fetchJson } from "./http";
export type { JsonResult } from "./http";

/** Error helpers shared by every catch block in the kit */
export { describeError } from "./errors";

/** Core type definitions: actions, plugins, contexts, and result shapes */
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

/** Gas estimation for contract calls */
export { estimateGas, DEFAULT_GAS, CROSS_CONTRACT_GAS } from "./gas";

/** Post-TX contract verification */
export { verifyContractExecution } from "./verify";
export type { VerifyResult } from "./verify";

/** Utility functions: address formatting, unit conversion, transaction helpers */
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

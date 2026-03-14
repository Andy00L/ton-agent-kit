import { definePlugin } from "@ton-agent-kit/core";
import { getTransactionHistoryAction } from "./actions/get-transaction-history";
import { getWalletInfoAction } from "./actions/get-wallet-info";

/**
 * Analytics Plugin — Wallet analytics and transaction history
 *
 * Actions:
 * - get_transaction_history: Get recent transaction history
 * - get_wallet_info: Get detailed wallet information
 */
const AnalyticsPlugin = definePlugin({
  name: "analytics",
  actions: [getTransactionHistoryAction, getWalletInfoAction],
});

export default AnalyticsPlugin;

export { getTransactionHistoryAction, getWalletInfoAction };

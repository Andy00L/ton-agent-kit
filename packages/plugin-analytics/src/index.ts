import { definePlugin } from "@ton-agent-kit/core";
import { getTransactionHistoryAction } from "./actions/get-transaction-history";
import { getWalletInfoAction } from "./actions/get-wallet-info";
import { getPortfolioMetricsAction } from "./actions/get-portfolio-metrics";
import { getEquityCurveAction } from "./actions/get-equity-curve";
import { waitForTransactionAction } from "./actions/wait-for-transaction";
import { subscribeWebhookAction } from "./actions/subscribe-webhook";
import { callContractMethodAction } from "./actions/call-contract-method";
import { getAccountsBulkAction } from "./actions/get-accounts-bulk";

/**
 * Analytics Plugin -- Wallet analytics, transaction history, portfolio metrics,
 * and real-time event subscriptions.
 *
 * Provides deep insight into wallet activity and on-chain state: transaction
 * history, bulk account lookups, portfolio PnL / ROI, equity curves, real-time
 * transaction streaming via SSE, webhook subscriptions, and arbitrary smart
 * contract get-method calls.
 *
 * Actions:
 * - `get_transaction_history` -- Get recent transaction history for a wallet
 * - `get_wallet_info` -- Get detailed wallet information (balance, status, interfaces)
 * - `get_portfolio_metrics` -- Compute PnL, ROI, win rate, and max drawdown
 * - `get_equity_curve` -- Daily balance time-series for charting
 * - `wait_for_transaction` -- Wait for the next transaction via SSE streaming
 * - `subscribe_webhook` -- Register a TONAPI webhook for transaction notifications
 * - `call_contract_method` -- Call any get-method on any smart contract
 * - `get_accounts_bulk` -- Fetch account info for multiple addresses in one call
 *
 * @example
 * ```typescript
 * import AnalyticsPlugin from "@ton-agent-kit/plugin-analytics";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(AnalyticsPlugin);
 * const history = await agent.runAction("get_transaction_history", { limit: 10 });
 * ```
 *
 * @since 1.0.0
 */
const AnalyticsPlugin = definePlugin({
  name: "analytics",
  actions: [
    getTransactionHistoryAction,
    getWalletInfoAction,
    getPortfolioMetricsAction,
    getEquityCurveAction,
    waitForTransactionAction,
    subscribeWebhookAction,
    callContractMethodAction,
    getAccountsBulkAction,
  ],
});

/** @since 1.0.0 */
export default AnalyticsPlugin;

export {
  getTransactionHistoryAction,
  getWalletInfoAction,
  getPortfolioMetricsAction,
  getEquityCurveAction,
  waitForTransactionAction,
  subscribeWebhookAction,
  callContractMethodAction,
  getAccountsBulkAction,
};

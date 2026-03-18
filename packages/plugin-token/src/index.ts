import { definePlugin } from "@ton-agent-kit/core";
import { getBalanceAction } from "./actions/get-balance";
import { transferTonAction } from "./actions/transfer-ton";
import { transferJettonAction } from "./actions/transfer-jetton";
import { getJettonBalanceAction } from "./actions/get-jetton-balance";
import { deployJettonAction } from "./actions/deploy-jetton";
import { getJettonInfoAction } from "./actions/get-jetton-info";
import { simulateTransactionAction } from "./actions/simulate-transaction";

/**
 * Token Plugin -- TON and Jetton (fungible token) operations.
 *
 * Provides actions for querying balances, transferring native TON and Jetton
 * tokens, deploying new Jettons, inspecting token metadata, and simulating
 * transactions before committing them on-chain.
 *
 * Actions:
 * - `get_balance` -- Get the TON balance of any wallet
 * - `get_jetton_balance` -- Get a Jetton token balance for a wallet
 * - `transfer_ton` -- Send TON to another address with an optional comment
 * - `transfer_jetton` -- Send Jetton tokens to another address
 * - `deploy_jetton` -- Deploy a new Jetton token contract
 * - `get_jetton_info` -- Get Jetton metadata (name, symbol, decimals, etc.)
 * - `simulate_transaction` -- Simulate a TON transfer via emulation without broadcasting
 *
 * @example
 * ```typescript
 * import TokenPlugin from "@ton-agent-kit/plugin-token";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(TokenPlugin);
 * const balance = await agent.runAction("get_balance", {});
 * ```
 *
 * @since 1.0.0
 */
const TokenPlugin = definePlugin({
  name: "token",
  actions: [
    getBalanceAction,
    getJettonBalanceAction,
    transferTonAction,
    transferJettonAction,
    deployJettonAction,
    getJettonInfoAction,
    simulateTransactionAction,
  ],
});

/** @since 1.0.0 */
export default TokenPlugin;

// Also export individual actions for selective use
export {
  getBalanceAction,
  getJettonBalanceAction,
  transferTonAction,
  transferJettonAction,
  deployJettonAction,
  getJettonInfoAction,
  simulateTransactionAction,
};

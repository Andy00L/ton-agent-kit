import { definePlugin } from "@ton-agent-kit/core";
import { getBalanceAction } from "./actions/get-balance";
import { transferTonAction } from "./actions/transfer-ton";
import { transferJettonAction } from "./actions/transfer-jetton";
import { getJettonBalanceAction } from "./actions/get-jetton-balance";
import { deployJettonAction } from "./actions/deploy-jetton";
import { getJettonInfoAction } from "./actions/get-jetton-info";

/**
 * Token Plugin — TON and Jetton operations
 *
 * Actions:
 * - get_balance: Get TON balance
 * - get_jetton_balance: Get Jetton token balance
 * - transfer_ton: Send TON
 * - transfer_jetton: Send Jettons
 * - deploy_jetton: Deploy a new token
 * - get_jetton_info: Get token metadata
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
  ],
});

export default TokenPlugin;

// Also export individual actions for selective use
export {
  getBalanceAction,
  getJettonBalanceAction,
  transferTonAction,
  transferJettonAction,
  deployJettonAction,
  getJettonInfoAction,
};

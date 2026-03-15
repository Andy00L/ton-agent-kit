import { definePlugin } from "@ton-agent-kit/core";
import { swapDedustAction } from "./actions/swap-dedust";
import { swapStonfiAction } from "./actions/swap-stonfi";
import { getPriceAction } from "./actions/get-price";
import { createDcaOrderAction } from "./actions/create-dca-order";
import { createLimitOrderAction } from "./actions/create-limit-order";
import { cancelOrderAction } from "./actions/cancel-order";
import { getYieldPoolsAction } from "./actions/get-yield-pools";
import { yieldDepositAction } from "./actions/yield-deposit";
import { yieldWithdrawAction } from "./actions/yield-withdraw";
import { getStakingPoolsAction } from "./actions/get-staking-pools";
import { getTokenTrustAction } from "./actions/get-token-trust";

/**
 * DeFi Plugin — DEX swaps, prices, liquidity, DCA, limit orders, yield, staking, and trust scores on TON
 *
 * Actions:
 * - swap_dedust: Swap tokens on DeDust
 * - swap_stonfi: Swap tokens on STON.fi
 * - get_price: Get token price from DEX pools
 * - create_dca_order: Create a Dollar Cost Averaging order (swap.coffee)
 * - create_limit_order: Create a limit order (swap.coffee)
 * - cancel_order: Cancel an active DCA or limit order (swap.coffee)
 * - get_yield_pools: List yield farming / liquidity pools (swap.coffee)
 * - yield_deposit: Deposit into a yield farming pool
 * - yield_withdraw: Withdraw from a yield farming pool
 * - get_staking_pools: List staking pools with APR (swap.coffee)
 * - get_token_trust: Get token trust score (DYOR.io)
 */
const DefiPlugin = definePlugin({
  name: "defi",
  actions: [
    swapDedustAction,
    swapStonfiAction,
    getPriceAction,
    createDcaOrderAction,
    createLimitOrderAction,
    cancelOrderAction,
    getYieldPoolsAction,
    yieldDepositAction,
    yieldWithdrawAction,
    getStakingPoolsAction,
    getTokenTrustAction,
  ],
});

export default DefiPlugin;
export {
  swapDedustAction,
  swapStonfiAction,
  getPriceAction,
  createDcaOrderAction,
  createLimitOrderAction,
  cancelOrderAction,
  getYieldPoolsAction,
  yieldDepositAction,
  yieldWithdrawAction,
  getStakingPoolsAction,
  getTokenTrustAction,
};

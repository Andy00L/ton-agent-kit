import { definePlugin } from "@ton-agent-kit/core";
import { swapDedustAction } from "./actions/swap-dedust";
import { swapStonfiAction } from "./actions/swap-stonfi";
import { getPriceAction } from "./actions/get-price";

/**
 * DeFi Plugin — DEX swaps, prices, and liquidity on TON
 *
 * Actions:
 * - swap_dedust: Swap tokens on DeDust
 * - swap_stonfi: Swap tokens on STON.fi
 * - get_price: Get token price from DEX pools
 */
const DefiPlugin = definePlugin({
  name: "defi",
  actions: [swapDedustAction, swapStonfiAction, getPriceAction],
});

export default DefiPlugin;
export { swapDedustAction, swapStonfiAction, getPriceAction };

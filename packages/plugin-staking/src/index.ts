import { definePlugin } from "@ton-agent-kit/core";
import { getStakingInfoAction } from "./actions/get-staking-info";
import { stakeTonAction } from "./actions/stake-ton";
import { unstakeTonAction } from "./actions/unstake-ton";

/**
 * Staking Plugin -- Native TON staking operations.
 *
 * Enables agents to query available validator staking pools and their APRs,
 * stake TON with a chosen validator pool, and unstake to reclaim funds.
 *
 * Actions:
 * - `get_staking_info` -- Get staking pools and validator info
 * - `stake_ton` -- Stake TON with a validator pool
 * - `unstake_ton` -- Unstake TON from a validator pool
 *
 * @example
 * ```typescript
 * import StakingPlugin from "@ton-agent-kit/plugin-staking";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(StakingPlugin);
 * const pools = await agent.runAction("get_staking_info", {});
 * ```
 *
 * @since 1.0.0
 */
const StakingPlugin = definePlugin({
  name: "staking",
  actions: [getStakingInfoAction, stakeTonAction, unstakeTonAction],
});

/** @since 1.0.0 */
export default StakingPlugin;

export { getStakingInfoAction, stakeTonAction, unstakeTonAction };

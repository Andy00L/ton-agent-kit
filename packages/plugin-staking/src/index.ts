import { definePlugin } from "@ton-agent-kit/core";
import { getStakingInfoAction } from "./actions/get-staking-info";
import { stakeTonAction } from "./actions/stake-ton";
import { unstakeTonAction } from "./actions/unstake-ton";

/**
 * Staking Plugin — TON staking operations
 *
 * Actions:
 * - get_staking_info: Get staking pools and validator info
 * - stake_ton: Stake TON with a validator pool
 * - unstake_ton: Unstake TON from a validator pool
 */
const StakingPlugin = definePlugin({
  name: "staking",
  actions: [getStakingInfoAction, stakeTonAction, unstakeTonAction],
});

export default StakingPlugin;

export { getStakingInfoAction, stakeTonAction, unstakeTonAction };

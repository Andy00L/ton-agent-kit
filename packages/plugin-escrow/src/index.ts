import { definePlugin } from "@ton-agent-kit/core";
import { createEscrowAction } from "./actions/create-escrow";
import { depositToEscrowAction } from "./actions/deposit-to-escrow";
import { releaseEscrowAction } from "./actions/release-escrow";
import { refundEscrowAction } from "./actions/refund-escrow";
import { getEscrowInfoAction } from "./actions/get-escrow-info";
import { confirmDeliveryAction } from "./actions/confirm-delivery";
import { autoReleaseEscrowAction } from "./actions/auto-release-escrow";
import { openDisputeAction } from "./actions/open-dispute";
import { joinDisputeAction } from "./actions/join-dispute";
import { voteReleaseAction } from "./actions/vote-release";
import { voteRefundAction } from "./actions/vote-refund";
import { claimRewardAction } from "./actions/claim-reward";
import { fallbackSettleAction } from "./actions/fallback-settle";
import { sellerStakeAction } from "./actions/seller-stake";

/**
 * Escrow Plugin -- TON escrow with self-selecting arbiters, staking, and
 * dispute-resolution voting.
 *
 * Manages the full lifecycle of on-chain escrow deals: creation, funding,
 * delivery confirmation, release/refund, and a dispute flow where independent
 * arbiters self-select by staking TON, then vote to release or refund.
 *
 * Actions:
 * - `create_escrow` -- Create a new escrow deal (arbiters self-select during disputes)
 * - `deposit_to_escrow` -- Fund an escrow with TON
 * - `release_escrow` -- Release funds to beneficiary (depositor only, non-dispute)
 * - `refund_escrow` -- Refund funds to depositor
 * - `get_escrow_info` -- Get escrow details or list all escrows
 * - `confirm_delivery` -- Confirm service delivery on-chain (buyer only)
 * - `auto_release_escrow` -- Release after deadline (requires delivery confirmation)
 * - `open_dispute` -- Open a dispute, freezing the escrow for arbiter voting
 * - `join_dispute` -- Stake TON to join as an arbiter in a dispute
 * - `vote_release` -- Arbiter votes to release funds during a dispute
 * - `vote_refund` -- Arbiter votes to refund funds during a dispute
 * - `claim_reward` -- Claim arbiter reward after settlement (winners profit, losers forfeit)
 * - `fallback_settle` -- Settle after the 72 h voting deadline expires
 * - `seller_stake` -- Seller stakes TON to signal commitment to the deal
 *
 * @example
 * ```typescript
 * import EscrowPlugin from "@ton-agent-kit/plugin-escrow";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(EscrowPlugin);
 * const escrow = await agent.runAction("create_escrow", {
 *   beneficiary: "EQBx...",
 *   amount: "1.5",
 * });
 * ```
 *
 * @since 1.0.0
 */
const EscrowPlugin = definePlugin({
  name: "escrow",
  actions: [
    createEscrowAction,
    depositToEscrowAction,
    releaseEscrowAction,
    refundEscrowAction,
    getEscrowInfoAction,
    confirmDeliveryAction,
    autoReleaseEscrowAction,
    openDisputeAction,
    joinDisputeAction,
    voteReleaseAction,
    voteRefundAction,
    claimRewardAction,
    fallbackSettleAction,
    sellerStakeAction,
  ],
});

/** @since 1.0.0 */
export default EscrowPlugin;

export {
  createEscrowAction,
  depositToEscrowAction,
  releaseEscrowAction,
  refundEscrowAction,
  getEscrowInfoAction,
  confirmDeliveryAction,
  autoReleaseEscrowAction,
  openDisputeAction,
  joinDisputeAction,
  voteReleaseAction,
  voteRefundAction,
  claimRewardAction,
  fallbackSettleAction,
  sellerStakeAction,
};

import { definePlugin } from "@ton-agent-kit/core";
import { createEscrowAction } from "./actions/create-escrow";
import { depositToEscrowAction } from "./actions/deposit-to-escrow";
import { releaseEscrowAction } from "./actions/release-escrow";
import { refundEscrowAction } from "./actions/refund-escrow";
import { getEscrowInfoAction } from "./actions/get-escrow-info";

/**
 * Escrow Plugin — TON escrow deal management
 *
 * Actions:
 * - create_escrow: Create a new escrow deal
 * - deposit_to_escrow: Fund an escrow with TON
 * - release_escrow: Release funds to beneficiary
 * - refund_escrow: Refund funds to depositor
 * - get_escrow_info: Get escrow details or list all
 */
const EscrowPlugin = definePlugin({
  name: "escrow",
  actions: [
    createEscrowAction,
    depositToEscrowAction,
    releaseEscrowAction,
    refundEscrowAction,
    getEscrowInfoAction,
  ],
});

export default EscrowPlugin;

export {
  createEscrowAction,
  depositToEscrowAction,
  releaseEscrowAction,
  refundEscrowAction,
  getEscrowInfoAction,
};

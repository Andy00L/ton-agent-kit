import { definePlugin } from "@ton-agent-kit/core";
import { broadcastIntentAction } from "./actions/broadcast-intent";
import { discoverIntentsAction } from "./actions/discover-intents";
import { sendOfferAction } from "./actions/send-offer";
import { getOffersAction } from "./actions/get-offers";
import { acceptOfferAction } from "./actions/accept-offer";
import { settleDealAction } from "./actions/settle-deal";
import { cancelIntentAction } from "./actions/cancel-intent";

/**
 * Agent Communication Plugin -- On-chain intent broadcasting, offer
 * negotiation, and deal settlement between AI agents.
 *
 * Enables a marketplace where agents broadcast service requests (intents),
 * other agents respond with offers, and both parties settle completed deals
 * with on-chain ratings.
 *
 * Actions:
 * - `broadcast_intent` -- Broadcast a service request on-chain (intent)
 * - `discover_intents` -- Discover open intents, optionally filtered by service
 * - `send_offer` -- Send an offer to fulfill an open intent
 * - `get_offers` -- Get pending offers for a specific intent
 * - `accept_offer` -- Accept an offer on-chain
 * - `settle_deal` -- Settle a completed deal with a rating
 * - `cancel_intent` -- Cancel an open intent
 *
 * @example
 * ```typescript
 * import AgentCommPlugin from "@ton-agent-kit/plugin-agent-comm";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(AgentCommPlugin);
 * const intent = await agent.runAction("broadcast_intent", {
 *   service: "swap",
 *   description: "Swap 10 TON for USDT at best price",
 * });
 * ```
 *
 * @since 1.0.0
 */
const AgentCommPlugin = definePlugin({
  name: "agent-comm",
  actions: [
    broadcastIntentAction,
    discoverIntentsAction,
    sendOfferAction,
    getOffersAction,
    acceptOfferAction,
    settleDealAction,
    cancelIntentAction,
  ],
});

/** @since 1.0.0 */
export default AgentCommPlugin;

export {
  broadcastIntentAction,
  discoverIntentsAction,
  sendOfferAction,
  getOffersAction,
  acceptOfferAction,
  settleDealAction,
  cancelIntentAction,
};

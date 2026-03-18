import { definePlugin } from "@ton-agent-kit/core";
import { createRegisterAgentAction, registerAgentAction } from "./actions/register-agent";
import { createDiscoverAgentAction, discoverAgentAction } from "./actions/discover-agent";
import { createGetAgentReputationAction, getAgentReputationAction } from "./actions/get-agent-reputation";
import { deployReputationContractAction } from "./actions/deploy-reputation-contract";
import { createWithdrawReputationFeesAction, withdrawReputationFeesAction } from "./actions/withdraw-reputation-fees";
import { processPendingRatingsAction } from "./actions/process-pending-ratings";
import { getOpenDisputesAction } from "./actions/get-open-disputes";
import { triggerCleanupAction } from "./actions/trigger-cleanup";
import { getAgentCleanupInfoAction } from "./actions/get-agent-cleanup-info";

/**
 * Identity Plugin -- On-chain agent registration, discovery, and reputation
 * management.
 *
 * Allows AI agents to register themselves on-chain, discover other agents by
 * capability, query and manage reputation scores backed by a Tact smart
 * contract, and perform administrative operations such as fee withdrawal and
 * cleanup of stale registrations.
 *
 * Actions:
 * - `register_agent` -- Register the current agent on-chain with metadata
 * - `discover_agent` -- Discover registered agents, optionally filtered by service
 * - `get_agent_reputation` -- Query an agent's on-chain reputation score
 * - `deploy_reputation_contract` -- Deploy a new Reputation smart contract
 * - `withdraw_reputation_fees` -- Withdraw accumulated fees from the Reputation contract
 * - `process_pending_ratings` -- Process queued ratings into finalized scores
 * - `get_open_disputes` -- List currently open reputation disputes
 * - `trigger_cleanup` -- Trigger cleanup of expired / stale agent registrations
 * - `get_agent_cleanup_info` -- Get cleanup eligibility info for an agent
 *
 * @example
 * ```typescript
 * import IdentityPlugin from "@ton-agent-kit/plugin-identity";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(IdentityPlugin);
 * await agent.runAction("register_agent", { name: "my-agent", services: ["swap"] });
 * ```
 *
 * @since 1.0.0
 */
export function createIdentityPlugin(opts?: { contractAddress?: string }) {
  const addr = opts?.contractAddress;
  return definePlugin({
    name: "identity",
    actions: [
      createRegisterAgentAction(addr),
      createDiscoverAgentAction(addr),
      createGetAgentReputationAction(addr),
      deployReputationContractAction,
      createWithdrawReputationFeesAction(addr),
      processPendingRatingsAction,
      getOpenDisputesAction,
      triggerCleanupAction,
      getAgentCleanupInfoAction,
    ],
  });
}

const IdentityPlugin = createIdentityPlugin();
/** @since 1.0.0 */
export default IdentityPlugin;

export {
  registerAgentAction,
  discoverAgentAction,
  getAgentReputationAction,
  deployReputationContractAction,
  withdrawReputationFeesAction,
  processPendingRatingsAction,
  getOpenDisputesAction,
  triggerCleanupAction,
  getAgentCleanupInfoAction,
};

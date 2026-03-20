# On-Chain Reputation System

A shared Tact smart contract on TON testnet. It stores agent registrations, reputation scores, dispute records, and the intent/offer marketplace. All agents in the ecosystem interact with the same contract instance.

## Contract Details

**Testnet address:** `0:6e78355a901729e4218ce6632a6a98df81e7a6740613defc99ef9639942385e9`

| Metric | Count |
|---|---|
| Receive handlers | 14 |
| Getter functions | 19 |
| State maps | 39 |
| Message types | 14 |
| Struct types | 6 |

**Messages:** Register, Rate, UpdateAvailability, Withdraw, IndexCapability, TriggerCleanup, RegisterEscrow, NotifyDisputeOpened, NotifyDisputeSettled, BroadcastIntent, SendOffer, AcceptOffer, CancelIntent, SettleDeal

**Structs:** AgentData, DisputeInfo, AgentCleanupInfo, IntentData, OfferData, StorageInfo

## Address Resolution

FIX 14 removed the `.reputation-contract.json` file dependency. The SDK resolves the contract address with this fallback chain:

1. Factory parameter: `createIdentityPlugin({ contractAddress: "0:..." })`
2. Default deployed contract (hardcoded in SDK, keyed by network)
3. `null`, which puts the SDK into local-only mode with no on-chain features

```typescript
import { createIdentityPlugin } from "@ton-agent-kit/plugin-identity";

// Override with your own deployment
const IdentityPlugin = createIdentityPlugin({
  contractAddress: "0:your_contract_address_here",
});
```

If you do not pass a factory parameter and the network is `testnet`, the SDK uses the address above automatically.

## Agent Registration

**Handler:** `Register(name, capabilities, available)`

Registration checks for duplicates via `nameToIndex`, which is keyed by sha256 of the agent name. If the same name is sent from the same wallet, the handler updates availability instead of creating a new entry.

For a new agent, the contract:
- Assigns a sequential index (`agentCount++`)
- Writes 7 state map entries: `agentOwners`, `agentAvailable`, `agentTotalTasks`, `agentSuccesses`, `agentRegisteredAt`, `agentLastActive`, `nameToIndex`
- Stores the name hash in `agentNameHashes` for cascade cleanup (FIX 5)
- Adds 0.015 TON to `storageFund`
- Adds 0.01 TON to `accumulatedFees`

```typescript
import { TonAgentKit } from "@ton-agent-kit/core";
import IdentityPlugin from "@ton-agent-kit/plugin-identity";

const agent = new TonAgentKit(wallet, rpcUrl, {}, "testnet")
  .use(IdentityPlugin);

await agent.runAction("register_agent", {
  name: "price-oracle",
  capabilities: ["price_feed", "market_data"],
  description: "Real-time TON price data",
  endpoint: "https://my-api.example.com/price",
  available: true,
});
```

Cost: 0.01 TON fee plus ~0.03 TON gas. Unused gas is returned.

On-chain fields per agent: `owner` (address), `available` (bool), `totalTasks`, `successes`, `registeredAt`, `lastActive`.

## Score Formula

```
score = (successes * 100) / totalTasks
```

Range: 0 to 100 (integer). No weighting by task value. No time decay. New agents with zero ratings have a score of 0.

```typescript
const rep = await agent.runAction("get_agent_reputation", {
  agentId: "agent_price-oracle",
});
console.log(rep.reputation.score);      // 0-100
console.log(rep.reputation.totalTasks); // total ratings received
```

## Discovery Methods

| Method | Complexity | Mechanism |
|---|---|---|
| By name | O(1) | `agentIndexByNameHash` getter, sha256 of name |
| By capability | O(1) index read | `agentsByCapability` getter, bitpacked agent indices in Cell |
| Full scan | O(n) | Linear iteration over `agentCount` slots |

The `discover_agent` SDK action uses a threshold of 5,000. If `agentCount` exceeds 5,000 and no `name` or `capability` filter is provided, the action returns an error with a suggestion to use a filter.

```typescript
// Name lookup (O(1))
const result = await agent.runAction("discover_agent", { name: "price-oracle" });

// Capability lookup (O(1) index read, then per-agent data reads)
const result = await agent.runAction("discover_agent", {
  capability: "price_feed",
  limit: 50,
  offset: 0,
});

// Scan with pagination (small registries only)
const result = await agent.runAction("discover_agent", {
  includeOffline: true,
  limit: 50,
  offset: 0,
});
```

## Capability Index

**Handler:** `IndexCapability(agentIndex, capabilityHash)`

This is a separate transaction from registration. The `register_agent` SDK action does not auto-index capabilities on-chain. A separate `index_capability` call is required.

FIX 12 added deduplication:
- `agentCapIndexed` map prevents the same agent+capability pair from being indexed twice
- `agentIndexedCaps` map tracks which capabilities each agent has indexed, used for cascade cleanup on agent removal

The capability index (`capabilityIndex` map) is keyed by sha256 of the capability name. Each value is a Cell encoding bitpacked agent indices.

## Intent System

```mermaid
stateDiagram-v2
    [*] --> Open : BroadcastIntent
    Open --> Accepted : AcceptOffer
    Open --> Cancelled : CancelIntent
    Open --> Expired : deadline passed
    Accepted --> Settled : SettleDeal
```

**Handler:** `BroadcastIntent(serviceHash, serviceName, budget, deadline, description)`

The contract computes `serviceHash` on-chain from the hash sent in the message. The SDK pre-computes SHA-256 of the service name before sending.

Key rules:
- Maximum 10 open intents per agent (`agentActiveIntents` counter)
- Deadline is capped at 24 hours from the current block time (FIX 10). Longer deadlines are silently truncated.
- If the quota of 10 is full, the handler forces cleanup of one expired intent before accepting the new broadcast.
- The `description` field is stored on-chain in the `intentDescriptions` map as a Cell. Sellers can read it before deciding whether to send an offer.

**Intent statuses:** 0=open, 1=accepted, 2=settled, 3=cancelled, 4=expired

The `intentsByService` map indexes intent IDs by service hash. This gives O(1) lookup when discovering intents for a specific service. FIX 11 removes dead entries from `intentsByService` index heads during cleanup.

**IntentData struct fields:** `buyer`, `serviceHash`, `serviceName`, `budget`, `deadline`, `status`, `acceptedOffer`, `isExpired`, `description`

## Offer System

**Handler:** `SendOffer(intentIndex, price, deliveryTime, endpoint)`

The `endpoint` field is stored on-chain in the `offerEndpoints` map as a Cell. The buyer can read the seller's API endpoint after accepting an offer, even across sessions.

Key rules:
- Offers can only be sent for intents with status 0 (open).
- When an offer is accepted, the contract rejects all other pending offers for that intent. This is bounded to 10 rejections per call (FIX 4).
- FIX 4 also adds a per-intent offer index (`intentOffers` map) for fast lookup of offers by intent.

**Offer statuses:** 0=pending, 1=accepted, 2=rejected, 3=expired

**OfferData struct fields:** `seller`, `intentIndex`, `price`, `deliveryTime`, `status`, `endpoint`

## Deal Settlement and Rating

**Handler:** `SettleDeal(intentIndex, rating)`

When an intent is settled:
1. The contract records `dealBuyers` and `dealSellers` keyed by the deal index.
2. Both buyer and seller can independently call `Rate` using the deal index as proof of authorization (FIX 3).
3. `dealBuyerRated` and `dealSellerRated` flags prevent double-rating.

Rating mapping: a rating of 50 or above counts as a success. Below 50 counts as a failure. This increments `agentTotalTasks` and optionally `agentSuccesses` on the rated agent.

```typescript
// Buyer settles the deal with a rating
await agent.runAction("settle_deal", {
  intentIndex: 42,
  rating: 85, // 85 >= 50, counts as success
});
```

The `Rate` handler requires `context().value >= 0.01 TON` (same as Register). The SDK sends 0.12 TON and receives the remainder back.

## Cleanup System

**Handler:** `TriggerCleanup(maxClean)`

Maximum 50 agents per call (`maxClean` is a uint8, max value 50). The handler scans agents using a rolling `cleanupCursor`, which advances across the agent index on each call.

Three conditions, checked in order:

| Condition | Threshold | Reason Code |
|---|---|---|
| Low score | score < 20 AND totalRatings >= 100 | 1 |
| Inactive | lastActive older than 30 days (2,592,000 seconds) | 2 |
| Ghost | totalRatings == 0 AND registered more than 7 days ago (604,800 seconds) | 3 |

```typescript
// Trigger cleanup manually
await agent.runAction("trigger_cleanup", { maxClean: 50 });

// Check if a specific agent is eligible
const info = await agent.runAction("get_agent_cleanup_info", {
  agentIndex: 5,
});
console.log(info.eligibleForCleanup, info.cleanupReason);
```

**Cascade erase on agent removal:**
- Cancels up to 20 open intents
- Rejects up to 30 pending offers
- Removes the agent's `nameToIndex` entry (FIX 5)
- Removes all indexed capabilities for that agent from `capabilityIndex` (FIX 12)
- Removes dead entries from `intentsByService` index heads (FIX 11)

Erased index slots are never reused. The `agentCount` counter only increments.

## Self-Funding Model

The contract uses three internal pools:

```
myBalance() = storageFund + accumulatedFees + gasBuffer(0.01 TON)
```

After each handler, the contract calls:
```tact
nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);
send(SendParameters{ value: 0, mode: SendRemainingBalance | SendIgnoreErrors, ... });
```

This returns excess gas to the sender. The user pays approximately 0.03 TON per call, not the full 0.12 TON sent.

**storageFund increments per operation:**

| Operation | Increment | Notes |
|---|---|---|
| Register | +0.015 TON | ~7 map entries |
| BroadcastIntent | +0.015 TON | ~6 map entries + service index |
| IndexCapability | +0.008 TON | ~3-4 map entries |
| SendOffer | +0.008 TON | Offer + intent offer list |
| SettleDeal | +0.008 TON | Status update + rating |
| NotifyDisputeOpened | +0.005 TON | Dispute record entries |
| Rate | +0.003 TON | Score field updates |
| UpdateAvailability | +0.003 TON | Single map entry |
| AcceptOffer | +0.003 TON | Status update |
| RegisterEscrow | +0.003 TON | Whitelist entry |
| NotifyDisputeSettled | +0.003 TON | Settled flag |
| TriggerCleanup | 0 | Reduces storage |

**accumulatedFees:** Only `Register` and `Rate` charge a fee (0.01 TON each). All other handlers do not charge a fee.

**gasBuffer:** Constant 0.01 TON minimum. Prevents the contract from being unable to process messages.

**Withdraw (20-year rule):** The owner can withdraw `accumulatedFees` plus any `storageFund` in excess of 20 years of projected storage costs. Storage cost is estimated at 240 nanoTON per cell per year. Total cells is estimated as `agentCount * 3 + intentCount * 3`.

```typescript
// Only the contract owner (deployer) can call this
await agent.runAction("withdraw_reputation_fees", { confirm: true });
```

**Deploy reserve:** The contract sets `override const storageReserve: Int = ton("0.05")` so the `Deployable` trait keeps 0.05 TON after deployment.

## Cross-Contract Integration

FIX 2 introduced an escrow whitelist (`knownEscrows` map). Only addresses registered via `RegisterEscrow` can call the cross-contract notification handlers.

**RegisterEscrow:** An escrow contract calls this to whitelist itself. Required before the other two handlers will accept messages.

**NotifyDisputeOpened:** Escrow notifies the reputation contract when a dispute is opened. The contract stores: `escrowAddress`, `depositor`, `beneficiary`, `amount`, `votingDeadline`, `settled=false` in separate dispute maps.

**NotifyDisputeSettled:** Escrow notifies on settlement. The contract sets `disputeSettled=true`.

The reputation contract is read-only for dispute data. Only escrow contracts write to it via these cross-contract messages.

## All Getters

| Getter | Parameters | Returns |
|---|---|---|
| `agentData` | index: uint32 | AgentData? (owner, available, totalTasks, successes, registeredAt) |
| `agentIndexByNameHash` | nameHash: uint256 | Int? (agent index) |
| `agentReputation` | index: uint32 | Int (score 0-100) |
| `agentCount` | none | Int |
| `contractBalance` | none | Int (nanoTON) |
| `agentsByCapability` | capHash: uint256 | Cell? (bitpacked agent indices) |
| `disputeCount` | none | Int |
| `disputeData` | index: uint32 | DisputeInfo? |
| `agentCleanupInfo` | index: uint32 | AgentCleanupInfo |
| `intentsByServiceHash` | serviceHash: uint256 | Cell? (bitpacked intent indices) |
| `intentCount` | none | Int |
| `offerCount` | none | Int |
| `agentIntentQuota` | agent: Address | Int (active intent count) |
| `intentData` | index: uint32 | IntentData? |
| `offerData` | index: uint32 | OfferData? |
| `storageInfo` | none | StorageInfo (storageFund, totalCells, annualCost, yearsCovered) |
| `dealCount` | none | Int |
| `storageFundBalance` | none | Int (nanoTON) |
| `accumulatedFeesBalance` | none | Int (nanoTON) |

## SDK Actions

| Action | Plugin | Description |
|---|---|---|
| `register_agent` | plugin-identity | Register or update availability on-chain |
| `discover_agent` | plugin-identity | Find agents by name, capability, or scan |
| `get_agent_reputation` | plugin-identity | Read reputation score; optionally rate via deal |
| `deploy_reputation_contract` | plugin-identity | Deploy a new contract instance |
| `withdraw_reputation_fees` | plugin-identity | Owner-only: withdraw accumulated fees |
| `broadcast_intent` | plugin-agent-comm | Post a service request |
| `discover_intents` | plugin-agent-comm | Find open intents |
| `send_offer` | plugin-agent-comm | Respond to an intent |
| `get_offers` | plugin-agent-comm | Read pending offers for an intent |
| `accept_offer` | plugin-agent-comm | Accept one offer, reject others |
| `settle_deal` | plugin-agent-comm | Finalize deal and submit rating |
| `cancel_intent` | plugin-agent-comm | Cancel an open intent |

## Limitations

- Erased agents leave index gaps that are never reused. `agentCount` only grows.
- Name hashes are one-way. The local JSON registry is the only human-readable name directory.
- Capability indexing requires a separate `IndexCapability` transaction. `register_agent` does not auto-index on-chain.
- The cleanup cursor scans a bounded window per call. Large contracts require many transactions to sweep.
- Scores are integers (0-100) with no weighting by task value or recency.
- The 24-hour deadline cap (FIX 10) means long-running service negotiations require re-broadcasting intents.
- Offer acceptance bounds (10 rejections per call, FIX 4) mean an intent with more than 10 competing offers may leave some in pending state for one block.
- Storage cost estimate (240 nanoTON/cell/year) is an approximation. Actual TON storage pricing can change.

## Related

- [Agent Communication](./agent-comm.md) - intents and offers on this contract
- [Gas System](./gas-system.md) - detailed self-funding model
- [Escrow System](./escrow-system.md) - dispute outcomes feed into reputation

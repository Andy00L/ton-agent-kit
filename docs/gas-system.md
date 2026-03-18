# Gas System and Self-Funded Contracts

How TON Agent Kit handles gas, excess refunds, and contract self-funding.

## Overview

TON uses a gas model where the sender attaches TON to each message. The contract consumes gas for computation, and any excess should be returned. TON Agent Kit's contracts implement a 3-pool self-funding model that ensures:

1. **Users get excess gas back** -- typically paying 0.03--0.06 TON per call instead of the full 0.12 TON
2. **Contracts never freeze** -- a growing `storageFund` pays for on-chain storage over decades
3. **Owner revenue accumulates** -- `accumulatedFees` tracks revenue from fee-charging operations

## SDK Gas Constants

Defined in `packages/core/src/gas.ts`:

```typescript
import { estimateGas, DEFAULT_GAS, CROSS_CONTRACT_GAS } from "@ton-agent-kit/core";

DEFAULT_GAS        // "0.12" -- default for simple contract calls
CROSS_CONTRACT_GAS // "0.15" -- for operations that notify other contracts (e.g., OpenDispute)
```

`estimateGas(operation, state?)` returns a string TON amount with a 0.1 TON safety buffer. It accounts for contract state size (more agents = more gas for cleanup iterations).

## On-Chain Refund Pattern

Both Tact contracts use `nativeReserve` + `SendRemainingBalance`:

```tact
// 1. Add to storage fund based on operation type
self.storageFund = self.storageFund + ton("0.015"); // Register creates 3+ cells

// 2. Accumulate owner fee (only fee-charging handlers)
self.accumulatedFees = self.accumulatedFees + self.fee;

// 3. Reserve the three pools: storageFund + ownerFees + gasBuffer
nativeReserve(self.storageFund + self.accumulatedFees + ton("0.01"), 0);

// 4. Send everything else back to the sender
send(SendParameters{
    to: sender(),
    value: 0,
    mode: SendRemainingBalance | SendIgnoreErrors,
    bounce: false,
    body: "Excess".asComment()
});
```

**Why `nativeReserve` instead of manual calculation:** Earlier versions computed `excess = myBalance() - keep` and sent it with `mode: SendIgnoreErrors`. The action phase silently skipped the send when gas consumed after the `myBalance()` call reduced the balance below the computed value. The `nativeReserve` + `SendRemainingBalance` pattern is the standard TON approach -- the reserve is processed in the action phase before the send, guaranteeing correctness.

## Deploy Reserve

Both contracts override the BaseTrait's `storageReserve` constant:

```tact
contract Reputation with Deployable {
    override const storageReserve: Int = ton("0.05");
    // ...
}
```

This ensures the `Deployable` trait's Deploy handler (which calls `self.notify()`) keeps 0.05 TON in the contract after deployment instead of sending everything back. Without this, contracts deploy with 0 balance and freeze immediately.

## Three Pools

```
myBalance() = storageFund + accumulatedFees + gasBuffer(0.01 TON)
              ───────────   ───────────────   ────────────────────
              grows with     grows with        constant minimum
              each operation fee-charging ops  for gas processing
```

### storageFund

Accumulates with each operation based on cells created/modified:

| Operation | Fee | Reason |
|---|---|---|
| Register (new agent) | 0.015 TON | ~7 map entries (owner, available, tasks, successes, registeredAt, lastActive, nameToIndex) |
| BroadcastIntent | 0.01 TON | ~5 map entries (buyer, serviceHash, budget, deadline, status) + service index |
| SendOffer, IndexCapability, NotifyDisputeOpened | 0.005 TON | ~3 new map entries |
| Rate, UpdateAvailability, AcceptOffer, SettleDeal, CancelIntent, NotifyDisputeSettled | 0.003 TON | Status updates, no new cells |
| TriggerCleanup | 0 | Cleanup reduces storage |

### accumulatedFees

Only two handlers charge a fee (require `context().value >= self.fee`):
- `Register` -- 0.01 TON per registration
- `Rate` -- 0.01 TON per rating

All other handlers don't charge a fee but still contribute to `storageFund`.

### gasBuffer

A constant 0.01 TON minimum to prevent the contract from being unable to process messages.

## Withdraw with 20-Year Rule

The owner can withdraw `accumulatedFees` plus any `storageFund` excess beyond 20 years of projected storage:

```tact
receive(msg: Withdraw) {
    require(sender() == self.owner, "Only owner can withdraw");

    let totalCells: Int = self.agentCount * 3 + self.intentCount * 2;
    let annualCost: Int = totalCells * 240; // nanoTON per cell per year

    let withdrawableFromReserve: Int = 0;
    if (annualCost == 0) {
        // No data stored -- all reserve is free
        withdrawableFromReserve = self.storageFund;
        self.storageFund = 0;
    } else if (annualCost > 0) {
        let yearsCovered: Int = self.storageFund / annualCost;
        if (yearsCovered > 20) {
            let keep20: Int = annualCost * 20;
            withdrawableFromReserve = self.storageFund - keep20;
            self.storageFund = keep20;
        }
    }

    let totalWithdraw: Int = self.accumulatedFees + withdrawableFromReserve;
    // ... send to owner
}
```

The 240 nanoTON/cell/year constant is an approximation of TON's storage pricing. At current rates this is conservative -- contracts will accumulate more than needed.

## Escrow Contract

The escrow contract uses the same pattern but simpler:
- `storageFund` grows with each operation (0.003--0.005 TON per handler)
- No `accumulatedFees` (escrow doesn't charge fees)
- No 20-year rule (escrow is per-deal, short-lived)
- The `nativeReserve` also protects escrowed funds: `self.amount + self.sellerStake + self.totalArbiterStakes + self.storageFund + ton("0.01")`

## Verifying Contract Execution

The SDK provides `verifyContractExecution()` to confirm a transaction was processed (not bounced):

```typescript
import { verifyContractExecution } from "@ton-agent-kit/core";

const result = await verifyContractExecution(
    walletAddress,
    "https://testnet.tonapi.io/v2",
    tonapiKey,
    15000 // timeout ms
);
// result: { verified: boolean, contractExitCode: number, bounced: boolean, error?: string }
```

This checks the TONAPI trace for the most recent outgoing transaction, confirming the contract processed it with exit code 0 and didn't bounce.

## Monitoring

The `storageInfo()` getter on the Reputation contract returns:

```typescript
// Via call_contract_method action
const info = await agent.runAction("call_contract_method", {
    address: "0:a53a...",
    method: "storageInfo"
});
// Returns: { storageFund, totalCells, annualCost, yearsCovered }
```

Individual getters `storageFundBalance()` and `accumulatedFeesBalance()` return plain integers.

# @ton-agent-kit/plugin-escrow

Escrow plugin for on-chain escrow with self-selecting arbiters, staking, and dispute-resolution voting on TON. Manages the full lifecycle of escrow deals from creation through settlement.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-escrow @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import EscrowPlugin from "@ton-agent-kit/plugin-escrow";

const agent = new TonAgentKit(wallet).use(EscrowPlugin);

// Create an escrow deal
const escrow = await agent.runAction("create_escrow", {
  beneficiary: "EQBx...",
  amount: "1.5",
});

// Release funds after delivery
await agent.runAction("release_escrow", { escrowId: escrow.id });
```

## Actions

| Action | Description |
|---|---|
| `create_escrow` | Create a new escrow deal (arbiters self-select during disputes). |
| `deposit_to_escrow` | Fund an escrow with TON. |
| `release_escrow` | Release funds to beneficiary (depositor only, non-dispute). |
| `refund_escrow` | Refund funds to depositor. |
| `get_escrow_info` | Get escrow details or list all escrows. |
| `confirm_delivery` | Confirm service delivery on-chain (buyer only). |
| `auto_release_escrow` | Release after deadline (requires delivery confirmation). |
| `open_dispute` | Open a dispute, freezing the escrow for arbiter voting. |
| `join_dispute` | Stake TON to join as an arbiter in a dispute. |
| `vote_release` | Arbiter votes to release funds during a dispute. |
| `vote_refund` | Arbiter votes to refund funds during a dispute. |
| `claim_reward` | Claim arbiter reward after settlement. |
| `fallback_settle` | Settle after the 72h voting deadline expires. |
| `seller_stake_escrow` | Seller stakes TON to signal commitment to the deal. |

## Documentation

See [docs/escrow-system.md](https://github.com/Andy00L/ton-agent-kit/blob/main/docs/escrow-system.md) for the full escrow system design.

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-escrow)

## License

MIT

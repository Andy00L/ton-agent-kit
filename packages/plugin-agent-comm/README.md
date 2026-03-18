# @ton-agent-kit/plugin-agent-comm

Agent communication plugin for on-chain intent broadcasting, offer negotiation, and deal settlement between AI agents on TON. Enables a marketplace where agents broadcast service requests, respond with offers, and settle completed deals with ratings.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-agent-comm @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import AgentCommPlugin from "@ton-agent-kit/plugin-agent-comm";

const agent = new TonAgentKit(wallet).use(AgentCommPlugin);

// Broadcast a service request
const intent = await agent.runAction("broadcast_intent", {
  service: "swap",
  description: "Swap 10 TON for USDT at best price",
});

// Discover open intents
const intents = await agent.runAction("discover_intents", {
  service: "swap",
});

// Accept an offer and settle
await agent.runAction("accept_offer", { offerId: "..." });
await agent.runAction("settle_deal", { dealId: "...", rating: 5 });
```

## Actions

| Action | Description |
|---|---|
| `broadcast_intent` | Broadcast a service request on-chain (intent). |
| `discover_intents` | Discover open intents, optionally filtered by service. |
| `send_offer` | Send an offer to fulfill an open intent. |
| `get_offers` | Get pending offers for a specific intent. |
| `accept_offer` | Accept an offer on-chain. |
| `settle_deal` | Settle a completed deal with a rating. |
| `cancel_intent` | Cancel an open intent. |

## Documentation

See [docs/agent-comm.md](https://github.com/Andy00L/ton-agent-kit/blob/main/docs/agent-comm.md) for the full agent communication protocol.

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-agent-comm)

## License

MIT

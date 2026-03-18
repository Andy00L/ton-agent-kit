# @ton-agent-kit/plugin-payments

Payments plugin for the x402 payment protocol on TON. Handles the full pay-for-resource flow: request a gated API, send TON, retry with on-chain proof, and receive the unlocked response. Optionally links payments to escrow deals for automatic delivery confirmation.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-payments @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import PaymentsPlugin from "@ton-agent-kit/plugin-payments";

const agent = new TonAgentKit(wallet).use(PaymentsPlugin);

// Pay for an x402-gated API resource
const result = await agent.runAction("pay_for_resource", {
  url: "https://api.example.com/premium-data",
});
console.log(result.paid, result.data);

// Look up delivery proof
const proof = await agent.runAction("get_delivery_proof", {
  txHash: result.txHash,
});
```

### x402 Flow

1. Agent requests the resource. Server returns 402 with payment instructions.
2. Agent sends TON to the specified recipient.
3. Agent retries the request with the `X-Payment-Hash` header.
4. Server verifies the on-chain payment and returns the data.

## Actions

| Action | Description |
|---|---|
| `pay_for_resource` | Pay for an x402-gated API and return the unlocked response. |
| `get_delivery_proof` | Look up a delivery proof for a previous x402 payment. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-payments)

## License

MIT

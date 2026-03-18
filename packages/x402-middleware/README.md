# @ton-agent-kit/x402-middleware

Express middleware that gates any API endpoint behind a TON payment using the x402 protocol. Agents auto-detect the 402 response, pay, and retry with proof.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/x402-middleware
```

## Usage

```typescript
import express from "express";
import { tonPaywall } from "@ton-agent-kit/x402-middleware";

const app = express();

app.get("/api/data", tonPaywall({
  amount: "0.001",
  recipient: "0:abc...",
}), (req, res) => {
  res.json({ price: 3.85 });
});
```

That is all it takes. Three lines to make an endpoint payable in TON.

### Payment Server Helper

```typescript
import { createPaymentServer } from "@ton-agent-kit/x402-middleware";

const app = createPaymentServer({
  recipient: "0:abc...",
  network: "testnet",
  routes: [
    { path: "/api/price", amount: "0.001", handler: (req, res) => res.json({ ton: 3.85 }) },
    { path: "/api/report", amount: "0.01", handler: (req, res) => res.json({ report: "..." }) },
  ],
});

app.listen(3000);
```

## Security

- **Anti-replay.** Each transaction hash can only be used once. Pluggable store backends (file, Redis, in-memory, or custom).
- **Timestamp check.** Transactions must be recent (configurable TTL, default 5 minutes).
- **Amount verification.** Tight tolerance for cross-transfers, gas tolerance for self-transfers.
- **2-level verification.** Blockchain endpoint with events fallback.

## Storage Backends

| Store | Use case |
|---|---|
| `FileReplayStore` | Default. Zero dependencies, JSON file on disk. |
| `RedisReplayStore` | Production. Works with Upstash, Redis Cloud, or self-hosted. |
| `MemoryReplayStore` | Testing only. Data lost on restart. |
| Custom `ReplayStore` | Implement `has(hash)` and `add(hash)` for any backend. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/x402-middleware)

## License

MIT

# TON Agent Kit. x402 Payment Server Example

Make any Express API payable in TON using the HTTP 402 payment protocol. AI agents automatically detect the 402 response, pay on-chain, and retry. No manual integration needed.

## What is x402?

x402 uses the HTTP `402 Payment Required` status code to enable machine-to-machine payments. The flow:

```
Agent → GET /api/data
Server → 402 { payment: { recipient, amount, network } }
Agent → transfer_ton(amount, recipient)
Agent → GET /api/data + X-Payment-Hash: <tx-hash>
Server → verifies on-chain → 200 { data }
```

## Install

```bash
npm install
```

## Configuration

Create a `.env` file:

```env
TON_RECIPIENT=0:your-raw-address-here
TON_MNEMONIC=word1 word2 ... word24
TON_NETWORK=testnet
PORT=3402

# Dynamic endpoints (optional)
# PUBLIC_URL=https://agent.myserver.com    # Override auto-detected public IP
# LOCAL_MODE=true                          # Force localhost URLs (for local testing)
# X402_PORT=3402                           # Defaults to PORT
```

## Run

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

## Endpoints

### Static (hardcoded, always available)

| Endpoint | Cost | Description |
|----------|------|-------------|
| `GET /` | Free | Server info and endpoint listing |
| `GET /api/price` | 0.001 TON | Real-time price data |
| `GET /api/analytics` | 0.01 TON | Wallet analytics |
| `GET /api/premium` | 0.05 TON | Premium research report |

### Dynamic (LLM-controlled via EndpointPlugin)

The server also supports dynamic endpoints that can be opened/closed at runtime. These are managed by the `EndpointPlugin` with 3 actions:

| Action | Description |
|--------|-------------|
| `open_x402_endpoint` | Creates a paid endpoint. Returns the public URL. |
| `close_x402_endpoint` | Removes an endpoint. |
| `list_x402_endpoints` | Lists active endpoints with prices and serve counts. |

Dynamic endpoints are protected by `tonPaywall()` and call real SDK actions for live blockchain data. Buyer query params override default `dataParams`.

**Public URL auto-detection:** At startup, the server calls `https://api.ipify.org` to get its public IP. Endpoints return routable URLs like `http://143.198.45.67:3402/api/price` instead of `localhost`. Override with `PUBLIC_URL` env var or set `LOCAL_MODE=true` for local testing.

## Security Features

- **Anti-replay**: Each transaction hash can only be used ONCE (pluggable store)
- **Timestamp check**: Transaction must be recent (configurable `proofTTL`, default 5 min)
- **Amount verification**: Tight tolerance for cross-transfers, gas tolerance for self-transfers
- **2-level verification**: Blockchain endpoint with events fallback

## Storage Options

The anti-replay store is pluggable:

| Store | Use Case |
|-------|----------|
| `FileReplayStore` (default) | Zero dependencies, JSON file on disk, survives restarts |
| `RedisReplayStore` | Production scale. Upstash, Redis Cloud, or self-hosted |
| `MemoryReplayStore` | Testing only. Data lost on restart |
| Custom `ReplayStore` | Implement `has(hash)` and `add(hash)` for any backend |

## Standalone `tonPaywall()` Usage

Add x402 to any existing Express app:

```ts
import express from "express";
import { tonPaywall } from "@ton-agent-kit/x402-middleware";

const app = express();

app.get(
  "/api/data",
  tonPaywall({
    amount: "0.001",
    recipient: "0:abc...",
    network: "testnet",
    description: "API access",
  }),
  (req, res) => {
    res.json({ data: "paid content" });
  },
);

app.listen(3402);
```

## Using with Redis

```ts
import { Redis } from "@upstash/redis";
import { RedisReplayStore, tonPaywall } from "@ton-agent-kit/x402-middleware";

const store = new RedisReplayStore(
  new Redis({ url: "https://your-upstash-url", token: "your-token" }),
);

app.get(
  "/api/data",
  tonPaywall({
    amount: "0.001",
    recipient: "0:abc...",
    replayStore: store,
  }),
  handler,
);
```

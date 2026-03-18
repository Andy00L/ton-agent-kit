# x402 Payment Protocol

HTTP 402 Payment Required middleware for Express that gates API endpoints behind TON payments.

## Overview

The x402 middleware lets any Express server charge TON for API access. An AI agent calls `pay_for_resource` which handles the full flow: request, pay, retry with proof.

**Package:** `@ton-agent-kit/x402-middleware` v1.1.1

## Payment Flow

```
Agent                    Server                     TON Blockchain
  |                        |                             |
  |--- GET /api/data ----->|                             |
  |<-- 402 + instructions -|                             |
  |                        |                             |
  |--- transfer_ton -------|----------------------------->|
  |<-- tx hash ------------|                             |
  |                        |                             |
  |--- GET /api/data ----->|                             |
  |   X-Payment-Hash: tx   |                             |
  |                        |--- verify on-chain -------->|
  |                        |<-- confirmed ---------------|
  |<-- 200 + data ---------|                             |
```

## Server Setup

```typescript
import { tonPaywall, FileReplayStore } from "@ton-agent-kit/x402-middleware";

app.get("/api/data", tonPaywall({
    amount: "0.001",                       // charge per request
    recipient: "0QAVhp...",                // your wallet
    network: "testnet",
    description: "Market data feed",
    proofTTL: 300,                         // 5 min proof validity
    replayStore: new FileReplayStore(),    // anti-replay
}), (req, res) => {
    res.json({ price: 3.42, source: "oracle" });
});
```

## Client (Agent) Usage

```typescript
const result = await agent.runAction("pay_for_resource", {
    url: "https://oracle.example.com/api/data",
    amount: "0.001",
});
// result.data contains the API response
```

## Anti-Replay Protection

Each transaction hash can only be used ONCE. Three storage backends:

| Backend | Persistence | Use Case |
|---|---|---|
| `FileReplayStore` | JSON file, survives restarts | Default, zero dependencies |
| `RedisReplayStore` | Redis/Upstash | Production, multi-instance |
| `MemoryReplayStore` | In-memory only | Testing |

## Verification (2-level)

1. **Primary:** Fetch transaction via blockchain endpoint, check success + timestamp + recipient + amount
2. **Fallback:** If primary fails, fetch via TONAPI events endpoint

Amount tolerance: 5M nanoTON for self-transfers, 0.5M for cross-transfers. Timestamp: transaction must be within `maxAge` (default 5 minutes).

## Security

- Anti-replay: each tx hash usable once
- Timestamp validation: rejects old transactions
- Amount verification with tolerance
- On-chain verification (not just hash checking)
- Bearer token auth on the server side (optional)

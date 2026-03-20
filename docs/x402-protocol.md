# x402 Protocol

HTTP 402 Payment Required middleware for Express. Gates API endpoints behind TON payments.

**Package:** `@ton-agent-kit/x402-middleware` v1.1.1

---

## Payment Flow

```
Client Agent              Server                    TON Blockchain
     |                       |                            |
     |--- GET /api/data ----->|                            |
     |<-- 402 + details ------|                            |
     |   (recipient, amount,  |                            |
     |    network)            |                            |
     |                        |                            |
     |--- transfer_ton ------> - - - - - - - - - - - - - >|
     |<-- tx hash ------------|                            |
     |                        |                            |
     |--- GET /api/data ----->|                            |
     |   X-Payment-Hash: tx   |                            |
     |                        |--- verify on-chain ------->|
     |                        |<-- confirmed --------------|
     |<-- 200 + data ---------|                            |
```

---

## Server Setup

```typescript
import { tonPaywall, FileReplayStore } from "@ton-agent-kit/x402-middleware";

app.get("/api/data", tonPaywall({
    amount: "0.001",
    recipient: "0QAVhp...",
    network: "testnet",
    description: "Market data feed",
    proofTTL: 300,
    replayStore: new FileReplayStore(),
}), (req, res) => {
    res.json({ price: 3.42 });
});
```

A convenience function `createPaymentServer(options)` creates an Express server with a paywall already attached.

---

## Client (Agent) Usage

```typescript
const result = await agent.runAction("pay_for_resource", {
    url: "https://oracle.example.com/api/data",
    amount: "0.001",
});
// result.data contains the API response
```

`pay_for_resource` handles the full flow: initial request, TON payment, wait for confirmation, retry with `X-Payment-Hash`. It can optionally confirm escrow delivery after payment.

The `get_delivery_proof` action retrieves a delivery proof by TX hash or escrow ID from the memory plugin.

Both actions are in the `plugin-payments` package.

---

## Verification

Payment verification runs at two levels:

1. **Primary:** Fetch transaction directly from the blockchain endpoint. Check: success status, timestamp, recipient address, amount.
2. **Fallback:** If primary fails, fetch via TONAPI events endpoint.

### Timestamp

The transaction must be within `maxAge` of the current time. Default: 300 seconds (5 minutes).

### Amount Tolerance

| Transfer type | Tolerance |
|---|---|
| Self-transfer (sender == recipient) | 5,000,000 nanoTON |
| Cross-transfer | 500,000 nanoTON |

Tolerance exists to account for fees and rounding. Payments below the required amount minus tolerance are rejected.

---

## Anti-Replay Protection

Each transaction hash can be used only once. Three built-in store implementations:

| Store | Persistence | Notes |
|---|---|---|
| `FileReplayStore` | JSON file on disk | Survives restarts. No dependencies. |
| `RedisReplayStore` | Redis with TTL | Suitable for multi-instance deployments. |
| `MemoryReplayStore` | In-memory Set | Lost on restart. Suitable for testing or short-lived processes. |

Custom stores are supported. Implement `has(hash: string): boolean` and `add(hash: string): void`.

---

## Dynamic Endpoints (EndpointPlugin)

EndpointPlugin lets the LLM open and close paywall endpoints at runtime. It is defined inline in `telegram-bot.ts` and `cloud-agent.ts`. It is not a separate npm package.

Dynamic endpoints use `MemoryReplayStore`. They do not survive a process restart.

### Actions

| Action | Description |
|---|---|
| `open_x402_endpoint` | Creates a paid endpoint. Returns the public URL. |
| `close_x402_endpoint` | Removes an endpoint. |
| `list_x402_endpoints` | Lists all active endpoints with prices and serve counts. |

### Public URL Detection

At startup, the process calls `https://api.ipify.org` to get its public IP. Endpoints are advertised as `http://<public-ip>:<port>/path`. If the API call fails, the process falls back to `localhost`.

Override the detected address with `PUBLIC_URL`. Set `LOCAL_MODE=true` to force localhost.

### Example Flow

1. Agent discovers an intent for a price feed service.
2. Agent calls `open_x402_endpoint({ path: "/api/price", price: "0.005", dataAction: "get_price" })`.
3. Agent calls `send_offer({ intentIndex: 3, endpoint: "http://143.198.45.67:4000/api/price" })`.
4. Buyer calls `pay_for_resource({ url: "http://143.198.45.67:4000/api/price" })`.
5. The Express server verifies payment on-chain via `tonPaywall`, calls `get_price` via the SDK, and returns the data.
6. After settlement, agent calls `close_x402_endpoint({ path: "/api/price" })`.

### Architecture

```
LLM                    Express Server               Buyer Agent
 |                           |                           |
 |-- open_x402_endpoint ---->|  endpointRoutes.set(path) |
 |<-- { url } ---------------|                           |
 |                           |<-- GET /path -------------|
 |                           |--- 402 Payment Required ->|
 |                           |<-- GET /path + X-Payment -|
 |                           |   tonPaywall() verifies   |
 |                           |   runAction(dataAction)   |
 |                           |--- 200 { data } --------->|
 |                           |                           |
 |-- close_x402_endpoint --->|  endpointRoutes.delete()  |
```

---

## Example Server

`examples/x402-server/` contains a reference implementation with static and dynamic endpoints.

| Endpoint | Price | Replay Store |
|---|---|---|
| `/api/price` | 0.001 TON | MemoryReplayStore |
| `/api/analytics` | 0.01 TON | MemoryReplayStore |
| `/api/premium` | 0.05 TON | FileReplayStore |
| `/api/dynamic-price` | 0.002 TON (opened programmatically) | MemoryReplayStore |

Default port for the example server: 3402.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `X402_PORT` | No | `4000` | HTTP server port (bot and cloud-agent) |
| `PUBLIC_URL` | No | auto-detected | Override the public URL advertised in offers |
| `LOCAL_MODE` | No | `false` | Set to `true` to use localhost instead of public IP |

# @ton-agent-kit/plugin-endpoints

Dynamic x402 endpoint management plugin. Lets AI agents open, close, and list paid API endpoints at runtime. Uses the standard TON Agent Kit plugin system.

## Usage
```typescript
import { createEndpointPlugin } from "@ton-agent-kit/plugin-endpoints";

const routes = new Map();
const EndpointPlugin = createEndpointPlugin({
  port: 4000,
  getPublicUrl: () => "http://localhost:4000",
  routes,
});

const agent = new TonAgentKit(wallet, rpcUrl)
  .use(EndpointPlugin);

// LLM can now call these actions:
// open_x402_endpoint  - Create a paid endpoint
// close_x402_endpoint - Remove an endpoint
// list_x402_endpoints - List active endpoints
```

## Actions

| Action | Description |
|---|---|
| `open_x402_endpoint` | Create a paid endpoint that calls an SDK action. Returns the public URL. |
| `close_x402_endpoint` | Remove an endpoint by path. |
| `list_x402_endpoints` | List all active endpoints with prices and request counts. |

## Factory Pattern

Uses a factory function because endpoints depend on runtime state (port, public URL, route map). The factory receives these as options instead of using globals.

# @ton-agent-kit/plugin-memory

Memory plugin for persistent key-value context storage. Agents can save, retrieve, list, and delete namespaced entries across sessions. Ships with file-based persistence by default. Swap in Redis or an in-memory store for other environments.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-memory @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import MemoryPlugin from "@ton-agent-kit/plugin-memory";

const agent = new TonAgentKit(wallet).use(MemoryPlugin);

// Save context
await agent.runAction("save_context", {
  key: "last_swap",
  namespace: "trades",
  value: "10 TON -> 35 USDT",
});

// Retrieve context
const entry = await agent.runAction("get_context", {
  key: "last_swap",
  namespace: "trades",
});

// List all entries in a namespace
const all = await agent.runAction("list_context", { namespace: "trades" });
```

### Custom Store Backends

```typescript
import { createMemoryPlugin, RedisMemoryStore } from "@ton-agent-kit/plugin-memory";

// Redis (production)
agent.use(createMemoryPlugin(new RedisMemoryStore(redisClient)));

// In-memory (tests)
import { InMemoryStore } from "@ton-agent-kit/plugin-memory";
agent.use(createMemoryPlugin(new InMemoryStore()));
```

## Actions

| Action | Description |
|---|---|
| `save_context` | Save a key-value entry to persistent memory. |
| `get_context` | Retrieve a memory entry by key. |
| `list_context` | List all entries in a namespace. |
| `delete_context` | Remove a memory entry. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-memory)

## License

MIT

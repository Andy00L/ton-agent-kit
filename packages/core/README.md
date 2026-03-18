# @ton-agent-kit/core

Core SDK for connecting AI agents to the TON blockchain. Provides the plugin system, wallet management, action registry, LLM tool generation, autonomous runtime, and TTL-based caching.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";

// Create a wallet from mnemonic
const wallet = await KeypairWallet.fromMnemonic(mnemonic);

// Create the agent and register plugins
const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
  .use(TokenPlugin);

// Run an action
const balance = await agent.runAction("get_balance", {});

// Generate OpenAI-compatible tool definitions
const tools = agent.toAITools();

// Autonomous loop (requires OPENAI_API_KEY)
const result = await agent.runLoop("Check my TON balance", {
  model: "gpt-4.1-nano",
  maxIterations: 5,
});
console.log(result.summary);
```

## Key APIs

| Export | Description |
|---|---|
| `TonAgentKit` | Main agent class. Manages wallet, plugins, actions, cache, and autonomous loop. |
| `KeypairWallet` | Wallet from secret key or mnemonic with auto-detect for wallet version. |
| `ReadOnlyWallet` | Read-only wallet for querying without signing. |
| `definePlugin` | Factory to create a plugin from a list of actions. |
| `defineAction` | Factory to create a Zod-validated action with a handler. |
| `PluginRegistry` | Internal registry for plugins and actions. |
| `ActionCache` | TTL-based cache for read actions. Invalidated on writes. |
| `toAITools()` | Generate OpenAI function-calling tool definitions from registered actions. |
| `runAction()` | Execute a registered action by name with Zod-validated params. |
| `runLoop()` | Autonomous LLM loop that pursues a natural-language goal using registered actions. |
| `nanoToTon` / `tonToNano` | Unit conversion utilities. |
| `sendTransaction` | Send signed transactions via the wallet provider. |
| `parseAddress` / `toFriendlyAddress` | Address formatting helpers. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/core)

## License

MIT

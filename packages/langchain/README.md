# @ton-agent-kit/langchain

LangChain tool wrappers for TON Agent Kit. Converts registered actions into LangChain `DynamicStructuredTool` instances for use with any LangChain agent.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/langchain @ton-agent-kit/core @langchain/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import { createLangchainTools } from "@ton-agent-kit/langchain";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";

const agent = new TonAgentKit(wallet)
  .use(TokenPlugin)
  .use(DefiPlugin);

// Create LangChain tools from all registered actions
const tools = createLangchainTools(agent);

// Use with a LangChain ReAct agent
import { createReactAgent } from "langchain/agents";
const llmAgent = createReactAgent({ llm, tools });
```

### Subset of Actions

```typescript
import { createLangchainToolsFromActions } from "@ton-agent-kit/langchain";

// Only expose specific actions
const tools = createLangchainToolsFromActions(agent, [
  "get_balance",
  "transfer_ton",
  "get_price",
]);
```

## Key APIs

| Export | Description |
|---|---|
| `createLangchainTools(agent)` | Create tools from all registered actions. |
| `createLangchainToolsFromActions(agent, names)` | Create tools from a specific subset of actions. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/langchain)

## License

MIT

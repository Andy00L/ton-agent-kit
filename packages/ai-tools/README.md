# @ton-agent-kit/ai-tools

Vercel AI SDK tool wrappers for TON Agent Kit. Converts registered actions into Vercel AI SDK `tool` instances for use with `generateText`, `streamText`, and any AI SDK-compatible model.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/ai-tools @ton-agent-kit/core ai zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import { createVercelAITools } from "@ton-agent-kit/ai-tools";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const agent = new TonAgentKit(wallet).use(TokenPlugin);
const tools = createVercelAITools(agent);

const result = await generateText({
  model: openai("gpt-4o-mini"),
  tools,
  prompt: "Check my TON balance",
});
console.log(result.text);
```

### OpenAI Function Definitions

For manual integration with OpenAI or compatible APIs:

```typescript
import { createOpenAITools } from "@ton-agent-kit/ai-tools";

const functions = createOpenAITools(agent);
// Returns OpenAI-compatible function definitions
```

## Key APIs

| Export | Description |
|---|---|
| `createVercelAITools(agent)` | Create Vercel AI SDK tools from all registered actions. |
| `createOpenAITools(agent)` | Create OpenAI-compatible function definitions for manual use. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/ai-tools)

## License

MIT

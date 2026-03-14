# TON Agent Kit — Simple Agent Example

Minimal example showing SDK usage in ~20 lines. Creates a wallet, loads 3 plugins, checks balance, and resolves a `.ton` domain.

## Install

```bash
npm install
```

## Setup

Set your TON wallet mnemonic as an environment variable:

```bash
export TON_MNEMONIC="word1 word2 ... word24"
```

## Run

```bash
bun index.ts
```

## What It Does

1. Creates a wallet from your mnemonic
2. Initializes the agent with 3 plugins (Token, DeFi, DNS)
3. Checks your TON balance
4. Resolves `foundation.ton` to an address
5. Demonstrates the `agent.methods` proxy shorthand

```ts
const agent = new TonAgentKit(wallet, rpcUrl, {}, "testnet")
  .use(TokenPlugin)
  .use(DefiPlugin)
  .use(DnsPlugin);

const balance = await agent.runAction("get_balance", {});
const dns = await agent.runAction("resolve_domain", { domain: "foundation.ton" });
```

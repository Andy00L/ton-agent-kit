# @ton-agent-kit/plugin-dns

DNS plugin for TON domain resolution and reverse lookups. Resolves `.ton` domain names to wallet addresses, performs reverse lookups, and retrieves domain registration details.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-dns @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import DnsPlugin from "@ton-agent-kit/plugin-dns";

const agent = new TonAgentKit(wallet).use(DnsPlugin);

// Resolve a .ton domain
const info = await agent.runAction("resolve_domain", {
  domain: "alice.ton",
});
console.log(info.address);
```

## Actions

| Action | Description |
|---|---|
| `resolve_domain` | Resolve a `.ton` domain name to its wallet address. |
| `lookup_address` | Reverse lookup: find the `.ton` domain for a wallet address. |
| `get_domain_info` | Get domain registration details including expiration date. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-dns)

## License

MIT

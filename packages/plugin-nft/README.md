# @ton-agent-kit/plugin-nft

NFT plugin for non-fungible token operations on TON. Inspect individual NFT items, transfer NFTs between wallets, and query NFT collection metadata.

Part of [TON Agent Kit](https://github.com/Andy00L/ton-agent-kit).

## Install

```bash
npm install @ton-agent-kit/plugin-nft @ton-agent-kit/core zod
```

## Usage

```typescript
import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import NftPlugin from "@ton-agent-kit/plugin-nft";

const agent = new TonAgentKit(wallet).use(NftPlugin);

// Get NFT metadata
const nft = await agent.runAction("get_nft_info", {
  nftAddress: "EQBx...",
});
console.log(nft.owner, nft.collection);
```

## Actions

| Action | Description |
|---|---|
| `get_nft_info` | Get NFT metadata, owner, collection, and initialization status. |
| `get_nft_collection` | Get NFT collection info (name, description, item count, owner). |
| `transfer_nft` | Transfer an NFT to another wallet address. |

## Links

- [GitHub](https://github.com/Andy00L/ton-agent-kit)
- [npm](https://www.npmjs.com/package/@ton-agent-kit/plugin-nft)

## License

MIT

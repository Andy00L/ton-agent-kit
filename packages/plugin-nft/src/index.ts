import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import {
  defineAction,
  definePlugin,
  explorerUrl,
  fetchJson,
  sendTransaction,
  toFriendlyAddress,
  type NftInfo,
  type TransactionResult,
} from "@ton-agent-kit/core";

/** The fields this plugin reads off the TonAPI NFT collection endpoint. */
const NftCollectionResponse = z.object({
  address: z.string().optional(),
  next_item_index: z.number().optional(),
  metadata: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  owner: z.object({ address: z.string().optional() }).optional(),
});

// ============================================================
// get_nft_info: Get NFT metadata
// ============================================================
const getNftInfoAction = defineAction<{ nftAddress: string }, NftInfo>({
  name: "get_nft_info",
  description: "Get information about an NFT on TON, including owner, collection, and metadata.",
  schema: z.object({
    nftAddress: z.string().describe("NFT item contract address"),
  }),
  handler: async (agent, params) => {
    const nftAddr = Address.parse(params.nftAddress);
    const lastBlock = await (agent.connection as any).getLastBlock();

    // Run get method on NFT contract to retrieve data
    const result = await (agent.connection as any).runMethod(
      lastBlock.last.seqno,
      nftAddr,
      "get_nft_data"
    );

    const stack = result.reader;
    const init = stack.readBoolean();      // is_initialized
    const index = stack.readBigNumber();    // index
    const collection = stack.readAddress(); // collection_address
    const owner = stack.readAddress();      // owner_address
    const content = stack.readCell();       // individual_content

    return {
      address: nftAddr.toRawString(),
      friendlyAddress: toFriendlyAddress(nftAddr, agent.network),
      index: Number(index),
      owner: owner.toRawString(),
      friendlyOwner: toFriendlyAddress(owner, agent.network),
      collection: collection?.toRawString(),
      friendlyCollection: collection ? toFriendlyAddress(collection, agent.network) : undefined,
      metadata: { initialized: init },
    };
  },
});

// ============================================================
// transfer_nft: Transfer an NFT to another address
// ============================================================
const transferNftAction = defineAction<
  { nftAddress: string; to: string },
  TransactionResult
>({
  name: "transfer_nft",
  description: "Transfer an NFT to another wallet address on TON.",
  schema: z.object({
    nftAddress: z.string().describe("NFT item contract address to transfer"),
    to: z.string().describe("Destination wallet address"),
  }),
  handler: async (agent, params) => {
    const nftAddr = Address.parse(params.nftAddress);
    const toAddr = Address.parse(params.to);

    // NFT transfer message body (op: 0x5fcc3d14)
    const transferBody = beginCell()
      .storeUint(0x5fcc3d14, 32) // transfer op
      .storeUint(0, 64)          // query_id
      .storeAddress(toAddr)      // new_owner
      .storeAddress(agent.wallet.address) // response_destination
      .storeBit(0)               // no custom_payload
      .storeCoins(toNano("0.01")) // forward_amount
      .storeBit(0)               // no forward_payload
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: nftAddr,
        value: toNano("0.05"),
        bounce: true,
        body: transferBody,
      }),
    ]);

    return {
      txHash: "pending",
      status: "sent",
      to: params.to,
      friendlyTo: toFriendlyAddress(toAddr, agent.network),
      explorerUrl: explorerUrl("pending", agent.network),
      fee: "~0.05 TON",
    };
  },
});

// ============================================================
// get_collection: Get NFT collection info
// ============================================================
const getCollectionAction = defineAction<
  { collectionAddress: string },
  { address: string; name?: string; description?: string; nextItemIndex?: number; ownerAddress?: string }
>({
  name: "get_nft_collection",
  description: "Get information about an NFT collection on TON.",
  schema: z.object({
    collectionAddress: z.string().describe("NFT collection contract address"),
  }),
  handler: async (agent, params) => {
    // Use TONAPI for reliable collection info (handles all address formats)
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const headers: Record<string, string> = {};
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    const response = await fetchJson(
      `${apiBase}/nfts/collections/${encodeURIComponent(params.collectionAddress)}`,
      NftCollectionResponse,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch collection: ${response.reason}`);
    }

    const collection = response.value;
    const rawAddress = collection.address || params.collectionAddress;
    const ownerAddress = collection.owner?.address;
    return {
      address: rawAddress,
      friendlyAddress: toFriendlyAddress(Address.parse(rawAddress), agent.network),
      name: collection.metadata?.name,
      description: collection.metadata?.description,
      nextItemIndex: collection.next_item_index,
      ownerAddress,
      friendlyOwnerAddress: ownerAddress
        ? toFriendlyAddress(Address.parse(ownerAddress), agent.network)
        : undefined,
    };
  },
});

// ============================================================
// Plugin export
// ============================================================

/**
 * NFT Plugin -- Non-fungible token operations on TON.
 *
 * Provides actions for inspecting individual NFT items, transferring NFTs
 * between wallets, and querying NFT collection metadata.
 *
 * Actions:
 * - `get_nft_info` -- Get NFT metadata, owner, collection, and initialization status
 * - `transfer_nft` -- Transfer an NFT to another wallet address
 * - `get_nft_collection` -- Get information about an NFT collection (name, description, item count)
 *
 * @example
 * ```typescript
 * import NftPlugin from "@ton-agent-kit/plugin-nft";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(NftPlugin);
 * const nft = await agent.runAction("get_nft_info", { nftAddress: "EQBx..." });
 * ```
 *
 * @since 1.0.0
 */
const NftPlugin = definePlugin({
  name: "nft",
  actions: [getNftInfoAction, transferNftAction, getCollectionAction],
});

/** @since 1.0.0 */
export default NftPlugin;
export { getNftInfoAction, transferNftAction, getCollectionAction as getNftCollectionAction, getCollectionAction };

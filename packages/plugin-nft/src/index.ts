import { z } from "zod";
import { Address, toNano, beginCell } from "@ton/core";
import { definePlugin, defineAction, type NftInfo, type TransactionResult } from "@ton-agent-kit/core";

// ============================================================
// get_nft_info — Get NFT metadata
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
      address: nftAddr.toString(),
      index: Number(index),
      owner: owner.toString(),
      collection: collection?.toString(),
      metadata: { initialized: init },
    };
  },
});

// ============================================================
// transfer_nft — Transfer an NFT to another address
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

    const sender = agent.wallet.getSender();
    await sender.send({
      to: nftAddr,
      value: toNano("0.05"),
      body: transferBody,
    });

    return {
      txHash: "pending",
      status: "sent",
      fee: "~0.05 TON",
    };
  },
});

// ============================================================
// get_collection — Get NFT collection info
// ============================================================
const getCollectionAction = defineAction<
  { collectionAddress: string },
  { address: string; nextItemIndex: number; ownerAddress: string }
>({
  name: "get_collection",
  description: "Get information about an NFT collection on TON.",
  schema: z.object({
    collectionAddress: z.string().describe("NFT collection contract address"),
  }),
  handler: async (agent, params) => {
    const collAddr = Address.parse(params.collectionAddress);
    const lastBlock = await (agent.connection as any).getLastBlock();

    const result = await (agent.connection as any).runMethod(
      lastBlock.last.seqno,
      collAddr,
      "get_collection_data"
    );

    const stack = result.reader;
    const nextItemIndex = stack.readBigNumber();
    const content = stack.readCell();
    const owner = stack.readAddress();

    return {
      address: collAddr.toString(),
      nextItemIndex: Number(nextItemIndex),
      ownerAddress: owner.toString(),
    };
  },
});

// ============================================================
// Plugin export
// ============================================================
const NftPlugin = definePlugin({
  name: "nft",
  actions: [getNftInfoAction, transferNftAction, getCollectionAction],
});

export default NftPlugin;
export { getNftInfoAction, transferNftAction, getCollectionAction };

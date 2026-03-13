#!/usr/bin/env node
import "dotenv/config";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { Address, fromNano, toNano, beginCell, internal } from "@ton/core";
import { mnemonicToPrivateKey } from "@ton/crypto";
import { z } from "zod";
import { KeypairWallet } from "./packages/core/src/wallet";

// ============================================================
// All 10 proven actions
// ============================================================

const actions: Record<
  string,
  {
    description: string;
    schema: any;
    handler: (agent: any, params: any) => Promise<any>;
  }
> = {
  get_balance: {
    description:
      "Get the TON balance of a wallet address. If no address provided, returns agent's own balance.",
    schema: z.object({
      address: z.string().optional().describe("TON address to check"),
    }),
    handler: async (agent, params) => {
      const targetAddress = params.address
        ? Address.parse(params.address)
        : agent.wallet.address;
      const lastBlock = await agent.connection.getLastBlock();
      const state = await agent.connection.getAccount(
        lastBlock.last.seqno,
        targetAddress,
      );
      return {
        balance: fromNano(state.account.balance.coins),
        address: targetAddress.toRawString(),
      };
    },
  },

  get_jetton_balance: {
    description:
      "Get the balance of a Jetton (token like USDT, NOT, etc.) for a wallet.",
    schema: z.object({
      jettonAddress: z.string().describe("Jetton master contract address"),
      ownerAddress: z
        .string()
        .optional()
        .describe("Wallet to check. Defaults to agent's own."),
    }),
    handler: async (agent, params) => {
      const ownerAddr =
        params.ownerAddress || agent.wallet.address.toRawString();
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const url = `${apiBase}/accounts/${encodeURIComponent(ownerAddr)}/jettons/${encodeURIComponent(params.jettonAddress)}`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const decimals = data.jetton?.decimals || 9;
          return {
            balance: (
              Number(data.balance || "0") / Math.pow(10, decimals)
            ).toString(),
            symbol: data.jetton?.symbol || "???",
            name: data.jetton?.name || "Unknown",
            decimals,
          };
        }
      } catch {}
      return { balance: "0", symbol: "???", name: "Unknown", decimals: 9 };
    },
  },

  transfer_ton: {
    description:
      "Transfer TON to another wallet address. Specify destination and amount.",
    schema: z.object({
      to: z.string().describe("Destination address"),
      amount: z.string().describe("Amount of TON to send (e.g. '1.5')"),
      comment: z.string().optional().describe("Optional comment"),
    }),
    handler: async (agent, params) => {
      const toAddress = Address.parse(params.to);
      let body = undefined;
      if (params.comment) {
        body = beginCell()
          .storeUint(0, 32)
          .storeStringTail(params.comment)
          .endCell();
      }
      const { secretKey, publicKey } = agent.wallet.getCredentials();
      const networkId = agent.network === "testnet" ? -3 : -239;
      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
      const walletContract = freshClient.open(
        WalletContractV5R1.create({
          workchain: 0,
          publicKey,
          walletId: {
            networkGlobalId: networkId,
            workchain: 0,
            subwalletNumber: 0,
          },
        }),
      );
      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: toAddress,
            value: toNano(params.amount),
            bounce: false,
            body,
          }),
        ],
      });
      return {
        status: "sent",
        to: params.to,
        amount: params.amount,
        comment: params.comment || "",
      };
    },
  },

  resolve_domain: {
    description: "Resolve a .ton domain name to its wallet address.",
    schema: z.object({
      domain: z.string().describe("Domain name (e.g. 'foundation.ton')"),
    }),
    handler: async (agent, params) => {
      const domain = params.domain.replace(/\.ton$/i, "");
      try {
        const response = await fetch(
          `https://tonapi.io/v2/dns/${encodeURIComponent(domain + ".ton")}/resolve`,
        );
        if (response.ok) {
          const data = await response.json();
          return {
            domain: `${domain}.ton`,
            address: data.wallet?.address || "not found",
            resolved: !!data.wallet,
          };
        }
      } catch {}
      return { domain: `${domain}.ton`, address: "not found", resolved: false };
    },
  },

  get_price: {
    description: "Get the current price of a token in USD and TON.",
    schema: z.object({
      token: z.string().describe("Jetton master address"),
    }),
    handler: async (agent, params) => {
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      try {
        const response = await fetch(
          `${apiBase}/rates?tokens=${encodeURIComponent(params.token)}&currencies=usd,ton`,
        );
        if (response.ok) {
          const data = await response.json();
          const rates = data.rates?.[params.token];
          return {
            token: params.token,
            priceUSD: rates?.prices?.USD || "unknown",
            priceTON: rates?.prices?.TON || "unknown",
          };
        }
      } catch {}
      return { token: params.token, priceUSD: "unknown", priceTON: "unknown" };
    },
  },

  swap_dedust: {
    description:
      "Swap tokens on DeDust DEX. Supports TON to any Jetton. Only works on mainnet.",
    schema: z.object({
      fromToken: z.string().describe("Source: 'TON' or Jetton address"),
      toToken: z.string().describe("Destination: 'TON' or Jetton address"),
      amount: z.string().describe("Amount to swap"),
      slippage: z
        .number()
        .optional()
        .default(1)
        .describe("Slippage % (default: 1)"),
    }),
    handler: async (agent, params) => {
      const { Factory, MAINNET_FACTORY_ADDR, Asset, PoolType } =
        await import("@dedust/sdk");
      const factory = agent.connection.open(
        Factory.createFromAddress(MAINNET_FACTORY_ADDR),
      );
      const fromAsset =
        params.fromToken.toUpperCase() === "TON"
          ? Asset.native()
          : Asset.jetton(Address.parse(params.fromToken));
      const toAsset =
        params.toToken.toUpperCase() === "TON"
          ? Asset.native()
          : Asset.jetton(Address.parse(params.toToken));
      const pool = agent.connection.open(
        await factory.getPool(PoolType.VOLATILE, [fromAsset, toAsset]),
      );
      const poolState = await pool.getReadinessStatus();
      if (poolState !== "ready") throw new Error(`Pool not ready`);
      const amountIn = toNano(params.amount);
      const { amountOut } = await pool.getEstimatedSwapOut({
        assetIn: fromAsset,
        amountIn,
      });
      const minAmountOut =
        (amountOut * BigInt(100 - (params.slippage || 1))) / 100n;

      if (params.fromToken.toUpperCase() !== "TON")
        throw new Error("Only TON→Jetton swaps supported currently");

      const { secretKey, publicKey } = agent.wallet.getCredentials();
      const networkId = agent.network === "testnet" ? -3 : -239;
      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
      const walletContract = freshClient.open(
        WalletContractV5R1.create({
          workchain: 0,
          publicKey,
          walletId: {
            networkGlobalId: networkId,
            workchain: 0,
            subwalletNumber: 0,
          },
        }),
      );
      const tonVault = agent.connection.open(await factory.getNativeVault());
      const swapPayload = beginCell()
        .storeUint(0xea06185d, 32)
        .storeUint(0, 64)
        .storeCoins(amountIn)
        .storeAddress(pool.address)
        .storeUint(0, 1)
        .storeCoins(minAmountOut)
        .storeMaybeRef(null)
        .storeRef(
          beginCell()
            .storeAddress(agent.wallet.address)
            .storeAddress(agent.wallet.address)
            .storeMaybeRef(null)
            .storeMaybeRef(null)
            .endCell(),
        )
        .endCell();
      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: tonVault.address,
            value: amountIn + toNano("0.25"),
            bounce: true,
            body: swapPayload,
          }),
        ],
      });
      return {
        status: "sent",
        fromAmount: params.amount,
        fromToken: params.fromToken,
        toAmount: fromNano(amountOut),
        toToken: params.toToken,
        dex: "dedust",
      };
    },
  },

  swap_stonfi: {
    description:
      "Swap tokens on STON.fi DEX. Supports TON↔Jetton and Jetton↔Jetton.",
    schema: z.object({
      fromToken: z.string().describe("Source: 'TON' or Jetton address"),
      toToken: z.string().describe("Destination: 'TON' or Jetton address"),
      amount: z.string().describe("Amount to swap"),
    }),
    handler: async (agent, params) => {
      const { DEX, pTON } = await import("@ston-fi/sdk");
      const router = agent.connection.open(new DEX.v1.Router());
      const amountIn = toNano(params.amount);
      const { secretKey, publicKey } = agent.wallet.getCredentials();
      const networkId = agent.network === "testnet" ? -3 : -239;
      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
      const walletContract = freshClient.open(
        WalletContractV5R1.create({
          workchain: 0,
          publicKey,
          walletId: {
            networkGlobalId: networkId,
            workchain: 0,
            subwalletNumber: 0,
          },
        }),
      );
      let txParams: any;
      if (params.fromToken.toUpperCase() === "TON") {
        txParams = await router.getSwapTonToJettonTxParams({
          userWalletAddress: agent.wallet.address,
          proxyTon: new pTON.v1(),
          offerAmount: amountIn,
          askJettonAddress: Address.parse(params.toToken),
          minAskAmount: toNano("0"),
        });
      } else if (params.toToken.toUpperCase() === "TON") {
        txParams = await router.getSwapJettonToTonTxParams({
          userWalletAddress: agent.wallet.address,
          proxyTon: new pTON.v1(),
          offerJettonAddress: Address.parse(params.fromToken),
          offerAmount: amountIn,
          minAskAmount: toNano("0"),
        });
      } else {
        txParams = await router.getSwapJettonToJettonTxParams({
          userWalletAddress: agent.wallet.address,
          offerJettonAddress: Address.parse(params.fromToken),
          offerAmount: amountIn,
          askJettonAddress: Address.parse(params.toToken),
          minAskAmount: toNano("0"),
        });
      }
      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: txParams.to,
            value: txParams.value,
            bounce: true,
            body: txParams.body,
          }),
        ],
      });
      return {
        status: "sent",
        fromAmount: params.amount,
        fromToken: params.fromToken,
        toToken: params.toToken,
        dex: "stonfi",
      };
    },
  },

  get_nft_info: {
    description:
      "Get information about an NFT including owner, collection, name, and image.",
    schema: z.object({
      nftAddress: z.string().describe("NFT item contract address"),
    }),
    handler: async (agent, params) => {
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const response = await fetch(
        `${apiBase}/nfts/${encodeURIComponent(params.nftAddress)}`,
      );
      if (!response.ok) throw new Error(`NFT not found`);
      const data = await response.json();
      return {
        address: data.address,
        owner: data.owner?.address || "unknown",
        collection: data.collection?.address || "none",
        name: data.metadata?.name || "Unknown",
        description: data.metadata?.description || "",
        image: data.metadata?.image || "",
      };
    },
  },

  get_nft_collection: {
    description:
      "Get information about an NFT collection including name, item count, and owner.",
    schema: z.object({
      collectionAddress: z.string().describe("NFT collection contract address"),
    }),
    handler: async (agent, params) => {
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const response = await fetch(
        `${apiBase}/nfts/collections/${encodeURIComponent(params.collectionAddress)}`,
      );
      if (!response.ok) throw new Error(`Collection not found`);
      const data = await response.json();
      return {
        address: data.address,
        name: data.metadata?.name || "Unknown",
        description: data.metadata?.description || "",
        image: data.metadata?.image || "",
        itemCount: data.next_item_index || 0,
        owner: data.owner?.address || "unknown",
      };
    },
  },

  transfer_nft: {
    description: "Transfer an NFT to another wallet address.",
    schema: z.object({
      nftAddress: z.string().describe("NFT item contract address"),
      to: z.string().describe("Destination wallet address"),
    }),
    handler: async (agent, params) => {
      const nftAddr = Address.parse(params.nftAddress);
      const toAddr = Address.parse(params.to);
      const transferBody = beginCell()
        .storeUint(0x5fcc3d14, 32)
        .storeUint(0, 64)
        .storeAddress(toAddr)
        .storeAddress(agent.wallet.address)
        .storeBit(0)
        .storeCoins(toNano("0.01"))
        .storeBit(0)
        .endCell();
      const { secretKey, publicKey } = agent.wallet.getCredentials();
      const networkId = agent.network === "testnet" ? -3 : -239;
      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
      const walletContract = freshClient.open(
        WalletContractV5R1.create({
          workchain: 0,
          publicKey,
          walletId: {
            networkGlobalId: networkId,
            workchain: 0,
            subwalletNumber: 0,
          },
        }),
      );
      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: nftAddr,
            value: toNano("0.05"),
            bounce: true,
            body: transferBody,
          }),
        ],
      });
      return { status: "sent", nftAddress: params.nftAddress, to: params.to };
    },
  },
};

// ============================================================
// MCP Server
// ============================================================

async function main() {
  // Init wallet + agent context
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    console.error("Set TON_MNEMONIC in .env");
    process.exit(1);
  }

  const network =
    (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
  const rpcUrl =
    process.env.TON_RPC_URL ||
    (network === "testnet"
      ? "https://testnet-v4.tonhubapi.com"
      : "https://mainnet-v4.tonhubapi.com");

  const client = new TonClient4({ endpoint: rpcUrl });
  const wallet = await KeypairWallet.autoDetect(
    mnemonic.split(" "),
    client,
    network,
  );

  const agentContext = {
    connection: client,
    wallet,
    network,
    rpcUrl,
    config: {},
  };

  // Create MCP server
  const server = new Server(
    { name: "ton-agent-kit", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // Meta tool
      {
        name: "ton_agent_info",
        description:
          "Get TON Agent Kit info: wallet address, network, available actions.",
        inputSchema: { type: "object" as const, properties: {} },
      },
      // All actions as tools
      ...Object.entries(actions).map(([name, action]) => ({
        name,
        description: action.description,
        inputSchema: zodToJsonSchema(action.schema),
      })),
    ],
  }));

  // Call tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "ton_agent_info") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                address: wallet.address.toRawString(),
                network,
                rpcUrl,
                walletVersion: wallet.version,
                actions: Object.keys(actions),
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    const action = actions[name];
    if (!action) {
      return {
        content: [{ type: "text" as const, text: `Unknown action: ${name}` }],
        isError: true,
      };
    }

    const parsed = action.schema.safeParse(args || {});
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Invalid params: ${parsed.error.message}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const result = await action.handler(agentContext, parsed.data);
      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  // Start
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`TON Agent Kit MCP Server started`);
  console.error(
    `Network: ${network} | Address: ${wallet.address.toRawString()}`,
  );
  console.error(`Actions: ${Object.keys(actions).join(", ")}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

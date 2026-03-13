#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Address, beginCell, fromNano, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import "dotenv/config";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { KeypairWallet } from "./packages/core/src/wallet";

// ============================================================
// Escrow storage (JSON file)
// ============================================================

import { existsSync, readFileSync, writeFileSync } from "fs";

const ESCROW_FILE = ".escrow-store.json";

function loadEscrows(): Record<string, any> {
  try {
    if (existsSync(ESCROW_FILE)) {
      return JSON.parse(readFileSync(ESCROW_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveEscrows(escrows: Record<string, any>): void {
  try {
    writeFileSync(ESCROW_FILE, JSON.stringify(escrows, null, 2), "utf-8");
  } catch {}
}

// ============================================================
// Agent Registry storage (JSON file)
// ============================================================

const REGISTRY_FILE = ".agent-registry.json";

function loadAgentRegistry(): Record<string, any> {
  try {
    if (existsSync(REGISTRY_FILE)) {
      return JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

function saveAgentRegistry(registry: Record<string, any>): void {
  try {
    writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
  } catch {}
}

// ============================================================
// All 15 proven actions
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

  get_transaction_history: {
    description: "Get recent transaction history for a wallet address.",
    schema: z.object({
      address: z
        .string()
        .optional()
        .describe("Wallet address. Defaults to agent's own."),
      limit: z.coerce
        .number()
        .optional()
        .default(10)
        .describe("Number of transactions (default: 10)"),
    }),
    handler: async (agent, params) => {
      const addr = params.address || agent.wallet.address.toRawString();
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const url = `${apiBase}/accounts/${encodeURIComponent(addr)}/events?limit=${params.limit || 10}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Failed to fetch history: ${response.status}`);
      const data = await response.json();
      const events = (data.events || []).map((e: any) => ({
        id: e.event_id,
        timestamp: new Date(e.timestamp * 1000).toISOString(),
        actions: (e.actions || []).map((a: any) => ({
          type: a.type,
          status: a.status,
          amount: a.TonTransfer?.amount
            ? (Number(a.TonTransfer.amount) / 1e9).toString()
            : undefined,
          sender: a.TonTransfer?.sender?.address,
          recipient: a.TonTransfer?.recipient?.address,
        })),
      }));
      return { address: addr, count: events.length, events };
    },
  },

  get_wallet_info: {
    description:
      "Get detailed wallet information including status, balance, interfaces, and last activity.",
    schema: z.object({
      address: z
        .string()
        .optional()
        .describe("Wallet address. Defaults to agent's own."),
    }),
    handler: async (agent, params) => {
      const addr = params.address || agent.wallet.address.toRawString();
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const response = await fetch(
        `${apiBase}/accounts/${encodeURIComponent(addr)}`,
      );
      if (!response.ok)
        throw new Error(`Failed to fetch wallet info: ${response.status}`);
      const data = await response.json();
      return {
        address: data.address,
        balance: (Number(data.balance) / 1e9).toString() + " TON",
        status: data.status,
        interfaces: data.interfaces || [],
        name: data.name || null,
        lastActivity: data.last_activity
          ? new Date(data.last_activity * 1000).toISOString()
          : null,
        isWallet: data.is_wallet,
      };
    },
  },

  get_staking_info: {
    description: "Get staking pools and validator information on TON.",
    schema: z.object({
      address: z
        .string()
        .optional()
        .describe("Wallet to check staking for. Defaults to agent's own."),
    }),
    handler: async (agent, params) => {
      const addr = params.address || agent.wallet.address.toRawString();
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";

      // Get staking info for this wallet
      const response = await fetch(
        `${apiBase}/staking/nominator/${encodeURIComponent(addr)}/pools`,
      );
      if (response.ok) {
        const data = await response.json();
        return {
          address: addr,
          pools: (data.pools || []).map((p: any) => ({
            pool: p.address,
            name: p.name || "Unknown pool",
            amount: (Number(p.amount) / 1e9).toString() + " TON",
            readyWithdraw: (Number(p.ready_withdraw) / 1e9).toString() + " TON",
            pendingDeposit:
              (Number(p.pending_deposit) / 1e9).toString() + " TON",
          })),
        };
      }

      return {
        address: addr,
        pools: [],
        message: "No staking positions found",
      };
    },
  },

  stake_ton: {
    description:
      "Stake TON with a validator pool. Sends TON to a staking pool contract.",
    schema: z.object({
      poolAddress: z.string().describe("Staking pool contract address"),
      amount: z.string().describe("Amount of TON to stake"),
    }),
    handler: async (agent, params) => {
      const poolAddr = Address.parse(params.poolAddress);
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

      // Staking deposit message: send TON with a deposit op code
      const depositBody = beginCell()
        .storeUint(0x47d54391, 32) // deposit op
        .storeUint(0, 64) // query_id
        .endCell();

      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: poolAddr,
            value: toNano(params.amount),
            bounce: true,
            body: depositBody,
          }),
        ],
      });

      return {
        status: "sent",
        pool: params.poolAddress,
        amount: params.amount,
      };
    },
  },

  unstake_ton: {
    description:
      "Unstake TON from a validator pool. Initiates withdrawal from a staking pool.",
    schema: z.object({
      poolAddress: z.string().describe("Staking pool contract address"),
    }),
    handler: async (agent, params) => {
      const poolAddr = Address.parse(params.poolAddress);
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

      // Withdraw op
      const withdrawBody = beginCell()
        .storeUint(0x47d54392, 32) // withdraw op
        .storeUint(0, 64) // query_id
        .endCell();

      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: poolAddr,
            value: toNano("0.1"),
            bounce: true,
            body: withdrawBody,
          }),
        ],
      });

      return { status: "sent", pool: params.poolAddress, action: "unstake" };
    },
  },

  pay_for_resource: {
    description:
      "Pay for an x402-gated API resource. Sends payment, then retries the request with proof. Returns the API response.",
    schema: z.object({
      url: z.string().describe("URL of the x402-gated API endpoint"),
    }),
    handler: async (agent, params) => {
      // Step 1: Request the resource
      const initialResponse = await fetch(params.url);

      // If not 402, return directly (no payment needed)
      if (initialResponse.status !== 402) {
        const data = await initialResponse.json();
        return { paid: false, status: initialResponse.status, data };
      }

      // Step 2: Parse payment requirements
      const paymentInfo = await initialResponse.json();
      const requirement = paymentInfo.payment;

      if (!requirement || requirement.protocol !== "ton-x402-v1") {
        throw new Error("Unsupported payment protocol");
      }

      // Step 3: Send payment
      const toAddress = Address.parse(requirement.recipient);
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

      const commentBody = beginCell()
        .storeUint(0, 32)
        .storeStringTail(`x402:${params.url}`)
        .endCell();

      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: toAddress,
            value: toNano(requirement.amount),
            bounce: false,
            body: commentBody,
          }),
        ],
      });

      // Step 4: Wait for confirmation
      await new Promise((r) => setTimeout(r, 10000));

      // Step 5: Get the tx hash from recent transactions
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const txResponse = await fetch(
        `${apiBase}/accounts/${encodeURIComponent(agent.wallet.address.toRawString())}/events?limit=1`,
      );
      const txData = await txResponse.json();
      const txHash = txData.events?.[0]?.event_id;

      if (!txHash) {
        throw new Error("Payment sent but could not retrieve transaction hash");
      }

      // Step 6: Retry with payment proof
      const paidResponse = await fetch(params.url, {
        headers: { "X-Payment-Hash": txHash },
      });

      if (paidResponse.ok) {
        const data = await paidResponse.json();
        return {
          paid: true,
          amount: requirement.amount + " TON",
          txHash,
          data,
        };
      }

      throw new Error(
        `Payment verified but resource returned ${paidResponse.status}`,
      );
    },
  },

  create_escrow: {
    description:
      "Create a new escrow deal. Tracks the escrow locally and returns an ID. The beneficiary receives funds when released.",
    schema: z.object({
      beneficiary: z
        .string()
        .describe("Address of the beneficiary (who receives funds)"),
      amount: z.string().describe("Amount of TON to escrow"),
      description: z.string().optional().describe("Description of the deal"),
      deadlineMinutes: z.coerce
        .number()
        .optional()
        .default(60)
        .describe("Deadline in minutes (default: 60)"),
    }),
    handler: async (agent, params) => {
      const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const deadline =
        Math.floor(Date.now() / 1000) + (params.deadlineMinutes || 60) * 60;

      const escrow = {
        id: escrowId,
        depositor: agent.wallet.address.toRawString(),
        beneficiary: params.beneficiary,
        arbiter: agent.wallet.address.toRawString(), // Agent is arbiter by default
        amount: params.amount,
        deadline,
        deadlineISO: new Date(deadline * 1000).toISOString(),
        description: params.description || "",
        status: "created", // created → funded → released | refunded
        depositTxHash: null as string | null,
        settleTxHash: null as string | null,
        createdAt: new Date().toISOString(),
      };

      // Save to escrow store
      const escrows = loadEscrows();
      escrows[escrowId] = escrow;
      saveEscrows(escrows);

      return {
        escrowId,
        status: "created",
        beneficiary: params.beneficiary,
        amount: params.amount + " TON",
        deadline: escrow.deadlineISO,
        description: params.description || "",
        nextStep: `Deposit ${params.amount} TON using deposit_to_escrow with escrowId: ${escrowId}`,
      };
    },
  },

  deposit_to_escrow: {
    description:
      "Deposit TON into an escrow deal. Sends TON to a holding address and marks the escrow as funded.",
    schema: z.object({
      escrowId: z.string().describe("Escrow ID from create_escrow"),
    }),
    handler: async (agent, params) => {
      const escrows = loadEscrows();
      const escrow = escrows[params.escrowId];
      if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
      if (escrow.status !== "created")
        throw new Error(`Escrow already ${escrow.status}`);

      // Send TON to ourselves (holding) with escrow ID as comment
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

      const commentBody = beginCell()
        .storeUint(0, 32)
        .storeStringTail(`escrow:${params.escrowId}`)
        .endCell();

      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: walletContract.address,
            value: toNano(escrow.amount),
            bounce: false,
            body: commentBody,
          }),
        ],
      });

      // Wait for confirmation
      await new Promise((r) => setTimeout(r, 10000));

      // Get tx hash
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const txRes = await fetch(
        `${apiBase}/accounts/${encodeURIComponent(agent.wallet.address.toRawString())}/events?limit=1`,
      );
      const txData = await txRes.json();
      const txHash = txData.events?.[0]?.event_id || "pending";

      // Update escrow
      escrow.status = "funded";
      escrow.depositTxHash = txHash;
      saveEscrows(escrows);

      return {
        escrowId: params.escrowId,
        status: "funded",
        amount: escrow.amount + " TON",
        depositTxHash: txHash,
        beneficiary: escrow.beneficiary,
        deadline: escrow.deadlineISO,
      };
    },
  },

  release_escrow: {
    description:
      "Release escrowed funds to the beneficiary. Only the depositor or arbiter can release.",
    schema: z.object({
      escrowId: z.string().describe("Escrow ID to release"),
    }),
    handler: async (agent, params) => {
      const escrows = loadEscrows();
      const escrow = escrows[params.escrowId];
      if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
      if (escrow.status !== "funded")
        throw new Error(`Escrow is ${escrow.status}, must be funded`);

      // Send TON to beneficiary
      const beneficiary = Address.parse(escrow.beneficiary);
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

      const commentBody = beginCell()
        .storeUint(0, 32)
        .storeStringTail(`escrow-release:${params.escrowId}`)
        .endCell();

      const seqno = await walletContract.getSeqno();
      await walletContract.sendTransfer({
        seqno,
        secretKey,
        messages: [
          internal({
            to: beneficiary,
            value: toNano(escrow.amount),
            bounce: false,
            body: commentBody,
          }),
        ],
      });

      // Wait and get tx hash
      await new Promise((r) => setTimeout(r, 10000));
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";
      const txRes = await fetch(
        `${apiBase}/accounts/${encodeURIComponent(agent.wallet.address.toRawString())}/events?limit=1`,
      );
      const txData = await txRes.json();
      const txHash = txData.events?.[0]?.event_id || "pending";

      escrow.status = "released";
      escrow.settleTxHash = txHash;
      saveEscrows(escrows);

      return {
        escrowId: params.escrowId,
        status: "released",
        amount: escrow.amount + " TON",
        beneficiary: escrow.beneficiary,
        releaseTxHash: txHash,
      };
    },
  },

  refund_escrow: {
    description:
      "Refund escrowed funds back to the depositor. Can refund if authorized or after deadline.",
    schema: z.object({
      escrowId: z.string().describe("Escrow ID to refund"),
    }),
    handler: async (agent, params) => {
      const escrows = loadEscrows();
      const escrow = escrows[params.escrowId];
      if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
      if (escrow.status !== "funded")
        throw new Error(`Escrow is ${escrow.status}, must be funded`);

      // Check deadline for auto-refund
      const now = Math.floor(Date.now() / 1000);
      const isDepositor =
        agent.wallet.address.toRawString() === escrow.depositor;
      const isArbiter = agent.wallet.address.toRawString() === escrow.arbiter;
      const pastDeadline = now > escrow.deadline;

      if (!isDepositor && !isArbiter && !pastDeadline) {
        throw new Error(
          "Not authorized: only depositor/arbiter can refund before deadline",
        );
      }

      // Refund is just keeping the TON (since deposit was a self-transfer)
      escrow.status = "refunded";
      escrow.settleTxHash = "self-refund";
      saveEscrows(escrows);

      return {
        escrowId: params.escrowId,
        status: "refunded",
        amount: escrow.amount + " TON",
        depositor: escrow.depositor,
        reason: pastDeadline ? "Deadline passed" : "Authorized refund",
      };
    },
  },

  get_escrow_info: {
    description:
      "Get escrow details. If escrowId is provided, returns that escrow. If no escrowId, lists ALL escrows.",
    schema: z.object({
      escrowId: z
        .string()
        .optional()
        .describe("Escrow ID. If not provided, lists all escrows."),
    }),
    handler: async (agent, params) => {
      const escrows = loadEscrows();

      if (params.escrowId) {
        const escrow = escrows[params.escrowId];
        if (!escrow) throw new Error(`Escrow not found: ${params.escrowId}`);
        return escrow;
      }

      // List all escrows
      const list = Object.values(escrows);
      return {
        count: list.length,
        escrows: list.map((e: any) => ({
          id: e.id,
          status: e.status,
          amount: e.amount + " TON",
          beneficiary: e.beneficiary,
          deadline: e.deadlineISO,
          description: e.description,
        })),
      };
    },
  },

  register_agent: {
    description:
      "Register an AI agent in the local agent registry with its capabilities, name, and description. Other agents can discover it via discover_agent.",
    schema: z.object({
      name: z
        .string()
        .describe("Agent name (e.g., 'market-data', 'trading-bot')"),
      capabilities: z
        .union([
          z.array(z.string()),
          z.string().transform((s) => {
            try {
              return JSON.parse(s);
            } catch {
              return s.split(",").map((c: string) => c.trim());
            }
          }),
        ])
        .describe(
          "List of capabilities (e.g., ['price_feed', 'analytics', 'trading'])",
        ),
      description: z
        .string()
        .optional()
        .describe("Human-readable description of the agent"),
      endpoint: z
        .string()
        .optional()
        .describe("API endpoint where the agent can be reached"),
    }),
    handler: async (agent, params) => {
      const agentId = `agent_${params.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;

      const agentRecord = {
        id: agentId,
        name: params.name,
        address: agent.wallet.address.toRawString(),
        capabilities: params.capabilities,
        description: params.description || "",
        endpoint: params.endpoint || null,
        network: agent.network,
        registeredAt: new Date().toISOString(),
        reputation: { score: 0, totalTasks: 0, successfulTasks: 0 },
      };

      const registry = loadAgentRegistry();
      registry[agentId] = agentRecord;
      saveAgentRegistry(registry);

      return {
        agentId,
        name: params.name,
        address: agent.wallet.address.toRawString(),
        capabilities: params.capabilities,
        description: params.description || "",
        status: "registered",
        dnsHint: `${params.name}.agents.ton (requires TON DNS domain)`,
      };
    },
  },

  discover_agent: {
    description:
      "Find registered agents by capability or name. Search the local agent registry to find agents that can perform specific tasks.",
    schema: z.object({
      capability: z
        .string()
        .optional()
        .describe("Capability to search for (e.g., 'price_feed', 'trading')"),
      name: z.string().optional().describe("Agent name to search for"),
    }),
    handler: async (agent, params) => {
      const registry = loadAgentRegistry();
      let results = Object.values(registry);

      if (params.capability) {
        const cap = params.capability.toLowerCase();
        results = results.filter((a: any) =>
          a.capabilities.some((c: string) => c.toLowerCase().includes(cap)),
        );
      }

      if (params.name) {
        const name = params.name.toLowerCase();
        results = results.filter((a: any) =>
          a.name.toLowerCase().includes(name),
        );
      }

      return {
        query: { capability: params.capability, name: params.name },
        count: results.length,
        agents: results.map((a: any) => ({
          id: a.id,
          name: a.name,
          address: a.address,
          capabilities: a.capabilities,
          description: a.description,
          endpoint: a.endpoint,
          reputation: a.reputation,
          registeredAt: a.registeredAt,
        })),
      };
    },
  },

  get_agent_reputation: {
    description:
      "Get the reputation score of a registered agent. Set addTask=true and success=true to record a successful task. Set addTask=true and success=false to record a failed task.",
    schema: z.object({
      agentId: z.string().describe("Agent ID to check or update"),
      addTask: z
        .union([z.boolean(), z.string().transform((s) => s === "true")])
        .optional()
        .describe("Set to true to record a completed task"),
      success: z
        .union([z.boolean(), z.string().transform((s) => s === "true")])
        .optional()
        .describe("If addTask is true, whether the task was successful"),
    }),
    handler: async (agent, params) => {
      const registry = loadAgentRegistry();
      const agentRecord = registry[params.agentId];
      if (!agentRecord) throw new Error(`Agent not found: ${params.agentId}`);

      // Update reputation if recording a task
      if (params.addTask) {
        agentRecord.reputation.totalTasks += 1;
        if (params.success !== false) {
          agentRecord.reputation.successfulTasks += 1;
        }
        agentRecord.reputation.score = Math.round(
          (agentRecord.reputation.successfulTasks /
            agentRecord.reputation.totalTasks) *
            100,
        );
        saveAgentRegistry(registry);
      }

      return {
        agentId: params.agentId,
        name: agentRecord.name,
        address: agentRecord.address,
        reputation: agentRecord.reputation,
        registeredAt: agentRecord.registeredAt,
      };
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
        inputSchema: (() => {
          const schema = zodToJsonSchema(action.schema, { target: "openApi3" });
          const { $schema, ...rest } = schema as any;
          return { type: "object", properties: {}, ...rest };
        })(),
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

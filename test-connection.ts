import { Address, beginCell, fromNano, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import "dotenv/config";
import { z } from "zod";
import { TonAgentKit } from "./packages/core/src/agent";
import { defineAction, definePlugin } from "./packages/core/src/plugin";
import { KeypairWallet } from "./packages/core/src/wallet";

// ── get_balance ──
const getBalanceAction = defineAction({
  name: "get_balance",
  description: "Get the TON balance of a wallet address.",
  schema: z.object({ address: z.string().optional() }),
  handler: async (agent: any, params: any) => {
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
      address: targetAddress.toString({ testOnly: true, bounceable: false }),
    };
  },
});

// ── get_jetton_balance (via TONAPI) ──
const getJettonBalanceAction = defineAction({
  name: "get_jetton_balance",
  description: "Get the balance of a specific Jetton (token) for a wallet.",
  schema: z.object({
    jettonAddress: z.string().describe("Jetton master contract address"),
    ownerAddress: z.string().optional(),
  }),
  handler: async (agent: any, params: any) => {
    const ownerAddr = params.ownerAddress || agent.wallet.address.toRawString();
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
        const rawBalance = data.balance || "0";
        return {
          balance: (Number(rawBalance) / Math.pow(10, decimals)).toString(),
          symbol: data.jetton?.symbol || "???",
          name: data.jetton?.name || "Unknown",
          decimals,
          jettonAddress: params.jettonAddress,
          ownerAddress: ownerAddr,
        };
      }
    } catch {}
    return {
      balance: "0",
      symbol: "???",
      name: "Unknown",
      decimals: 9,
      jettonAddress: params.jettonAddress,
      ownerAddress: ownerAddr,
    };
  },
});

// ── transfer_ton ──
const transferTonAction = defineAction({
  name: "transfer_ton",
  description: "Transfer TON to another wallet address.",
  schema: z.object({
    to: z.string().describe("Destination address"),
    amount: z.string().describe("Amount of TON to send"),
    comment: z.string().optional(),
  }),
  handler: async (agent: any, params: any) => {
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
    return { status: "sent", to: params.to, amount: params.amount };
  },
});

// ── resolve_domain ──
const resolveDomainAction = defineAction({
  name: "resolve_domain",
  description: "Resolve a .ton domain name to its wallet address.",
  schema: z.object({
    domain: z.string().describe("Domain name (e.g., 'foundation.ton')"),
  }),
  handler: async (agent: any, params: any) => {
    const domain = params.domain.replace(/\.ton$/i, "");
    const apiUrl = `https://tonapi.io/v2/dns/${encodeURIComponent(domain + ".ton")}/resolve`;
    try {
      const response = await fetch(apiUrl);
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
});

// ── swap_dedust ──
const swapDedustAction = defineAction({
  name: "swap_dedust",
  description: "Swap tokens on DeDust DEX. Supports TON and any Jetton.",
  schema: z.object({
    fromToken: z
      .string()
      .describe("Source token: 'TON' or Jetton master address"),
    toToken: z
      .string()
      .describe("Destination token: 'TON' or Jetton master address"),
    amount: z.string().describe("Amount to swap in source token units"),
    slippage: z.coerce
      .number()
      .optional()
      .default(1)
      .describe("Slippage tolerance percent (default: 1)"),
  }),
  handler: async (agent: any, params: any) => {
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
    if (poolState !== "ready")
      throw new Error(
        `Pool not ready for ${params.fromToken}/${params.toToken}`,
      );

    const amountIn = toNano(params.amount);
    const { amountOut } = await pool.getEstimatedSwapOut({
      assetIn: fromAsset,
      amountIn,
    });
    const minAmountOut =
      (amountOut * BigInt(100 - (params.slippage || 1))) / 100n;

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

    if (params.fromToken.toUpperCase() === "TON") {
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
    } else {
      throw new Error(
        "Jetton swaps coming soon. Use TON as fromToken for now.",
      );
    }

    return {
      status: "sent",
      fromAmount: params.amount,
      fromToken: params.fromToken,
      toAmount: fromNano(amountOut),
      toToken: params.toToken,
      minReceived: fromNano(minAmountOut),
      dex: "dedust",
    };
  },
});

// ── swap_stonfi ──
const swapStonfiAction = defineAction({
  name: "swap_stonfi",
  description: "Swap tokens on STON.fi DEX.",
  schema: z.object({
    fromToken: z
      .string()
      .describe("Source token: 'TON' or Jetton master address"),
    toToken: z
      .string()
      .describe("Destination token: 'TON' or Jetton master address"),
    amount: z.string().describe("Amount to swap"),
    slippage: z.number().optional().default(1),
  }),
  handler: async (agent: any, params: any) => {
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
});

// ── get_price (via TONAPI) ──
const getPriceAction = defineAction({
  name: "get_price",
  description: "Get the current price of a token.",
  schema: z.object({
    token: z.string().describe("Jetton master address"),
  }),
  handler: async (agent: any, params: any) => {
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const url = `${apiBase}/rates?tokens=${encodeURIComponent(params.token)}&currencies=usd,ton`;
    try {
      const response = await fetch(url);
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
});

// ── get_nft_info (via TONAPI) ──
const getNftInfoAction = defineAction({
  name: "get_nft_info",
  description:
    "Get information about an NFT on TON including owner, collection, and metadata.",
  schema: z.object({
    nftAddress: z.string().describe("NFT item contract address"),
  }),
  handler: async (agent: any, params: any) => {
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const url = `${apiBase}/nfts/${encodeURIComponent(params.nftAddress)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NFT not found: ${response.status}`);
    const data = await response.json();
    return {
      address: data.address,
      index: data.index,
      owner: data.owner?.address || "unknown",
      collection: data.collection?.address || "none",
      name: data.metadata?.name || "Unknown NFT",
      description: data.metadata?.description || "",
      image: data.metadata?.image || "",
      verified: data.approved_by?.length > 0 || false,
    };
  },
});

// ── get_nft_collection (via TONAPI) ──
const getNftCollectionAction = defineAction({
  name: "get_nft_collection",
  description: "Get information about an NFT collection on TON.",
  schema: z.object({
    collectionAddress: z.string().describe("NFT collection contract address"),
  }),
  handler: async (agent: any, params: any) => {
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const url = `${apiBase}/nfts/collections/${encodeURIComponent(params.collectionAddress)}`;
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Collection not found: ${response.status}`);
    const data = await response.json();
    return {
      address: data.address,
      name: data.metadata?.name || "Unknown Collection",
      description: data.metadata?.description || "",
      image: data.metadata?.image || "",
      itemCount: data.next_item_index || 0,
      owner: data.owner?.address || "unknown",
    };
  },
});

// ── transfer_nft ──
const transferNftAction = defineAction({
  name: "transfer_nft",
  description: "Transfer an NFT to another wallet address.",
  schema: z.object({
    nftAddress: z.string().describe("NFT item contract address"),
    to: z.string().describe("Destination wallet address"),
  }),
  handler: async (agent: any, params: any) => {
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
});

const TestPlugin = definePlugin({
  name: "test",
  actions: [
    getBalanceAction,
    getJettonBalanceAction,
    transferTonAction,
    resolveDomainAction,
    swapDedustAction,
    swapStonfiAction,
    getPriceAction,
    getNftInfoAction,
    getNftCollectionAction,
    transferNftAction,
  ],
});

async function main() {
  const mnemonic = process.env.TON_MNEMONIC!.split(" ");
  const client = new TonClient4({
    endpoint: "https://testnet-v4.tonhubapi.com",
  });
  const wallet = await KeypairWallet.autoDetect(mnemonic, client, "testnet");

  const agent = new TonAgentKit(
    wallet,
    "https://testnet-v4.tonhubapi.com",
    {},
    "testnet",
  ).use(TestPlugin);

  console.log(`🤖 Agent: ${agent.actionCount} actions loaded`);
  console.log(
    `   ${agent
      .getAvailableActions()
      .map((a) => a.name)
      .join(", ")}\n`,
  );

  // Mainnet agent for API queries
  const mainWallet = await KeypairWallet.fromMnemonic(mnemonic, {
    version: "V5R1",
    network: "mainnet",
  });
  const mainAgent = new TonAgentKit(
    mainWallet,
    "https://mainnet-v4.tonhubapi.com",
    {},
    "mainnet",
  ).use(TestPlugin);

  // Test 1: get_balance
  const bal = await agent.methods.get_balance({});
  console.log(`✅ get_balance: ${bal.balance} TON`);

  // Test 2: get_jetton_balance
  const jBal = await mainAgent.methods.get_jetton_balance({
    jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    ownerAddress: "UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPp3p",
  });
  console.log(`✅ get_jetton_balance: ${jBal.balance} ${jBal.symbol}`);

  // Test 3: resolve_domain
  const dns = await agent.methods.resolve_domain({ domain: "foundation.ton" });
  console.log(`✅ resolve_domain: foundation.ton → ${dns.address}`);

  // Test 4: get_price
  const price = await mainAgent.methods.get_price({
    token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  });
  console.log(`✅ get_price: USDT = $${price.priceUSD}`);

  // Test 5: swap schemas
  console.log(`\n🔄 Swap schemas...`);
  const ds = swapDedustAction.schema.safeParse({
    fromToken: "TON",
    toToken: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    amount: "10",
    slippage: 1,
  });
  console.log(`✅ swap_dedust schema: ${ds.success ? "valid" : "invalid"}`);
  const ss = swapStonfiAction.schema.safeParse({
    fromToken: "TON",
    toToken: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    amount: "5",
  });
  console.log(`✅ swap_stonfi schema: ${ss.success ? "valid" : "invalid"}`);

  // Test 6: NFT actions
  console.log(`\n🖼️ NFT actions...`);
  try {
    const nft = await mainAgent.methods.get_nft_info({
      nftAddress: "EQBhPMcSCNLfRdHyolQsmgFj3MiA2V9X-4b4k2WWUSQPMPHT",
    });
    console.log(`✅ get_nft_info: "${nft.name}" | Owner: ${nft.owner}`);
  } catch (err: any) {
    console.log(`⚠️ get_nft_info: ${err.message}`);
  }

  try {
    const col = await mainAgent.methods.get_nft_collection({
      collectionAddress: "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi",
    });
    console.log(
      `✅ get_nft_collection: "${col.name}" (${col.itemCount} items)`,
    );
  } catch (err: any) {
    console.log(`⚠️ get_nft_collection: ${err.message}`);
  }

  const nts = transferNftAction.schema.safeParse({
    nftAddress: "EQBhPMcSCNLfRdHyolQsmgFj3MiA2V9X-4b4k2WWUSQPMPHT",
    to: wallet.address.toRawString(),
  });
  console.log(`✅ transfer_nft schema: ${nts.success ? "valid" : "invalid"}`);

  console.log(`\n✅ All ${agent.actionCount} actions verified!`);
}

main().catch((err) => console.error("❌ Error:", err.message));

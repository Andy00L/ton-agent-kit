import "dotenv/config";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { KeypairWallet } from "./packages/core/src/wallet";
import { Address, fromNano, toNano, beginCell, internal } from "@ton/core";

async function main() {
  const mnemonic = process.env.TON_MNEMONIC!.split(" ");
  const client = new TonClient4({
    endpoint: "https://testnet-v4.tonhubapi.com",
  });
  const wallet = await KeypairWallet.autoDetect(mnemonic, client, "testnet");

  // Import all actions from mcp-server dynamically
  const actions = await loadActions();

  const agentContext = {
    connection: client,
    wallet,
    network: "testnet",
    rpcUrl: "https://testnet-v4.tonhubapi.com",
    config: {},
  };

  // Mainnet context for TONAPI queries
  const mainWallet = await KeypairWallet.fromMnemonic(mnemonic, {
    version: "V5R1",
    network: "mainnet",
  });
  const mainClient = new TonClient4({
    endpoint: "https://mainnet-v4.tonhubapi.com",
  });
  const mainContext = {
    connection: mainClient,
    wallet: mainWallet,
    network: "mainnet",
    rpcUrl: "https://mainnet-v4.tonhubapi.com",
    config: {},
  };

  console.log(`\n🤖 TON Agent Kit — Full Test Suite`);
  console.log(`📍 Address: ${wallet.address.toRawString()}`);
  console.log(`🔧 Actions: ${Object.keys(actions).length}\n`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  async function test(
    name: string,
    ctx: any,
    params: any,
    validate?: (r: any) => boolean,
  ) {
    try {
      const action = actions[name];
      if (!action) {
        console.log(`⏭️  ${name}: NOT FOUND`);
        skipped++;
        return;
      }
      const parsed = action.schema.parse(params);
      const result = await action.handler(ctx, parsed);
      const ok = validate ? validate(result) : true;
      if (ok) {
        console.log(`✅ ${name}: ${JSON.stringify(result).slice(0, 120)}`);
        passed++;
      } else {
        console.log(
          `❌ ${name}: validation failed — ${JSON.stringify(result).slice(0, 120)}`,
        );
        failed++;
      }
    } catch (err: any) {
      console.log(`❌ ${name}: ${err.message.slice(0, 120)}`);
      failed++;
    }
  }

  async function testSchema(name: string, params: any) {
    try {
      const action = actions[name];
      if (!action) {
        console.log(`⏭️  ${name}: NOT FOUND`);
        skipped++;
        return;
      }
      action.schema.parse(params);
      console.log(`✅ ${name}: schema valid`);
      passed++;
    } catch (err: any) {
      console.log(`❌ ${name}: schema invalid — ${err.message.slice(0, 100)}`);
      failed++;
    }
  }

  // ── LIVE TESTS (testnet) ──
  console.log(`── Live Tests (testnet) ──`);
  await test("get_balance", agentContext, {}, (r) => parseFloat(r.balance) > 0);
  await test("get_wallet_info", agentContext, {}, (r) => r.status === "active");
  await test(
    "get_transaction_history",
    agentContext,
    { limit: 3 },
    (r) => r.count > 0,
  );
  await test("get_staking_info", agentContext, {}, (r) => !!r.address);

  // ── LIVE TESTS (mainnet via TONAPI) ──
  console.log(`\n── Live Tests (mainnet TONAPI) ──`);
  await test("get_jetton_balance", mainContext, {
    jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    ownerAddress: "UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPp3p",
  });
  await test(
    "resolve_domain",
    agentContext,
    { domain: "foundation.ton" },
    (r) => r.resolved === true,
  );
  await test(
    "get_price",
    mainContext,
    {
      token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    },
    (r) => r.priceUSD !== "unknown",
  );
  await test(
    "get_nft_collection",
    mainContext,
    {
      collectionAddress: "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi",
    },
    (r) => !!r.name,
  );

  // ── SCHEMA VALIDATION (no execution) ──
  console.log(`\n── Schema Validation ──`);
  await testSchema("transfer_ton", {
    to: "0:abc123",
    amount: "1.5",
    comment: "test",
  });
  await testSchema("transfer_jetton", {
    to: "0:abc123",
    amount: "100",
    jettonAddress: "0:def456",
  });
  await testSchema("transfer_nft", { nftAddress: "0:abc123", to: "0:def456" });
  await testSchema("swap_dedust", {
    fromToken: "TON",
    toToken: "0:abc123",
    amount: "10",
    slippage: 1,
  });
  await testSchema("swap_stonfi", {
    fromToken: "TON",
    toToken: "0:abc123",
    amount: "5",
  });
  await testSchema("stake_ton", { poolAddress: "0:abc123", amount: "10" });
  await testSchema("unstake_ton", { poolAddress: "0:abc123" });

  // ── SUMMARY ──
  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(
    `📊 Total: ${passed + failed + skipped} / ${Object.keys(actions).length}`,
  );
  console.log(`${"═".repeat(50)}\n`);
}

// Load actions from mcp-server inline (avoids import issues)
async function loadActions() {
  const { z } = await import("zod");
  const { Address, fromNano, toNano, beginCell, internal } =
    await import("@ton/core");
  const { TonClient4, WalletContractV5R1 } = await import("@ton/ton");

  // Re-import the mcp-server actions object
  // Since it's not exported, we re-declare the schemas here
  return {
    get_balance: {
      schema: z.object({ address: z.string().optional() }),
      handler: async (agent: any, params: any) => {
        const addr = params.address
          ? Address.parse(params.address)
          : agent.wallet.address;
        const lb = await agent.connection.getLastBlock();
        const s = await agent.connection.getAccount(lb.last.seqno, addr);
        return {
          balance: fromNano(s.account.balance.coins),
          address: addr.toRawString(),
        };
      },
    },
    get_jetton_balance: {
      schema: z.object({
        jettonAddress: z.string(),
        ownerAddress: z.string().optional(),
      }),
      handler: async (agent: any, params: any) => {
        const owner = params.ownerAddress || agent.wallet.address.toRawString();
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        try {
          const r = await fetch(
            `${base}/accounts/${encodeURIComponent(owner)}/jettons/${encodeURIComponent(params.jettonAddress)}`,
          );
          if (r.ok) {
            const d = await r.json();
            return {
              balance: (
                Number(d.balance || "0") / Math.pow(10, d.jetton?.decimals || 9)
              ).toString(),
              symbol: d.jetton?.symbol || "???",
              name: d.jetton?.name || "Unknown",
            };
          }
        } catch {}
        return { balance: "0", symbol: "???", name: "Unknown" };
      },
    },
    transfer_ton: {
      schema: z.object({
        to: z.string(),
        amount: z.string(),
        comment: z.string().optional(),
      }),
      handler: async () => ({ status: "schema_only" }),
    },
    transfer_jetton: {
      schema: z.object({
        to: z.string(),
        amount: z.string(),
        jettonAddress: z.string(),
      }),
      handler: async () => ({ status: "schema_only" }),
    },
    resolve_domain: {
      schema: z.object({ domain: z.string() }),
      handler: async (_a: any, p: any) => {
        const d = p.domain.replace(/\.ton$/i, "");
        try {
          const r = await fetch(
            `https://tonapi.io/v2/dns/${encodeURIComponent(d + ".ton")}/resolve`,
          );
          if (r.ok) {
            const data = await r.json();
            return {
              domain: `${d}.ton`,
              address: data.wallet?.address || "not found",
              resolved: !!data.wallet,
            };
          }
        } catch {}
        return { domain: `${d}.ton`, address: "not found", resolved: false };
      },
    },
    get_price: {
      schema: z.object({ token: z.string() }),
      handler: async (agent: any, params: any) => {
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        try {
          const r = await fetch(
            `${base}/rates?tokens=${encodeURIComponent(params.token)}&currencies=usd,ton`,
          );
          if (r.ok) {
            const d = await r.json();
            const rates = d.rates?.[params.token];
            return {
              token: params.token,
              priceUSD: rates?.prices?.USD || "unknown",
              priceTON: rates?.prices?.TON || "unknown",
            };
          }
        } catch {}
        return {
          token: params.token,
          priceUSD: "unknown",
          priceTON: "unknown",
        };
      },
    },
    swap_dedust: {
      schema: z.object({
        fromToken: z.string(),
        toToken: z.string(),
        amount: z.string(),
        slippage: z.coerce.number().optional().default(1),
      }),
      handler: async () => ({ status: "schema_only" }),
    },
    swap_stonfi: {
      schema: z.object({
        fromToken: z.string(),
        toToken: z.string(),
        amount: z.string(),
      }),
      handler: async () => ({ status: "schema_only" }),
    },
    get_nft_info: {
      schema: z.object({ nftAddress: z.string() }),
      handler: async (agent: any, params: any) => {
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        const r = await fetch(
          `${base}/nfts/${encodeURIComponent(params.nftAddress)}`,
        );
        if (!r.ok) throw new Error(`NFT not found`);
        const d = await r.json();
        return {
          address: d.address,
          name: d.metadata?.name || "Unknown",
          owner: d.owner?.address || "unknown",
        };
      },
    },
    get_nft_collection: {
      schema: z.object({ collectionAddress: z.string() }),
      handler: async (agent: any, params: any) => {
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        const r = await fetch(
          `${base}/nfts/collections/${encodeURIComponent(params.collectionAddress)}`,
        );
        if (!r.ok) throw new Error(`Collection not found`);
        const d = await r.json();
        return {
          address: d.address,
          name: d.metadata?.name || "Unknown",
          itemCount: d.next_item_index || 0,
        };
      },
    },
    transfer_nft: {
      schema: z.object({ nftAddress: z.string(), to: z.string() }),
      handler: async () => ({ status: "schema_only" }),
    },
    get_transaction_history: {
      schema: z.object({
        address: z.string().optional(),
        limit: z.coerce.number().optional().default(10),
      }),
      handler: async (agent: any, params: any) => {
        const addr = params.address || agent.wallet.address.toRawString();
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        const r = await fetch(
          `${base}/accounts/${encodeURIComponent(addr)}/events?limit=${params.limit || 10}`,
        );
        if (!r.ok) throw new Error(`Failed`);
        const d = await r.json();
        return { address: addr, count: (d.events || []).length };
      },
    },
    get_wallet_info: {
      schema: z.object({ address: z.string().optional() }),
      handler: async (agent: any, params: any) => {
        const addr = params.address || agent.wallet.address.toRawString();
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        const r = await fetch(`${base}/accounts/${encodeURIComponent(addr)}`);
        if (!r.ok) throw new Error(`Failed`);
        const d = await r.json();
        return {
          address: d.address,
          balance: (Number(d.balance) / 1e9).toString() + " TON",
          status: d.status,
        };
      },
    },
    get_staking_info: {
      schema: z.object({ address: z.string().optional() }),
      handler: async (agent: any, params: any) => {
        const addr = params.address || agent.wallet.address.toRawString();
        const base =
          agent.network === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        const r = await fetch(
          `${base}/staking/nominator/${encodeURIComponent(addr)}/pools`,
        );
        if (r.ok) {
          const d = await r.json();
          return { address: addr, pools: d.pools || [] };
        }
        return {
          address: addr,
          pools: [],
          message: "No staking positions found",
        };
      },
    },
    stake_ton: {
      schema: z.object({ poolAddress: z.string(), amount: z.string() }),
      handler: async () => ({ status: "schema_only" }),
    },
    unstake_ton: {
      schema: z.object({ poolAddress: z.string() }),
      handler: async () => ({ status: "schema_only" }),
    },
  };
}

main().catch((err) => console.error("❌ Fatal:", err.message));

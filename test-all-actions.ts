/**
 * TON Agent Kit — Comprehensive Action Test Suite
 *
 * Tests ALL 29 actions through the plugin architecture.
 * Uses agent.runAction() for everything — validates the full pipeline.
 *
 * Run: bun run test-all-actions.ts
 */

import "dotenv/config";
import { TonClient4 } from "@ton/ton";
import { Address, fromNano } from "@ton/core";
import { KeypairWallet } from "./packages/core/src/wallet";
import { TonAgentKit } from "./packages/core/src/agent";

// Import all 9 plugins
import TokenPlugin from "./packages/plugin-token/src";
import DefiPlugin from "./packages/plugin-defi/src";
import NftPlugin from "./packages/plugin-nft/src";
import DnsPlugin from "./packages/plugin-dns/src";
import StakingPlugin from "./packages/plugin-staking/src";
import EscrowPlugin from "./packages/plugin-escrow/src";
import IdentityPlugin from "./packages/plugin-identity/src";
import AnalyticsPlugin from "./packages/plugin-analytics/src";
import PaymentsPlugin from "./packages/plugin-payments/src";

// ============================================================
// Test framework
// ============================================================

let passed = 0;
let failed = 0;
let skipped = 0;
const errors: string[] = [];

async function test(
  name: string,
  fn: () => Promise<any>,
  validate?: (result: any) => boolean | string,
) {
  try {
    const result = await fn();
    if (validate) {
      const v = validate(result);
      if (v === true) {
        console.log(`  ✅ ${name}: ${truncate(JSON.stringify(result))}`);
        passed++;
      } else {
        const reason = typeof v === "string" ? v : "validation failed";
        console.log(`  ❌ ${name}: ${reason} — ${truncate(JSON.stringify(result))}`);
        failed++;
        errors.push(`${name}: ${reason}`);
      }
    } else {
      console.log(`  ✅ ${name}: ${truncate(JSON.stringify(result))}`);
      passed++;
    }
    return result;
  } catch (err: any) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
    errors.push(`${name}: ${err.message}`);
    return null;
  }
}

async function testSchema(
  name: string,
  agent: TonAgentKit,
  params: any,
) {
  try {
    // We just validate the schema parses — don't execute
    const actions = agent.getAvailableActions();
    const action = actions.find((a: any) => a.name === name);
    if (!action) {
      console.log(`  ⏭️  ${name}: NOT FOUND in plugins`);
      skipped++;
      return;
    }
    action.schema.parse(params);
    console.log(`  ✅ ${name}: schema valid`);
    passed++;
  } catch (err: any) {
    console.log(`  ❌ ${name}: schema invalid — ${err.message?.slice(0, 120)}`);
    failed++;
    errors.push(`${name}: schema — ${err.message?.slice(0, 120)}`);
  }
}

function skip(name: string, reason: string) {
  console.log(`  ⏭️  ${name}: SKIPPED — ${reason}`);
  skipped++;
}

function truncate(s: string, max = 140): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

/** Small delay to avoid TONAPI 429 rate limits on free tier */
async function delay(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// Main
// ============================================================

async function main() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) {
    console.error("❌ Set TON_MNEMONIC in .env");
    process.exit(1);
  }

  const network = (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
  const rpcUrl = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";

  // ── Init testnet agent ──
  const client = new TonClient4({ endpoint: rpcUrl });
  const wallet = await KeypairWallet.autoDetect(mnemonic.split(" "), client, network);

  const agent = new TonAgentKit(wallet, rpcUrl)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin)
    .use(AnalyticsPlugin)
    .use(PaymentsPlugin);

  // ── Init mainnet agent (for TONAPI read queries) ──
  const mainWallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "mainnet",
  });
  const mainAgent = new TonAgentKit(mainWallet, "https://mainnet-v4.tonhubapi.com")
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(StakingPlugin)
    .use(AnalyticsPlugin);

  const ownAddress = wallet.address.toRawString();
  const actions = agent.getAvailableActions();

  console.log(`\n🤖 TON Agent Kit — Comprehensive Test Suite`);
  console.log(`📍 Address: ${ownAddress}`);
  console.log(`🔧 Plugins loaded: 9`);
  console.log(`🎯 Actions registered: ${actions.length}`);
  console.log(`🌐 Network: ${network}\n`);

  // List all registered actions
  console.log(`── Registered Actions ──`);
  for (const a of actions) {
    console.log(`  📌 ${a.name}`);
  }
  console.log();

  // ════════════════════════════════════════════════════════════
  // SECTION 1: TOKEN PLUGIN — Read Operations
  // ════════════════════════════════════════════════════════════
  console.log(`\n══ SECTION 1: Token Plugin (reads) ══`);

  // get_balance — own wallet, no params
  await test("get_balance (own wallet)", () =>
    agent.runAction("get_balance", {}),
    (r) => r && parseFloat(r.balance) > 0 ? true : `balance is ${r?.balance}`,
  );

  // get_balance — own wallet, explicit address
  await test("get_balance (explicit address)", () =>
    agent.runAction("get_balance", { address: ownAddress }),
    (r) => r && parseFloat(r.balance) > 0 ? true : `balance is ${r?.balance}`,
  );

  // get_balance — invalid address (edge case)
  await test("get_balance (invalid address — should error)", async () => {
    try {
      await agent.runAction("get_balance", { address: "totally-invalid-address" });
      return { error: "should have thrown" };
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  }, (r) => r?.caught === true ? true : "did not throw on invalid address");

  // get_balance — empty string address (edge case)
  await test("get_balance (empty string address)", async () => {
    try {
      await agent.runAction("get_balance", { address: "" });
      return { error: "should have thrown or returned own balance" };
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  }); // Just log result, behavior may vary

  // get_jetton_balance — mainnet USDT
  await delay(1500);
  await test("get_jetton_balance (USDT mainnet)", () =>
    mainAgent.runAction("get_jetton_balance", {
      jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
      ownerAddress: "UQDKbjIcfM6ezt8KjKJJLshZJJSqX7XOA4ff-W72r5gqPp3p",
    }),
    (r) => r && r.symbol ? true : "missing symbol",
  );

  // get_jetton_balance — no owner (should use own wallet)
  await delay(1500);
  await test("get_jetton_balance (no owner — own wallet)", () =>
    agent.runAction("get_jetton_balance", {
      jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    }),
  );

  // get_jetton_balance — invalid jetton address (edge case)
  await delay(1500);
  await test("get_jetton_balance (invalid jetton)", () =>
    agent.runAction("get_jetton_balance", {
      jettonAddress: "not-a-real-jetton",
    }),
    (r) => r?.balance === "0" ? true : `expected balance 0, got ${r?.balance}`,
  );

  // get_jetton_info
  await delay(1500);
  await test("get_jetton_info (USDT)", () =>
    mainAgent.runAction("get_jetton_info", {
      jettonAddress: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    }),
  );

  // get_price — USDT
  await delay(1500);
  await test("get_price (USDT)", () =>
    mainAgent.runAction("get_price", {
      token: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
    }),
    (r) => r?.priceUSD && r.priceUSD !== "unknown" ? true : `priceUSD is ${r?.priceUSD}`,
  );

  // get_price — invalid token (edge case)
  await delay(1500);
  await test("get_price (invalid token)", () =>
    mainAgent.runAction("get_price", { token: "invalid-token-address" }),
    (r) => r?.priceUSD === "unknown" ? true : `expected unknown, got ${r?.priceUSD}`,
  );

  // ════════════════════════════════════════════════════════════
  // SECTION 2: NFT Plugin
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 2: NFT Plugin ══`);

  await delay(1500);
  await test("get_nft_collection (Telegram Usernames)", () =>
    mainAgent.runAction("get_nft_collection", {
      collectionAddress: "EQCA14o1-VWhS2efqoh_9M1b_A9DtKTuoqfmkn83AbJzwnPi",
    }),
    (r) => r?.name ? true : "missing collection name",
  );

  await delay(1500);
  await test("get_nft_collection (invalid address)", async () => {
    try {
      const r = await mainAgent.runAction("get_nft_collection", {
        collectionAddress: "invalid-nft-collection",
      });
      return r;
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  });

  // get_nft_info — skip if no known testnet NFT
  skip("get_nft_info", "needs a known NFT address — test manually");

  // ════════════════════════════════════════════════════════════
  // SECTION 3: DNS Plugin
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 3: DNS Plugin ══`);

  await delay(1500);
  const domainResult = await test("resolve_domain (foundation.ton)", () =>
    agent.runAction("resolve_domain", { domain: "foundation.ton" }),
    (r) => r?.resolved === true ? true : `resolved is ${r?.resolved}`,
  );

  await delay(1500);
  await test("resolve_domain (nonexistent.ton)", () =>
    agent.runAction("resolve_domain", { domain: "thisdoesnotexist99999.ton" }),
    (r) => r?.resolved === false ? true : `expected resolved=false, got ${r?.resolved}`,
  );

  await delay(1500);
  await test("resolve_domain (without .ton suffix)", () =>
    agent.runAction("resolve_domain", { domain: "foundation" }),
    (r) => r?.resolved === true ? true : `resolved is ${r?.resolved}`,
  );

  // lookup_address — reverse lookup
  if (domainResult?.address) {
    await delay(1500);
    await test("lookup_address (reverse lookup)", () =>
      agent.runAction("lookup_address", { address: domainResult.address }),
    );
  } else {
    skip("lookup_address", "no address from resolve_domain");
  }

  // get_domain_info
  await delay(1500);
  await test("get_domain_info (foundation.ton)", () =>
    agent.runAction("get_domain_info", { domain: "foundation.ton" }),
  );

  // ════════════════════════════════════════════════════════════
  // SECTION 4: Analytics Plugin
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 4: Analytics Plugin ══`);

  await delay(1500);
  await test("get_wallet_info (own wallet)", () =>
    agent.runAction("get_wallet_info", {}),
    (r) => r?.status === "active" ? true : `status is ${r?.status}`,
  );

  await delay(1500);
  await test("get_wallet_info (explicit address)", () =>
    agent.runAction("get_wallet_info", { address: ownAddress }),
    (r) => r?.balance ? true : "missing balance",
  );

  await delay(1500);
  await test("get_wallet_info (invalid address)", async () => {
    try {
      const r = await agent.runAction("get_wallet_info", { address: "garbage" });
      return r;
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  });

  await delay(1500);
  await test("get_transaction_history (limit 3)", () =>
    agent.runAction("get_transaction_history", { limit: 3 }),
    (r) => r?.count >= 0 ? true : `count is ${r?.count}`,
  );

  await delay(1500);
  await test("get_transaction_history (limit 1)", () =>
    agent.runAction("get_transaction_history", { limit: 1 }),
    (r) => r?.count >= 0 ? true : `count is ${r?.count}`,
  );

  await delay(1500);
  await test("get_transaction_history (limit 0 — edge case)", () =>
    agent.runAction("get_transaction_history", { limit: 0 }),
  );

  await delay(1500);
  await test("get_transaction_history (no params — default limit)", () =>
    agent.runAction("get_transaction_history", {}),
  );

  // ════════════════════════════════════════════════════════════
  // SECTION 5: Staking Plugin
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 5: Staking Plugin ══`);

  await delay(1500);
  await test("get_staking_info (own wallet)", () =>
    agent.runAction("get_staking_info", {}),
    (r) => r?.address ? true : "missing address",
  );

  await delay(1500);
  await test("get_staking_info (explicit address)", () =>
    agent.runAction("get_staking_info", { address: ownAddress }),
    (r) => r?.address ? true : "missing address",
  );

  // ════════════════════════════════════════════════════════════
  // SECTION 6: Escrow Plugin — Full Lifecycle
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 6: Escrow Plugin (lifecycle) ══`);

  // Create escrow
  const escrowResult = await test("create_escrow", () =>
    agent.runAction("create_escrow", {
      beneficiary: ownAddress,
      amount: "0.5",
      description: "Test escrow for validation",
      deadlineMinutes: 30,
    }),
    (r) => r?.escrowId && r?.status === "created" ? true : `status is ${r?.status}`,
  );

  const escrowId = escrowResult?.escrowId;

  // Get escrow info by ID
  if (escrowId) {
    await test("get_escrow_info (by ID)", () =>
      agent.runAction("get_escrow_info", { escrowId }),
      (r) => r?.status === "created" ? true : `status is ${r?.status}`,
    );
  } else {
    skip("get_escrow_info (by ID)", "no escrowId from create");
  }

  // List all escrows
  await test("get_escrow_info (list all)", () =>
    agent.runAction("get_escrow_info", {}),
    (r) => r?.count >= 0 ? true : `count is ${r?.count}`,
  );

  // Get nonexistent escrow (edge case)
  await test("get_escrow_info (nonexistent ID)", async () => {
    try {
      const r = await agent.runAction("get_escrow_info", { escrowId: "fake-id-12345" });
      return r;
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  });

  // Create second escrow (different params)
  await test("create_escrow (second — different params)", () =>
    agent.runAction("create_escrow", {
      beneficiary: ownAddress,
      amount: "1.0",
      description: "Second test escrow",
      deadlineMinutes: 5,
    }),
    (r) => r?.escrowId ? true : "missing escrowId",
  );

  // Verify list now has at least 2
  await test("get_escrow_info (list — should have >= 2)", () =>
    agent.runAction("get_escrow_info", {}),
    (r) => r?.count >= 2 ? true : `count is ${r?.count}, expected >= 2`,
  );

  // Create escrow with missing beneficiary (edge case — should fail)
  await test("create_escrow (no beneficiary — should error)", async () => {
    try {
      await agent.runAction("create_escrow", { amount: "0.1" });
      return { error: "should have thrown" };
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  }, (r) => r?.caught === true ? true : "did not throw on missing beneficiary");

  // ════════════════════════════════════════════════════════════
  // SECTION 7: Identity Plugin — Full Lifecycle
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 7: Identity Plugin (lifecycle) ══`);

  // Register agent
  const agentResult = await test("register_agent", () =>
    agent.runAction("register_agent", {
      name: "test-validator-bot",
      capabilities: ["testing", "validation", "analytics"],
      description: "Automated test agent for validation suite",
      endpoint: "https://test.example.com/api",
    }),
    (r) => r?.status === "registered" ? true : `status is ${r?.status}`,
  );

  const agentId = agentResult?.agentId;

  // Register second agent
  await test("register_agent (second agent)", () =>
    agent.runAction("register_agent", {
      name: "data-provider-bot",
      capabilities: ["price_feed", "market_data"],
      description: "Market data provider",
    }),
    (r) => r?.status === "registered" ? true : `status is ${r?.status}`,
  );

  // Discover by capability
  await test("discover_agent (capability: testing)", () =>
    agent.runAction("discover_agent", { capability: "testing" }),
    (r) => r?.count >= 1 ? true : `count is ${r?.count}, expected >= 1`,
  );

  // Discover by different capability
  await test("discover_agent (capability: price_feed)", () =>
    agent.runAction("discover_agent", { capability: "price_feed" }),
    (r) => r?.count >= 1 ? true : `count is ${r?.count}`,
  );

  // Discover by name
  await test("discover_agent (name: test-validator)", () =>
    agent.runAction("discover_agent", { name: "test-validator" }),
    (r) => r?.count >= 1 ? true : `count is ${r?.count}`,
  );

  // Discover nonexistent (edge case)
  await test("discover_agent (nonexistent capability)", () =>
    agent.runAction("discover_agent", { capability: "quantum_teleportation" }),
    (r) => r?.count === 0 ? true : `count is ${r?.count}, expected 0`,
  );

  // Discover with no params (should return all)
  await test("discover_agent (no params — all agents)", () =>
    agent.runAction("discover_agent", {}),
    (r) => r?.count >= 2 ? true : `count is ${r?.count}, expected >= 2`,
  );

  // Reputation — initial
  if (agentId) {
    await test("get_agent_reputation (initial — score 0)", () =>
      agent.runAction("get_agent_reputation", { agentId }),
      (r) => r?.reputation?.score === 0 ? true : `score is ${r?.reputation?.score}`,
    );

    // Add successful task
    await test("get_agent_reputation (add successful task)", () =>
      agent.runAction("get_agent_reputation", {
        agentId,
        addTask: true,
        success: true,
      }),
      (r) => r?.reputation?.score === 100 ? true : `score is ${r?.reputation?.score}, expected 100`,
    );

    // Add another successful task
    await test("get_agent_reputation (add second task)", () =>
      agent.runAction("get_agent_reputation", {
        agentId,
        addTask: true,
        success: true,
      }),
      (r) => r?.reputation?.totalTasks === 2 ? true : `totalTasks is ${r?.reputation?.totalTasks}`,
    );

    // Add failed task
    await test("get_agent_reputation (add failed task)", () =>
      agent.runAction("get_agent_reputation", {
        agentId,
        addTask: true,
        success: false,
      }),
      (r) => {
        const expected = Math.round((2 / 3) * 100); // 67
        return r?.reputation?.score === expected
          ? true
          : `score is ${r?.reputation?.score}, expected ${expected}`;
      },
    );

    // Check final state
    await test("get_agent_reputation (verify final state)", () =>
      agent.runAction("get_agent_reputation", { agentId }),
      (r) =>
        r?.reputation?.totalTasks === 3 && r?.reputation?.successfulTasks === 2
          ? true
          : `tasks: ${r?.reputation?.totalTasks}, success: ${r?.reputation?.successfulTasks}`,
    );
  } else {
    skip("get_agent_reputation (5 tests)", "no agentId from register");
  }

  // Reputation — nonexistent agent (edge case)
  await test("get_agent_reputation (nonexistent agent)", async () => {
    try {
      await agent.runAction("get_agent_reputation", { agentId: "fake-agent-xyz" });
      return { error: "should have thrown" };
    } catch (err: any) {
      return { caught: true, message: err.message };
    }
  }, (r) => r?.caught === true ? true : "did not throw on fake agent");

  // ════════════════════════════════════════════════════════════
  // SECTION 8: Schema Validation Only (no execution — would spend TON)
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 8: Schema Validation (no execution) ══`);

  await testSchema("transfer_ton", agent, {
    to: ownAddress,
    amount: "0.01",
    comment: "test",
  });

  await testSchema("transfer_jetton", agent, {
    to: ownAddress,
    amount: "100",
    jettonAddress: "0:abc123def456",
  });

  await testSchema("transfer_nft", agent, {
    nftAddress: "0:abc123",
    to: "0:def456",
  });

  await testSchema("deploy_jetton", agent, {
    name: "Test Token",
    symbol: "TST",
    supply: "1000000",
  });

  await testSchema("swap_dedust", agent, {
    fromToken: "TON",
    toToken: "0:abc123",
    amount: "10",
    slippage: 1,
  });

  await testSchema("swap_stonfi", agent, {
    fromToken: "TON",
    toToken: "0:abc123",
    amount: "5",
  });

  await testSchema("stake_ton", agent, {
    poolAddress: "0:abc123",
    amount: "10",
  });

  await testSchema("unstake_ton", agent, {
    poolAddress: "0:abc123",
  });

  await testSchema("pay_for_resource", agent, {
    url: "https://example.com/api/data",
    maxAmount: "0.01",
  });


  // ════════════════════════════════════════════════════════════
  // SECTION 9: Live Transfer Test (small amount)
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 9: Live Transfer (0.001 TON self-transfer) ══`);

  // Check balance first
  const preBalance = await test("pre-transfer balance check", () =>
    agent.runAction("get_balance", {}),
    (r) => parseFloat(r?.balance) > 0.01 ? true : `balance too low: ${r?.balance} TON`,
  );

  if (preBalance && parseFloat(preBalance.balance) > 0.01) {
    // Live transfer — send 0.001 TON to self
    await test("transfer_ton (0.001 TON to self)", () =>
      agent.runAction("transfer_ton", {
        to: ownAddress,
        amount: "0.001",
        comment: "agent-kit-comprehensive-test",
      }),
      (r) => r?.status === "sent" ? true : `status is ${r?.status}`,
    );

    console.log(`  ⏳ Waiting 12s for TX confirmation...`);
    await new Promise((r) => setTimeout(r, 12000));

    // Verify TX in history
    await delay(1500);
    await test("post-transfer TX history check", () =>
      agent.runAction("get_transaction_history", { limit: 1 }),
      (r) => r?.count >= 1 ? true : `count is ${r?.count}`,
    );

    // Check balance after (should be slightly less due to gas)
    await test("post-transfer balance check", () =>
      agent.runAction("get_balance", {}),
      (r) => {
        const pre = parseFloat(preBalance.balance);
        const post = parseFloat(r?.balance);
        const diff = pre - post;
        // Self-transfer: only gas is lost (~0.003-0.006 TON)
        return diff > 0 && diff < 0.01
          ? true
          : `balance diff: ${diff.toFixed(6)} TON (expected 0 < diff < 0.01)`;
      },
    );

    // Transfer with 0 amount (edge case — should fail)
    await test("transfer_ton (0 amount — should error)", async () => {
      try {
        await agent.runAction("transfer_ton", {
          to: ownAddress,
          amount: "0",
        });
        return { error: "should have thrown" };
      } catch (err: any) {
        return { caught: true, message: err.message };
      }
    }, (r) => r?.caught === true ? true : "did not throw on 0 amount");

    // Transfer with negative amount (edge case)
    await test("transfer_ton (negative amount — should error)", async () => {
      try {
        await agent.runAction("transfer_ton", {
          to: ownAddress,
          amount: "-1",
        });
        return { error: "should have thrown" };
      } catch (err: any) {
        return { caught: true, message: err.message };
      }
    }, (r) => r?.caught === true ? true : "did not throw on negative amount");

    // Transfer more than balance (edge case)
    await test("transfer_ton (999999 TON — insufficient balance)", async () => {
      try {
        await agent.runAction("transfer_ton", {
          to: ownAddress,
          amount: "999999",
        });
        return { error: "should have thrown" };
      } catch (err: any) {
        return { caught: true, message: err.message };
      }
    }, (r) => r?.caught === true ? true : "did not throw on insufficient balance");
  } else {
    skip("transfer_ton (3 tests)", "balance too low for live transfer");
    skip("post-transfer checks (3 tests)", "skipped due to low balance");
  }

  // ════════════════════════════════════════════════════════════
  // SECTION 10: Deposit/Release/Refund Escrow (Schema Only)
  // ════════════════════════════════════════════════════════════
  await delay(2000);
  console.log(`\n══ SECTION 10: Escrow Write Operations (schema only) ══`);

  if (escrowId) {
    await testSchema("deposit_to_escrow", agent, { escrowId, amount: "0.5" });
    await testSchema("release_escrow", agent, { escrowId });
    await testSchema("refund_escrow", agent, { escrowId });
  } else {
    skip("deposit_to_escrow", "no escrowId");
    skip("release_escrow", "no escrowId");
    skip("refund_escrow", "no escrowId");
  }

  // ════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════
  const total = passed + failed + skipped;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🤖 TON Agent Kit — Comprehensive Test Results`);
  console.log(`${"═".repeat(60)}`);
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${total}`);
  console.log(`${"═".repeat(60)}`);

  if (errors.length > 0) {
    console.log(`\n── Error Details ──`);
    for (const e of errors) {
      console.log(`  🔴 ${e}`);
    }
  }

  if (failed === 0) {
    console.log(`\n🎉 ALL TESTS PASSED!\n`);
  } else {
    console.log(`\n⚠️  ${failed} test(s) need attention.\n`);
  }

  // Cleanup: remove test escrows and agents (optional)
  // You may want to manually delete .escrow-store.json and .agent-registry.json after testing
}

main().catch((err) => {
  console.error("❌ Fatal error:", err.message);
  console.error(err.stack);
  process.exit(1);
});

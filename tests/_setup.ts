/**
 * Shared test setup for all split test files.
 * Provides: .env loading, TestResult type, test framework, agent factories.
 */

import { readFileSync } from "fs";

// ── Load .env (same approach as original test-all-actions.ts) ──
try {
  const envContent = readFileSync(".env", "utf-8");
  for (const line of envContent.split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0 && !line.startsWith("#")) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

import { TonAgentKit } from "../packages/core/src/agent";
import { KeypairWallet } from "../packages/core/src/wallet";
import TokenPlugin from "../packages/plugin-token/src/index";
import DefiPlugin from "../packages/plugin-defi/src/index";
import DnsPlugin from "../packages/plugin-dns/src/index";
import NftPlugin from "../packages/plugin-nft/src/index";
import StakingPlugin from "../packages/plugin-staking/src/index";
import EscrowPlugin from "../packages/plugin-escrow/src/index";
import IdentityPlugin from "../packages/plugin-identity/src/index";
import AnalyticsPlugin from "../packages/plugin-analytics/src/index";
import PaymentsPlugin from "../packages/plugin-payments/src/index";
import AgentCommPlugin from "../packages/plugin-agent-comm/src/index";

export { TonAgentKit, KeypairWallet };
export {
  TokenPlugin, DefiPlugin, DnsPlugin, NftPlugin, StakingPlugin,
  EscrowPlugin, IdentityPlugin, AnalyticsPlugin, PaymentsPlugin, AgentCommPlugin,
};

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

const RATE_MS = 1000;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createTestContext() {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  async function test(name: string, fn: () => Promise<any>): Promise<any> {
    await delay(RATE_MS);
    try {
      const result = await fn();
      console.log(`  \u2705 ${name}`);
      passed++;
      return result;
    } catch (err: any) {
      console.log(`  \u274C ${name}`);
      console.log(`     \u2192 ${err.message.slice(0, 120)}`);
      failed++;
      errors.push(`${name}: ${err.message.slice(0, 100)}`);
      return null;
    }
  }

  async function testError(name: string, fn: () => Promise<any>, expectedMsg: string): Promise<void> {
    await delay(RATE_MS);
    try {
      await fn();
      console.log(`  \u274C ${name} \u2014 should have thrown`);
      failed++;
      errors.push(`${name}: did not throw`);
    } catch (err: any) {
      if (err.message.includes(expectedMsg)) {
        console.log(`  \u2705 ${name}`);
        passed++;
      } else {
        console.log(`  \u274C ${name} \u2014 wrong error`);
        console.log(`     Expected "${expectedMsg}" got "${err.message.slice(0, 80)}"`);
        failed++;
        errors.push(`${name}: wrong error \u2014 ${err.message.slice(0, 80)}`);
      }
    }
  }

  function skip(name: string, reason: string) {
    console.log(`  \u23ED\uFE0F  ${name} \u2014 ${reason}`);
  }

  function result(startMs: number): TestResult {
    return { passed, failed, errors: [...errors], duration: Date.now() - startMs };
  }

  return { test, testError, skip, result };
}

export async function createTestnetAgent() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) throw new Error("Set TON_MNEMONIC in .env");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "testnet",
  });
  const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(DnsPlugin)
    .use(NftPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin)
    .use(AnalyticsPlugin)
    .use(PaymentsPlugin)
    .use(AgentCommPlugin);
  const ownAddress = wallet.address.toRawString();
  const friendlyAddress = wallet.address.toString({ testOnly: true, bounceable: false });
  const actions = agent.getAvailableActions();
  return { agent, wallet, ownAddress, friendlyAddress, actions };
}

export async function createMainnetAgent() {
  const mnemonic = process.env.TON_MNEMONIC;
  if (!mnemonic) throw new Error("Set TON_MNEMONIC in .env");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "), {
    version: "V5R1",
    network: "mainnet",
  });
  const agent = new TonAgentKit(wallet, "https://mainnet-v4.tonhubapi.com")
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(AnalyticsPlugin);
  return { agent, wallet };
}

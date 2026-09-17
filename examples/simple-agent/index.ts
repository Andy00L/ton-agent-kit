/**
 * TON Agent Kit, simple example.
 *
 * The smallest useful agent: a wallet, three plugins, and four calls.
 *
 * Run it with `bun index.ts` after putting TON_MNEMONIC in your environment.
 */

import { TonAgentKit, KeypairWallet, RPC_ENDPOINTS } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import DnsPlugin from "@ton-agent-kit/plugin-dns";

/** Which chain this example talks to. */
const NETWORK = "testnet";

async function main(): Promise<void> {
  const phrase = process.env.TON_MNEMONIC;
  if (!phrase) {
    console.error("[main] Set TON_MNEMONIC to your 24 word seed phrase and run again.");
    process.exit(1);
  }

  // The network belongs in the wallet config, not only in the agent. A v5
  // wallet folds the network id into its wallet id, so leaving it out derives
  // the mainnet address and then queries testnet with it: a funded wallet
  // reads as empty and nothing says why.
  const wallet = await KeypairWallet.fromMnemonic(phrase.split(" "), {
    version: "V5R1",
    network: NETWORK,
  });

  // The rpc url is optional: the agent falls back to RPC_ENDPOINTS for the
  // network it was given.
  const agent = new TonAgentKit(wallet, RPC_ENDPOINTS[NETWORK], {}, NETWORK)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(DnsPlugin);

  console.log(`[main] agent address: ${agent.address}`);
  console.log(`[main] available actions: ${agent.actionCount}`);

  const balance = await agent.runAction("get_balance", {});
  console.log(`[main] balance: ${balance.balance} TON`);

  const dns = await agent.runAction("resolve_domain", { domain: "foundation.ton" });
  console.log(`[main] foundation.ton resolves to ${dns.address}`);

  // The methods proxy is shorthand for runAction with the same name.
  const viaProxy = await agent.methods.get_balance({});
  console.log(`[main] balance via the proxy: ${viaProxy.balance} TON`);
}

main().catch((caught: unknown) => {
  console.error("[main] failed:", caught instanceof Error ? caught.message : String(caught));
  process.exitCode = 1;
});

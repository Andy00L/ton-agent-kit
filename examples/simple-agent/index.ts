/**
 * TON Agent Kit — Simple Example
 *
 * Minimal example showing how to use TON Agent Kit
 * to perform blockchain operations with just a few lines of code.
 */

import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import DnsPlugin from "@ton-agent-kit/plugin-dns";

async function main() {
  // 1. Create wallet from mnemonic
  const mnemonic = process.env.TON_MNEMONIC!.split(" ");
  const wallet = await KeypairWallet.fromMnemonic(mnemonic);

  // 2. Initialize agent with plugins
  const agent = new TonAgentKit(
    wallet,
    "https://testnet-v4.tonhubapi.com", // testnet
    {},
    "testnet"
  )
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(DnsPlugin);

  console.log(`Agent address: ${agent.address}`);
  console.log(`Available actions: ${agent.actionCount}`);

  // 3. Check balance
  const balance = await agent.runAction("get_balance", {});
  console.log(`Balance: ${balance.balance} TON`);

  // 4. Resolve a .ton domain
  const dns = await agent.runAction("resolve_domain", { domain: "foundation.ton" });
  console.log(`foundation.ton → ${dns.address}`);

  // 5. Use methods proxy (shorthand)
  const balance2 = await agent.methods.get_balance({});
  console.log(`Balance (via methods): ${balance2.balance} TON`);
}

main().catch(console.error);

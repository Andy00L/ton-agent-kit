import { TonAgentKit } from "./packages/core/src";
import TokenPlugin from "./packages/plugin-token/src";
import DefiPlugin from "./packages/plugin-defi/src";
import EscrowPlugin from "./packages/plugin-escrow/src";
import AnalyticsPlugin from "./packages/plugin-analytics/src";
import DNSPlugin from "./packages/plugin-dns/src";
import IdentityPlugin from "./packages/plugin-identity/src";
import NFTPlugin from "./packages/plugin-nft/src";
import PaymentsPlugin from "./packages/plugin-payments/src";
import StakingPlugin from "./packages/plugin-staking/src";

const agent = new TonAgentKit(
  { address: { toString: () => "test" }, publicKey: Buffer.alloc(32) } as any,
  "https://testnet-v4.tonhubapi.com",
);
agent.use(TokenPlugin).use(DefiPlugin).use(EscrowPlugin).use(AnalyticsPlugin)
  .use(DNSPlugin).use(IdentityPlugin).use(NFTPlugin).use(PaymentsPlugin).use(StakingPlugin);

const tools = agent.toAITools();
console.log("Total tools:", tools.length);
let allGood = true;
for (const tool of tools) {
  const props = Object.keys(tool.function.parameters.properties || {});
  const status = props.length > 0 ? "OK" : "EMPTY";
  if (status === "EMPTY") allGood = false;
  console.log(status.padEnd(6), tool.function.name.padEnd(30), JSON.stringify(props));
}
console.log(allGood ? "\n✅ All tools have properties!" : "\n❌ Some tools have empty properties!");
process.exit(allGood ? 0 : 1);

import { ChatOpenAI } from "@langchain/openai";
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
import { createLangchainTools } from "@ton-agent-kit/langchain";
import TokenPlugin from "@ton-agent-kit/plugin-token";
import DefiPlugin from "@ton-agent-kit/plugin-defi";
import NftPlugin from "@ton-agent-kit/plugin-nft";
import DnsPlugin from "@ton-agent-kit/plugin-dns";
import PaymentsPlugin from "@ton-agent-kit/plugin-payments";

/**
 * Initialize the TON Agent Kit with all plugins
 */
export async function createTonAgent(): Promise<TonAgentKit> {
  const mnemonic = process.env.TON_MNEMONIC;
  const privateKey = process.env.TON_PRIVATE_KEY;
  const network = (process.env.TON_NETWORK as "mainnet" | "testnet") || "testnet";
  const rpcUrl = process.env.TON_RPC_URL;

  let wallet: KeypairWallet;

  if (mnemonic) {
    wallet = await KeypairWallet.fromMnemonic(mnemonic.split(" "));
  } else if (privateKey) {
    wallet = KeypairWallet.fromSecretKey(Buffer.from(privateKey, "base64"));
  } else {
    throw new Error("Set TON_MNEMONIC or TON_PRIVATE_KEY in .env");
  }

  const agent = new TonAgentKit(wallet, rpcUrl, {
    TONAPI_KEY: process.env.TONAPI_KEY || "",
  }, network)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(NftPlugin)
    .use(DnsPlugin)
    .use(PaymentsPlugin);

  console.log(`✅ TON Agent Kit initialized`);
  console.log(`   Network: ${agent.network}`);
  console.log(`   Address: ${agent.address}`);
  console.log(`   Actions: ${agent.actionCount}`);
  console.log(`   Plugins: ${agent.getPlugins().map((p) => p.name).join(", ")}`);

  return agent;
}

/**
 * Create a LangChain agent executor with TON tools
 */
export async function createLangchainAgent(tonAgent: TonAgentKit): Promise<AgentExecutor> {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0,
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  const tools = createLangchainTools(tonAgent);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful TON blockchain assistant powered by TON Agent Kit.
You help users interact with the TON blockchain through natural language.

You can:
- Check TON and Jetton (token) balances
- Transfer TON and Jettons to any address
- Swap tokens on DeDust and STON.fi DEXes
- Look up NFT information and transfer NFTs
- Resolve .ton domain names
- Deploy new Jetton tokens

The agent's wallet address is: ${tonAgent.address}
Network: ${tonAgent.network}

When users ask to perform actions, use the available tools.
Always confirm the action details before executing transactions.
Format responses clearly with relevant transaction details and explorer links.
Be concise but informative. Use emojis sparingly for clarity.`,
    ],
    new MessagesPlaceholder("chat_history"),
    ["human", "{input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = await createOpenAIFunctionsAgent({
    llm,
    tools,
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools,
    verbose: true,
    maxIterations: 5,
    handleParsingErrors: true,
  });
}

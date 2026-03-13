import "dotenv/config";
import { Bot, Context } from "grammy";
import { createTonAgent, createLangchainAgent } from "./agent";
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import type { AgentExecutor } from "langchain/agents";
import type { TonAgentKit } from "@ton-agent-kit/core";

// ============================================================
// TON Agent Kit — Telegram Bot Demo
//
// A Telegram bot that lets users interact with TON blockchain
// through natural language, powered by LangChain + TON Agent Kit.
//
// Commands:
//   /start    — Welcome message
//   /balance  — Quick balance check
//   /address  — Show agent wallet address
//   /actions  — List available actions
//   /help     — Show help
//
// Natural language examples:
//   "What's my balance?"
//   "Swap 10 TON for USDT on DeDust"
//   "Send 5 TON to EQBx2..."
//   "Resolve alice.ton"
//   "Get NFT info for EQ..."
// ============================================================

// Chat history per user (in-memory for demo)
const chatHistories = new Map<number, Array<HumanMessage | AIMessage>>();

async function main() {
  // Initialize TON Agent Kit
  const tonAgent = await createTonAgent();

  // Initialize LangChain agent
  const langchainAgent = await createLangchainAgent(tonAgent);

  // Create Telegram bot
  const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

  // ────────────────────────────────────────────────────
  // /start command
  // ────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    await ctx.reply(
      `🤖 *TON Agent Kit Demo Bot*\n\n` +
        `I'm an AI-powered TON blockchain assistant. Talk to me in natural language!\n\n` +
        `*What I can do:*\n` +
        `• Check balances (TON & Jettons)\n` +
        `• Swap tokens (DeDust & STON.fi)\n` +
        `• Transfer TON & Jettons\n` +
        `• Resolve .ton domains\n` +
        `• NFT operations\n` +
        `• Zero-fee payment channels\n\n` +
        `*Try saying:*\n` +
        `"What's my TON balance?"\n` +
        `"Swap 10 TON for USDT"\n` +
        `"Resolve alice.ton"\n\n` +
        `Network: ${tonAgent.network}\n` +
        `Agent wallet: \`${tonAgent.address}\``,
      { parse_mode: "Markdown" }
    );
  });

  // ────────────────────────────────────────────────────
  // /balance command — quick balance check
  // ────────────────────────────────────────────────────
  bot.command("balance", async (ctx) => {
    try {
      const result = await tonAgent.runAction("get_balance", {});
      await ctx.reply(
        `💰 *Balance:* ${result.balance} TON\n` +
          `📍 *Address:* \`${result.address}\``,
        { parse_mode: "Markdown" }
      );
    } catch (err) {
      await ctx.reply(`❌ Error: ${(err as Error).message}`);
    }
  });

  // ────────────────────────────────────────────────────
  // /address command
  // ────────────────────────────────────────────────────
  bot.command("address", async (ctx) => {
    await ctx.reply(
      `📍 *Agent Wallet Address:*\n\`${tonAgent.address}\`\n\n` +
        `Network: ${tonAgent.network}`,
      { parse_mode: "Markdown" }
    );
  });

  // ────────────────────────────────────────────────────
  // /actions command — list all available actions
  // ────────────────────────────────────────────────────
  bot.command("actions", async (ctx) => {
    const actions = tonAgent.getAvailableActions();
    const grouped = tonAgent.getPlugins().map((plugin) => {
      const pluginActions = actions
        .filter((a) => plugin.actions.some((pa) => pa.name === a.name))
        .map((a) => `  • \`${a.name}\` — ${a.description.slice(0, 60)}...`)
        .join("\n");
      return `*${plugin.name}*\n${pluginActions}`;
    });

    await ctx.reply(
      `🔧 *Available Actions (${actions.length}):*\n\n${grouped.join("\n\n")}`,
      { parse_mode: "Markdown" }
    );
  });

  // ────────────────────────────────────────────────────
  // /help command
  // ────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `📖 *Help*\n\n` +
        `Just send me a message in plain English (or any language) and I'll figure out what to do!\n\n` +
        `*Commands:*\n` +
        `/start — Welcome message\n` +
        `/balance — Quick balance check\n` +
        `/address — Show wallet address\n` +
        `/actions — List all actions\n` +
        `/help — This message\n\n` +
        `*Examples:*\n` +
        `"Check my balance"\n` +
        `"How much USDT do I have?"\n` +
        `"Swap 5 TON to USDT on DeDust"\n` +
        `"Send 2 TON to EQBx2CfDE..."\n` +
        `"What's alice.ton address?"\n` +
        `"Open payment channel with EQ..."`,
      { parse_mode: "Markdown" }
    );
  });

  // ────────────────────────────────────────────────────
  // Natural language handler — the main magic
  // ────────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    // Get or create chat history
    if (!chatHistories.has(userId)) {
      chatHistories.set(userId, []);
    }
    const history = chatHistories.get(userId)!;

    // Show typing indicator
    await ctx.replyWithChatAction("typing");

    try {
      // Run the LangChain agent
      const result = await langchainAgent.invoke({
        input: userMessage,
        chat_history: history,
      });

      const response = result.output as string;

      // Update chat history (keep last 10 exchanges)
      history.push(new HumanMessage(userMessage));
      history.push(new AIMessage(response));
      if (history.length > 20) {
        history.splice(0, 2);
      }

      // Send response (split if too long for Telegram)
      if (response.length > 4000) {
        const chunks = response.match(/.{1,4000}/gs) || [response];
        for (const chunk of chunks) {
          await ctx.reply(chunk);
        }
      } else {
        await ctx.reply(response, { parse_mode: "Markdown" }).catch(() => {
          // Fallback without markdown if parsing fails
          ctx.reply(response);
        });
      }
    } catch (err) {
      const error = err as Error;
      console.error("Agent error:", error);
      await ctx.reply(
        `⚠️ Something went wrong: ${error.message}\n\nPlease try again or rephrase your request.`
      );
    }
  });

  // ────────────────────────────────────────────────────
  // Error handler
  // ────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  // ────────────────────────────────────────────────────
  // Start the bot
  // ────────────────────────────────────────────────────
  console.log("🚀 TON Agent Kit Telegram Bot starting...");
  bot.start();
  console.log("✅ Bot is running! Send /start to begin.");
}

main().catch(console.error);

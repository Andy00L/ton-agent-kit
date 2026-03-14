import { TonClient4 } from "@ton/ton";
import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import OpenAI from "openai";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import TokenPlugin from "./packages/plugin-token/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import StakingPlugin from "./packages/plugin-staking/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";

// ============================================================
// Config
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_BASE = process.env.OPENAI_BASE_URL;
const AI_MODEL = process.env.AI_MODEL || "gpt-4.1-nano";
const MNEMONIC = process.env.TON_MNEMONIC!;
const NETWORK = (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
const RPC_URL = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";

// HITL: transactions above this amount require approval
const AUTO_APPROVE_LIMIT = 0.05; // TON

// ============================================================
// Pending approvals store
// ============================================================

const pendingApprovals = new Map<
  string,
  {
    chatId: number;
    action: string;
    params: any;
    resolve: (approved: boolean) => void;
  }
>();

// ============================================================
// Initialize
// ============================================================

async function main() {
  console.log("🤖 Starting TON Agent Kit Telegram Bot...");

  // Init wallet + agent
  const client = new TonClient4({ endpoint: RPC_URL });
  const wallet = await KeypairWallet.autoDetect(
    MNEMONIC.split(" "),
    client,
    NETWORK,
  );
  console.log(`📍 Wallet: ${wallet.address.toRawString()}`);

  const agent = new TonAgentKit(wallet, RPC_URL, {}, NETWORK)
    .use(TokenPlugin)
    .use(DefiPlugin)
    .use(DnsPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(AnalyticsPlugin);

  // Init OpenAI
  const openai = new OpenAI({
    apiKey: OPENAI_KEY,
    ...(OPENAI_BASE && { baseURL: OPENAI_BASE }),
  });

  // Init Telegram bot
  const bot = new Bot(BOT_TOKEN);

  // ── Available actions for the LLM ──
  const tools: OpenAI.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "get_balance",
        description: "Get TON balance. No params needed for own balance.",
        parameters: {
          type: "object",
          properties: {
            address: { type: "string", description: "Optional address" },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "transfer_ton",
        description: "Send TON to an address",
        parameters: {
          type: "object",
          properties: {
            to: { type: "string", description: "Destination address" },
            amount: { type: "string", description: "Amount of TON" },
            comment: { type: "string", description: "Optional comment" },
          },
          required: ["to", "amount"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_wallet_info",
        description: "Get wallet details (balance, status, type)",
        parameters: {
          type: "object",
          properties: { address: { type: "string" } },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_transaction_history",
        description: "Get recent transactions",
        parameters: {
          type: "object",
          properties: { limit: { type: "number", default: 5 } },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "resolve_domain",
        description: "Resolve a .ton domain to address",
        parameters: {
          type: "object",
          properties: { domain: { type: "string" } },
          required: ["domain"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_price",
        description: "Get token price in USD and TON",
        parameters: {
          type: "object",
          properties: { token: { type: "string" } },
          required: ["token"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_staking_info",
        description: "Check staking positions",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "create_escrow",
        description: "Create an escrow deal",
        parameters: {
          type: "object",
          properties: {
            beneficiary: { type: "string" },
            amount: { type: "string" },
            description: { type: "string" },
            deadlineMinutes: { type: "number", default: 60 },
          },
          required: ["beneficiary", "amount"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_escrow_info",
        description: "Get escrow details or list all escrows",
        parameters: {
          type: "object",
          properties: { escrowId: { type: "string" } },
        },
      },
    },
  ];

  // ── Chat history per user ──
  const chatHistories = new Map<number, OpenAI.ChatCompletionMessageParam[]>();

  // ── Per-user TX mode: "auto" skips HITL, "confirm" (default) shows buttons ──
  const userTxMode = new Map<number, "auto" | "confirm">();

  const friendlyWalletAddr = wallet.address.toString({ testOnly: NETWORK === "testnet", bounceable: false });

  const SYSTEM_PROMPT = `You are TON Agent Kit Bot — an AI agent that manages a TON blockchain wallet via Telegram.
You have 9 blockchain actions available.

Your wallet: ${friendlyWalletAddr}
Network: ${NETWORK}

You can check balances, send TON, resolve .ton domains, check prices, view transaction history, manage escrows, and more.

CRITICAL: When the user asks to perform any action (transfer, escrow, etc.), call the function IMMEDIATELY. Do NOT ask "are you sure?", "would you like to proceed?", or any form of confirmation. The system automatically shows Approve/Reject buttons for transfers above ${AUTO_APPROVE_LIMIT} TON. Your job is to call the function, not to ask for permission.

Users can type "TX auto" to skip approval buttons, or "TX confirm" to re-enable them.

When displaying addresses to the user, always use the user-friendly format (like 0QClVWrj... or EQClVWrj...) instead of raw format (0:a5556...). Both formats refer to the same address — raw format is used internally by the blockchain, user-friendly format is what wallets like Tonkeeper display. If a function result includes both address and friendlyAddress fields, prefer showing friendlyAddress. If the user provides a raw address, accept it but display the user-friendly version back.

Rules:
- Be concise. Use emojis sparingly.
- Format TON amounts to 4 decimal places.
- When showing addresses, use the user-friendly format and truncate to first 6 and last 4 characters.
- Always show transaction results clearly.`;

  // ── HITL: Approval handler ──
  bot.callbackQuery(/^approve_(.+)$/, async (ctx) => {
    const approvalId = ctx.match![1];
    const pending = pendingApprovals.get(approvalId);
    if (pending) {
      pending.resolve(true);
      pendingApprovals.delete(approvalId);
      await ctx.editMessageText("✅ Approved! Executing transaction...");
    } else {
      await ctx.editMessageText("⚠️ This approval has expired.");
    }
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^reject_(.+)$/, async (ctx) => {
    const approvalId = ctx.match![1];
    const pending = pendingApprovals.get(approvalId);
    if (pending) {
      pending.resolve(false);
      pendingApprovals.delete(approvalId);
      await ctx.editMessageText("❌ Transaction rejected.");
    } else {
      await ctx.editMessageText("⚠️ This approval has expired.");
    }
    await ctx.answerCallbackQuery();
  });

  // ── Request HITL approval ──
  async function requestApproval(
    chatId: number,
    action: string,
    params: any,
  ): Promise<boolean> {
    const approvalId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const keyboard = new InlineKeyboard()
      .text("✅ Approve", `approve_${approvalId}`)
      .text("❌ Reject", `reject_${approvalId}`);

    let message = `🔔 *Approval Required*\n\n`;
    if (action === "transfer_ton") {
      message += `Send *${params.amount} TON* to \`${params.to}\``;
      if (params.comment) message += `\nComment: ${params.comment}`;
    } else {
      message += `Action: \`${action}\`\nParams: \`${JSON.stringify(params)}\``;
    }

    await bot.api.sendMessage(chatId, message, {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });

    return new Promise((resolve) => {
      pendingApprovals.set(approvalId, { chatId, action, params, resolve });
      // Auto-expire after 2 minutes
      setTimeout(() => {
        if (pendingApprovals.has(approvalId)) {
          pendingApprovals.delete(approvalId);
          resolve(false);
        }
      }, 120000);
    });
  }

  // ── Main message handler ──
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const userMessage = ctx.message.text;

    // ── Detect TX mode commands before sending to GPT ──
    const msgLower = userMessage.toLowerCase().trim();
    if (/\b(tx\s*auto|auto\s*approve|enable\s*auto\s*mode)\b/.test(msgLower)) {
      userTxMode.set(chatId, "auto");
      await ctx.reply("🔓 Auto mode enabled — transfers will execute without approval buttons.");
      return;
    }
    if (/\b(tx\s*confirm|approval\s*on|enable\s*confirmation)\b/.test(msgLower)) {
      userTxMode.set(chatId, "confirm");
      await ctx.reply("🔒 Confirmation mode enabled — transfers above " + AUTO_APPROVE_LIMIT + " TON will require approval.");
      return;
    }

    // Skip commands
    if (userMessage.startsWith("/start")) {
      await ctx.reply(
        `🤖 *TON Agent Kit Bot*\n\n` +
          `I'm an AI agent connected to TON blockchain.\n\n` +
          `Try:\n` +
          `• "What's my balance?"\n` +
          `• "Send 0.01 TON to 0:abc..."\n` +
          `• "Resolve alice.ton"\n` +
          `• "Show my recent transactions"\n` +
          `• "Create an escrow for 1 TON"\n\n` +
          `Wallet: \`${friendlyWalletAddr.slice(0, 10)}...${friendlyWalletAddr.slice(-6)}\`\n` +
          `Network: ${NETWORK}`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    // Get or create chat history
    if (!chatHistories.has(chatId)) {
      chatHistories.set(chatId, [{ role: "system", content: SYSTEM_PROMPT }]);
    }
    const history = chatHistories.get(chatId)!;

    // Add user message
    history.push({ role: "user", content: userMessage });

    // Keep history manageable (last 20 messages)
    if (history.length > 22) {
      history.splice(1, history.length - 21);
    }

    try {
      // Call OpenAI
      let response = await openai.chat.completions.create({
        model: AI_MODEL,
        messages: history,
        tools,
        tool_choice: "auto",
      });

      let assistantMessage = response.choices[0].message;

      // Process tool calls (up to 5 iterations)
      let iterations = 0;
      while (assistantMessage.tool_calls && iterations < 5) {
        iterations++;
        history.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          const fnParams = JSON.parse(toolCall.function.arguments);

          // HITL: "confirm" mode → ALWAYS show buttons; "auto" mode → skip entirely
          let approved = true;
          const mode = userTxMode.get(chatId) || "confirm";
          if (fnName === "transfer_ton" && mode === "confirm") {
            await ctx.reply(
              `⏳ Requesting approval for ${fnParams.amount} TON transfer...`,
            );
            approved = await requestApproval(chatId, fnName, fnParams);
          }

          let result: string;
          if (approved) {
            try {
              const actionResult = await agent.runAction(fnName, fnParams);
              result = JSON.stringify(actionResult);

              // TX confirmation — wait and verify on-chain, include explorer link
              if (fnName === "transfer_ton") {
                const walletAddr = wallet.address.toRawString();
                const viewerBase = NETWORK === "mainnet"
                  ? "https://tonviewer.com"
                  : "https://testnet.tonviewer.com";
                const fallbackLink = `${viewerBase}/${walletAddr}`;
                const pluginExplorerUrl = (actionResult as any)?.explorerUrl;

                await new Promise((r) => setTimeout(r, 10000));
                try {
                  const txHistory = await agent.runAction("get_transaction_history", { limit: 1 }) as any;
                  // Extract real tx hash from history: events[0].id
                  const realTxHash = txHistory?.events?.[0]?.id;
                  const txLink = realTxHash
                    ? `${viewerBase}/transaction/${realTxHash}`
                    : fallbackLink;

                  if (txHistory && Object.keys(txHistory).length > 0) {
                    result = JSON.stringify({
                      ...actionResult,
                      confirmation: `✅ Transaction confirmed on-chain\n${txLink}`,
                      ...(pluginExplorerUrl && { explorerUrl: pluginExplorerUrl }),
                    });
                  } else {
                    result = JSON.stringify({
                      ...actionResult,
                      confirmation: `⏳ Transaction sent, awaiting confirmation\n${fallbackLink}`,
                      ...(pluginExplorerUrl && { explorerUrl: pluginExplorerUrl }),
                    });
                  }
                } catch {
                  result = JSON.stringify({
                    ...actionResult,
                    confirmation: `⏳ Transaction sent, awaiting confirmation\n${fallbackLink}`,
                    ...(pluginExplorerUrl && { explorerUrl: pluginExplorerUrl }),
                  });
                }
              }
            } catch (err: any) {
              result = JSON.stringify({ error: err.message });
            }
          } else {
            result = JSON.stringify({
              status: "rejected",
              reason: "User rejected the transaction",
            });
          }

          history.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        // Get next response
        response = await openai.chat.completions.create({
          model: AI_MODEL,
          messages: history,
          tools,
          tool_choice: "auto",
        });
        assistantMessage = response.choices[0].message;
      }

      // Send final response
      const reply = assistantMessage.content || "Done!";
      history.push({ role: "assistant", content: reply });
      try {
        await ctx.reply(reply, { parse_mode: "Markdown" });
      } catch {
        await ctx.reply(reply);
      }
    } catch (err: any) {
      console.error("Error:", err.message);
      chatHistories.delete(chatId);
      await ctx.reply(`⚠️ Error: ${err.message.slice(0, 200)}`);
    }
  });

  // Error handler (prevents crash on expired callbacks)
  bot.catch((err: any) => {
    console.error("Bot error (non-fatal):", err.message?.slice(0, 100));
  });

  // Start bot with concurrent update processing (needed for HITL)
  const { run } = await import("@grammyjs/runner");
  const runner = run(bot);
  console.log("✅ Bot is running! Send a message on Telegram.");
  process.on("SIGINT", () => runner.stop());
  process.on("SIGTERM", () => runner.stop());
}

main().catch(console.error);

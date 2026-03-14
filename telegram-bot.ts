import { TonClient4 } from "@ton/ton";
import { readFileSync } from "fs";
import { Bot, InlineKeyboard } from "grammy";
import OpenAI from "openai";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import StakingPlugin from "./packages/plugin-staking/src/index";
import TokenPlugin from "./packages/plugin-token/src/index";

// ============================================================
// Config
// ============================================================

const envContent = readFileSync(".env", "utf-8");
const getEnv = (key: string) =>
  envContent
    .split("\n")
    .find((l) => l.startsWith(key + "="))
    ?.slice(key.length + 1)
    .trim() || "";

process.env.TON_MNEMONIC = getEnv("TON_MNEMONIC");
process.env.TELEGRAM_BOT_TOKEN = getEnv("TELEGRAM_BOT_TOKEN");
process.env.OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
process.env.OPENAI_BASE_URL = getEnv("OPENAI_BASE_URL");
process.env.AI_MODEL = getEnv("AI_MODEL");
process.env.TON_NETWORK = getEnv("TON_NETWORK");
process.env.TON_RPC_URL = getEnv("TON_RPC_URL");

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
const OPENAI_BASE = process.env.OPENAI_BASE_URL;
const AI_MODEL = process.env.AI_MODEL || "gpt-4.1-nano";
const MNEMONIC = process.env.TON_MNEMONIC!;
const NETWORK = (process.env.TON_NETWORK as "testnet" | "mainnet") || "testnet";
const RPC_URL = process.env.TON_RPC_URL || "https://testnet-v4.tonhubapi.com";

const AUTO_APPROVE_LIMIT = 0.05;

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
// HTML formatting helpers
// ============================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function shortAddr(addr: string): string {
  if (!addr) return "unknown";
  if (addr.length > 20) return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  return addr;
}

function formatTon(amount: string | number): string {
  return parseFloat(String(amount)).toFixed(4);
}

// ============================================================
// Initialize
// ============================================================

async function main() {
  console.log("🤖 Starting TON Agent Kit Telegram Bot...");

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
    .use(IdentityPlugin)
    .use(AnalyticsPlugin);

  const openai = new OpenAI({
    apiKey: OPENAI_KEY,
    ...(OPENAI_BASE && { baseURL: OPENAI_BASE }),
  });

  const bot = new Bot(BOT_TOKEN);

  // ── Use toAITools() for proper schemas ──
  const tools = agent.toAITools();

  // ── Chat history per user ──
  const chatHistories = new Map<number, OpenAI.ChatCompletionMessageParam[]>();
  const userTxMode = new Map<number, "auto" | "confirm">();

  const friendlyAddr = wallet.address.toString({
    testOnly: NETWORK === "testnet",
    bounceable: false,
  });

  const viewerBase =
    NETWORK === "mainnet"
      ? "https://tonviewer.com"
      : "https://testnet.tonviewer.com";

  const SYSTEM_PROMPT = `You are TON Agent Kit Bot — an AI agent connected to the TON blockchain via Telegram.

Wallet: ${friendlyAddr}
Network: ${NETWORK}
Actions: ${agent
    .getAvailableActions()
    .map((a: any) => a.name)
    .join(", ")}

RULES:
1. Execute actions IMMEDIATELY when asked. Never ask "are you sure?" — the system handles approval buttons automatically.
2. Format responses for Telegram HTML:
   - Use <b>bold</b> for labels and important values
   - Use <code>address</code> for addresses and hashes
   - Use line breaks for readability
   - Keep responses concise — no walls of text
3. Format TON amounts to 4 decimal places
4. When showing addresses, prefer the user-friendly format (EQ... or UQ...) and truncate: first 8 + last 6 chars
5. After a transfer, always mention the explorer link
6. For balance checks, show the amount prominently
7. For escrow operations, clearly show the escrow ID and status
8. For errors, explain what went wrong in plain language

FORMATTING EXAMPLES:
- Balance: "💰 <b>Balance:</b> 2.3456 TON"
- Transfer: "✅ <b>Sent 1.0000 TON</b> to <code>0QClVW...07VR9</code>"
- Price: "📊 <b>USDT:</b> $1.00 (0.7670 TON)"
- Domain: "🌐 <b>foundation.ton</b> → <code>0:5541...9a57</code>"
- Escrow: "🔒 <b>Escrow created</b>\nID: <code>escrow_abc123</code>\nAmount: 0.05 TON"`;

  // ── Onboarding: /start ──
  bot.command("start", async (ctx) => {
    const balResult = (await agent.runAction("get_balance", {})) as any;
    const balance = formatTon(balResult.balance || "0");

    await ctx.reply(
      `<b>🤖 TON Agent Kit</b>\n` +
        `<i>AI-powered blockchain agent on TON</i>\n` +
        `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `\n` +
        `💎 <b>Wallet</b>\n` +
        `<code>${friendlyAddr}</code>\n` +
        `Balance: <b>${balance} TON</b>\n` +
        `Network: ${NETWORK === "testnet" ? "🧪 Testnet" : "🌐 Mainnet"}\n` +
        `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `\n` +
        `⚡ <b>Quick start</b> — try these:\n` +
        `\n` +
        `💰 <i>"What's my balance?"</i>\n` +
        `📤 <i>"Send 0.01 TON to 0QBQ-vTF..."</i>\n` +
        `🌐 <i>"Resolve foundation.ton"</i>\n` +
        `📊 <i>"What's the price of USDT?"</i>\n` +
        `📜 <i>"Show my last 3 transactions"</i>\n` +
        `🔒 <i>"Create escrow for 0.05 TON to 0QBQ..."</i>\n` +
        `🪪 <i>"Register agent trading-bot"</i>\n` +
        `\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `\n` +
        `🛡️ <b>Security</b>\n` +
        `Transfers above ${AUTO_APPROVE_LIMIT} TON require approval.\n` +
        `Type <b>TX auto</b> to skip · <b>TX confirm</b> to re-enable\n` +
        `\n` +
        `Type <b>/help</b> for all commands.`,
      { parse_mode: "HTML" },
    );
  });

  // ── Help command ──
  bot.command("help", async (ctx) => {
    await ctx.reply(
      `<b>📖 Commands</b>\n` +
        `\n` +
        `<b>💰 Wallet</b>\n` +
        `• Check balance\n` +
        `• Send TON to any address\n` +
        `• View transaction history\n` +
        `• Get wallet info\n` +
        `\n` +
        `<b>📈 DeFi</b>\n` +
        `• Get token prices (USDT, etc.)\n` +
        `• Swap tokens on DeDust/STON.fi\n` +
        `\n` +
        `<b>🌐 DNS</b>\n` +
        `• Resolve .ton domains\n` +
        `• Reverse lookup addresses\n` +
        `\n` +
        `<b>🔒 Escrow</b>\n` +
        `• Create trustless escrow deals\n` +
        `• Deposit, release, or refund\n` +
        `• List all active escrows\n` +
        `\n` +
        `<b>🪪 Identity</b>\n` +
        `• Register as an AI agent\n` +
        `• Discover other agents\n` +
        `• Check agent reputation\n` +
        `\n` +
        `<b>💎 Staking</b>\n` +
        `• View staking positions\n` +
        `• Stake/unstake TON\n` +
        `\n` +
        `<b>⚙️ Settings</b>\n` +
        `<b>TX auto</b> — skip approval buttons\n` +
        `<b>TX confirm</b> — require approval\n` +
        `\n` +
        `<i>Just type what you want in natural language!</i>`,
      { parse_mode: "HTML" },
    );
  });

  // ── Wallet command (quick balance check) ──
  bot.command("wallet", async (ctx) => {
    try {
      const balResult = (await agent.runAction("get_balance", {})) as any;
      const balance = formatTon(balResult.balance || "0");

      await ctx.reply(
        `💎 <b>Wallet</b>\n` +
          `\n` +
          `Address: <code>${friendlyAddr}</code>\n` +
          `Balance: <b>${balance} TON</b>\n` +
          `Network: ${NETWORK === "testnet" ? "🧪 Testnet" : "🌐 Mainnet"}\n` +
          `\n` +
          `<a href="${viewerBase}/${friendlyAddr}">View on Tonviewer ↗</a>`,
        { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
      );
    } catch (err: any) {
      await ctx.reply(`⚠️ Error: ${escapeHtml(err.message.slice(0, 200))}`);
    }
  });

  // ── HITL: Approval handler ──
  bot.callbackQuery(/^approve_(.+)$/, async (ctx) => {
    const approvalId = ctx.match![1];
    const pending = pendingApprovals.get(approvalId);
    if (pending) {
      pending.resolve(true);
      pendingApprovals.delete(approvalId);
      await ctx.editMessageText(
        "✅ <b>Approved</b> — executing transaction...",
        { parse_mode: "HTML" },
      );
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
      await ctx.editMessageText("❌ <b>Transaction rejected</b>", {
        parse_mode: "HTML",
      });
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

    let message = `🔔 <b>Approval required</b>\n\n`;
    if (action === "transfer_ton") {
      message += `📤 Send <b>${formatTon(params.amount)} TON</b>\n`;
      message += `📍 To: <code>${escapeHtml(params.to)}</code>`;
      if (params.comment)
        message += `\n💬 Comment: ${escapeHtml(params.comment)}`;
    } else if (action === "create_escrow") {
      message += `🔒 Create escrow: <b>${formatTon(params.amount)} TON</b>\n`;
      message += `📍 Beneficiary: <code>${escapeHtml(params.beneficiary)}</code>`;
    } else {
      message += `⚡ Action: <code>${escapeHtml(action)}</code>\n`;
      message += `📋 Params: <code>${escapeHtml(JSON.stringify(params).slice(0, 200))}</code>`;
    }

    await bot.api.sendMessage(chatId, message, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });

    return new Promise((resolve) => {
      pendingApprovals.set(approvalId, { chatId, action, params, resolve });
      setTimeout(() => {
        if (pendingApprovals.has(approvalId)) {
          pendingApprovals.delete(approvalId);
          resolve(false);
        }
      }, 120000);
    });
  }

  // ── TX mode commands ──
  function handleTxMode(chatId: number, text: string): string | null {
    const lower = text.toLowerCase().trim();
    if (/\b(tx\s*auto|auto\s*approve|enable\s*auto)\b/.test(lower)) {
      userTxMode.set(chatId, "auto");
      return "🔓 <b>Auto mode enabled</b>\nTransfers execute without approval buttons.";
    }
    if (/\b(tx\s*confirm|approval\s*on|enable\s*confirm)\b/.test(lower)) {
      userTxMode.set(chatId, "confirm");
      return `🔒 <b>Confirmation mode enabled</b>\nTransfers above ${AUTO_APPROVE_LIMIT} TON require approval.`;
    }
    return null;
  }

  // ── Safe reply with HTML fallback ──
  async function safeReply(ctx: any, text: string) {
    try {
      await ctx.reply(text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch {
      // Strip HTML tags as fallback
      const plain = text.replace(/<[^>]+>/g, "");
      await ctx.reply(plain);
    }
  }

  // ── Main message handler ──
  bot.on("message:text", async (ctx) => {
    const chatId = ctx.chat.id;
    const userMessage = ctx.message.text;

    // TX mode commands
    const modeReply = handleTxMode(chatId, userMessage);
    if (modeReply) {
      await safeReply(ctx, modeReply);
      return;
    }

    // Get or create chat history
    if (!chatHistories.has(chatId)) {
      chatHistories.set(chatId, [{ role: "system", content: SYSTEM_PROMPT }]);
    }
    const history = chatHistories.get(chatId)!;

    history.push({ role: "user", content: userMessage });

    // Keep history manageable
    if (history.length > 22) {
      history.splice(1, history.length - 21);
    }

    try {
      // Show typing indicator
      await ctx.api.sendChatAction(chatId, "typing");

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

          // HITL check
          let approved = true;
          const mode = userTxMode.get(chatId) || "confirm";
          const needsApproval =
            (fnName === "transfer_ton" || fnName === "create_escrow") &&
            mode === "confirm";

          if (needsApproval) {
            approved = await requestApproval(chatId, fnName, fnParams);
          }

          let result: string;
          if (approved) {
            try {
              // Show typing while executing
              await ctx.api.sendChatAction(chatId, "typing");

              const actionResult = await agent.runAction(fnName, fnParams);
              result = JSON.stringify(actionResult);

              // TX confirmation — wait and add explorer link
              if (fnName === "transfer_ton") {
                await new Promise((r) => setTimeout(r, 10000));
                try {
                  const txHistory = (await agent.runAction(
                    "get_transaction_history",
                    { limit: 1 },
                  )) as any;
                  const realTxHash = txHistory?.events?.[0]?.id;
                  const txLink = realTxHash
                    ? `${viewerBase}/transaction/${realTxHash}`
                    : `${viewerBase}/${friendlyAddr}`;

                  result = JSON.stringify({
                    ...actionResult,
                    explorerUrl: txLink,
                    confirmed: !!realTxHash,
                  });
                } catch {
                  result = JSON.stringify({
                    ...actionResult,
                    explorerUrl: `${viewerBase}/${friendlyAddr}`,
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

        // Show typing for follow-up
        await ctx.api.sendChatAction(chatId, "typing");

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
      await safeReply(ctx, reply);
    } catch (err: any) {
      console.error("Error:", err.message);
      chatHistories.delete(chatId);
      await safeReply(
        ctx,
        `⚠️ <b>Error:</b> ${escapeHtml(err.message.slice(0, 200))}`,
      );
    }
  });

  // Error handler
  bot.catch((err: any) => {
    console.error("Bot error (non-fatal):", err.message?.slice(0, 100));
  });

  await bot.api.setMyCommands([
    { command: "start", description: "Welcome & quick start" },
    { command: "help", description: "All commands & capabilities" },
    { command: "wallet", description: "Check balance & wallet info" },
  ]);

  // Start with concurrent processing (needed for HITL)
  const { run } = await import("@grammyjs/runner");
  const runner = run(bot);

  console.log(`\n${"━".repeat(40)}`);
  console.log(`  🤖 TON Agent Kit Bot`);
  console.log(`  📍 ${shortAddr(friendlyAddr)}`);
  console.log(`  🌐 ${NETWORK}`);
  console.log(`  🧠 ${AI_MODEL}`);
  console.log(`  ⚡ ${agent.getAvailableActions().length} actions`);
  console.log(`${"━".repeat(40)}\n`);

  process.on("SIGINT", () => runner.stop());
  process.on("SIGTERM", () => runner.stop());
}

main().catch(console.error);

import { TonClient4 } from "@ton/ton";
import { readFileSync } from "fs";
import { Bot, InlineKeyboard } from "grammy";
import OpenAI from "openai";
import { TonAgentKit } from "./packages/core/src/agent";
import { KeypairWallet } from "./packages/core/src/wallet";
import AnalyticsPlugin from "./packages/plugin-analytics/src/index";
import DefiPlugin from "./packages/plugin-defi/src/index";
import DnsPlugin from "./packages/plugin-dns/src/index";
import NftPlugin from "./packages/plugin-nft/src/index";
import EscrowPlugin from "./packages/plugin-escrow/src/index";
import IdentityPlugin from "./packages/plugin-identity/src/index";
import StakingPlugin from "./packages/plugin-staking/src/index";
import TokenPlugin from "./packages/plugin-token/src/index";
import PaymentsPlugin from "./packages/plugin-payments/src/index";
import AgentCommPlugin from "./packages/plugin-agent-comm/src/index";

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
    .use(NftPlugin)
    .use(StakingPlugin)
    .use(EscrowPlugin)
    .use(IdentityPlugin)
    .use(AnalyticsPlugin)
    .use(PaymentsPlugin)
    .use(AgentCommPlugin);

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

  const SYSTEM_PROMPT = `You are TON Agent Kit Bot. An AI agent on the TON blockchain, running inside Telegram.

Wallet: ${friendlyAddr}
Network: ${NETWORK}
Actions: ${agent.actionCount}

You have ${agent.actionCount} blockchain actions in 12 plugins:

WALLET & TOKENS: get_balance, get_jetton_balance, transfer_ton, transfer_jetton, deploy_jetton, get_jetton_info, simulate_transaction
Use these for balance checks, sending TON/tokens, deploying new tokens, simulating transfers.

DEFI: swap_dedust, swap_stonfi, swap_best_price, get_price, create_dca_order, create_limit_order, cancel_order, get_yield_pools, yield_deposit, yield_withdraw, get_staking_pools, get_token_trust
swap_best_price compares DeDust and STON.fi and picks the better rate.

DNS: resolve_domain, lookup_address, get_domain_info

NFT: get_nft_info, get_nft_collection, transfer_nft

STAKING: stake_ton, unstake_ton, get_staking_info

ESCROW & DISPUTES: create_escrow, deposit_to_escrow, release_escrow, refund_escrow, get_escrow_info, confirm_delivery, auto_release_escrow, open_dispute, join_dispute, vote_release, vote_refund, claim_reward, fallback_settle, seller_stake_escrow
Each escrow deploys its own smart contract. Disputes use multi-arbiter voting.

AGENT NETWORK: register_agent, discover_agent, get_agent_reputation, deploy_reputation_contract, withdraw_reputation_fees, process_pending_ratings, get_open_disputes, trigger_cleanup, get_agent_cleanup_info

AGENT COMMUNICATION: broadcast_intent, discover_intents, send_offer, get_offers, accept_offer, settle_deal, cancel_intent
Intents = "I need service X, budget Y." Offers = "I can do it for Z." Settlement releases payment with rating.

ANALYTICS: get_transaction_history, get_wallet_info, get_portfolio_metrics, get_equity_curve, wait_for_transaction, subscribe_webhook, call_contract_method, get_accounts_bulk
get_portfolio_metrics returns PnL, ROI, win rate, drawdown. get_accounts_bulk queries multiple wallets in one call.

PAYMENTS: pay_for_resource, get_delivery_proof

RULES:
1. Execute actions IMMEDIATELY. Never ask "are you sure?" The system handles approval buttons.
2. Format for Telegram HTML: <b>bold</b> for labels, <code>mono</code> for addresses/hashes.
3. Format TON amounts to 4 decimal places.
4. Truncate addresses: first 8 + last 6 chars.
5. After transfers, show explorer link.
6. For intents/offers, show service, budget, deadline clearly.
7. For disputes, show escrow ID, status, voting progress.
8. For portfolio, show PnL, ROI, win rate cleanly.
9. Keep responses concise.`;

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
        `${agent.actionCount} actions across 12 plugins.\n` +
        `Ask me anything in natural language.\n` +
        `\n` +
        `💰 <i>"What's my balance?"</i>\n` +
        `📤 <i>"Send 0.01 TON to 0QBQ..."</i>\n` +
        `📊 <i>"USDT price?"</i>\n` +
        `🌐 <i>"Resolve foundation.ton"</i>\n` +
        `📈 <i>"My portfolio metrics"</i>\n` +
        `🤝 <i>"Broadcast intent for price_feed"</i>\n` +
        `💹 <i>"Swap 5 TON to USDT best price"</i>\n` +
        `⚖️ <i>"Any open disputes?"</i>\n` +
        `🔬 <i>"Simulate sending 10 TON to 0QBQ..."</i>\n` +
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
      `<b>📖 TON Agent Kit</b>. ${agent.actionCount} actions.\n` +
        `\n` +
        `━━━ <b>💰 Wallet</b> ━━━━━━━━━━\n` +
        `Balance, transfers, jettons, deploy tokens, simulate TX\n` +
        `\n` +
        `━━━ <b>📈 DeFi</b> ━━━━━━━━━━━━\n` +
        `Prices, swaps (DeDust + STON.fi), best-price router, DCA, limit orders, yield, staking pools\n` +
        `\n` +
        `━━━ <b>🌐 DNS</b> ━━━━━━━━━━━━━\n` +
        `Resolve .ton domains, reverse lookup\n` +
        `\n` +
        `━━━ <b>🖼️ NFT</b> ━━━━━━━━━━━━━\n` +
        `NFT info, collections, transfer\n` +
        `\n` +
        `━━━ <b>🔒 Escrow</b> ━━━━━━━━━━\n` +
        `Create deals, deposit, release, refund, disputes, arbitration, seller stake\n` +
        `\n` +
        `━━━ <b>🤝 Agent Network</b> ━━━━\n` +
        `Register agents, discover by capability, reputation, intents, offers, deals\n` +
        `\n` +
        `━━━ <b>📊 Analytics</b> ━━━━━━━━\n` +
        `Portfolio metrics, equity curve, TX history, bulk queries, contract calls\n` +
        `\n` +
        `━━━ <b>💎 Staking</b> ━━━━━━━━━━\n` +
        `Stake, unstake, view positions\n` +
        `\n` +
        `━━━ <b>⚙️ Settings</b> ━━━━━━━━━\n` +
        `<b>TX auto</b> . skip approval\n` +
        `<b>TX confirm</b> . require approval\n` +
        `\n` +
        `━━━ <b>📋 Commands</b> ━━━━━━━━━\n` +
        `/wallet . balance + address\n` +
        `/agents . registered agents\n` +
        `/intents . open intents\n` +
        `/portfolio . 7-day portfolio\n` +
        `\n` +
        `<i>Or just type what you need.</i>`,
      { parse_mode: "HTML" },
    );
  });

  // ── /agents command ──
  bot.command("agents", async (ctx) => {
    try {
      const result = (await agent.runAction("discover_agent", {})) as any;
      const agents = result?.agents || [];
      if (agents.length === 0) {
        await safeReply(ctx, `🤝 No agents registered yet.`);
        return;
      }
      let msg = `<b>🤝 Registered Agents</b> (${agents.length})\n\n`;
      for (const a of agents.slice(0, 10)) {
        const caps = (a.capabilities || []).join(", ");
        msg += `<b>${escapeHtml(a.name || "unknown")}</b>\n`;
        msg += `Capabilities: ${escapeHtml(caps || "none")}\n`;
        msg += `Reputation: ${a.reputation?.score || 0}/100\n\n`;
      }
      await safeReply(ctx, msg);
    } catch (err: any) {
      await safeReply(ctx, `⚠️ ${escapeHtml(err.message.slice(0, 200))}`);
    }
  });

  // ── /intents command ──
  bot.command("intents", async (ctx) => {
    try {
      const result = (await agent.runAction("discover_intents", {})) as any;
      const intents = result?.intents || [];
      if (intents.length === 0) {
        await safeReply(ctx, `📡 No open intents right now.`);
        return;
      }
      let msg = `<b>📡 Open Intents</b> (${intents.length})\n\n`;
      for (const i of intents.slice(0, 10)) {
        msg += `#${i.intentIndex} <b>${escapeHtml(i.serviceHash?.slice(0, 10) || "?")}</b>\n`;
        msg += `Budget: ${i.budget || "?"}\nDeadline: ${i.deadline || "?"}\n\n`;
      }
      await safeReply(ctx, msg);
    } catch (err: any) {
      await safeReply(ctx, `⚠️ ${escapeHtml(err.message.slice(0, 200))}`);
    }
  });

  // ── /portfolio command ──
  bot.command("portfolio", async (ctx) => {
    try {
      const r = (await agent.runAction("get_portfolio_metrics", { days: 7 })) as any;
      await safeReply(ctx,
        `<b>📊 Portfolio (7 days)</b>\n\n` +
        `PnL: <b>${r.netPnL || "0"} TON</b>\n` +
        `ROI: <b>${r.roi || "0"}%</b>\n` +
        `Win Rate: <b>${r.winRate || "0"}%</b>\n` +
        `Max Drawdown: <b>${r.maxDrawdown || "0"} TON</b>\n` +
        `Transactions: ${r.totalTransactions || 0}\n` +
        `Balance: <b>${r.currentBalance || "?"} TON</b>`
      );
    } catch (err: any) {
      await safeReply(ctx, `⚠️ ${escapeHtml(err.message.slice(0, 200))}`);
    }
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
      message += `📤 <b>Transfer</b>\nSend: <b>${formatTon(params.amount)} TON</b>\nTo: <code>${escapeHtml(params.to || "")}</code>`;
      if (params.comment) message += `\nComment: ${escapeHtml(params.comment)}`;
    } else if (action === "create_escrow") {
      message += `🔒 <b>Create Escrow</b>\nAmount: <b>${formatTon(params.amount)} TON</b>\nBeneficiary: <code>${escapeHtml(params.beneficiary || "")}</code>`;
    } else if (action.startsWith("swap_")) {
      message += `🔄 <b>Swap</b>\nFrom: ${escapeHtml(params.fromToken || "TON")}\nAmount: ${escapeHtml(params.amount || "?")}\nTo: ${escapeHtml(params.toToken || "?")}`;
    } else if (action === "broadcast_intent") {
      message += `📡 <b>Broadcast Intent</b>\nService: ${escapeHtml(params.service || "?")}\nBudget: ${escapeHtml(params.budget || "?")} TON`;
    } else if (action === "open_dispute") {
      message += `⚖️ <b>Open Dispute</b>\nEscrow: <code>${escapeHtml(params.escrowId || "?")}</code>`;
    } else if (action === "accept_offer") {
      message += `🤝 <b>Accept Offer</b>\nOffer #${params.offerIndex || "?"}`;
    } else if (action === "deposit_to_escrow") {
      message += `🔒 <b>Deposit to Escrow</b>\nEscrow: <code>${escapeHtml(params.escrowId || "?")}</code>\nAmount: ${escapeHtml(params.amount || "?")} TON`;
    } else if (action === "stake_ton" || action === "unstake_ton") {
      message += `💎 <b>${action === "stake_ton" ? "Stake" : "Unstake"}</b>\nAmount: ${escapeHtml(params.amount || "?")} TON`;
    } else {
      message += `⚡ <b>${escapeHtml(action)}</b>\n<code>${escapeHtml(JSON.stringify(params).slice(0, 200))}</code>`;
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
          const HITL_ACTIONS = new Set([
            "transfer_ton", "transfer_jetton", "create_escrow", "deposit_to_escrow",
            "release_escrow", "refund_escrow", "open_dispute", "accept_offer",
            "stake_ton", "unstake_ton", "swap_dedust", "swap_stonfi", "swap_best_price",
            "broadcast_intent", "join_dispute", "seller_stake_escrow",
          ]);
          const needsApproval = HITL_ACTIONS.has(fnName) && mode === "confirm";

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
    { command: "start", description: "Welcome and quick start" },
    { command: "help", description: "All 68 actions and capabilities" },
    { command: "wallet", description: "Balance and wallet info" },
    { command: "agents", description: "Registered agents on the network" },
    { command: "intents", description: "Open service intents" },
    { command: "portfolio", description: "7-day portfolio metrics" },
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

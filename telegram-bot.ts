import { TonClient4 } from "@ton/ton";
import { readFileSync } from "fs";
import { Bot, InlineKeyboard } from "grammy";
import OpenAI from "openai";
import { TonAgentKit } from "./packages/core/src/agent";
import { definePlugin, defineAction } from "./packages/core/src/plugin";
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
import {
  tonPaywall,
  MemoryReplayStore,
} from "./packages/x402-middleware/src/index";
import express from "express";
import { z } from "./node_modules/zod";

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
const X402_PORT = parseInt(getEnv("X402_PORT") || "4000", 10);
const AUTO_APPROVE_LIMIT = 0.05;

// ── HITL action sets ──
const HITL_ACTIONS = new Set([
  "transfer_ton", "transfer_jetton", "create_escrow",
  "deposit_to_escrow", "release_escrow", "refund_escrow",
  "open_dispute", "accept_offer", "stake_ton", "unstake_ton",
  "swap_dedust", "swap_stonfi", "swap_best_price",
  "broadcast_intent", "join_dispute", "seller_stake_escrow",
  "settle_deal", "confirm_delivery", "send_offer",
  "vote_release", "vote_refund", "claim_reward", "cancel_intent",
]);
const ALWAYS_CONFIRM = new Set([
  "vote_release", "vote_refund", "confirm_delivery",
  "settle_deal", "send_offer", "cancel_intent",
  "open_dispute", "join_dispute",
]);

function needsApproval(action: string, params: any, mode: string): boolean {
  if (mode !== "confirm") return false;
  if (!HITL_ACTIONS.has(action)) return false;
  if (ALWAYS_CONFIRM.has(action)) return true;
  const amount = parseFloat(params.amount ?? params.value ?? "0");
  return isNaN(amount) || amount >= AUTO_APPROVE_LIMIT;
}

// ── Pending approvals (HITL) ──
const pendingApprovals = new Map<
  string,
  { chatId: number; action: string; params: any; resolve: (approved: boolean) => void }
>();

// ── Helpers ──
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function shortAddr(addr: string): string {
  if (!addr) return "unknown";
  if (addr.length > 20) return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
  return addr;
}
function formatTon(amount: string | number): string {
  return parseFloat(String(amount)).toFixed(4);
}

// ── UserState ──
interface UserState {
  currentMenu: string;
  mainMessageId?: number;
  confirmTrades: boolean;
  hitlThreshold: number;
  autoMode: boolean;
  listenMode: boolean;
  listenFilter?: string;
  maxAutoSteps: number;
  pollInterval: number;
  listenTimer?: ReturnType<typeof setInterval>;
  seenIntentIds: Set<number>;
  lastPollCount: number;
  pendingOffers: Map<number, { intentIndex: number; sentAt: number }>;
  offerTrackTimer?: ReturnType<typeof setInterval>;
  myActiveIntents: Map<number, { service: string; createdAt: number }>;
  offerDraft?: { intentIndex: number; price: string; deliveryTime: number };
  autoRunning: boolean;
  autoGoal?: string;
  awaitingInput?: "transfer" | "swap" | "new_intent" | "listen_filter" | null;
}

const userStates = new Map<number, UserState>();

function getState(uid: number): UserState {
  if (!userStates.has(uid)) {
    userStates.set(uid, {
      currentMenu: "main",
      confirmTrades: true,
      hitlThreshold: 0.05,
      autoMode: false,
      listenMode: false,
      maxAutoSteps: 10,
      pollInterval: 30000,
      seenIntentIds: new Set(),
      lastPollCount: 0,
      pendingOffers: new Map(),
      myActiveIntents: new Map(),
      autoRunning: false,
    });
  }
  return userStates.get(uid)!;
}

// ── Keyboards ──
function mainMenuKb(): InlineKeyboard {
  return new InlineKeyboard()
    .text("💎 Balance", "btn_balance").text("📤 Transfer", "btn_transfer").row()
    .text("📡 Intents", "btn_intents").text("📨 Offers", "btn_offers").text("🤝 Agents", "btn_agents").row()
    .text("🔒 Escrow", "btn_escrow").text("🔄 Swap", "btn_swap").row()
    .text("👂 Listen", "btn_listen").text("🤖 Auto", "btn_auto").row()
    .text("⚙️ Settings", "btn_settings").text("🔄 Refresh", "btn_refresh").row()
    .text("📊 Portfolio", "btn_portfolio").text("❓ Help", "btn_help");
}

function intentsMenuKb(myIntents: any[]): InlineKeyboard {
  const kb = new InlineKeyboard()
    .text("📡 New Intent", "btn_new_intent").text("🔍 Browse All", "btn_browse").row();
  for (const i of myIntents.slice(0, 5)) {
    kb.text(`View #${i.intentIndex}`, `view_intent_${i.intentIndex}`)
      .text(`Cancel #${i.intentIndex}`, `cancel_intent_${i.intentIndex}`).row();
  }
  kb.text("📨 My Offers", "btn_my_offers").text("🔄 Refresh", "btn_intents_refresh").row();
  kb.text("« Back", "btn_main");
  return kb;
}

function browseIntentsKb(intents: any[], page: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const i of intents.slice(0, 5)) {
    kb.text(`Offer on #${i.intentIndex}`, `offer_${i.intentIndex}`).row();
  }
  if (page > 0) kb.text("« Prev", `browse_page_${page - 1}`);
  kb.text("Next »", `browse_page_${page + 1}`).row();
  kb.text("« Back", "btn_intents");
  return kb;
}

function offerFormKb(draft: any): InlineKeyboard {
  return new InlineKeyboard()
    .text("0.05 TON", "price_0.05").text("0.1 TON", "price_0.1").text("0.2 TON", "price_0.2").row()
    .text("5 min", "time_5").text("15 min", "time_15").text("1 hour", "time_60").row()
    .text("✅ Send Offer", "btn_send_offer").text("« Cancel", "btn_intents").row();
}

function settingsKb(state: UserState): InlineKeyboard {
  return new InlineKeyboard()
    .text(state.confirmTrades ? "🔒 Confirm ON" : "🔓 Confirm OFF", "toggle_confirm")
    .text(state.autoMode ? "🤖 Auto ON" : "🤖 Auto OFF", "toggle_auto").row()
    .text(state.listenMode ? "👂 Listen ON" : "👂 Listen OFF", "toggle_listen")
    .text(`⚡ HITL: ${state.hitlThreshold} TON`, "cycle_hitl").row()
    .text(`🔢 Steps: ${state.maxAutoSteps}`, "cycle_steps")
    .text(`⏱️ Poll: ${state.pollInterval / 1000}s`, "cycle_poll").row()
    .text("💎 Wallet Info", "btn_wallet_info").text("« Back", "btn_main").row();
}

function listenKb(newCount: number): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (newCount > 0) kb.text(`📬 Show New (${newCount})`, "btn_show_new").row();
  kb.text("🔍 Filter", "btn_listen_filter").text("🎲 Random 5", "btn_listen_random").row();
  kb.text("⏹️ Stop", "btn_stop_listen").text("🔄 Poll Now", "btn_poll_now").row();
  kb.text("« Back", "btn_main");
  return kb;
}

function autoModeKb(state: UserState): InlineKeyboard {
  return new InlineKeyboard()
    .text("⏹️ Stop Auto", "btn_stop_auto").text(`🔢 Steps: ${state.maxAutoSteps}`, "cycle_steps").row()
    .text("« Back", "btn_main");
}

// ── x402 Endpoint Plugin ──
interface EndpointConfig {
  price: string;
  dataAction: string;
  dataParams: Record<string, string>;
  description: string;
  createdAt: string;
  served: number;
}
const endpointRoutes = new Map<string, EndpointConfig>();

const EndpointPlugin = definePlugin({
  name: "x402-endpoints",
  actions: [
    defineAction({
      name: "open_x402_endpoint",
      description:
        "Open a paid x402 endpoint on your HTTP server. Other agents pay TON to access it. The endpoint calls the specified SDK action to fetch LIVE blockchain data. Query params from buyer override dataParams. IMPORTANT: When you send_offer, use the URL from this endpoint.",
      schema: z.object({
        path: z.string().describe("URL path starting with /"),
        price: z.string().describe("Price in TON per request"),
        dataAction: z.string().describe("SDK action name for data"),
        dataParams: z.string().optional().describe('Default params as JSON string'),
        description: z.string().optional().describe("Description"),
      }),
      handler: async (_agent: any, params: any) => {
        const path = params.path.startsWith("/") ? params.path : "/" + params.path;
        endpointRoutes.set(path, {
          price: params.price,
          dataAction: params.dataAction,
          dataParams: params.dataParams ? (typeof params.dataParams === "string" ? JSON.parse(params.dataParams) : params.dataParams) : {},
          description: params.description || params.dataAction + " data",
          createdAt: new Date().toISOString(),
          served: 0,
        });
        console.log(`    [x402] Opened ${path} → ${params.dataAction} @ ${params.price} TON`);
        return { success: true, path, url: `http://localhost:${X402_PORT}${path}`, price: params.price, dataAction: params.dataAction, message: `Endpoint live. Use this URL in send_offer.` };
      },
    }),
    defineAction({
      name: "close_x402_endpoint",
      description: "Close a paid x402 endpoint.",
      schema: z.object({ path: z.string().describe("URL path to close") }),
      handler: async (_agent: any, params: any) => {
        const path = params.path.startsWith("/") ? params.path : "/" + params.path;
        const c = endpointRoutes.get(path);
        const existed = endpointRoutes.delete(path);
        return { success: true, closed: path, existed, totalServed: c?.served || 0 };
      },
    }),
    defineAction({
      name: "list_x402_endpoints",
      description: "List all open x402 endpoints with prices and request counts.",
      schema: z.object({}),
      handler: async () => {
        const eps: any[] = [];
        for (const [p, c] of endpointRoutes) eps.push({ path: p, url: `http://localhost:${X402_PORT}${p}`, price: c.price, dataAction: c.dataAction, served: c.served });
        return { endpoints: eps, count: eps.length, serverPort: X402_PORT };
      },
    }),
  ],
});

// ══════════════════════════════════════════════
// ══ MAIN ═════════════════════════════════════
// ══════════════════════════════════════════════
async function main() {
  console.log("🤖 Starting TON Agent Kit Telegram Bot...");
  const client = new TonClient4({ endpoint: RPC_URL });
  const wallet = await KeypairWallet.autoDetect(MNEMONIC.split(" "), client, NETWORK);
  const address = wallet.address.toRawString();
  const friendlyAddr = wallet.address.toString({ testOnly: NETWORK === "testnet", bounceable: false });
  const viewerBase = NETWORK === "mainnet" ? "https://tonviewer.com" : "https://testnet.tonviewer.com";

  const agent = new TonAgentKit(wallet, RPC_URL, {}, NETWORK)
    .use(TokenPlugin).use(DefiPlugin).use(DnsPlugin).use(NftPlugin)
    .use(StakingPlugin).use(EscrowPlugin).use(IdentityPlugin)
    .use(AnalyticsPlugin).use(PaymentsPlugin).use(AgentCommPlugin)
    .use(EndpointPlugin);

  const openai = new OpenAI({ apiKey: OPENAI_KEY, ...(OPENAI_BASE && { baseURL: OPENAI_BASE }) });
  const bot = new Bot(BOT_TOKEN);
  const tools = agent.toAITools();
  const chatHistories = new Map<number, OpenAI.ChatCompletionMessageParam[]>();

  // ── x402 server ──
  const app = express();
  const replayStore = new MemoryReplayStore();
  app.get("/", (_req, res) => {
    const eps: any[] = [];
    for (const [p, c] of endpointRoutes) eps.push({ path: p, price: c.price + " TON", description: c.description, served: c.served });
    res.json({ agent: "telegram-bot", wallet: friendlyAddr, network: NETWORK, activeEndpoints: eps });
  });
  app.use(async (req: any, res: any, next: any) => {
    const route = endpointRoutes.get(req.path);
    if (!route) return next();
    tonPaywall({ amount: route.price, recipient: address, network: NETWORK, description: route.description, replayStore })(req, res, async () => {
      try {
        const merged: Record<string, any> = { ...route.dataParams };
        for (const [k, v] of Object.entries(req.query)) { if (typeof v === "string" && v.length > 0) merged[k] = v; }
        const data = await agent.runAction(route.dataAction, merged);
        route.served++;
        res.json({ source: "telegram-bot", fetchedAt: new Date().toISOString(), ...data });
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });
  });
  app.use((_req: any, res: any) => { res.status(404).json({ error: "No endpoint here", available: Array.from(endpointRoutes.keys()) }); });
  const x402Server = app.listen(X402_PORT);

  // ── System prompt ──
  const SYSTEM_PROMPT = `You are TON Agent Kit Bot — an AI agent on TON blockchain inside Telegram.
You run an x402 HTTP server on port ${X402_PORT} for paid data endpoints.

Wallet: ${friendlyAddr} | Network: ${NETWORK} | Actions: ${agent.actionCount}

PLUGINS: Wallet/Tokens, DeFi, DNS, NFT, Staking, Escrow, Identity, Analytics, Payments, AgentComm, x402 Endpoints

🌐 x402 ENDPOINTS — YOU CAN SELL DATA:
- open_x402_endpoint: open a paid endpoint (pick path, price, SDK action)
- close_x402_endpoint: close when done
- list_x402_endpoints: see what's open

CRITICAL: When responding to an intent with send_offer:
1. FIRST open an x402 endpoint with open_x402_endpoint
2. THEN send_offer with the endpoint URL from step 1
3. NEVER use fake URLs like "example/api"

Example: open_x402_endpoint({ path: "/api/price", price: "0.005", dataAction: "get_price", dataParams: "{\\"tokenAddress\\":\\"EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs\\"}" })
Then: send_offer({ intentIndex: 3, price: "0.05", endpoint: "http://localhost:${X402_PORT}/api/price" })

WORKFLOWS:

🛒 BUYING: broadcast_intent → wait for offers → get_offers → accept_offer → create_escrow → deposit → confirm_delivery → release_escrow → rate

🏪 SELLING: discover_intents → open_x402_endpoint → send_offer (with real URL) → wait for acceptance → close_x402_endpoint after settlement

🔒 ESCROW: create_escrow, deposit_to_escrow, release_escrow, refund_escrow, confirm_delivery, open_dispute, join_dispute, vote_release, vote_refund

IMPORTANT RULES:
- Before registering, call discover_agent to check if you already exist
- Before opening an endpoint, call list_x402_endpoints to see what's open
- Extract seller address from get_offers results for create_escrow beneficiary
- Execute actions IMMEDIATELY — system handles approval buttons

FORMATTING — ALWAYS use Telegram HTML, NEVER markdown:
<b>bold</b> for labels, <code>mono</code> for addresses
Use ├ └ tree lines, emojis: 💎 wallet, 📈 price, 🤝 agents, 📡 intents, ⚖️ disputes, 🔒 escrow, 🌐 endpoints
Format TON to 4 decimals. Truncate addresses: first 8 + last 6 in <code>.

AGENT FORMAT:
🤖 <b>name</b>
├ 🏷️ <i>capabilities</i>
├ ⭐ Reputation: <b>85</b>/100
└ 📍 <code>0:abc...def456</code>

INTENT FORMAT:
📡 <b>Intent #17</b>
├ 🏷️ Service: <b>price_feed</b>
├ 💰 Budget: <b>0.5000 TON</b>
└ 👤 <code>0:abc...def456</code>`;

  // ── Helpers ──
  async function safeReply(ctx: any, text: string, extra?: any) {
    try {
      await ctx.reply(text, { parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra });
    } catch {
      await ctx.reply(text.replace(/<[^>]+>/g, ""), extra);
    }
  }

  async function requestApproval(chatId: number, action: string, params: any): Promise<boolean> {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const kb = new InlineKeyboard().text("✅ Approve", `approve_${id}`).text("❌ Reject", `reject_${id}`);
    let msg = `🔔 <b>Approval required</b>\n\n`;
    if (action === "transfer_ton") msg += `📤 <b>Transfer</b>\n├ 💰 <b>${formatTon(params.amount)} TON</b>\n└ 📍 <code>${escapeHtml(shortAddr(params.to || ""))}</code>`;
    else if (action === "create_escrow") msg += `🔒 <b>Create Escrow</b>\n├ 💰 <b>${formatTon(params.amount)} TON</b>\n└ 👤 <code>${escapeHtml(shortAddr(params.beneficiary || ""))}</code>`;
    else if (action.startsWith("swap_")) msg += `🔄 <b>Swap</b>\n├ ${escapeHtml(params.fromToken || "TON")} → ${escapeHtml(params.toToken || "?")}\n└ 💰 ${escapeHtml(params.amount || "?")}`;
    else if (action === "broadcast_intent") msg += `📡 <b>Broadcast Intent</b>\n├ 🏷️ ${escapeHtml(params.service || "?")}\n└ 💰 ${escapeHtml(params.budget || "?")} TON`;
    else if (action === "send_offer") msg += `📨 <b>Send Offer</b>\n├ 📡 Intent #${params.intentIndex || "?"}\n├ 💰 ${escapeHtml(params.price || "?")} TON\n└ ⏱️ ${params.deliveryTime || "?"} min`;
    else if (action === "settle_deal") msg += `✅ <b>Settle Deal</b>\n├ 📡 Intent #${params.intentIndex || "?"}\n└ ⭐ ${params.rating || "?"}/100`;
    else if (action === "vote_release" || action === "vote_refund") msg += `⚖️ <b>${action === "vote_release" ? "Vote Release 💚" : "Vote Refund 🔴"}</b>\n└ 🔒 <code>${escapeHtml(params.escrowId || "?")}</code>`;
    else if (action === "confirm_delivery") msg += `📦 <b>Confirm Delivery</b>\n└ 🔒 <code>${escapeHtml(params.escrowId || "?")}</code>`;
    else msg += `⚡ <b>${escapeHtml(action)}</b>\n<code>${escapeHtml(JSON.stringify(params).slice(0, 200))}</code>`;
    await bot.api.sendMessage(chatId, msg, { parse_mode: "HTML", reply_markup: kb });
    return new Promise((resolve) => {
      pendingApprovals.set(id, { chatId, action, params, resolve });
      setTimeout(() => { if (pendingApprovals.has(id)) { pendingApprovals.delete(id); resolve(false); } }, 120000);
    });
  }

  // ── LLM tool loop (shared by normal + auto mode) ──
  async function executeLLMLoop(
    chatId: number,
    history: OpenAI.ChatCompletionMessageParam[],
    maxIter: number,
    onStep?: (step: number, action: string) => Promise<void>,
  ): Promise<string> {
    await bot.api.sendChatAction(chatId, "typing");
    let response = await openai.chat.completions.create({ model: AI_MODEL, messages: history, tools, tool_choice: "auto" });
    let am = response.choices[0].message;
    let iter = 0;

    while (am.tool_calls && iter < maxIter) {
      iter++;
      history.push(am);
      for (const tc of am.tool_calls) {
        const fn = tc.function.name;
        const fp = JSON.parse(tc.function.arguments);
        if (onStep) try { await onStep(iter, fn); } catch {}

        const state = getState(chatId);
        const mode = state.confirmTrades ? "confirm" : "auto";
        let approved = true;
        if (needsApproval(fn, fp, mode)) approved = await requestApproval(chatId, fn, fp);

        let result: string;
        if (approved) {
          try {
            await bot.api.sendChatAction(chatId, "typing");
            const ar = await agent.runAction(fn, fp);
            result = JSON.stringify(ar);
            // Track intents
            if (fn === "broadcast_intent" && (ar as any)?.intentIndex !== undefined) {
              state.myActiveIntents.set((ar as any).intentIndex, { service: fp.service || "unknown", createdAt: Date.now() });
            }
            if ((fn === "accept_offer" || fn === "cancel_intent") && fp.intentIndex !== undefined) {
              state.myActiveIntents.delete(fp.intentIndex);
            }
            // Tx explorer link
            if (fn === "transfer_ton") {
              await new Promise((r) => setTimeout(r, 10000));
              try {
                const tx = (await agent.runAction("get_transaction_history", { limit: 1 })) as any;
                const h = tx?.events?.[0]?.id;
                result = JSON.stringify({ ...ar, explorerUrl: h ? `${viewerBase}/transaction/${h}` : `${viewerBase}/${friendlyAddr}`, confirmed: !!h });
              } catch { result = JSON.stringify({ ...ar, explorerUrl: `${viewerBase}/${friendlyAddr}` }); }
            }
          } catch (err: any) { result = JSON.stringify({ error: err.message }); }
        } else {
          result = JSON.stringify({ status: "rejected", reason: "User rejected" });
        }
        history.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
      await bot.api.sendChatAction(chatId, "typing");
      response = await openai.chat.completions.create({ model: AI_MODEL, messages: history, tools, tool_choice: "auto" });
      am = response.choices[0].message;
    }
    const reply = am.content || "Done!";
    history.push({ role: "assistant", content: reply });
    return reply;
  }

  // ── handleNormalMessage (extracted from old message:text) ──
  async function handleNormalMessage(ctx: any, text: string) {
    const chatId = ctx.chat.id;
    if (!chatHistories.has(chatId)) chatHistories.set(chatId, [{ role: "system", content: SYSTEM_PROMPT }]);
    const history = chatHistories.get(chatId)!;
    history.push({ role: "user", content: text });
    if (history.length > 40) history.splice(1, history.length - 39);
    try {
      const reply = await executeLLMLoop(chatId, history, 5);
      await safeReply(ctx, reply);
    } catch (err: any) {
      console.error("Error:", err.message);
      chatHistories.delete(chatId);
      await safeReply(ctx, `⚠️ <b>Error:</b> ${escapeHtml(err.message.slice(0, 200))}`);
    }
  }

  // ── Auto Mode handler ──
  async function handleAutoMode(ctx: any, state: UserState, goal: string) {
    state.autoRunning = true;
    state.autoGoal = goal;
    const chatId = ctx.chat!.id;
    const statusMsg = await ctx.reply(
      `<b>🤖 Mission started</b>\n\nGoal: <i>${escapeHtml(goal.slice(0, 200))}</i>\n\n<i>Working...</i>`,
      { parse_mode: "HTML" },
    );
    try {
      const missionHistory: OpenAI.ChatCompletionMessageParam[] = [
        { role: "system", content: SYSTEM_PROMPT + "\n\nMISSION MODE: Execute the following mission autonomously. Be decisive. Report results concisely." },
        { role: "user", content: goal },
      ];
      let stepCount = 0;
      const reply = await executeLLMLoop(chatId, missionHistory, state.maxAutoSteps, async (step, action) => {
        stepCount = step;
        try {
          await bot.api.editMessageText(chatId, statusMsg.message_id,
            `<b>🤖 Mission in progress</b>\n\nGoal: <i>${escapeHtml(goal.slice(0, 100))}</i>\n\nStep ${step}/${state.maxAutoSteps}: <code>${escapeHtml(action)}</code>...`,
            { parse_mode: "HTML" });
        } catch {}
      });
      state.autoRunning = false;
      state.autoMode = false;
      await bot.api.editMessageText(chatId, statusMsg.message_id,
        `<b>✅ Mission complete!</b>\n\n${escapeHtml(reply.slice(0, 500))}\n\nSteps: ${stepCount}\n<i>Auto mode off.</i>`,
        { parse_mode: "HTML", reply_markup: mainMenuKb() });
    } catch (err: any) {
      state.autoRunning = false;
      state.autoMode = false;
      await bot.api.editMessageText(chatId, statusMsg.message_id,
        `<b>❌ Mission failed</b>\n\n${escapeHtml((err.message || "Unknown error").slice(0, 300))}\n\n<i>Auto mode off.</i>`,
        { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  }

  // ── Listen Mode ──
  function startListening(uid: number) {
    const state = getState(uid);
    if (state.listenTimer) clearInterval(state.listenTimer);
    state.seenIntentIds = new Set();
    state.lastPollCount = 0;
    pollIntents(uid);
    state.listenTimer = setInterval(() => pollIntents(uid), state.pollInterval);
  }

  function stopListening(uid: number) {
    const state = getState(uid);
    if (state.listenTimer) { clearInterval(state.listenTimer); state.listenTimer = undefined; }
    state.listenMode = false;
  }

  async function pollIntents(uid: number) {
    const state = getState(uid);
    try {
      const filter: any = state.listenFilter ? { service: state.listenFilter } : {};
      const result = (await agent.runAction("discover_intents", filter)) as any;
      const intents = result?.intents || [];
      const newOnes = intents.filter((i: any) => !state.seenIntentIds.has(i.intentIndex));
      for (const i of intents) state.seenIntentIds.add(i.intentIndex);

      if (newOnes.length > 0) {
        const byService: Record<string, number> = {};
        for (const i of intents) { const svc = i.serviceName || i.service || "unknown"; byService[svc] = (byService[svc] || 0) + 1; }
        const topServices = Object.entries(byService).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${s} (${c})`).join(", ");
        await bot.api.sendMessage(uid,
          `<b>👂 Listen Mode</b> — update\n\n${intents.length} active intents\n<b>${newOnes.length} new</b> since last check\n\nTop: ${topServices}`,
          { parse_mode: "HTML", reply_markup: listenKb(newOnes.length) });
      }
      state.lastPollCount = intents.length;

      // Also poll offers on user's own intents
      await pollMyOffers(uid);
    } catch {}
  }

  async function pollMyOffers(uid: number) {
    const state = getState(uid);
    for (const [intentIdx, info] of state.myActiveIntents) {
      try {
        const offers = (await agent.runAction("get_offers", { intentIndex: intentIdx })) as any;
        const newOffers = (offers?.offers || []).filter(
          (o: any) => o.offerIndex !== undefined && !state.seenIntentIds.has(o.offerIndex + 100000)
        );
        if (newOffers.length > 0) {
          for (const o of newOffers) state.seenIntentIds.add(o.offerIndex + 100000);
          let msg = `<b>📨 New offers on #${intentIdx} (${escapeHtml(info.service)})</b>\n\n`;
          for (const o of newOffers) {
            msg += `Offer #${o.offerIndex}: <b>${o.price ? formatTon(o.price) : "?"} TON</b>, ${o.deliveryTime || "?"} min\n`;
            msg += `Seller: <code>${shortAddr(o.seller || "")}</code>\n\n`;
          }
          const kb = new InlineKeyboard();
          for (const o of newOffers.slice(0, 3)) kb.text(`Accept #${o.offerIndex}`, `accept_offer_${o.offerIndex}`).row();
          kb.text("View All", `view_intent_${intentIdx}`).text("« Back", "btn_main");
          await bot.api.sendMessage(uid, msg, { parse_mode: "HTML", reply_markup: kb });
        }
      } catch {}
    }
  }

  // ── Offer Tracking ──
  function startOfferTracking(uid: number) {
    const state = getState(uid);
    if (state.offerTrackTimer) return;
    state.offerTrackTimer = setInterval(async () => {
      if (state.pendingOffers.size === 0) { clearInterval(state.offerTrackTimer!); state.offerTrackTimer = undefined; return; }
      for (const [offerIdx, info] of state.pendingOffers) {
        try {
          const offers = (await agent.runAction("get_offers", { intentIndex: info.intentIndex })) as any;
          const offer = (offers?.offers || []).find((o: any) => o.offerIndex === offerIdx);
          if (!offer) continue;
          if (offer.status === 1) {
            state.pendingOffers.delete(offerIdx);
            await bot.api.sendMessage(uid, `<b>✅ Offer accepted!</b>\n\nYour offer #${offerIdx} on intent #${info.intentIndex} was accepted!`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
          } else if (offer.status === 2 || offer.status === 3) {
            state.pendingOffers.delete(offerIdx);
            await bot.api.sendMessage(uid, `<b>${offer.status === 2 ? "❌ Offer rejected" : "⏰ Offer expired"}</b>\n\nOffer #${offerIdx} on intent #${info.intentIndex}.`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
          }
        } catch {}
      }
    }, 15000);
  }

  // ══════════════════════════════════════
  // ══ HITL CALLBACKS (preserved) ═══════
  // ══════════════════════════════════════
  bot.callbackQuery(/^approve_(.+)$/, async (ctx) => {
    const p = pendingApprovals.get(ctx.match![1]);
    if (p) { p.resolve(true); pendingApprovals.delete(ctx.match![1]); await ctx.editMessageText("✅ <b>Approved</b> — executing...", { parse_mode: "HTML" }); }
    else { await ctx.editMessageText("⚠️ Expired."); }
    await ctx.answerCallbackQuery();
  });
  bot.callbackQuery(/^reject_(.+)$/, async (ctx) => {
    const p = pendingApprovals.get(ctx.match![1]);
    if (p) { p.resolve(false); pendingApprovals.delete(ctx.match![1]); await ctx.editMessageText("❌ <b>Rejected</b>", { parse_mode: "HTML" }); }
    else { await ctx.editMessageText("⚠️ Expired."); }
    await ctx.answerCallbackQuery();
  });

  // ══════════════════════════════════════
  // ══ /start COMMAND ═══════════════════
  // ══════════════════════════════════════
  bot.command("start", async (ctx) => {
    const uid = ctx.from!.id;
    const state = getState(uid);
    let bal = "?";
    try { bal = formatTon(((await agent.runAction("get_balance", {})) as any).balance || "0"); } catch {}
    const sent = await ctx.reply(
      `<b>🤖 TON Agent Kit</b>\n\n` +
      `<code>${friendlyAddr}</code> <i>(tap to copy)</i>\n` +
      `Balance: <b>${bal} TON</b> · ${NETWORK}\n\n` +
      `⚡ ${agent.getAvailableActions().length} actions · x402: port ${X402_PORT}\n\n` +
      `Tap any button below.`,
      { parse_mode: "HTML", reply_markup: mainMenuKb() },
    );
    state.mainMessageId = sent.message_id;
    state.currentMenu = "main";
  });

  // ══════════════════════════════════════
  // ══ MAIN MENU CALLBACKS ══════════════
  // ══════════════════════════════════════

  bot.callbackQuery("btn_main", async (ctx) => {
    await ctx.answerCallbackQuery();
    let bal = "?";
    try { bal = formatTon(((await agent.runAction("get_balance", {})) as any).balance || "0"); } catch {}
    await ctx.editMessageText(
      `<b>🤖 TON Agent Kit</b>\n\n<code>${friendlyAddr}</code>\nBalance: <b>${bal} TON</b> · ${NETWORK}\n\nTap any button below.`,
      { parse_mode: "HTML", reply_markup: mainMenuKb() },
    );
  });

  bot.callbackQuery("btn_balance", async (ctx) => {
    await ctx.answerCallbackQuery();
    let bal = "?";
    try { bal = formatTon(((await agent.runAction("get_balance", {})) as any).balance || "0"); } catch {}
    let priceInfo = "";
    try {
      const price = (await agent.runAction("get_price", { token: "TON" })) as any;
      if (price?.priceUSD) {
        const usd = (parseFloat(bal) * parseFloat(price.priceUSD)).toFixed(2);
        priceInfo = `\n💵 ~$${usd} (${price.priceUSD} USD/TON)`;
      }
    } catch {}
    await ctx.editMessageText(
      `<b>💎 Balance</b>\n\n<b>${bal} TON</b>${priceInfo}\n\n<a href="${viewerBase}/${friendlyAddr}">🔗 Tonviewer ↗</a>`,
      { parse_mode: "HTML", reply_markup: mainMenuKb(), link_preview_options: { is_disabled: true } } as any,
    );
  });

  bot.callbackQuery("btn_refresh", async (ctx) => {
    await ctx.answerCallbackQuery("Refreshing...");
    let bal = "?";
    try { bal = formatTon(((await agent.runAction("get_balance", {})) as any).balance || "0"); } catch {}
    await ctx.editMessageText(
      `<b>🤖 TON Agent Kit</b>\n\n<code>${friendlyAddr}</code>\nBalance: <b>${bal} TON</b> · ${NETWORK}\n\nTap any button below.`,
      { parse_mode: "HTML", reply_markup: mainMenuKb() },
    );
  });

  bot.callbackQuery("btn_transfer", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.awaitingInput = "transfer";
    state.currentMenu = "main";
    await ctx.editMessageText(
      `<b>📤 Transfer</b>\n\nType your transfer request:\n\n<i>"Send 0.1 TON to EQ..."</i>\n<i>"Transfer 5 USDT to 0:abc..."</i>`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("« Back", "btn_main") },
    );
  });

  bot.callbackQuery("btn_swap", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.awaitingInput = "swap";
    state.currentMenu = "main";
    await ctx.editMessageText(
      `<b>🔄 Swap</b>\n\nType your swap request:\n\n<i>"Swap 1 TON to USDT"</i>\n<i>"Buy 10 USDT with TON"</i>`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("« Back", "btn_main") },
    );
  });

  bot.callbackQuery("btn_portfolio", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const r = (await agent.runAction("get_portfolio_metrics", { days: 7 })) as any;
      await ctx.editMessageText(
        `<b>📊 Portfolio (7d)</b>\n\n📈 PnL: <b>${r.netPnL || "0"} TON</b>\n📊 ROI: <b>${r.roi || "0"}%</b>\n🏆 Win: <b>${r.winRate || "0"}%</b>\n📉 Drawdown: <b>${r.maxDrawdown || "0"} TON</b>\n🔄 TXs: <b>${r.totalTransactions || 0}</b>\n💎 Balance: <b>${r.currentBalance || "?"} TON</b>`,
        { parse_mode: "HTML", reply_markup: mainMenuKb() },
      );
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_help", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `<b>❓ TON Agent Kit</b> · ${agent.getAvailableActions().length} actions\n\n` +
      `━━━ <b>💰 Wallet</b> ━━━━━━━━━━\nBalance, transfers, jettons\n\n` +
      `━━━ <b>📈 DeFi</b> ━━━━━━━━━━━━\nSwaps, prices, yield\n\n` +
      `━━━ <b>🔒 Escrow</b> ━━━━━━━━━━\nDeals, deposits, disputes\n\n` +
      `━━━ <b>🤝 Agents</b> ━━━━━━━━━━\nRegister, discover, reputation\n\n` +
      `━━━ <b>🌐 x402</b> ━━━━━━━━━━━━\nPaid data endpoints\n\n` +
      `<i>Use buttons or type naturally.</i>`,
      { parse_mode: "HTML", reply_markup: mainMenuKb() },
    );
  });

  bot.callbackQuery("btn_wallet_info", async (ctx) => {
    await ctx.answerCallbackQuery();
    let bal = "?";
    try { bal = formatTon(((await agent.runAction("get_balance", {})) as any).balance || "0"); } catch {}
    await ctx.editMessageText(
      `💎 <b>Wallet</b>\n\n📍 <code>${friendlyAddr}</code>\n💰 Balance: <b>${bal} TON</b>\n🌐 ${NETWORK === "testnet" ? "🧪 Testnet" : "🌐 Mainnet"}\n\n<a href="${viewerBase}/${friendlyAddr}">🔗 Tonviewer ↗</a>`,
      { parse_mode: "HTML", reply_markup: settingsKb(getState(ctx.from!.id)), link_preview_options: { is_disabled: true } } as any,
    );
  });

  bot.callbackQuery("btn_agents", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const result = (await agent.runAction("discover_agent", { limit: 10 })) as any;
      const agents = result?.agents || [];
      if (!agents.length) {
        await ctx.editMessageText(`<b>🤝 Agents</b>\n\n<i>No agents found.</i>\n\nType "register agent my-bot" to create one.`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
        return;
      }
      let msg = `<b>🤝 Agents</b> (${agents.length}${result.total > agents.length ? `/${result.total}` : ""})\n\n`;
      for (const a of agents.slice(0, 8)) {
        msg += `🤖 <b>${escapeHtml(a.name || "?")}</b>\n├ 🏷️ <i>${escapeHtml((a.capabilities || []).join(", ") || "none")}</i>\n├ ⭐ <b>${a.reputation?.score ?? 0}</b>/100\n└ 📍 <code>${escapeHtml(shortAddr(a.address || a.wallet || ""))}</code>\n\n`;
      }
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_escrow", async (ctx) => {
    await ctx.answerCallbackQuery();
    let msg = `<b>🔒 Escrow</b>\n\n`;
    let has = false;
    if (endpointRoutes.size) {
      msg += `━━━ <b>🌐 Endpoints</b> ━━━\n`;
      for (const [p, c] of endpointRoutes) msg += `• ${escapeHtml(p)} → ${escapeHtml(c.dataAction)} (${c.served}x)\n`;
      msg += `\n`;
      has = true;
    }
    try {
      const d = (await agent.runAction("get_open_disputes", { limit: 5 })) as any;
      if (d?.disputes?.length) {
        msg += `━━━ <b>⚖️ Disputes</b> ━━━\n`;
        for (const x of d.disputes.slice(0, 5)) msg += `⚖️ <code>${shortAddr(x.escrowAddress || "")}</code> · <b>${x.amount ? formatTon(x.amount) : "?"} TON</b>\n`;
        has = true;
      }
    } catch {}
    if (!has) msg += `<i>No active escrows or disputes.</i>`;
    await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: mainMenuKb() });
  });

  bot.callbackQuery("btn_offers", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    if (state.pendingOffers.size === 0) {
      await ctx.editMessageText(`<b>📨 My Offers</b>\n\n<i>No pending offers.</i>\n\nBrowse intents and send offers to track them here.`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
      return;
    }
    let msg = `<b>📨 My Offers</b> (${state.pendingOffers.size} pending)\n\n`;
    for (const [offerIdx, info] of state.pendingOffers) {
      const age = Math.round((Date.now() - info.sentAt) / 60000);
      msg += `• Offer #${offerIdx} → Intent #${info.intentIndex} (${age}m ago)\n`;
    }
    await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: mainMenuKb() });
  });

  // ══════════════════════════════════════
  // ══ INTENTS CALLBACKS ════════════════
  // ══════════════════════════════════════

  bot.callbackQuery("btn_intents", async (ctx) => {
    await ctx.answerCallbackQuery();
    const uid = ctx.from!.id;
    const state = getState(uid);
    state.currentMenu = "intents";
    try {
      const myAddr = address;
      const allIntents = (await agent.runAction("discover_intents", {})) as any;
      const intents = allIntents?.intents || [];
      const myIntents = intents.filter((i: any) => i.buyer === myAddr);
      let msg = `<b>📡 Service Marketplace</b>\n\nYour active intents: <b>${myIntents.length}</b>\n\n`;
      for (const i of myIntents.slice(0, 5)) {
        const svc = i.serviceName || i.service || "?";
        let offerCount = 0;
        try { const or = (await agent.runAction("get_offers", { intentIndex: i.intentIndex })) as any; offerCount = or?.offers?.length || 0; } catch {}
        msg += `#${i.intentIndex} <b>${escapeHtml(svc)}</b> — ${i.budget ? formatTon(i.budget) : "?"} TON — ${offerCount} offers\n`;
      }
      if (myIntents.length === 0) msg += `<i>No active intents. Tap "New Intent" to start.</i>\n`;
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: intentsMenuKb(myIntents) });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_intents_refresh", async (ctx) => {
    // Same as btn_intents
    await ctx.answerCallbackQuery("Refreshing...");
    const uid = ctx.from!.id;
    const state = getState(uid);
    try {
      const allIntents = (await agent.runAction("discover_intents", {})) as any;
      const intents = allIntents?.intents || [];
      const myIntents = intents.filter((i: any) => i.buyer === address);
      let msg = `<b>📡 Service Marketplace</b>\n\nYour active intents: <b>${myIntents.length}</b>\n\n`;
      for (const i of myIntents.slice(0, 5)) {
        const svc = i.serviceName || i.service || "?";
        msg += `#${i.intentIndex} <b>${escapeHtml(svc)}</b> — ${i.budget ? formatTon(i.budget) : "?"} TON\n`;
      }
      if (myIntents.length === 0) msg += `<i>No active intents.</i>\n`;
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: intentsMenuKb(myIntents) });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_browse", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const intents = (await agent.runAction("discover_intents", {})) as any;
      const list = intents?.intents || [];
      let msg = `<b>🔍 Open Intents</b> (${intents?.total || list.length} active)\n\n`;
      for (const i of list.slice(0, 5)) {
        const svc = i.serviceName || i.service || i.serviceHash?.slice(0, 12) || "?";
        msg += `<b>#${i.intentIndex} ${escapeHtml(svc)}</b>\n├ 💰 ${i.budget ? formatTon(i.budget) : "?"} TON\n└ 👤 <code>${escapeHtml(shortAddr(i.buyer || ""))}</code>\n\n`;
      }
      if (list.length === 0) msg += `<i>No open intents right now.</i>`;
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: browseIntentsKb(list, 0) });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery(/^browse_page_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const page = parseInt(ctx.match![1]);
    try {
      const intents = (await agent.runAction("discover_intents", {})) as any;
      const list = intents?.intents || [];
      const offset = page * 5;
      const pageItems = list.slice(offset, offset + 5);
      let msg = `<b>🔍 Open Intents</b> (page ${page + 1})\n\n`;
      for (const i of pageItems) {
        const svc = i.serviceName || i.service || "?";
        msg += `<b>#${i.intentIndex} ${escapeHtml(svc)}</b>\n├ 💰 ${i.budget ? formatTon(i.budget) : "?"} TON\n└ 👤 <code>${escapeHtml(shortAddr(i.buyer || ""))}</code>\n\n`;
      }
      if (pageItems.length === 0) msg += `<i>No more intents.</i>`;
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: browseIntentsKb(pageItems, page) });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_new_intent", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.awaitingInput = "new_intent";
    await ctx.editMessageText(
      `<b>📡 New Intent</b>\n\nDescribe what service you need:\n\n<i>"I need a price feed for TON/USDT"</i>\n<i>"Looking for analytics data, budget 0.5 TON"</i>`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("« Back", "btn_intents") },
    );
  });

  bot.callbackQuery("btn_my_offers", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    if (state.pendingOffers.size === 0) {
      await ctx.editMessageText(`<b>📨 My Sent Offers</b>\n\n<i>No pending offers.</i>`, { parse_mode: "HTML", reply_markup: intentsMenuKb([]) });
      return;
    }
    let msg = `<b>📨 My Sent Offers</b>\n\n`;
    for (const [offerIdx, info] of state.pendingOffers) {
      const age = Math.round((Date.now() - info.sentAt) / 60000);
      msg += `• Offer #${offerIdx} → Intent #${info.intentIndex} (${age}m ago)\n`;
    }
    await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: intentsMenuKb([]) });
  });

  bot.callbackQuery(/^view_intent_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const intentIdx = parseInt(ctx.match![1]);
    try {
      const intents = (await agent.runAction("discover_intents", {})) as any;
      const intent = (intents?.intents || []).find((i: any) => i.intentIndex === intentIdx);
      const offers = (await agent.runAction("get_offers", { intentIndex: intentIdx })) as any;
      const offerList = offers?.offers || [];
      let msg = `<b>📡 Intent #${intentIdx}</b>\n\n`;
      if (intent) {
        const svc = intent.serviceName || intent.service || "?";
        msg += `🏷️ Service: <b>${escapeHtml(svc)}</b>\n💰 Budget: <b>${intent.budget ? formatTon(intent.budget) : "?"} TON</b>\n👤 Buyer: <code>${escapeHtml(shortAddr(intent.buyer || ""))}</code>\n\n`;
      }
      msg += `<b>Offers (${offerList.length}):</b>\n\n`;
      for (const o of offerList.slice(0, 5)) {
        msg += `#${o.offerIndex}: <b>${o.price ? formatTon(o.price) : "?"} TON</b>, ${o.deliveryTime || "?"} min\n└ <code>${shortAddr(o.seller || "")}</code>\n\n`;
      }
      const kb = new InlineKeyboard();
      for (const o of offerList.slice(0, 3)) kb.text(`Accept #${o.offerIndex}`, `accept_offer_${o.offerIndex}`).row();
      kb.text("« Back", "btn_intents");
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: kb });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  // ══════════════════════════════════════
  // ══ OFFER FORM CALLBACKS ═════════════
  // ══════════════════════════════════════

  bot.callbackQuery(/^offer_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const uid = ctx.from!.id;
    const state = getState(uid);
    const intentIdx = parseInt(ctx.match![1]);
    state.currentMenu = "offer_form";
    state.offerDraft = { intentIndex: intentIdx, price: "0.1", deliveryTime: 5 };
    await ctx.editMessageText(
      `<b>📨 Offer on Intent #${intentIdx}</b>\n\nPrice: <b>${state.offerDraft.price} TON</b>\nDelivery: <b>${state.offerDraft.deliveryTime} min</b>\n\nTap to change, or type a custom amount.`,
      { parse_mode: "HTML", reply_markup: offerFormKb(state.offerDraft) },
    );
  });

  bot.callbackQuery(/^price_(.+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    if (!state.offerDraft) return;
    state.offerDraft.price = ctx.match![1];
    await ctx.editMessageText(
      `<b>📨 Offer on Intent #${state.offerDraft.intentIndex}</b>\n\nPrice: <b>${state.offerDraft.price} TON</b>\nDelivery: <b>${state.offerDraft.deliveryTime} min</b>\n\nTap to change, or type a custom amount.`,
      { parse_mode: "HTML", reply_markup: offerFormKb(state.offerDraft) },
    );
  });

  bot.callbackQuery(/^time_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    if (!state.offerDraft) return;
    state.offerDraft.deliveryTime = parseInt(ctx.match![1]);
    await ctx.editMessageText(
      `<b>📨 Offer on Intent #${state.offerDraft.intentIndex}</b>\n\nPrice: <b>${state.offerDraft.price} TON</b>\nDelivery: <b>${state.offerDraft.deliveryTime} min</b>\n\nTap to change, or type a custom amount.`,
      { parse_mode: "HTML", reply_markup: offerFormKb(state.offerDraft) },
    );
  });

  bot.callbackQuery("btn_send_offer", async (ctx) => {
    await ctx.answerCallbackQuery("Sending offer...");
    const uid = ctx.from!.id;
    const state = getState(uid);
    const draft = state.offerDraft;
    if (!draft) return;
    try {
      const result = (await agent.runAction("send_offer", {
        intentIndex: draft.intentIndex,
        price: draft.price,
        deliveryTime: draft.deliveryTime,
        endpoint: "pending",
      })) as any;
      if (result?.offerIndex !== undefined) {
        state.pendingOffers.set(result.offerIndex, { intentIndex: draft.intentIndex, sentAt: Date.now() });
        startOfferTracking(uid);
      }
      state.offerDraft = undefined;
      state.currentMenu = "main";
      await ctx.editMessageText(
        `<b>✅ Offer sent!</b>\n\nIntent #${draft.intentIndex}\nPrice: ${draft.price} TON\nDelivery: ${draft.deliveryTime} min\n\n<i>Tracking... You'll be notified when accepted.</i>`,
        { parse_mode: "HTML", reply_markup: mainMenuKb() },
      );
    } catch (err: any) {
      await ctx.editMessageText(`<b>❌ Offer failed</b>\n\n${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  // ══════════════════════════════════════
  // ══ ACCEPT / CANCEL CALLBACKS ════════
  // ══════════════════════════════════════

  bot.callbackQuery(/^accept_offer_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("Accepting offer...");
    const offerIdx = parseInt(ctx.match![1]);
    try {
      await agent.runAction("accept_offer", { offerIndex: offerIdx });
      await ctx.editMessageText(
        `<b>✅ Offer #${offerIdx} accepted!</b>\n\nCreating escrow and depositing funds...\n<i>You'll be guided through the next steps.</i>`,
        { parse_mode: "HTML", reply_markup: mainMenuKb() },
      );
    } catch (err: any) {
      await ctx.editMessageText(`<b>❌ Accept failed</b>\n\n${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery(/^cancel_intent_(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery("Cancelling...");
    const intentIdx = parseInt(ctx.match![1]);
    const state = getState(ctx.from!.id);
    try {
      await agent.runAction("cancel_intent", { intentIndex: intentIdx });
      state.myActiveIntents.delete(intentIdx);
      await ctx.editMessageText(`<b>✅ Intent #${intentIdx} cancelled.</b>`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    } catch (err: any) {
      await ctx.editMessageText(`<b>❌ Cancel failed</b>\n\n${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  // ══════════════════════════════════════
  // ══ SETTINGS CALLBACKS ═══════════════
  // ══════════════════════════════════════

  bot.callbackQuery("btn_settings", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.currentMenu = "settings";
    await ctx.editMessageText(`<b>⚙️ Settings</b>\n\nConfigure your agent behavior.`, { parse_mode: "HTML", reply_markup: settingsKb(state) });
  });

  bot.callbackQuery("toggle_confirm", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.confirmTrades = !state.confirmTrades;
    await ctx.editMessageText(
      `<b>⚙️ Settings</b>\n\nConfirm Trades: <b>${state.confirmTrades ? "ON" : "OFF"}</b>\n<i>${state.confirmTrades ? "Transfers need approval" : "No approval buttons"}</i>`,
      { parse_mode: "HTML", reply_markup: settingsKb(state) },
    );
  });

  bot.callbackQuery("toggle_auto", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.autoMode = !state.autoMode;
    if (!state.autoMode) state.autoRunning = false;
    await ctx.editMessageText(
      `<b>⚙️ Settings</b>\n\nAuto Mode: <b>${state.autoMode ? "ON" : "OFF"}</b>`,
      { parse_mode: "HTML", reply_markup: settingsKb(state) },
    );
  });

  bot.callbackQuery("toggle_listen", async (ctx) => {
    await ctx.answerCallbackQuery();
    const uid = ctx.from!.id;
    const state = getState(uid);
    state.listenMode = !state.listenMode;
    if (state.listenMode) startListening(uid); else stopListening(uid);
    await ctx.editMessageText(
      `<b>⚙️ Settings</b>\n\nListen Mode: <b>${state.listenMode ? "ON" : "OFF"}</b>`,
      { parse_mode: "HTML", reply_markup: settingsKb(state) },
    );
  });

  bot.callbackQuery("cycle_hitl", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    const vals = [0.05, 0.1, 0.5, 1.0];
    const idx = vals.indexOf(state.hitlThreshold);
    state.hitlThreshold = vals[(idx + 1) % vals.length];
    await ctx.editMessageText(`<b>⚙️ Settings</b>\n\nHITL threshold: <b>${state.hitlThreshold} TON</b>`, { parse_mode: "HTML", reply_markup: settingsKb(state) });
  });

  bot.callbackQuery("cycle_steps", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    const vals = [5, 10, 15, 20];
    const idx = vals.indexOf(state.maxAutoSteps);
    state.maxAutoSteps = vals[(idx + 1) % vals.length];
    await ctx.editMessageText(`<b>⚙️ Settings</b>\n\nMax auto steps: <b>${state.maxAutoSteps}</b>`, { parse_mode: "HTML", reply_markup: settingsKb(state) });
  });

  bot.callbackQuery("cycle_poll", async (ctx) => {
    await ctx.answerCallbackQuery();
    const uid = ctx.from!.id;
    const state = getState(uid);
    const vals = [15000, 30000, 60000];
    const idx = vals.indexOf(state.pollInterval);
    state.pollInterval = vals[(idx + 1) % vals.length];
    if (state.listenMode) { stopListening(uid); startListening(uid); }
    await ctx.editMessageText(`<b>⚙️ Settings</b>\n\nPoll interval: <b>${state.pollInterval / 1000}s</b>`, { parse_mode: "HTML", reply_markup: settingsKb(state) });
  });

  // ══════════════════════════════════════
  // ══ LISTEN MODE CALLBACKS ════════════
  // ══════════════════════════════════════

  bot.callbackQuery("btn_listen", async (ctx) => {
    await ctx.answerCallbackQuery();
    const uid = ctx.from!.id;
    const state = getState(uid);
    if (!state.listenMode) { state.listenMode = true; startListening(uid); }
    state.currentMenu = "listening";
    await ctx.editMessageText(
      `<b>👂 Listen Mode ACTIVE</b>\n\nPolling every ${state.pollInterval / 1000}s\nFilter: ${state.listenFilter || "all services"}\n\n${state.lastPollCount} intents tracked`,
      { parse_mode: "HTML", reply_markup: listenKb(0) },
    );
  });

  bot.callbackQuery("btn_stop_listen", async (ctx) => {
    await ctx.answerCallbackQuery("Stopped");
    stopListening(ctx.from!.id);
    await ctx.editMessageText(`<b>👂 Listen Mode OFF</b>`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
  });

  bot.callbackQuery("btn_show_new", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const result = (await agent.runAction("discover_intents", {})) as any;
      const list = (result?.intents || []).slice(0, 5);
      let msg = `<b>📬 Recent Intents</b>\n\n`;
      for (const i of list) {
        const svc = i.serviceName || i.service || "?";
        msg += `<b>#${i.intentIndex} ${escapeHtml(svc)}</b>\n├ 💰 ${i.budget ? formatTon(i.budget) : "?"} TON\n└ 👤 <code>${escapeHtml(shortAddr(i.buyer || ""))}</code>\n\n`;
      }
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: browseIntentsKb(list, 0) });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_listen_random", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      const result = (await agent.runAction("discover_intents", {})) as any;
      const all = result?.intents || [];
      // Shuffle and take 5
      const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 5);
      let msg = `<b>🎲 Random Intents</b>\n\n`;
      for (const i of shuffled) {
        const svc = i.serviceName || i.service || "?";
        msg += `<b>#${i.intentIndex} ${escapeHtml(svc)}</b>\n├ 💰 ${i.budget ? formatTon(i.budget) : "?"} TON\n└ 👤 <code>${escapeHtml(shortAddr(i.buyer || ""))}</code>\n\n`;
      }
      await ctx.editMessageText(msg, { parse_mode: "HTML", reply_markup: browseIntentsKb(shuffled, 0) });
    } catch (err: any) {
      await ctx.editMessageText(`⚠️ ${escapeHtml(err.message.slice(0, 200))}`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
    }
  });

  bot.callbackQuery("btn_listen_filter", async (ctx) => {
    await ctx.answerCallbackQuery();
    const state = getState(ctx.from!.id);
    state.awaitingInput = "listen_filter";
    await ctx.editMessageText(
      `<b>🔍 Listen Filter</b>\n\nCurrent: <b>${state.listenFilter || "all"}</b>\n\nType a service name to filter:\n<i>"price_feed"</i>, <i>"analytics"</i>, or <i>"all"</i> to clear`,
      { parse_mode: "HTML", reply_markup: new InlineKeyboard().text("Clear Filter", "btn_clear_filter").text("« Back", "btn_listen") },
    );
  });

  bot.callbackQuery("btn_clear_filter", async (ctx) => {
    await ctx.answerCallbackQuery("Filter cleared");
    const uid = ctx.from!.id;
    const state = getState(uid);
    state.listenFilter = undefined;
    state.awaitingInput = undefined;
    if (state.listenMode) { stopListening(uid); startListening(uid); }
    await ctx.editMessageText(
      `<b>👂 Listen Mode</b>\n\nFilter: <b>all services</b>\n${state.lastPollCount} intents tracked`,
      { parse_mode: "HTML", reply_markup: listenKb(0) },
    );
  });

  bot.callbackQuery("btn_poll_now", async (ctx) => {
    await ctx.answerCallbackQuery("Polling...");
    await pollIntents(ctx.from!.id);
  });

  // ══════════════════════════════════════
  // ══ AUTO MODE CALLBACKS ══════════════
  // ══════════════════════════════════════

  bot.callbackQuery("btn_auto", async (ctx) => {
    await ctx.answerCallbackQuery();
    const uid = ctx.from!.id;
    const state = getState(uid);
    if (!state.autoMode) state.autoMode = true;
    state.currentMenu = "auto";
    await ctx.editMessageText(
      `<b>🤖 Auto Mode ACTIVE</b>\n\nSend me a mission. I'll handle everything.\n\n<i>"Find a cheap price feed and buy it"</i>\n<i>"Register as analytics provider"</i>\n<i>"Check all intents and offer on the best ones"</i>`,
      { parse_mode: "HTML", reply_markup: autoModeKb(state) },
    );
  });

  bot.callbackQuery("btn_stop_auto", async (ctx) => {
    await ctx.answerCallbackQuery("Stopped");
    const state = getState(ctx.from!.id);
    state.autoMode = false;
    state.autoRunning = false;
    await ctx.editMessageText(`<b>🤖 Auto Mode OFF</b>`, { parse_mode: "HTML", reply_markup: mainMenuKb() });
  });

  // ══════════════════════════════════════
  // ══ MESSAGE HANDLER ══════════════════
  // ══════════════════════════════════════

  bot.on("message:text", async (ctx) => {
    const uid = ctx.from!.id;
    const state = getState(uid);
    const text = ctx.message.text;

    // TX mode text commands (kept for backward compatibility)
    const l = text.toLowerCase().trim();
    if (/\b(tx\s*auto|auto\s*approve)\b/.test(l)) {
      state.confirmTrades = false;
      await safeReply(ctx, `🔓 <b>Auto mode</b> — no approval buttons.`);
      return;
    }
    if (/\b(tx\s*confirm|approval\s*on)\b/.test(l)) {
      state.confirmTrades = true;
      await safeReply(ctx, `🔒 <b>Confirm mode</b> — approval above ${AUTO_APPROVE_LIMIT} TON.`);
      return;
    }

    // Listen filter input
    if (state.awaitingInput === "listen_filter") {
      state.awaitingInput = undefined;
      if (l === "all" || l === "clear" || l === "*") {
        state.listenFilter = undefined;
      } else {
        state.listenFilter = text.trim();
      }
      if (state.listenMode) { stopListening(uid); startListening(uid); }
      await safeReply(ctx, `Filter set to: <b>${state.listenFilter || "all"}</b>`, { reply_markup: listenKb(0) });
      return;
    }

    // Awaiting input for transfer/swap/new_intent → route to LLM with context
    if (state.awaitingInput) {
      const prefix = state.awaitingInput === "new_intent" ? "I want to broadcast an intent for: "
        : state.awaitingInput === "transfer" ? "I want to transfer: "
        : "I want to swap: ";
      state.awaitingInput = undefined;
      return handleNormalMessage(ctx, prefix + text);
    }

    // Offer form: parse custom price
    if (state.currentMenu === "offer_form" && state.offerDraft) {
      const match = text.match(/(\d+\.?\d*)/);
      if (match) {
        state.offerDraft.price = match[1];
        await safeReply(ctx, `Price updated to <b>${match[1]} TON</b>.\nTap "Send Offer" when ready.`, { reply_markup: offerFormKb(state.offerDraft) });
        return;
      }
    }

    // Auto Mode: start mission
    if (state.autoMode && !state.autoRunning) {
      return handleAutoMode(ctx, state, text);
    }

    // Normal LLM handler
    return handleNormalMessage(ctx, text);
  });

  // ── Bot setup ──
  bot.catch((err: any) => console.error("Bot error:", err.message?.slice(0, 100)));

  await bot.api.setMyCommands([
    { command: "start", description: "Open main menu" },
  ]);

  const { run } = await import("@grammyjs/runner");
  const runner = run(bot);

  console.log(`\n${"━".repeat(40)}`);
  console.log(`  🤖 TON Agent Kit Bot (Inline UI)`);
  console.log(`  📍 ${shortAddr(friendlyAddr)}`);
  console.log(`  🌐 ${NETWORK} | 🧠 ${AI_MODEL}`);
  console.log(`  ⚡ ${agent.getAvailableActions().length} actions`);
  console.log(`  🌐 x402: http://localhost:${X402_PORT}`);
  console.log(`  🎛️  Inline buttons + Listen/Auto modes`);
  console.log(`${"━".repeat(40)}\n`);

  process.on("SIGINT", () => {
    for (const [, s] of userStates) {
      if (s.listenTimer) clearInterval(s.listenTimer);
      if (s.offerTrackTimer) clearInterval(s.offerTrackTimer);
    }
    x402Server.close();
    runner.stop();
  });
  process.on("SIGTERM", () => {
    for (const [, s] of userStates) {
      if (s.listenTimer) clearInterval(s.listenTimer);
      if (s.offerTrackTimer) clearInterval(s.offerTrackTimer);
    }
    x402Server.close();
    runner.stop();
  });
}

main().catch(console.error);

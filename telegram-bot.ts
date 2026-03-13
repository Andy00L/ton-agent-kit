import { Address, beginCell, fromNano, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { Bot, InlineKeyboard } from "grammy";
import OpenAI from "openai";
import { KeypairWallet } from "./packages/core/src/wallet";
// ============================================================
// Config
// ============================================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const OPENAI_KEY = process.env.OPENAI_API_KEY!;
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

  // Init wallet
  const client = new TonClient4({ endpoint: RPC_URL });
  const wallet = await KeypairWallet.autoDetect(
    MNEMONIC.split(" "),
    client,
    NETWORK,
  );
  console.log(`📍 Wallet: ${wallet.address.toRawString()}`);

  const agentContext = {
    connection: client,
    wallet,
    network: NETWORK,
    rpcUrl: RPC_URL,
    config: {},
  };

  // Init OpenAI
  const openai = new OpenAI({
    apiKey:
      readFileSync(".env", "utf-8")
        .split("\n")
        .find((l) => l.startsWith("OPENAI_API_KEY="))
        ?.replace("OPENAI_API_KEY=", "")
        .trim() || "",
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

  // ── Action handlers ──
  async function executeAction(name: string, params: any): Promise<string> {
    const apiBase =
      NETWORK === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    switch (name) {
      case "get_balance": {
        if (!params.address) {
          const lb = await client.getLastBlock();
          const state = await client.getAccount(lb.last.seqno, wallet.address);
          return JSON.stringify({
            balance: fromNano(state.account.balance.coins) + " TON",
            address: wallet.address.toRawString(),
          });
        }
        try {
          const addr = Address.parse(params.address);
          const lb = await client.getLastBlock();
          const state = await client.getAccount(lb.last.seqno, addr);
          return JSON.stringify({
            balance: fromNano(state.account.balance.coins) + " TON",
            address: addr.toRawString(),
          });
        } catch {}
        const apiBase =
          NETWORK === "testnet"
            ? "https://testnet.tonapi.io/v2"
            : "https://tonapi.io/v2";
        const r = await fetch(
          `${apiBase}/accounts/${encodeURIComponent(params.address)}`,
        );
        if (r.ok) {
          const d = await r.json();
          return JSON.stringify({
            balance: (Number(d.balance) / 1e9).toString() + " TON",
            address: d.address,
          });
        }
        return JSON.stringify({ error: "Could not fetch balance" });
      }

      case "transfer_ton": {
        const toAddr = Address.parse(params.to);
        let body = undefined;
        if (params.comment) {
          body = beginCell()
            .storeUint(0, 32)
            .storeStringTail(params.comment)
            .endCell();
        }
        const { secretKey, publicKey } = wallet.getCredentials();
        const networkId = NETWORK === "testnet" ? -3 : -239;
        const freshClient = new TonClient4({ endpoint: RPC_URL });
        const walletContract = freshClient.open(
          WalletContractV5R1.create({
            workchain: 0,
            publicKey,
            walletId: {
              networkGlobalId: networkId,
              workchain: 0,
              subwalletNumber: 0,
            },
          }),
        );
        const seqno = await walletContract.getSeqno();
        await walletContract.sendTransfer({
          seqno,
          secretKey,
          messages: [
            internal({
              to: toAddr,
              value: toNano(params.amount),
              bounce: false,
              body,
            }),
          ],
        });
        return JSON.stringify({
          status: "sent",
          to: params.to,
          amount: params.amount + " TON",
        });
      }

      case "get_wallet_info": {
        const addr = params.address || wallet.address.toRawString();
        const r = await fetch(
          `${apiBase}/accounts/${encodeURIComponent(addr)}`,
        );
        const d = await r.json();
        return JSON.stringify({
          balance: (Number(d.balance) / 1e9).toFixed(4) + " TON",
          status: d.status,
          type: d.interfaces?.[0] || "wallet",
        });
      }

      case "get_transaction_history": {
        const r = await fetch(
          `${apiBase}/accounts/${encodeURIComponent(wallet.address.toRawString())}/events?limit=${params.limit || 5}`,
        );
        const d = await r.json();
        const txs = (d.events || []).map((e: any) => ({
          time: new Date(e.timestamp * 1000).toLocaleString(),
          type: e.actions?.[0]?.type || "unknown",
          amount: e.actions?.[0]?.TonTransfer?.amount
            ? (Number(e.actions[0].TonTransfer.amount) / 1e9).toFixed(4) +
              " TON"
            : "N/A",
        }));
        return JSON.stringify({ count: txs.length, transactions: txs });
      }

      case "resolve_domain": {
        const domain = params.domain.replace(/\.ton$/i, "");
        const r = await fetch(
          `https://tonapi.io/v2/dns/${encodeURIComponent(domain + ".ton")}/resolve`,
        );
        if (r.ok) {
          const d = await r.json();
          return JSON.stringify({
            domain: domain + ".ton",
            address: d.wallet?.address || "not found",
          });
        }
        return JSON.stringify({
          domain: domain + ".ton",
          address: "not found",
        });
      }

      case "get_price": {
        const r = await fetch(
          `${apiBase}/rates?tokens=${encodeURIComponent(params.token)}&currencies=usd,ton`,
        );
        if (r.ok) {
          const d = await r.json();
          const rates = d.rates?.[params.token];
          return JSON.stringify({
            priceUSD: rates?.prices?.USD || "unknown",
            priceTON: rates?.prices?.TON || "unknown",
          });
        }
        return JSON.stringify({ priceUSD: "unknown" });
      }

      case "get_staking_info": {
        const r = await fetch(
          `${apiBase}/staking/nominator/${encodeURIComponent(wallet.address.toRawString())}/pools`,
        );
        if (r.ok) {
          const d = await r.json();
          return JSON.stringify({ pools: d.pools || [] });
        }
        return JSON.stringify({ pools: [], message: "No staking positions" });
      }

      case "create_escrow": {
        const ESCROW_FILE = ".escrow-store.json";
        let escrows: any = {};
        try {
          if (existsSync(ESCROW_FILE))
            escrows = JSON.parse(readFileSync(ESCROW_FILE, "utf-8"));
        } catch {}
        const escrowId = `escrow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const deadline =
          Math.floor(Date.now() / 1000) + (params.deadlineMinutes || 60) * 60;
        escrows[escrowId] = {
          id: escrowId,
          depositor: wallet.address.toRawString(),
          beneficiary: params.beneficiary,
          amount: params.amount,
          deadline,
          status: "created",
          description: params.description || "",
          deadlineISO: new Date(deadline * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        writeFileSync(ESCROW_FILE, JSON.stringify(escrows, null, 2));
        return JSON.stringify({
          escrowId,
          status: "created",
          amount: params.amount + " TON",
          beneficiary: params.beneficiary,
        });
      }

      case "get_escrow_info": {
        const ESCROW_FILE = ".escrow-store.json";
        let escrows: any = {};
        try {
          if (existsSync(ESCROW_FILE))
            escrows = JSON.parse(readFileSync(ESCROW_FILE, "utf-8"));
        } catch {}
        if (params.escrowId)
          return JSON.stringify(
            escrows[params.escrowId] || { error: "Not found" },
          );
        return JSON.stringify({
          count: Object.keys(escrows).length,
          escrows: Object.values(escrows).map((e: any) => ({
            id: e.id,
            status: e.status,
            amount: e.amount + " TON",
          })),
        });
      }

      default:
        return JSON.stringify({ error: `Unknown action: ${name}` });
    }
  }

  // ── Chat history per user ──
  const chatHistories = new Map<number, OpenAI.ChatCompletionMessageParam[]>();

  const SYSTEM_PROMPT = `You are TON Agent Kit Bot — an AI agent that manages a TON blockchain wallet via Telegram.

Your wallet: ${wallet.address.toRawString()}
Network: ${NETWORK}

You can check balances, send TON, resolve .ton domains, check prices, view transaction history, manage escrows, and more.

Rules:
- Be concise. Use emojis sparingly.
- For transfers above ${AUTO_APPROVE_LIMIT} TON, always confirm with the user first.
- Format TON amounts to 4 decimal places.
- When showing addresses, truncate to first 6 and last 4 characters.
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
          `Wallet: \`${wallet.address.toRawString().slice(0, 10)}...${wallet.address.toRawString().slice(-6)}\`\n` +
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
        model: "gpt-4.1-nano",
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

          // HITL check for write operations
          let approved = true;
          if (fnName === "transfer_ton") {
            const amount = parseFloat(fnParams.amount);
            if (amount > AUTO_APPROVE_LIMIT) {
              await ctx.reply(
                `⏳ Requesting approval for ${fnParams.amount} TON transfer...`,
              );
              approved = await requestApproval(chatId, fnName, fnParams);
            }
          }

          let result: string;
          if (approved) {
            result = await executeAction(fnName, fnParams);
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
          model: "gpt-4.1-nano",
          messages: history,
          tools,
          tool_choice: "auto",
        });
        assistantMessage = response.choices[0].message;
      }

      // Send final response
      const reply = assistantMessage.content || "Done!";
      history.push({ role: "assistant", content: reply });
      await ctx.reply(reply, { parse_mode: "Markdown" });
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

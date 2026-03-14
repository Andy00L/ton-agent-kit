# TON Agent Kit — Telegram Bot Example

AI-powered Telegram bot connected to the TON blockchain. Supports 29 blockchain actions via natural language, human-in-the-loop (HITL) approval for transactions, and rich HTML-formatted responses.

## Prerequisites

- **Telegram bot token** — create one via [@BotFather](https://t.me/BotFather)
- **OpenAI API key** (or any OpenAI-compatible provider)
- **TON wallet mnemonic** — 24-word seed phrase

## Install

```bash
npm install
```

## Setup

```bash
cp .env.example .env
```

Fill in the values in `.env`:

```env
TON_MNEMONIC=word1 word2 ... word24
TON_NETWORK=testnet
TELEGRAM_BOT_TOKEN=your-token-from-botfather
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
```

## Run

```bash
bun src/index.ts
```

## Features

- **29 blockchain actions** via natural language — send TON, swap tokens, resolve domains, create escrow, stake, and more
- **HITL approval** — transfers and escrow creation above 0.05 TON show Approve/Reject buttons
- **HTML formatted responses** — bold labels, code-formatted addresses, inline links
- **Typing indicators** — shows "typing..." while processing and executing actions
- **Bot commands** — `/start` (onboarding), `/help` (all capabilities), `/wallet` (quick balance check)
- **`toAITools()`** — generates proper JSON schemas for any LLM with function calling
- **Multi-provider support** — works with OpenAI, OpenRouter, Groq, or any OpenAI-compatible API via `OPENAI_BASE_URL`

## Example Commands

Send these as messages in your Telegram chat:

| Message | What it does |
|---------|-------------|
| "What's my balance?" | Checks TON balance |
| "Send 0.01 TON to EQ..." | Transfers TON (with HITL approval) |
| "What's the price of USDT?" | Gets token price via DeFi plugin |
| "Resolve foundation.ton" | Looks up .ton domain |
| "Show my last 5 transactions" | Gets transaction history |
| "Create escrow for 0.05 TON to EQ..." | Creates trustless escrow deal |
| "Register agent trading-bot" | Registers on-chain AI agent identity |
| "Stake 1 TON" | Stakes TON tokens |

## TX Mode

Control whether transactions require approval buttons:

- **`TX auto`** — skip approval, execute transfers immediately
- **`TX confirm`** — require Approve/Reject buttons for transfers > 0.05 TON (default)

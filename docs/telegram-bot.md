# Telegram Bot

AI-powered Telegram bot with human-in-the-loop approval and 68 blockchain actions.

## Features

- **68 actions** across 12 plugins via `toAITools()` -- OpenAI function calling
- **HITL approval** -- transfers above 0.05 TON require inline button confirmation
- **Auto-approve mode** -- `/start` then type `TX auto` to skip confirmations
- **Per-user chat history** -- 22 messages of context per conversation
- **Multi-provider LLM** -- configurable via `OPENAI_BASE_URL` and `AI_MODEL` env vars
- **Post-transfer verification** -- waits 10s after transfers, fetches real tx hash, shows Tonviewer link
- **Portfolio metrics** -- `/portfolio` shows 7-day PnL, ROI, win rate, max drawdown

## Commands

| Command | Description |
|---|---|
| `/start` | Onboarding -- wallet address, balance, quick action examples |
| `/help` | List all 68 actions grouped by plugin |
| `/wallet` | Balance + address + Tonviewer explorer link |
| `/agents` | List registered agents (name, capabilities, reputation score) |
| `/intents` | List open service intents on-chain |
| `/portfolio` | 7-day portfolio performance metrics |

## Running

```bash
# Set environment variables
export TON_MNEMONIC="your 24 word mnemonic"
export TELEGRAM_BOT_TOKEN="your_bot_token"
export OPENAI_API_KEY="your_openai_key"

# Run
bun run telegram-bot.ts
```

## HITL Approval Flow

When the agent decides to execute a write action (transfer, swap, etc.) that moves more than 0.05 TON:

1. Bot shows a confirmation message with action details
2. User taps "Approve" or "Reject" inline button
3. If approved, the action executes and results are shown
4. If rejected, the agent is told the action was denied

Users can toggle between modes by typing `TX auto` or `TX confirm` in chat.

## Plugins Loaded

Token, DeFi, DNS, NFT, Staking, Escrow, Identity, Analytics, Payments, AgentComm (10 plugins).

## Configuration

| Env Variable | Required | Description |
|---|---|---|
| `TON_MNEMONIC` | Yes | 24-word BIP-39 mnemonic |
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `OPENAI_API_KEY` | Yes | OpenAI or compatible provider |
| `OPENAI_BASE_URL` | No | Custom LLM endpoint |
| `AI_MODEL` | No | Model name (default: gpt-4o) |
| `TONAPI_KEY` | No | TONAPI key for analytics |

# Telegram Bot

A Telegram bot interface to TON Agent Kit. Users interact with the agent through buttons and text commands. The LLM calls any of 72+ SDK actions as tools.

**File:** `telegram-bot.ts` (1308 lines)
**Framework:** grammY + @grammyjs/runner
**Parse mode:** HTML (all messages, with plain-text fallback on parse error)

---

## Plugins Loaded

The bot loads 10 standard plugins plus one inline plugin.

| # | Plugin |
|---|---|
| 1 | TokenPlugin |
| 2 | DefiPlugin |
| 3 | DnsPlugin |
| 4 | NftPlugin |
| 5 | StakingPlugin |
| 6 | EscrowPlugin |
| 7 | IdentityPlugin |
| 8 | AnalyticsPlugin |
| 9 | PaymentsPlugin |
| 10 | AgentCommPlugin |
| 11 | EndpointPlugin (inline) |

EndpointPlugin is defined inline in `telegram-bot.ts`, not as a separate package. It provides 3 actions: `open_x402_endpoint`, `close_x402_endpoint`, `list_x402_endpoints`.

---

## Operating Modes

The bot has three modes. Only one is active at a time.

### Normal Mode

Default mode. Every text message goes to the LLM with all available actions as tools. The LLM runs a multi-step tool loop with a maximum of 5 iterations. Chat history is stored per user in a Map, capped at 40 messages. Older messages are spliced out.

### Listen Mode

Polls the agent-comm protocol for new intents and offers at a configurable interval.

- Interval options: 15s, 30s, 60s
- Tracks seen intent IDs in a `seenIntentIds` Set to avoid duplicate notifications
- Notifies the user when new intents appear that match the optional service filter
- Also polls for new offers arriving on the user's own active intents

Activate with the Listen button in the main menu.

### Auto Mode

The next text message the user sends becomes a mission goal. The bot runs `executeLLMLoop` with a configurable step limit. Progress is reported by editing a single message in place rather than sending new messages.

- Step options: 5, 10, 15, 20
- Activate with the Auto button in the main menu

---

## Human-in-the-Loop (HITL)

Certain actions require user approval before they execute. The bot presents inline Approve/Reject buttons for each pending action.

### HITL_ACTIONS (23 total)

`transfer_ton`, `transfer_jetton`, `create_escrow`, `deposit_to_escrow`, `release_escrow`, `refund_escrow`, `open_dispute`, `accept_offer`, `stake_ton`, `unstake_ton`, `swap_dedust`, `swap_stonfi`, `swap_best_price`, `broadcast_intent`, `join_dispute`, `seller_stake_escrow`, `settle_deal`, `confirm_delivery`, `send_offer`, `vote_release`, `vote_refund`, `claim_reward`, `cancel_intent`

### ALWAYS_CONFIRM (8 total)

These 8 actions always require approval, regardless of amount:

`vote_release`, `vote_refund`, `confirm_delivery`, `settle_deal`, `send_offer`, `cancel_intent`, `open_dispute`, `join_dispute`

### Auto-Approve Limit

`AUTO_APPROVE_LIMIT` is 0.05 TON. In confirm mode, actions involving amounts below this threshold are auto-approved. Actions at or above this limit always require explicit user approval.

### Toggle

Send `tx auto` or `tx confirm` as a text message, or use the toggle button in Settings. The current state is displayed in the Settings screen.

---

## UI Screens

The bot registers 7 named inline keyboards. Additional keyboards are created dynamically within handlers.

### Main Menu

Buttons: Balance, Transfer, Intents, Offers, Agents, Escrow, Swap, Listen, Auto, Settings, Refresh, Portfolio, Help

### Intents Menu

Buttons: New Intent, Browse All, up to 5 active intents (each with View and Cancel), My Offers, Refresh, Back

### Browse Intents

Up to 5 "Offer on #X" buttons with Prev/Next pagination and a Back button.

### Offer Form

Price presets: 0.05, 0.1, 0.2 TON. Time presets: 5, 15, 60 min. Buttons: Send Offer, Cancel.

### Settings

Buttons: Confirm toggle, Auto toggle, Listen toggle, HITL cycle, Steps cycle, Poll cycle, Wallet Info, Back

### Listen Mode

Buttons: Show New (only visible when new intents are buffered), Filter, Random 5, Stop, Poll Now, Back

### Auto Mode

Buttons: Stop Auto, Steps cycle, Back

### Dynamic Keyboards

- HITL approval: Approve/Reject buttons, one pair per pending action
- Back button: shown during text input prompts
- Offer accept: up to 3 Accept buttons, View All, Back

---

## State Tracking

| State | Type | Purpose |
|---|---|---|
| `pendingOffers` | Map | Polled every 15s. Notifies user when an offer is accepted, rejected, or expired. |
| `myActiveIntents` | Map | Auto-populated on `broadcast_intent`. Cleaned up on `accept_offer` and `cancel_intent`. |
| `seenIntentIds` | Set | Tracks which intents the user has already been notified about in Listen Mode. |

### Contextual Text Input

The `awaitingInput` state routes incoming text to specific handlers instead of the LLM. States: `transfer`, `swap`, `new_intent`, `listen_filter`.

---

## Callback Handlers

The bot registers 40 callback query handlers total: 9 regex-pattern handlers for dynamic button data (intent IDs, offer indices) and 31 static handlers for named buttons.

---

## Transaction Links

After a `transfer_ton` action completes, the bot fetches the transaction hash and appends a tonviewer.com link to the response message.

---

## x402 Server

An Express server runs alongside the bot on `X402_PORT` (default 4000). It serves paid API endpoints that the LLM opens at runtime via EndpointPlugin.

- Routes are stored in an `endpointRoutes` Map
- Each route uses the `tonPaywall` middleware with a `MemoryReplayStore`
- Routes do not persist across restarts

See [x402-protocol.md](./x402-protocol.md) for the full payment flow.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | | Bot token from @BotFather |
| `TON_MNEMONIC` | Yes | | 24-word wallet mnemonic |
| `OPENAI_API_KEY` | Yes | | OpenAI API key |
| `OPENAI_BASE_URL` | No | OpenAI default | Override for compatible APIs |
| `AI_MODEL` | No | `gpt-4.1-nano` | Model name |
| `TON_NETWORK` | No | `testnet` | `testnet` or `mainnet` |
| `TON_RPC_URL` | No | network default | Custom RPC endpoint |
| `X402_PORT` | No | `4000` | Port for the x402 Express server |

## Running

```bash
export TELEGRAM_BOT_TOKEN="your_bot_token"
export TON_MNEMONIC="word1 word2 ... word24"
export OPENAI_API_KEY="your_openai_key"

bun run telegram-bot.ts
```

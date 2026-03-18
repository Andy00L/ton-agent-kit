import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction } from "@ton-agent-kit/core";

export const getEquityCurveAction = defineAction({
  name: "get_equity_curve",
  description:
    "Return a daily time-series of the wallet's estimated TON balance over a period, reconstructed from transaction history. Useful for charting performance.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Wallet address to analyze. Defaults to the agent's own wallet."),
    days: z.coerce
      .number()
      .optional()
      .describe("Number of days for the curve. Defaults to 30."),
    limit: z.coerce
      .number()
      .optional()
      .describe("Maximum transactions to process. Defaults to 200."),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();
    const days = params.days || 30;
    const limit = params.limit || 200;

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    // Fetch transaction events
    const eventsRes = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(addr)}/events?limit=${limit}`,
    );
    if (!eventsRes.ok) {
      return emptyCurve(days, "0", `Failed to fetch transaction history (${eventsRes.status})`);
    }
    const eventsData = await eventsRes.json();

    // Fetch current balance
    const accountRes = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(addr)}`,
    );
    const currentBalanceNum = accountRes.ok
      ? Number((await accountRes.json()).balance) / 1e9
      : 0;
    const currentBalance = currentBalanceNum.toFixed(4);

    // Parse TON transfers within the window
    const rawAddr = Address.parse(addr).toRawString();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const transfers: { timestamp: number; delta: number }[] = [];

    for (const event of eventsData.events || []) {
      const ts = event.timestamp * 1000;
      if (ts < cutoff) continue;
      for (const action of event.actions || []) {
        if (action.type !== "TonTransfer" || !action.TonTransfer) continue;
        const amount = Number(action.TonTransfer.amount) / 1e9;
        if (amount <= 0) continue;
        const sender = action.TonTransfer.sender?.address;
        const recipient = action.TonTransfer.recipient?.address;
        let delta = 0;
        if (recipient && normed(recipient) === normed(rawAddr)) delta = amount;
        if (sender && normed(sender) === normed(rawAddr)) delta = -amount;
        if (delta === 0) continue;
        transfers.push({ timestamp: ts, delta });
      }
    }

    // Build date-keyed delta map (aggregate multiple TXs per day)
    const deltaByDate = new Map<string, number>();
    for (const tx of transfers) {
      const dateKey = new Date(tx.timestamp).toISOString().slice(0, 10);
      deltaByDate.set(dateKey, (deltaByDate.get(dateKey) || 0) + tx.delta);
    }

    // Generate day range [startDate .. today]
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);

    const dateRange: string[] = [];
    const d = new Date(startDate);
    while (d <= today) {
      dateRange.push(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }

    // Reconstruct balance backwards from today
    // Start at current balance, walk backwards undoing each day's net delta
    const endOfDayBalance = new Map<string, number>();
    let bal = currentBalanceNum;

    for (let i = dateRange.length - 1; i >= 0; i--) {
      const date = dateRange[i];
      endOfDayBalance.set(date, bal);
      const dayDelta = deltaByDate.get(date) || 0;
      // Undo this day's changes to get balance at the end of the prior day
      bal = Math.max(0, bal - dayDelta);
    }

    // Build points array (forward time)
    const points = dateRange.map((date) => ({
      date,
      balance: (endOfDayBalance.get(date) ?? currentBalanceNum).toFixed(4),
    }));

    const startBalance = points[0]?.balance || currentBalance;
    const endBalance = currentBalance;
    const changeNum = parseFloat(endBalance) - parseFloat(startBalance);
    const changePct =
      parseFloat(startBalance) > 0
        ? (changeNum / parseFloat(startBalance)) * 100
        : 0;

    const message =
      `Equity curve over ${days} days: started at ${startBalance} TON, ` +
      `now ${endBalance} TON (${changeNum >= 0 ? "+" : ""}${changePct.toFixed(1)}%)`;

    return {
      points,
      startBalance,
      endBalance,
      change: `${changeNum >= 0 ? "+" : ""}${changeNum.toFixed(4)}`,
      changePercent: `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`,
      periodDays: days,
      message,
    };
  },
});

function normed(addr: string): string {
  try {
    return Address.parse(addr).toRawString();
  } catch {
    return addr;
  }
}

function emptyCurve(days: number, balance: string, message: string) {
  const today = new Date();
  const points = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    points.push({ date: d.toISOString().slice(0, 10), balance });
  }
  return {
    points,
    startBalance: balance,
    endBalance: balance,
    change: "+0",
    changePercent: "+0.0%",
    periodDays: days,
    message,
  };
}

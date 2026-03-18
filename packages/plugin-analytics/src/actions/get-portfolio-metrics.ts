import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction } from "@ton-agent-kit/core";

export const getPortfolioMetricsAction = defineAction({
  name: "get_portfolio_metrics",
  description:
    "Compute portfolio performance metrics from on-chain transaction history: PnL, ROI, win rate, max drawdown, and more. TON-denominated only.",
  schema: z.object({
    address: z
      .string()
      .optional()
      .describe("Wallet address to analyze. Defaults to the agent's own wallet."),
    days: z.coerce
      .number()
      .optional()
      .describe("Number of days to analyze. Defaults to 30."),
    limit: z.coerce
      .number()
      .optional()
      .describe("Maximum number of transactions to analyze. Defaults to 100."),
  }),
  handler: async (agent, params) => {
    const addr = params.address || agent.wallet.address.toRawString();
    const days = params.days || 30;
    const limit = params.limit || 100;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // Fetch transaction events from TONAPI
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const eventsRes = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(addr)}/events?limit=${limit}`,
    );
    if (!eventsRes.ok) {
      return emptyMetrics(days, 0, "0", `Failed to fetch transaction history (${eventsRes.status})`);
    }
    const eventsData = await eventsRes.json();

    // Fetch current balance
    const accountRes = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(addr)}`,
    );
    const currentBalance = accountRes.ok
      ? (Number((await accountRes.json()).balance) / 1e9).toFixed(4)
      : "0";

    // Parse TON transfer actions
    const rawAddr = Address.parse(addr).toRawString();
    const transfers: { timestamp: number; amount: number; isInflow: boolean }[] = [];

    for (const event of eventsData.events || []) {
      const ts = event.timestamp * 1000;
      if (ts < cutoff) continue;
      for (const action of event.actions || []) {
        if (action.type !== "TonTransfer" || !action.TonTransfer) continue;
        const amount = Number(action.TonTransfer.amount) / 1e9;
        if (amount <= 0) continue;
        const sender = action.TonTransfer.sender?.address;
        const recipient = action.TonTransfer.recipient?.address;
        let isInflow: boolean | null = null;
        if (recipient && normed(recipient) === normed(rawAddr)) isInflow = true;
        if (sender && normed(sender) === normed(rawAddr)) isInflow = false;
        if (isInflow === null) continue;
        transfers.push({ timestamp: ts, amount, isInflow });
      }
    }

    if (transfers.length === 0) {
      return emptyMetrics(days, 0, currentBalance, `No TON transfers found in the last ${days} days.`);
    }

    // Sort oldest-first for running balance computation
    transfers.sort((a, b) => a.timestamp - b.timestamp);

    // Core metrics
    let totalInflow = 0;
    let totalOutflow = 0;
    let incomingCount = 0;
    let outgoingCount = 0;
    let largestGain = 0;
    let largestLoss = 0;

    for (const tx of transfers) {
      if (tx.isInflow) {
        totalInflow += tx.amount;
        incomingCount++;
        if (tx.amount > largestGain) largestGain = tx.amount;
      } else {
        totalOutflow += tx.amount;
        outgoingCount++;
        if (tx.amount > largestLoss) largestLoss = tx.amount;
      }
    }

    const netPnL = totalInflow - totalOutflow;
    const roi = totalOutflow > 0 ? (netPnL / totalOutflow) * 100 : NaN;
    const totalTx = transfers.length;
    const winRate = totalTx > 0 ? (incomingCount / totalTx) * 100 : 0;

    // Max drawdown: reconstruct running balance backwards from current balance
    let runningBalance = parseFloat(currentBalance);
    const balanceSeries: number[] = [runningBalance];
    // Walk backwards through transfers to build forward-time balance series
    for (let i = transfers.length - 1; i >= 0; i--) {
      const tx = transfers[i];
      if (tx.isInflow) {
        runningBalance -= tx.amount; // before receiving, had less
      } else {
        runningBalance += tx.amount; // before sending, had more
      }
      balanceSeries.unshift(Math.max(0, runningBalance));
    }

    let peak = balanceSeries[0];
    let maxDrawdownPct = 0;
    for (const bal of balanceSeries) {
      if (bal > peak) peak = bal;
      if (peak > 0) {
        const dd = ((bal - peak) / peak) * 100;
        if (dd < maxDrawdownPct) maxDrawdownPct = dd;
      }
    }

    const roiStr = isNaN(roi) ? "N/A" : `${roi.toFixed(1)}%`;
    const message =
      `Over the last ${days} days: ${totalTx} transactions, ` +
      `net PnL ${netPnL >= 0 ? "+" : ""}${netPnL.toFixed(4)} TON (${roiStr} ROI), ` +
      `win rate ${winRate.toFixed(0)}%, max drawdown ${maxDrawdownPct.toFixed(1)}%`;

    return {
      totalInflow: totalInflow.toFixed(4),
      totalOutflow: totalOutflow.toFixed(4),
      netPnL: `${netPnL >= 0 ? "+" : ""}${netPnL.toFixed(4)}`,
      roi: roiStr,
      totalTransactions: totalTx,
      incomingCount,
      outgoingCount,
      winRate: `${winRate.toFixed(0)}%`,
      maxDrawdown: `${maxDrawdownPct.toFixed(1)}%`,
      largestLoss: largestLoss > 0 ? `-${largestLoss.toFixed(4)} TON` : "0 TON",
      largestGain: largestGain > 0 ? `+${largestGain.toFixed(4)} TON` : "0 TON",
      currentBalance,
      periodDays: days,
      analyzedTransactions: totalTx,
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

function emptyMetrics(days: number, txCount: number, balance: string, message: string) {
  return {
    totalInflow: "0",
    totalOutflow: "0",
    netPnL: "+0",
    roi: "N/A",
    totalTransactions: txCount,
    incomingCount: 0,
    outgoingCount: 0,
    winRate: "0%",
    maxDrawdown: "0%",
    largestLoss: "0 TON",
    largestGain: "0 TON",
    currentBalance: balance,
    periodDays: days,
    analyzedTransactions: txCount,
    message,
  };
}

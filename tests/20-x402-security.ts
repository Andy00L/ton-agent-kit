// tests/20-x402-security.ts, Section 19: x402 paywall security
/**
 * Every attack this suite claims to cover against a live paywall backed by real
 * testnet payments.
 *
 * Until 2026-09-16 this file contained no assertion of any kind: 284 lines, zero
 * `throw`, zero comparison. Every check was a `console.log` reading
 * "(expected: not 200)" next to a status nothing branched on, and `run()`
 * returned a hardcoded `{ passed: 1, failed: 0 }`. A paywall that served every
 * replayed hash reported one passing test. That is why CHANGELOG.md records the
 * 1.2.0 paywall bypass as having "survived" this suite: it did not survive it,
 * it was never tested.
 *
 * Needs TON_MNEMONIC set to a funded testnet wallet. It sends two real
 * transactions and waits for them, so a full run takes a few minutes.
 */

import { internal, toNano, beginCell } from "@ton/core";
import { TonClient4 } from "@ton/ton";
import { mnemonicToPrivateKey } from "@ton/crypto";
import "dotenv/config";
import {
  createWalletContract,
  describeError,
  KeypairWallet,
  sendFromWalletContract,
  sleep,
  type WalletConfig,
} from "../packages/core/src/index";
import { createPaymentServer, tonPaywall } from "../packages/x402-middleware/src/index";
import express from "express";

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
  duration: number;
}

/** Port for the two-route paywall server. */
const PAYWALL_PORT = 3402;

/** Port for the single-route mainnet server used by the wrong-network check. */
const MAINNET_PAYWALL_PORT = 3404;

/** Price of /api/price, in TON. */
const PRICE_ENDPOINT_TON = "0.001";

/** Price of /api/analytics, in TON. */
const ANALYTICS_ENDPOINT_TON = "0.01";

/** Deliberately below PRICE_ENDPOINT_TON, to exercise the amount floor. */
const UNDERPAYMENT_TON = "0.0001";

/** How long to wait for a testnet transaction to be indexed, in milliseconds. */
const INDEXING_WAIT_MS = 15_000;

/** The paywall rejects a payment older than this, in seconds. sourceRef: packages/x402-middleware/src/index.ts */
const MAX_PAYMENT_AGE_SECONDS = 300;

/** Responses one verified payment may serve. sourceRef: MAX_CACHED_PROOF_USES in packages/x402-middleware/src/index.ts */
const MAX_RESPONSES_PER_PAYMENT = 3;

let passed = 0;
let failed = 0;
let skipped = 0;
const errors: string[] = [];

/** Record one security property. A false condition fails the suite. */
function check(name: string, condition: boolean, detail: string): void {
  if (condition) {
    passed++;
    console.log(`  pass  ${name}  (${detail})`);
    return;
  }
  failed++;
  const message = `${name}: ${detail}`;
  errors.push(message);
  console.log(`  FAIL  ${message}`);
}

/**
 * Record a property that could not be exercised.
 *
 * Counted and reported, never silently dropped. A skipped attack check is not
 * a passing one, and the old file could not tell the two apart.
 */
function skip(name: string, reason: string): void {
  skipped++;
  console.log(`  skip  ${name}  (${reason})`);
}

/** Ask the paywall for a resource, carrying a payment hash when given one. */
async function requestResource(url: string, paymentHash?: string): Promise<number> {
  const response = await fetch(url, {
    headers: paymentHash ? { "X-Payment-Hash": paymentHash } : {},
  });
  return response.status;
}

/** The most recent event id on an account, or null when it has none. */
async function latestEventId(rawAddress: string): Promise<string | null> {
  const response = await fetch(
    `https://testnet.tonapi.io/v2/accounts/${encodeURIComponent(rawAddress)}/events?limit=1`,
  );
  if (!response.ok) return null;
  const body = (await response.json()) as { events?: Array<{ event_id?: string }> };
  return body.events?.[0]?.event_id ?? null;
}

async function main(): Promise<void> {
  const mnemonicPhrase = process.env.TON_MNEMONIC;
  if (!mnemonicPhrase) throw new Error("[x402Security] TON_MNEMONIC not set in .env");
  const mnemonic = mnemonicPhrase.split(" ");

  const client = new TonClient4({ endpoint: "https://testnet-v4.tonhubapi.com" });
  const wallet = await KeypairWallet.autoDetect(mnemonic, client, "testnet");
  const recipient = wallet.address.toRawString();

  console.log(`\nx402 paywall security, wallet ${recipient.slice(0, 20)}...\n`);

  const app = createPaymentServer({
    recipient,
    network: "testnet",
    routes: [
      {
        path: "/api/price",
        amount: PRICE_ENDPOINT_TON,
        description: "Real-time market data",
        handler: (_request, response) => {
          response.json({ ton: 3.85, btc: 95000, eth: 3200, timestamp: Date.now() });
        },
      },
      {
        path: "/api/analytics",
        amount: ANALYTICS_ENDPOINT_TON,
        description: "Wallet analytics report",
        handler: (_request, response) => {
          response.json({ activeWallets: 15000, txVolume: "2.5M TON", topToken: "USDT" });
        },
      },
    ],
  });

  const server = app.listen(PAYWALL_PORT);
  const mainnetApp = express();
  mainnetApp.get(
    "/api/data",
    tonPaywall({ amount: PRICE_ENDPOINT_TON, recipient, network: "mainnet" }),
    (_request: express.Request, response: express.Response) => {
      response.json({ data: true });
    },
  );
  const mainnetServer = mainnetApp.listen(MAINNET_PAYWALL_PORT);

  try {
    await sleep(1000);
    const base = `http://localhost:${PAYWALL_PORT}`;

    // The index is free, and it must say what each route costs.
    const infoResponse = await fetch(`${base}/`);
    const info = (await infoResponse.json()) as { endpoints?: Array<{ path: string; amount: string }> };
    check("the index is served without payment", infoResponse.status === 200, `status ${infoResponse.status}`);
    check(
      "the index prices every paid route",
      info.endpoints?.length === 2,
      `${info.endpoints?.length ?? 0} routes advertised`,
    );

    // An unpaid request must be refused with instructions, not served.
    const unpaidResponse = await fetch(`${base}/api/price`);
    const unpaid = (await unpaidResponse.json()) as { payment?: { amount?: string; recipient?: string } };
    check("an unpaid request is refused", unpaidResponse.status === 402, `status ${unpaidResponse.status}`);
    check(
      "the refusal names the price and the recipient",
      unpaid.payment?.amount === PRICE_ENDPOINT_TON && unpaid.payment?.recipient === recipient,
      `amount ${unpaid.payment?.amount}, recipient ${unpaid.payment?.recipient?.slice(0, 12)}...`,
    );
    check(
      "a made-up hash does not open the paywall",
      (await requestResource(`${base}/api/price`, "f".repeat(64))) !== 200,
      "64 hex characters that were never a transaction",
    );

    // Pay the real price, to this wallet, and take the hash.
    const walletConfig: WalletConfig = { version: "V5R1", network: "testnet", workchain: 0 };
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const paymentAddress = createWalletContract(keyPair.publicKey, walletConfig).address;
    const sendPayment = (amountTon: string, comment: string) =>
      sendFromWalletContract({
        client,
        publicKey: keyPair.publicKey,
        secretKey: keyPair.secretKey,
        config: walletConfig,
        messages: [
          internal({
            to: paymentAddress,
            value: toNano(amountTon),
            bounce: false,
            body: beginCell().storeUint(0, 32).storeStringTail(comment).endCell(),
          }),
        ],
      });

    await sendPayment(PRICE_ENDPOINT_TON, "x402:price-data");
    await sleep(INDEXING_WAIT_MS);
    const paymentHash = await latestEventId(recipient);

    if (!paymentHash) {
      skip("a real payment opens the paywall", "the payment was not indexed in time");
      skip("the same payment does not open a second endpoint", "no payment hash");
    } else {
      check(
        "a real payment opens the paywall",
        (await requestResource(`${base}/api/price`, paymentHash)) === 200,
        `hash ${paymentHash.slice(0, 16)}...`,
      );

      // The second endpoint costs ten times as much and the hash is spent.
      check(
        "an unpaid second endpoint is still refused",
        (await requestResource(`${base}/api/analytics`)) === 402,
        "no payment header",
      );
      check(
        "a spent hash does not open a different endpoint",
        (await requestResource(`${base}/api/analytics`, paymentHash)) !== 200,
        "cross-endpoint replay",
      );
      // One verified payment serves a bounded number of responses so a client
      // that lost the first one can retry. Past that budget it is spent, and
      // before 3.0.0 there was no budget at all: one payment served every
      // request carrying its hash for the whole proofTTL window.
      let servedFromOnePayment = 1;
      while (servedFromOnePayment < MAX_RESPONSES_PER_PAYMENT + 2) {
        if ((await requestResource(`${base}/api/price`, paymentHash)) !== 200) break;
        servedFromOnePayment++;
      }
      check(
        "one payment does not buy unlimited responses",
        servedFromOnePayment <= MAX_RESPONSES_PER_PAYMENT,
        `${servedFromOnePayment} responses served, budget ${MAX_RESPONSES_PER_PAYMENT}`,
      );
      check(
        "a testnet payment does not satisfy a mainnet paywall",
        (await requestResource(`http://localhost:${MAINNET_PAYWALL_PORT}/api/data`, paymentHash)) !== 200,
        "same hash, different network",
      );
    }

    // A payment to somebody else must not open this paywall.
    const otherWallet = "0:554122744117f4414f02ca5643cd4ab4b02ed83851e33cd88f7b3263e1485399";
    const otherHash = await latestEventId(otherWallet);
    if (otherHash) {
      check(
        "a payment to another recipient is refused",
        (await requestResource(`${base}/api/price`, otherHash)) !== 200,
        `hash ${otherHash.slice(0, 16)}... pays ${otherWallet.slice(0, 12)}...`,
      );
    } else {
      skip("a payment to another recipient is refused", "the other wallet has no events");
    }

    // A payment older than the window must not be redeemable.
    const historyResponse = await fetch(
      `https://testnet.tonapi.io/v2/accounts/${encodeURIComponent(recipient)}/events?limit=20`,
    );
    const history = (await historyResponse.json()) as {
      events?: Array<{ event_id?: string; timestamp?: number }>;
    };
    const nowSeconds = Math.floor(Date.now() / 1000);
    const staleEvent = history.events?.find(
      (event) => nowSeconds - (event.timestamp ?? nowSeconds) > MAX_PAYMENT_AGE_SECONDS,
    );
    if (staleEvent?.event_id) {
      const age = nowSeconds - (staleEvent.timestamp ?? nowSeconds);
      check(
        "a payment older than the window is refused",
        (await requestResource(`${base}/api/price`, staleEvent.event_id)) !== 200,
        `${age}s old, limit ${MAX_PAYMENT_AGE_SECONDS}s`,
      );
    } else {
      skip("a payment older than the window is refused", "no event older than the window");
    }

    // The check that matters most, and the one this suite never made: paying
    // less than the price must not buy the resource. This is the exact hole
    // that shipped in every version up to 1.2.0.
    await sendPayment(UNDERPAYMENT_TON, "x402:underpay");
    await sleep(INDEXING_WAIT_MS);
    const underpaymentHash = await latestEventId(recipient);
    if (underpaymentHash && underpaymentHash !== paymentHash) {
      check(
        "an underpayment does not buy the resource",
        (await requestResource(`${base}/api/price`, underpaymentHash)) !== 200,
        `paid ${UNDERPAYMENT_TON} TON for a ${PRICE_ENDPOINT_TON} TON endpoint`,
      );
    } else {
      skip("an underpayment does not buy the resource", "the underpayment was not indexed in time");
    }
  } finally {
    server.close();
    mainnetServer.close();
  }

  console.log(`\n  ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  passed = 0;
  failed = 0;
  skipped = 0;
  errors.length = 0;
  try {
    await main();
  } catch (caught: unknown) {
    failed++;
    errors.push(`[x402Security] the suite crashed: ${describeError(caught)}`);
  }
  return { passed, failed, errors: [...errors], duration: Date.now() - start };
}

if (import.meta.main) {
  run().then((result) => {
    console.log(`\n${result.passed} passed, ${result.failed} failed (${result.duration}ms)`);
    for (const message of result.errors) console.log(`  - ${message}`);
    process.exit(result.failed > 0 ? 1 : 0);
  });
}

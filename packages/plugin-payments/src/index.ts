import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { definePlugin, defineAction } from "@ton-agent-kit/core";

// ============================================================
// pay_for_resource — x402 payment gateway
// ============================================================
const payForResourceAction = defineAction({
  name: "pay_for_resource",
  description:
    "Pay for an x402-gated API resource. Sends payment, then retries the request with proof. Returns the API response.",
  schema: z.object({
    url: z.string().describe("URL of the x402-gated API endpoint"),
  }),
  handler: async (agent, params) => {
    // Step 1: Request the resource
    const initialResponse = await fetch(params.url);

    // If not 402, return directly (no payment needed)
    if (initialResponse.status !== 402) {
      const data = await initialResponse.json();
      return { paid: false, status: initialResponse.status, data };
    }

    // Step 2: Parse payment requirements
    const paymentInfo = await initialResponse.json();
    const requirement = paymentInfo.payment;

    if (!requirement || requirement.protocol !== "ton-x402-v1") {
      throw new Error("Unsupported payment protocol");
    }

    // Step 3: Send payment
    const toAddress = Address.parse(requirement.recipient);
    const { secretKey, publicKey } = (agent.wallet as any).getCredentials();
    const networkId = agent.network === "testnet" ? -3 : -239;
    const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
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

    const commentBody = beginCell()
      .storeUint(0, 32)
      .storeStringTail(`x402:${params.url}`)
      .endCell();

    const seqno = await walletContract.getSeqno();
    await walletContract.sendTransfer({
      seqno,
      secretKey,
      messages: [
        internal({
          to: toAddress,
          value: toNano(requirement.amount),
          bounce: false,
          body: commentBody,
        }),
      ],
    });

    // Step 4: Wait for confirmation
    await new Promise((r) => setTimeout(r, 10000));

    // Step 5: Get the tx hash from recent transactions
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";
    const txResponse = await fetch(
      `${apiBase}/accounts/${encodeURIComponent(agent.wallet.address.toRawString())}/events?limit=1`,
    );
    const txData = await txResponse.json();
    const txHash = txData.events?.[0]?.event_id;

    if (!txHash) {
      throw new Error("Payment sent but could not retrieve transaction hash");
    }

    // Step 6: Retry with payment proof
    const paidResponse = await fetch(params.url, {
      headers: { "X-Payment-Hash": txHash },
    });

    if (paidResponse.ok) {
      const data = await paidResponse.json();
      return {
        paid: true,
        amount: requirement.amount + " TON",
        txHash,
        data,
      };
    }

    throw new Error(
      `Payment verified but resource returned ${paidResponse.status}`,
    );
  },
});

// ============================================================
// Plugin export
// ============================================================
const PaymentsPlugin = definePlugin({
  name: "payments",
  actions: [payForResourceAction],
});

export default PaymentsPlugin;
export { payForResourceAction };

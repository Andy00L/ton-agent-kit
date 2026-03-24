import { z } from "zod";
import { Address, toNano, beginCell, internal } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { definePlugin, defineAction, sendTransaction } from "@ton-agent-kit/core";
import { createHash } from "crypto";

// ============================================================
// pay_for_resource — x402 payment gateway with delivery proof
// ============================================================
const payForResourceAction = defineAction({
  name: "pay_for_resource",
  description:
    "Pay for an x402-gated API resource. Sends payment, retries with proof, returns the response. Optionally links to an escrow for automatic on-chain delivery confirmation.",
  schema: z.object({
    url: z.string().describe("URL of the x402-gated API endpoint"),
    escrowId: z
      .string()
      .optional()
      .describe("If this payment is linked to an escrow, provide the escrow ID. The SDK will automatically confirm delivery on-chain."),
  }),
  handler: async (agent, params) => {
    // Step 1: Request the resource
    const initialResponse = await fetch(params.url);

    // If not 402, return directly (no payment needed)
    if (initialResponse.status !== 402) {
      const ct = initialResponse.headers.get("content-type") || "application/json";
      let data: any;
      if (
        ct.startsWith("image/") ||
        ct.startsWith("audio/") ||
        ct.startsWith("application/pdf") ||
        ct.startsWith("application/octet-stream")
      ) {
        data = {
          contentType: ct.split(";")[0].trim(),
          data: Buffer.from(await initialResponse.arrayBuffer()),
        };
      } else {
        try {
          data = await initialResponse.json();
        } catch {
          data = { contentType: ct, data: await initialResponse.text() };
        }
      }
      return { paid: false, status: initialResponse.status, data };
    }

    // Step 2: Parse payment requirements
    const paymentInfo = await initialResponse.json();
    const requirement = paymentInfo.payment;

    if (!requirement || requirement.protocol !== "ton-x402-v1") {
      throw new Error("Unsupported payment protocol");
    }

    // Step 3: Send payment (with retry + seqno wait)
    const toAddress = Address.parse(requirement.recipient);

    const commentBody = beginCell()
      .storeUint(0, 32)
      .storeStringTail(`x402:${params.url}`)
      .endCell();

    await sendTransaction(agent, [
      internal({
        to: toAddress,
        value: toNano(requirement.amount),
        bounce: false,
        body: commentBody,
      }),
    ]);

    // Step 4: Wait for initial TX propagation
    await new Promise((r) => setTimeout(r, 8000));

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

    // Step 6: Retry with payment proof (with retries for TX confirmation)
    const maxRetries = 3;
    const retryDelay = 8000;
    let paidResponse: Response | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      paidResponse = await fetch(params.url, {
        headers: { "X-Payment-Hash": txHash },
      });

      if (paidResponse.status === 200) break;

      if (attempt < maxRetries) {
        // Server hasn't confirmed TX yet — wait and retry
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }

    if (!paidResponse || !paidResponse.ok) {
      const timestamp = Math.floor(Date.now() / 1000);
      return {
        paid: true,
        verified: false,
        amount: requirement.amount + " TON",
        txHash,
        deliveryProof: {
          txHash,
          responseHash: createHash("sha256").update(txHash).digest("hex"),
          timestamp,
          escrowConfirmed: false,
        },
        message: `Payment sent (hash: ${txHash}) but server could not verify after ${maxRetries} retries. The payment is on-chain — retry later with the same hash.`,
      };
    }

    const contentBuffer = Buffer.from(await paidResponse.arrayBuffer());
    const contentType = paidResponse.headers.get("content-type") || "";
    const ct = contentType || "application/json";
    let data: any;
    if (
      ct.startsWith("image/") ||
      ct.startsWith("audio/") ||
      ct.startsWith("application/pdf") ||
      ct.startsWith("application/octet-stream")
    ) {
      data = {
        contentType: ct.split(";")[0].trim(),
        data: contentBuffer,
      };
    } else {
      try {
        data = JSON.parse(contentBuffer.toString("utf-8"));
      } catch {
        data = { contentType: ct, data: contentBuffer.toString("utf-8") };
      }
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const responseHash = createHash("sha256")
      .update(data?.data instanceof Buffer ? data.data : JSON.stringify(data))
      .digest("hex");

    // Step 7: Save delivery proof to memory (non-critical)
    try {
      const proofData = {
        x402TxHash: txHash,
        httpStatus: paidResponse.status,
        responseHash,
        timestamp,
        endpoint: params.url,
        payer: agent.wallet.address.toRawString(),
        payee: requirement.recipient,
        amount: requirement.amount,
        escrowId: params.escrowId || null,
      };
      await (agent as any).runAction("save_context", {
        key: `delivery_proof_${txHash}`,
        namespace: "delivery_proofs",
        value: JSON.stringify(proofData),
      });
    } catch {
      // Memory plugin not loaded — proof is still in the return value
    }

    // Step 8: If linked to an escrow, confirm delivery on-chain
    let escrowConfirmed = false;
    if (params.escrowId) {
      try {
        await (agent as any).runAction("confirm_delivery", {
          escrowId: params.escrowId,
          x402TxHash: txHash,
        });
        escrowConfirmed = true;
      } catch {
        // Non-critical — don't fail the payment because escrow confirmation failed
      }
    }

    return {
      paid: true,
      amount: requirement.amount + " TON",
      txHash,
      data,
      content: contentBuffer,
      contentType,
      deliveryProof: {
        txHash,
        responseHash,
        timestamp,
        verified: true,
        escrowConfirmed,
      },
    };
  },
});

// ============================================================
// get_delivery_proof — Look up x402 delivery proofs
// ============================================================
const getDeliveryProofAction = defineAction({
  name: "get_delivery_proof",
  description:
    "Look up a delivery proof for an x402 payment. Proves that a paid service was actually delivered (HTTP 200 received).",
  schema: z.object({
    txHash: z
      .string()
      .optional()
      .describe("x402 payment TX hash to look up"),
    escrowId: z
      .string()
      .optional()
      .describe("Escrow ID to find related delivery proofs"),
  }),
  handler: async (agent, params) => {
    // Try to load from memory plugin
    try {
      if (params.txHash) {
        const r = await (agent as any).runAction("get_context", {
          key: `delivery_proof_${params.txHash}`,
          namespace: "delivery_proofs",
        });
        if (r.found) {
          const proof = JSON.parse(r.value);
          return {
            found: true,
            proof,
            message: `Delivery proof found: service delivered at ${new Date(proof.timestamp * 1000).toISOString()} via ${proof.endpoint}`,
          };
        }
      }

      if (params.escrowId) {
        const r = await (agent as any).runAction("list_context", {
          namespace: "delivery_proofs",
        });
        if (r.entries && r.entries.length > 0) {
          const proofs = r.entries
            .map((e: any) => {
              try { return JSON.parse(e.value); } catch { return null; }
            })
            .filter((p: any) => p && (!params.escrowId || p.escrowId === params.escrowId));
          return {
            found: proofs.length > 0,
            proofs,
            count: proofs.length,
            message: `Found ${proofs.length} delivery proof(s)`,
          };
        }
      }
    } catch {
      // Memory plugin not available
    }

    return {
      found: false,
      message: "No delivery proof found. The memory plugin may not be loaded, or no proof exists for this hash.",
    };
  },
});

// ============================================================
// Plugin export
// ============================================================

/**
 * Payments Plugin -- x402 payment protocol and delivery proof management.
 *
 * Handles the full x402 pay-for-resource flow: sends TON to a gated API
 * endpoint, retries with the on-chain payment proof, and returns the
 * unlocked response. Optionally links payments to escrow deals for automatic
 * on-chain delivery confirmation. Also provides lookup of stored delivery
 * proofs.
 *
 * Actions:
 * - `pay_for_resource` -- Pay for an x402-gated API resource and return the unlocked response
 * - `get_delivery_proof` -- Look up a delivery proof for a previous x402 payment
 *
 * @example
 * ```typescript
 * import PaymentsPlugin from "@ton-agent-kit/plugin-payments";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(PaymentsPlugin);
 * const result = await agent.runAction("pay_for_resource", {
 *   url: "https://api.example.com/premium-data",
 * });
 * ```
 *
 * @since 1.0.0
 */
const PaymentsPlugin = definePlugin({
  name: "payments",
  actions: [payForResourceAction, getDeliveryProofAction],
});

/** @since 1.0.0 */
export default PaymentsPlugin;
export { payForResourceAction, getDeliveryProofAction };

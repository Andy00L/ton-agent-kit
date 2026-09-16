import { z } from "zod";
import { Address, toNano, internal, external, beginCell, storeMessage } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { createWalletContract, DEFAULT_SEND_MODE, defineAction, describeError, isSigningWallet } from "@ton-agent-kit/core";
import { emulateTransaction, type EmulationResult } from "../utils/emulate";

export const simulateTransactionAction = defineAction<
  { to: string; amount: string; comment?: string },
  EmulationResult
>({
  name: "simulate_transaction",
  description:
    "Simulate a TON transfer without sending it on-chain. Returns estimated gas, balance changes, and risk assessment. Use this before any real transfer to verify it will succeed.",
  schema: z.object({
    to: z.string().describe("Destination address (raw, EQ, or UQ format)"),
    amount: z.string().describe("Amount of TON to simulate sending (e.g. '1.5')"),
    comment: z.string().optional().describe("Optional transfer comment/memo"),
  }),
  handler: async (agent, params) => {
    const toAddress = Address.parse(params.to);
    const amountNano = toNano(params.amount);

    try {
      // Build the transfer BOC (same pattern as sendTransaction in core/utils)
      if (!isSigningWallet(agent.wallet)) {
        throw new Error(
          "[simulateTransactionAction] This wallet cannot sign. Attach a KeypairWallet to the agent.",
        );
      }
      const { secretKey, publicKey, walletConfig } =
        agent.wallet.getCredentials();

      // The signed cell built below is V5R1-specific.
      const contract = createWalletContract(publicKey, {
        ...walletConfig,
        network: agent.network,
      });
      if (!(contract instanceof WalletContractV5R1)) {
        throw new Error(
          `[simulateTransactionAction] Simulation requires a V5R1 wallet, this agent uses ${walletConfig.version ?? "V5R1"}.`,
        );
      }

      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
      const walletContract = freshClient.open(contract);

      const seqno = await walletContract.getSeqno();

      const internalMessage = internal({
        to: toAddress,
        value: amountNano,
        bounce: false,
        body: params.comment ? buildCommentBody(params.comment) : undefined,
      });

      // Create signed transfer (returns Cell)
      const transferBody = walletContract.createTransfer({
        seqno,
        secretKey,
        messages: [internalMessage],
        sendMode: DEFAULT_SEND_MODE,
      });

      // Wrap in external message and serialize to BOC
      const ext = external({
        to: walletContract.address,
        body: transferBody,
      });
      const boc = beginCell()
        .store(storeMessage(ext))
        .endCell()
        .toBoc()
        .toString("base64");

      return await emulateTransaction(
        boc,
        agent.network,
        params.amount,
        toAddress.toRawString(),
        agent.config.TONAPI_KEY,
      );
    } catch (caught: unknown) {
      return {
        success: false,
        error: describeError(caught),
        gasUsed: "0",
        estimatedFee: "0",
        balanceChange: "0",
        destinationBalanceChange: "0",
        risk: "error",
        message: `Simulation failed: ${describeError(caught)}`,
      };
    }
  },
  examples: [
    {
      input: { to: "EQBx2CfDE...", amount: "5" },
      output: {
        success: true,
        gasUsed: "0.0053",
        balanceChange: "-5.0053",
        destinationBalanceChange: "+5.0",
        estimatedFee: "0.0053",
        risk: "none",
        message: "Simulation successful. Sending 5 TON would cost ~0.0053 TON in fees.",
      },
      description: "Simulate sending 5 TON to preview fees and balance changes",
    },
  ],
});

/**
 * Build a comment body Cell for simple text transfers
 */
function buildCommentBody(comment: string) {
  return beginCell()
    .storeUint(0, 32) // 0 opcode = text comment
    .storeStringTail(comment)
    .endCell();
}

export default simulateTransactionAction;

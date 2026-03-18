import { z } from "zod";
import { Address, toNano, fromNano, internal, external, beginCell, storeMessage } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { defineAction, toFriendlyAddress, sendTransaction } from "@ton-agent-kit/core";
import { emulateTransaction } from "../utils/emulate";

export const transferTonAction = defineAction({
  name: "transfer_ton",
  description:
    "Transfer TON to another wallet address. Specify the destination address and amount in TON (e.g., '1.5'). Set simulate=true to dry-run without sending, or simulateFirst=true to simulate and only send if it succeeds.",
  schema: z.object({
    to: z.string().describe("Destination TON address (raw or user-friendly format)"),
    amount: z.string().describe("Amount of TON to send (e.g., '1.5', '100')"),
    comment: z.string().optional().describe("Optional comment to include in the transfer"),
    simulate: z.boolean().optional().describe("If true, only simulate the transfer without sending. Returns estimated gas, balance changes, and risk assessment."),
    simulateFirst: z.boolean().optional().describe("If true, simulate first and only send if simulation succeeds. Returns error without sending if simulation fails."),
  }),
  handler: async (agent, params) => {
    const toAddress = Address.parse(params.to);
    const amountNano = toNano(params.amount);

    // Validate amount
    if (amountNano <= 0n) {
      throw new Error("Amount must be greater than 0");
    }

    // Check balance before building BOC (fast-fail for obvious insufficient balance)
    const lastBlock = await (agent.connection as any).getLastBlock();
    const accountState = await (agent.connection as any).getAccount(
      lastBlock.last.seqno,
      agent.wallet.address,
    );
    const balanceNano = accountState.account.balance.coins;
    if (amountNano > balanceNano) {
      throw new Error(
        `Insufficient balance: have ${fromNano(balanceNano)} TON, need ${params.amount} TON`,
      );
    }

    // ── Step 1: Build the transfer BOC (ONCE) ──
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

    const seqno = await walletContract.getSeqno();

    const internalMessage = internal({
      to: toAddress,
      value: amountNano,
      bounce: false,
      body: params.comment ? buildCommentBody(params.comment) : undefined,
    });

    // createTransfer returns a signed Cell — used for both emulation and sending
    const transferCell = walletContract.createTransfer({
      seqno,
      secretKey,
      messages: [internalMessage],
    });

    // ── Step 2: If simulate or simulateFirst → emulate ──
    let simResult: Awaited<ReturnType<typeof emulateTransaction>> | undefined;

    if (params.simulate || params.simulateFirst) {
      // Serialize the signed cell into the full external message BOC
      const ext = external({
        to: walletContract.address,
        body: transferCell,
      });
      const boc = beginCell()
        .store(storeMessage(ext))
        .endCell()
        .toBoc()
        .toString("base64");

      simResult = await emulateTransaction(
        boc,
        agent.network,
        params.amount,
        toAddress.toRawString(),
        agent.config.TONAPI_KEY,
      );

      // Mode 2: dry-run only — simulate wins if both flags are set
      if (params.simulate) {
        return {
          simulated: true,
          sent: false,
          success: simResult.success,
          gasUsed: simResult.gasUsed,
          estimatedFee: simResult.estimatedFee,
          balanceChange: simResult.balanceChange,
          destinationBalanceChange: simResult.destinationBalanceChange,
          risk: simResult.risk,
          message: simResult.message,
        };
      }

      // Mode 3: simulateFirst — abort if simulation failed
      if (!simResult.success) {
        return {
          simulated: true,
          sent: false,
          success: false,
          reason: simResult.message || "Simulation failed",
          simulation: simResult,
          message: `Transfer aborted: ${simResult.message}`,
        };
      }
      // Simulation passed → fall through to send
    }

    // ── Step 3: Broadcast on-chain (with retry + seqno wait) ──
    await sendTransaction(agent, [internalMessage]);

    const friendlyAddress = toFriendlyAddress(agent.wallet.address, agent.network);

    return {
      txHash: "pending",
      status: "sent",
      sent: true,
      to: params.to,
      friendlyTo: toFriendlyAddress(toAddress, agent.network),
      explorerUrl: `https://${agent.network === 'testnet' ? 'testnet.' : ''}tonviewer.com/${friendlyAddress}`,
      fee: "~0.005 TON",
      // Include simulation metadata when simulateFirst was used
      ...(params.simulateFirst && simResult && {
        simulated: true,
        estimatedFee: simResult.estimatedFee,
      }),
    };
  },
  examples: [
    {
      input: { to: "EQBx2CfDE...", amount: "5" },
      output: { txHash: "abc123", status: "sent", fee: "~0.005 TON" },
      description: "Send 5 TON to an address",
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

import { z } from "zod";
import { Address, toNano, fromNano, internal, external, beginCell, storeMessage } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import {
  createWalletContract,
  DEFAULT_SEND_MODE,
  defineAction,
  isSigningWallet,
  sendTransaction,
  toFriendlyAddress,
} from "@ton-agent-kit/core";
import { emulateTransaction } from "../utils/emulate";

interface TransferTonInput {
  to: string;
  amount: string;
  comment?: string;
  simulate?: boolean;
  simulateFirst?: boolean;
}

/**
 * Everything `transfer_ton` reports. The three modes (dry run, aborted
 * simulate-first, sent) each fill a different subset, so the type is declared
 * rather than inferred from the return statements.
 */
interface TransferTonResult {
  simulated?: boolean;
  sent?: boolean;
  success?: boolean;
  gasUsed?: string;
  estimatedFee?: string;
  balanceChange?: string;
  destinationBalanceChange?: string;
  risk?: string;
  reason?: string;
  simulation?: Awaited<ReturnType<typeof emulateTransaction>>;
  txHash?: string;
  status?: string;
  to?: string;
  friendlyTo?: string;
  explorerUrl?: string;
  fee?: string;
  message?: string;
}

export const transferTonAction = defineAction<TransferTonInput, TransferTonResult>({
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
    const balanceClient = new TonClient4({ endpoint: agent.rpcUrl });
    const lastBlock = await balanceClient.getLastBlock();
    const accountState = await balanceClient.getAccount(
      lastBlock.last.seqno,
      agent.wallet.address,
    );
    // TonClient4 reports the balance as a decimal string.
    const balanceNano = BigInt(accountState.account.balance.coins);
    if (amountNano > balanceNano) {
      throw new Error(
        `Insufficient balance: have ${fromNano(balanceNano)} TON, need ${params.amount} TON`,
      );
    }

    // Step 1: Build the transfer BOC (ONCE)
    if (!isSigningWallet(agent.wallet)) {
      throw new Error(
        "[transferTonAction] This wallet cannot sign. Attach a KeypairWallet to the agent.",
      );
    }
    const { secretKey, publicKey, walletConfig } = agent.wallet.getCredentials();

    const internalMessage = internal({
      to: toAddress,
      value: amountNano,
      bounce: false,
      body: params.comment ? buildCommentBody(params.comment) : undefined,
    });

    // Step 2: If simulate or simulateFirst, emulate.
    //
    // Everything below is for emulation only: a plain send goes through
    // sendTransaction, which handles every wallet version. The V5R1 guard, the
    // extra client, the seqno read and the Ed25519 signature used to run
    // unconditionally, so transfer_ton on a V4 wallet failed with a simulation
    // error and never reached the send path the comment promised it, and a
    // plain transfer paid for a signed cell nothing used.
    let simResult: Awaited<ReturnType<typeof emulateTransaction>> | undefined;

    if (params.simulate || params.simulateFirst) {
      const contract = createWalletContract(publicKey, {
        ...walletConfig,
        network: agent.network,
      });
      if (!(contract instanceof WalletContractV5R1)) {
        return {
          simulated: false,
          sent: false,
          success: false,
          reason: `Simulation builds a V5R1 external message, and this agent uses ${walletConfig.version ?? "an older version"}. Call transfer_ton without simulate to send it.`,
          message: "Simulation is only available on a V5R1 wallet.",
        };
      }

      const freshClient = new TonClient4({ endpoint: agent.rpcUrl });
      const walletContract = freshClient.open(contract);
      const seqno = await walletContract.getSeqno();

      // createTransfer returns a signed Cell, serialized into the external
      // message the emulator needs. The send path does not use it.
      const transferCell = walletContract.createTransfer({
        seqno,
        secretKey,
        messages: [internalMessage],
        sendMode: DEFAULT_SEND_MODE,
      });

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

      // Mode 2: dry-run only. Simulate wins if both flags are set.
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

      // Mode 3: simulateFirst, abort if simulation failed
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
      // Simulation passed, fall through to send
    }

    // Step 3: Broadcast on-chain (with retry and seqno wait)
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

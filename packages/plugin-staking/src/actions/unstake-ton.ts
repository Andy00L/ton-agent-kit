import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { defineAction } from "@ton-agent-kit/core";

export const unstakeTonAction = defineAction({
  name: "unstake_ton",
  description:
    "Unstake TON from a validator pool. Initiates withdrawal from a staking pool.",
  schema: z.object({
    poolAddress: z.string().describe("Staking pool contract address"),
  }),
  handler: async (agent, params) => {
    const poolAddr = Address.parse(params.poolAddress);
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

    // Withdraw op
    const withdrawBody = beginCell()
      .storeUint(0x47d54392, 32) // withdraw op
      .storeUint(0, 64) // query_id
      .endCell();

    await walletContract.sendTransfer({
      seqno,
      secretKey,
      messages: [
        internal({
          to: poolAddr,
          value: toNano("0.1"),
          bounce: true,
          body: withdrawBody,
        }),
      ],
    });

    return { status: "sent", pool: params.poolAddress, action: "unstake" };
  },
});

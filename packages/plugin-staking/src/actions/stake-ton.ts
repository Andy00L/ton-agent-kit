import { z } from "zod";
import { Address, beginCell, internal, toNano } from "@ton/core";
import { TonClient4, WalletContractV5R1 } from "@ton/ton";
import { defineAction } from "@ton-agent-kit/core";

export const stakeTonAction = defineAction({
  name: "stake_ton",
  description:
    "Stake TON with a validator pool. Sends TON to a staking pool contract.",
  schema: z.object({
    poolAddress: z.string().describe("Staking pool contract address"),
    amount: z.string().describe("Amount of TON to stake"),
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

    // Staking deposit message: send TON with a deposit op code
    const depositBody = beginCell()
      .storeUint(0x47d54391, 32) // deposit op
      .storeUint(0, 64) // query_id
      .endCell();

    await walletContract.sendTransfer({
      seqno,
      secretKey,
      messages: [
        internal({
          to: poolAddr,
          value: toNano(params.amount),
          bounce: true,
          body: depositBody,
        }),
      ],
    });

    return {
      status: "sent",
      pool: params.poolAddress,
      amount: params.amount,
    };
  },
});

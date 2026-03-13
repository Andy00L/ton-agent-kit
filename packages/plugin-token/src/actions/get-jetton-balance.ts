import { z } from "zod";
import { Address, fromNano } from "@ton/core";
import { JettonMaster } from "@ton/ton";
import { defineAction, type JettonBalanceResult } from "@ton-agent-kit/core";

export const getJettonBalanceAction = defineAction<
  { jettonAddress: string; ownerAddress?: string },
  JettonBalanceResult
>({
  name: "get_jetton_balance",
  description:
    "Get the balance of a specific Jetton (token) for a wallet. Provide the Jetton master address. If no owner is specified, checks the agent's own balance.",
  schema: z.object({
    jettonAddress: z.string().describe("Jetton master contract address"),
    ownerAddress: z.string().optional().describe("Wallet address to check. Defaults to agent's own address."),
  }),
  handler: async (agent, params) => {
    const jettonMasterAddr = Address.parse(params.jettonAddress);
    const ownerAddr = params.ownerAddress
      ? Address.parse(params.ownerAddress)
      : agent.wallet.address;

    const jettonMaster = (agent.connection as any).open(
      JettonMaster.create(jettonMasterAddr)
    );

    // Get jetton data for metadata
    const jettonData = await jettonMaster.getJettonData();

    // Get the owner's jetton wallet address
    const jettonWalletAddr = await jettonMaster.getWalletAddress(ownerAddr);

    // Get balance from the jetton wallet
    let balanceRaw = "0";
    try {
      const lastBlock = await (agent.connection as any).getLastBlock();
      const walletState = await (agent.connection as any).getAccount(
        lastBlock.last.seqno,
        jettonWalletAddr
      );
      if (walletState.account.state.type === "active") {
        // Parse the jetton wallet data to get balance
        const { JettonWallet } = require("@ton/ton");
        const jWallet = (agent.connection as any).open(
          JettonWallet.create(jettonWalletAddr)
        );
        const balance = await jWallet.getBalance();
        balanceRaw = balance.toString();
      }
    } catch {
      balanceRaw = "0";
    }

    const decimals = 9; // TON standard
    const balance = fromNano(BigInt(balanceRaw));

    return {
      balance,
      balanceRaw,
      symbol: "JETTON",
      name: "Jetton",
      decimals,
    };
  },
});

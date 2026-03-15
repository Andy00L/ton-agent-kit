import { Address, type MessageRelaxed } from "@ton/core";
import { KeyPair, mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import {
  TonClient4,
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
} from "@ton/ton";
import type { WalletProvider } from "./types";

export type WalletVersion = "V3R2" | "V4" | "V5R1";

export interface WalletConfig {
  version?: WalletVersion;
  workchain?: number;
  network?: "testnet" | "mainnet";
  subwalletNumber?: number;
}

const NETWORK_IDS = {
  testnet: -3,
  mainnet: -239,
} as const;

function createWalletContract(publicKey: Buffer, config: WalletConfig = {}) {
  const version = config.version || "V5R1";
  const workchain = config.workchain || 0;
  const network = config.network || "mainnet";

  switch (version) {
    case "V3R2":
      return WalletContractV3R2.create({ workchain, publicKey });
    case "V4":
      return WalletContractV4.create({ workchain, publicKey });
    case "V5R1":
      return WalletContractV5R1.create({
        workchain,
        publicKey,
        walletId: {
          networkGlobalId: NETWORK_IDS[network],
          workchain,
          subwalletNumber: config.subwalletNumber ?? 0,
        },
      });
    default:
      throw new Error(`Unsupported wallet version: ${version}`);
  }
}

export class KeypairWallet implements WalletProvider {
  public address: Address;
  public readonly version: WalletVersion;
  private keyPair: KeyPair;
  private walletConfig: WalletConfig;
  private rpcUrl: string = "";

  private constructor(keyPair: KeyPair, config: WalletConfig) {
    this.keyPair = keyPair;
    this.walletConfig = config;
    this.version = config.version || "V5R1";
    const contract = createWalletContract(keyPair.publicKey, config);
    this.address = contract.address;
  }

  static async fromMnemonic(
    mnemonic: string[],
    config: WalletConfig = {},
  ): Promise<KeypairWallet> {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    return new KeypairWallet(keyPair, config);
  }

  static fromSecretKey(
    secretKey: Buffer,
    config: WalletConfig = {},
  ): KeypairWallet {
    const publicKey = secretKey.subarray(32);
    const keyPair: KeyPair = { secretKey, publicKey };
    return new KeypairWallet(keyPair, config);
  }

  static async autoDetect(
    mnemonic: string[],
    client: TonClient4,
    network: "testnet" | "mainnet" = "mainnet",
  ): Promise<KeypairWallet> {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const versions: WalletVersion[] = ["V5R1", "V4", "V3R2"];
    const lastBlock = await client.getLastBlock();

    for (const version of versions) {
      const config: WalletConfig = { version, network };
      const contract = createWalletContract(keyPair.publicKey, config);

      try {
        const state = await client.getAccount(
          lastBlock.last.seqno,
          contract.address,
        );
        if (state.account.balance.coins > 0n) {
          console.error(
            `Auto-detected wallet: ${version} (${contract.address.toString({ testOnly: network === "testnet", bounceable: false })})`,
          );
          return new KeypairWallet(keyPair, config);
        }
      } catch {
        // Skip
      }
    }

    console.error("No existing wallet found, defaulting to V5R1");
    return new KeypairWallet(keyPair, { version: "V5R1", network });
  }

  /**
   * Set the RPC URL — called by TonAgentKit on init
   */
  setClient(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Send messages using a fresh client every time.
   * This is the proven pattern that works on both testnet and mainnet.
   */
  async sendTransfer(messages: MessageRelaxed[]): Promise<void> {
    if (!this.rpcUrl) {
      throw new Error(
        "RPC URL not set. Let TonAgentKit handle initialization.",
      );
    }

    const freshClient = new TonClient4({ endpoint: this.rpcUrl });
    const freshContract = createWalletContract(
      this.keyPair.publicKey,
      this.walletConfig,
    );
    const contract = freshClient.open(freshContract);

    const seqno = await contract.getSeqno();

    await contract.sendTransfer({
      seqno,
      secretKey: this.keyPair.secretKey,
      messages,
    });
  }

  /**
   * Get the raw materials for handlers that need direct contract access.
   * Returns everything needed to call sendTransfer on a fresh contract.
   */
  getCredentials(): {
    secretKey: Buffer;
    publicKey: Buffer;
    walletConfig: WalletConfig;
  } {
    return {
      secretKey: this.keyPair.secretKey,
      publicKey: this.keyPair.publicKey,
      walletConfig: this.walletConfig,
    };
  }

  async sign(data: Buffer): Promise<Buffer> {
    const { sign } = await import("@ton/crypto");
    return sign(data, this.keyPair.secretKey);
  }

  /**
   * Generate multiple new wallets with fresh mnemonics.
   * @param count - Number of wallets to generate
   * @param options - Optional network setting (default: "mainnet")
   * @returns Array of { wallet, mnemonic } objects
   */
  static async generateMultiple(
    count: number,
    options?: { network?: "testnet" | "mainnet" },
  ): Promise<{ wallet: KeypairWallet; mnemonic: string[] }[]> {
    const results: { wallet: KeypairWallet; mnemonic: string[] }[] = [];
    const network = options?.network || "mainnet";

    for (let i = 0; i < count; i++) {
      const mnemonic = await mnemonicNew(24);
      const wallet = await KeypairWallet.fromMnemonic(mnemonic, {
        version: "V5R1",
        network,
      });
      results.push({ wallet, mnemonic });
    }

    console.warn(
      `Generated ${count} wallets. Save the mnemonics securely — they cannot be recovered.`,
    );
    return results;
  }

  static async getAllAddresses(
    mnemonic: string[],
    network: "testnet" | "mainnet" = "mainnet",
  ): Promise<Record<WalletVersion, string>> {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    const versions: WalletVersion[] = ["V3R2", "V4", "V5R1"];
    const result: Record<string, string> = {};

    for (const version of versions) {
      const contract = createWalletContract(keyPair.publicKey, {
        version,
        network,
      });
      result[version] = contract.address.toString({
        testOnly: network === "testnet",
        bounceable: false,
      });
    }

    return result as Record<WalletVersion, string>;
  }
}

export class ReadOnlyWallet implements WalletProvider {
  public address: Address;

  constructor(address: string | Address) {
    this.address =
      typeof address === "string" ? Address.parse(address) : address;
  }

  async sendTransfer(): Promise<void> {
    throw new Error("ReadOnlyWallet cannot sign transactions.");
  }
}

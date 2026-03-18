import { Address, type MessageRelaxed } from "@ton/core";
import { KeyPair, mnemonicNew, mnemonicToPrivateKey } from "@ton/crypto";
import {
  TonClient4,
  WalletContractV3R2,
  WalletContractV4,
  WalletContractV5R1,
} from "@ton/ton";
import type { WalletProvider } from "./types";

/**
 * Supported TON wallet contract versions.
 *
 * - `"V3R2"` - Wallet V3 revision 2 (legacy).
 * - `"V4"` - Wallet V4 (widely supported).
 * - `"V5R1"` - Wallet V5 revision 1 (latest, recommended).
 *
 * @since 1.0.0
 */
export type WalletVersion = "V3R2" | "V4" | "V5R1";

/**
 * Configuration options for creating a {@link KeypairWallet}.
 *
 * @since 1.0.0
 */
export interface WalletConfig {
  /** The wallet contract version. Defaults to `"V5R1"`. */
  version?: WalletVersion;
  /** The workchain ID. Defaults to `0` (basechain). */
  workchain?: number;
  /** The target network. Affects address format and wallet ID. Defaults to `"mainnet"`. */
  network?: "testnet" | "mainnet";
  /** Sub-wallet number for V5R1 wallets. Defaults to `0`. */
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

/**
 * A wallet backed by an Ed25519 keypair that can sign and send TON transactions.
 *
 * Supports wallet contract versions V3R2, V4, and V5R1. Create instances via the
 * static factory methods rather than calling the private constructor directly.
 *
 * @example
 * ```typescript
 * import { KeypairWallet } from "@ton-agent-kit/core";
 *
 * // From a 24-word mnemonic
 * const wallet = await KeypairWallet.fromMnemonic(mnemonic, {
 *   version: "V5R1",
 *   network: "testnet",
 * });
 *
 * // Auto-detect the correct version from on-chain state
 * const wallet2 = await KeypairWallet.autoDetect(mnemonic, tonClient, "mainnet");
 *
 * console.log(wallet.address.toString());
 * ```
 *
 * @since 1.0.0
 */
export class KeypairWallet implements WalletProvider {
  /** The wallet's on-chain address derived from the public key and contract version. */
  public address: Address;
  /** The wallet contract version used by this instance. */
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

  /**
   * Create a wallet from a BIP-39 mnemonic phrase.
   *
   * @param mnemonic - The 24-word mnemonic as a string array.
   * @param config - Optional wallet configuration (version, network, etc.).
   * @returns A new `KeypairWallet` instance.
   *
   * @example
   * ```typescript
   * const wallet = await KeypairWallet.fromMnemonic(
   *   "word1 word2 ... word24".split(" "),
   *   { version: "V5R1", network: "testnet" },
   * );
   * ```
   *
   * @since 1.0.0
   */
  static async fromMnemonic(
    mnemonic: string[],
    config: WalletConfig = {},
  ): Promise<KeypairWallet> {
    const keyPair = await mnemonicToPrivateKey(mnemonic);
    return new KeypairWallet(keyPair, config);
  }

  /**
   * Create a wallet from a raw 64-byte Ed25519 secret key (first 32 bytes secret, last 32 bytes public).
   *
   * @param secretKey - The 64-byte Ed25519 secret key buffer.
   * @param config - Optional wallet configuration (version, network, etc.).
   * @returns A new `KeypairWallet` instance.
   *
   * @since 1.0.0
   */
  static fromSecretKey(
    secretKey: Buffer,
    config: WalletConfig = {},
  ): KeypairWallet {
    const publicKey = secretKey.subarray(32);
    const keyPair: KeyPair = { secretKey, publicKey };
    return new KeypairWallet(keyPair, config);
  }

  /**
   * Auto-detect the correct wallet version by checking on-chain balances.
   *
   * Tries V5R1, V4, and V3R2 in order, returning the first version whose
   * address has a non-zero balance. Falls back to V5R1 if no funded wallet is found.
   *
   * @param mnemonic - The 24-word mnemonic as a string array.
   * @param client - A `TonClient4` instance for querying on-chain state.
   * @param network - The target network. Defaults to `"mainnet"`.
   * @returns A `KeypairWallet` using the detected (or default) wallet version.
   *
   * @example
   * ```typescript
   * const client = new TonClient4({ endpoint: "https://testnet-v4.tonhubapi.com" });
   * const wallet = await KeypairWallet.autoDetect(mnemonic, client, "testnet");
   * console.log(wallet.version); // e.g. "V5R1"
   * ```
   *
   * @since 1.0.0
   */
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
   * Set the RPC endpoint URL for this wallet. Called internally by {@link TonAgentKit}
   * during initialization.
   *
   * @param rpcUrl - The TON HTTP API v4 endpoint URL.
   *
   * @since 1.0.0
   */
  setClient(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Send one or more outgoing messages by creating a fresh `TonClient4` for each call.
   *
   * This pattern avoids stale connection state and is proven to work reliably
   * on both testnet and mainnet.
   *
   * @param messages - The outgoing messages to send.
   * @returns Resolves when the transfer has been submitted to the network.
   * @throws {Error} When the RPC URL has not been set (wallet not attached to an agent).
   *
   * @since 1.0.0
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
   * Return the raw cryptographic credentials and wallet configuration.
   *
   * Intended for action handlers that need direct contract access (e.g. the
   * low-level {@link sendTransaction} utility).
   *
   * @returns An object containing the secret key, public key, and wallet config.
   *
   * @since 1.0.0
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

  /**
   * Sign arbitrary data with the wallet's Ed25519 secret key.
   *
   * Useful for identity proofs and off-chain message signing.
   *
   * @param data - The raw data buffer to sign.
   * @returns The 64-byte Ed25519 signature.
   *
   * @since 1.0.0
   */
  async sign(data: Buffer): Promise<Buffer> {
    const { sign } = await import("@ton/crypto");
    return sign(data, this.keyPair.secretKey);
  }

  /**
   * Generate multiple new wallets, each with a fresh 24-word mnemonic.
   *
   * All generated wallets use V5R1. The mnemonics are printed to `console.warn`
   * as a reminder to store them securely.
   *
   * @param count - Number of wallets to generate.
   * @param options - Optional settings.
   * @param options.network - The target network. Defaults to `"mainnet"`.
   * @returns An array of `{ wallet, mnemonic }` objects.
   *
   * @example
   * ```typescript
   * const wallets = await KeypairWallet.generateMultiple(3, { network: "testnet" });
   * for (const { wallet, mnemonic } of wallets) {
   *   console.log(wallet.address.toString(), mnemonic.join(" "));
   * }
   * ```
   *
   * @since 1.0.0
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

  /**
   * Derive the wallet addresses for all supported contract versions from a single mnemonic.
   *
   * Useful for showing the user all possible addresses for their seed phrase.
   *
   * @param mnemonic - The 24-word mnemonic as a string array.
   * @param network - The target network. Defaults to `"mainnet"`.
   * @returns A record mapping each {@link WalletVersion} to its user-friendly address string.
   *
   * @example
   * ```typescript
   * const addresses = await KeypairWallet.getAllAddresses(mnemonic, "testnet");
   * console.log(addresses.V5R1); // "0QB3..."
   * console.log(addresses.V4);   // "0QB7..."
   * ```
   *
   * @since 1.0.0
   */
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

/**
 * A read-only wallet that can observe an address but cannot sign transactions.
 *
 * Useful for monitoring balances, querying on-chain state, or building
 * read-only agent configurations.
 *
 * @example
 * ```typescript
 * const wallet = new ReadOnlyWallet("EQD...");
 * const agent = new TonAgentKit(wallet);
 * // agent can run read actions but will throw on write actions
 * ```
 *
 * @since 1.0.0
 */
export class ReadOnlyWallet implements WalletProvider {
  /** The observed wallet address. */
  public address: Address;

  /**
   * Create a read-only wallet for the given address.
   *
   * @param address - A TON address string or `Address` instance to observe.
   *
   * @since 1.0.0
   */
  constructor(address: string | Address) {
    this.address =
      typeof address === "string" ? Address.parse(address) : address;
  }

  /**
   * Always throws because a read-only wallet has no signing key.
   *
   * @throws {Error} Always, with the message "ReadOnlyWallet cannot sign transactions."
   *
   * @since 1.0.0
   */
  async sendTransfer(): Promise<void> {
    throw new Error("ReadOnlyWallet cannot sign transactions.");
  }
}

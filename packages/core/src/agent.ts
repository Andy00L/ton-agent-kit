import { TonClient4 } from "@ton/ton";
import { PluginRegistry } from "./plugin";
import type {
  Action,
  AgentContext,
  Plugin,
  TonAgentKitConfig,
  TonNetwork,
  WalletProvider,
} from "./types";
import { RPC_ENDPOINTS } from "./utils";
import { KeypairWallet } from "./wallet";

/**
 * TonAgentKit — the main entry point for connecting AI agents to TON.
 *
 * @example
 * ```ts
 * const wallet = await KeypairWallet.fromMnemonic(mnemonic, {
 *   version: "V5R1",
 *   network: "testnet",
 * });
 * const agent = new TonAgentKit(wallet, "https://testnet-v4.tonhubapi.com")
 *   .use(TokenPlugin)
 *   .use(DefiPlugin);
 *
 * const balance = await agent.runAction("get_balance", {});
 * ```
 */
export class TonAgentKit {
  public readonly wallet: WalletProvider;
  public readonly connection: TonClient4;
  public readonly network: TonNetwork;
  public readonly rpcUrl: string;
  public readonly config: TonAgentKitConfig;
  public readonly methods: Record<string, (params: any) => Promise<any>>;

  private registry: PluginRegistry;
  private context: AgentContext;
  private initialized: boolean = false;

  constructor(
    wallet: WalletProvider,
    rpcUrl?: string,
    config?: TonAgentKitConfig,
    network?: TonNetwork,
  ) {
    this.wallet = wallet;
    this.network =
      network || (rpcUrl?.includes("testnet") ? "testnet" : "mainnet");
    this.rpcUrl = rpcUrl || RPC_ENDPOINTS[this.network];
    this.config = config || {};
    this.registry = new PluginRegistry();

    // Create TON client
    this.connection = new TonClient4({ endpoint: this.rpcUrl });

    // If wallet supports setClient, inject the connection
    if (wallet instanceof KeypairWallet) {
      wallet.setClient(this.rpcUrl);
    }

    // Create agent context
    this.context = {
      connection: this.connection,
      wallet: this.wallet,
      network: this.network,
      rpcUrl: this.rpcUrl,
      config: this.config as Record<string, string>,
    };

    // Create methods proxy for convenient access
    this.methods = new Proxy(
      {} as Record<string, (params: any) => Promise<any>>,
      {
        get: (_target, prop: string) => {
          return (params: any) => this.runAction(prop, params);
        },
      },
    );
  }

  /**
   * Quick factory: create agent from mnemonic with auto-detect wallet version
   */
  static async fromMnemonic(
    mnemonic: string[],
    rpcUrl?: string,
    config?: TonAgentKitConfig,
    network?: TonNetwork,
  ): Promise<TonAgentKit> {
    const net =
      network || (rpcUrl?.includes("testnet") ? "testnet" : "mainnet");
    const url = rpcUrl || RPC_ENDPOINTS[net];
    const client = new TonClient4({ endpoint: url });

    const wallet = await KeypairWallet.autoDetect(mnemonic, client, net);
    return new TonAgentKit(wallet, url, config, net);
  }

  // ============================================================
  // Plugin Management
  // ============================================================

  use(plugin: Plugin): this {
    this.registry.register(plugin);
    return this;
  }

  // ============================================================
  // Action Execution
  // ============================================================

  async runAction<TOutput = any>(
    actionName: string,
    params: any,
  ): Promise<TOutput> {
    if (!this.initialized) {
      await this.initializePlugins();
      this.initialized = true;
    }

    const action = this.registry.getAction(actionName);
    if (!action) {
      const available = this.getAvailableActions()
        .map((a) => a.name)
        .join(", ");
      throw new Error(
        `Action "${actionName}" not found. Available: ${available}`,
      );
    }

    const parsed = action.schema.safeParse(params);
    if (!parsed.success) {
      throw new Error(
        `Invalid params for "${actionName}": ${parsed.error.message}`,
      );
    }

    try {
      return await action.handler(this.context, parsed.data);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Action "${actionName}" failed: ${error.message}`);
    }
  }

  // ============================================================
  // Introspection
  // ============================================================

  getAvailableActions(): Action[] {
    return this.registry.getAllActions();
  }

  getPlugins(): Plugin[] {
    return this.registry.getAllPlugins();
  }

  get actionCount(): number {
    return this.registry.actionCount;
  }

  get address(): string {
    return this.wallet.address.toString();
  }

  // ============================================================
  // Internal
  // ============================================================

  private async initializePlugins(): Promise<void> {
    for (const plugin of this.registry.getAllPlugins()) {
      if (plugin.initialize) {
        await plugin.initialize(this.context);
      }
    }
  }
}

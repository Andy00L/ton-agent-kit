import { readFileSync } from "fs";
import { toJSONSchema } from "zod";
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
import { ActionCache, type CacheConfig } from "./cache";

/**
 * Configuration options for the autonomous {@link TonAgentKit.runLoop} method.
 *
 * @since 1.0.0
 */
export interface RunLoopOptions {
  /** Maximum number of LLM reasoning iterations before stopping. Defaults to `5`. */
  maxIterations?: number;
  /** The LLM provider to use. Currently only `"openai"` (and compatible APIs) is supported. */
  provider?: "openai";
  /** The model identifier to use (e.g. `"gpt-4.1-nano"`). Defaults to `AI_MODEL` env var or `"gpt-4.1-nano"`. */
  model?: string;
  /** API key for the LLM provider. Defaults to `OPENAI_API_KEY` env var. */
  apiKey?: string;
  /** Optional base URL override for OpenAI-compatible endpoints (e.g. OpenRouter). */
  baseURL?: string;
  /** Whether to log progress to the console. Defaults to `true`. */
  verbose?: boolean;
  /** Called at the start of each LLM iteration. */
  onIteration?: (iteration: number, maxIterations: number) => void;
  /** Called before an action is executed. */
  onActionStart?: (actionName: string, params: any) => void;
  /** Called after an action returns. */
  onActionResult?: (actionName: string, params: any, result: any) => void;
  /** Called when the agent finishes (no more tool calls). */
  onComplete?: () => void;
}

/**
 * The result returned by {@link TonAgentKit.runLoop} after the autonomous loop completes.
 *
 * @since 1.0.0
 */
export interface RunLoopResult {
  /** The original goal string that was passed to `runLoop`. */
  goal: string;
  /** Ordered list of actions executed, with their parameters and results. */
  steps: Array<{ action: string; params: any; result: any }>;
  /** LLM-generated summary of what was accomplished. */
  summary: string;
}

/** Read a key from .env file (fallback when dotenv doesn't load) */
function readEnvKey(key: string): string {
  try {
    return readFileSync(".env", "utf-8")
      .split("\n")
      .find((l) => l.startsWith(key + "="))
      ?.slice(key.length + 1)
      .trim() || "";
  } catch {
    return "";
  }
}

/**
 * The main entry point for connecting AI agents to the TON blockchain.
 *
 * `TonAgentKit` manages a wallet, a plugin registry, an action cache, and
 * provides methods for executing blockchain actions, generating LLM-compatible
 * tool definitions, running autonomous agent loops, and executing deterministic
 * strategy workflows.
 *
 * @example
 * ```typescript
 * import { TonAgentKit, KeypairWallet } from "@ton-agent-kit/core";
 * import { TokenPlugin } from "@ton-agent-kit/plugin-token";
 * import { DefiPlugin } from "@ton-agent-kit/plugin-defi";
 *
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
 *
 * @since 1.0.0
 */
export class TonAgentKit {
  /** The wallet provider used for signing and sending transactions. */
  public readonly wallet: WalletProvider;
  /** The TON HTTP API v4 client used for blockchain queries. */
  public readonly connection: TonClient4;
  /** The active network (`"mainnet"` or `"testnet"`). */
  public readonly network: TonNetwork;
  /** The RPC endpoint URL used by the client. */
  public readonly rpcUrl: string;
  /** User-supplied configuration (API keys, custom settings). */
  public readonly config: TonAgentKitConfig;
  /** Proxy object for calling actions as methods (e.g. `agent.methods.get_balance({})`). */
  public readonly methods: Record<string, (params: any) => Promise<any>>;
  /** The TTL-based cache for read action results. */
  public readonly cache: ActionCache;

  private registry: PluginRegistry;
  private context: AgentContext;
  private initialized: boolean = false;
  private strategyRunner?: any;

  /**
   * Create a new TonAgentKit instance.
   *
   * @param wallet - The wallet provider for signing transactions.
   * @param rpcUrl - The TON HTTP API v4 endpoint. Auto-detected from network if omitted.
   * @param config - Optional configuration object (API keys, etc.).
   * @param network - The target network. Inferred from `rpcUrl` if omitted.
   * @param cacheConfig - Optional cache configuration overrides.
   *
   * @since 1.0.0
   */
  constructor(
    wallet: WalletProvider,
    rpcUrl?: string,
    config?: TonAgentKitConfig,
    network?: TonNetwork,
    cacheConfig?: CacheConfig,
  ) {
    this.wallet = wallet;
    this.network =
      network || (rpcUrl?.includes("testnet") ? "testnet" : "mainnet");
    this.rpcUrl = rpcUrl || RPC_ENDPOINTS[this.network];
    this.config = config || {};
    this.cache = new ActionCache(cacheConfig);
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
   * Factory method that creates a TonAgentKit from a BIP-39 mnemonic, automatically
   * detecting the correct wallet version by checking on-chain balances.
   *
   * @param mnemonic - The 24-word mnemonic phrase as a string array.
   * @param rpcUrl - Optional RPC endpoint. Defaults to the standard endpoint for the detected network.
   * @param config - Optional configuration object.
   * @param network - Optional network override. Inferred from `rpcUrl` if omitted.
   * @returns A fully initialized `TonAgentKit` instance.
   *
   * @example
   * ```typescript
   * const agent = await TonAgentKit.fromMnemonic(
   *   mnemonic,
   *   "https://testnet-v4.tonhubapi.com",
   * );
   * ```
   *
   * @since 1.0.0
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

  /**
   * Register a plugin and all of its actions with this agent.
   *
   * Returns `this` for fluent chaining (e.g. `agent.use(A).use(B)`).
   *
   * @param plugin - The plugin to register.
   * @returns This `TonAgentKit` instance for chaining.
   * @throws {Error} When the plugin name or any of its action names conflict with already-registered entries.
   *
   * @example
   * ```typescript
   * agent.use(TokenPlugin).use(DefiPlugin).use(EscrowPlugin);
   * ```
   *
   * @since 1.0.0
   */
  use(plugin: Plugin): this {
    this.registry.register(plugin);
    return this;
  }

  // ============================================================
  // Action Execution
  // ============================================================

  /**
   * Execute a registered action by name with the given parameters.
   *
   * Parameters are validated against the action's Zod schema before execution.
   * Read actions may return a cached result if one exists and has not expired.
   * Write actions automatically invalidate related read caches after execution.
   *
   * Plugins are lazily initialized on the first call to `runAction`.
   *
   * @typeParam TOutput - The expected return type of the action.
   * @param actionName - The unique action name (e.g. `"transfer_ton"`).
   * @param params - The action parameters (validated against the action's Zod schema).
   * @returns The action result.
   * @throws {Error} When the action name is not found.
   * @throws {Error} When the parameters fail Zod validation.
   * @throws {Error} When the action handler throws.
   *
   * @example
   * ```typescript
   * const result = await agent.runAction("get_balance", {});
   * console.log(result.balance);
   * ```
   *
   * @since 1.0.0
   */
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

    // Check cache — return cached result if fresh
    const cached = this.cache.get(actionName, parsed.data);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await action.handler(this.context, parsed.data);

      // Store in cache (only for cacheable actions)
      this.cache.set(actionName, parsed.data, result);

      // Write actions invalidate related read caches
      if (!this.cache.isCacheable(actionName)) {
        this.cache.invalidateRelated(actionName);
      }

      return result;
    } catch (err) {
      const error = err as Error;
      throw new Error(`Action "${actionName}" failed: ${error.message}`);
    }
  }

  // ============================================================
  // Introspection
  // ============================================================

  /**
   * Return all actions registered across every plugin.
   *
   * @returns An array of {@link Action} definitions.
   *
   * @since 1.0.0
   */
  getAvailableActions(): Action[] {
    return this.registry.getAllActions();
  }

  /**
   * Return all registered plugins.
   *
   * @returns An array of {@link Plugin} definitions.
   *
   * @since 1.0.0
   */
  getPlugins(): Plugin[] {
    return this.registry.getAllPlugins();
  }

  /**
   * The total number of registered actions across all plugins.
   *
   * @since 1.0.0
   */
  get actionCount(): number {
    return this.registry.actionCount;
  }

  /**
   * The agent's wallet address as a string.
   *
   * @since 1.0.0
   */
  get address(): string {
    return this.wallet.address.toString();
  }

  /**
   * Generate OpenAI-compatible function-calling tool definitions from all registered actions.
   *
   * The returned array is ready to pass directly to any LLM provider that supports the
   * OpenAI tool-calling format (OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together).
   *
   * @returns An array of tool definitions with `type: "function"` and a JSON Schema for parameters.
   *
   * @example
   * ```typescript
   * const tools = agent.toAITools();
   * const response = await openai.chat.completions.create({
   *   model: "gpt-4.1-nano",
   *   messages,
   *   tools,
   * });
   * ```
   *
   * @since 1.0.0
   */
  toAITools(): Array<{ type: "function"; function: { name: string; description: string; parameters: any } }> {
    return this.getAvailableActions().map((action) => {
      const { $schema, ...parameters } = toJSONSchema(action.schema);
      return {
        type: "function" as const,
        function: {
          name: action.name,
          description: action.description,
          parameters,
        },
      };
    });
  }

  // ============================================================
  // Strategy Engine (deterministic workflows)
  // ============================================================

  /**
   * Register a deterministic strategy workflow with the agent.
   *
   * Lazily initializes the `StrategyRunner` from `@ton-agent-kit/strategies` on first use.
   * Returns `this` for fluent chaining.
   *
   * @param strategy - The strategy definition to register.
   * @returns This `TonAgentKit` instance for chaining.
   * @throws {Error} When the `@ton-agent-kit/strategies` package is not installed.
   *
   * @since 1.0.0
   */
  useStrategy(strategy: any): this {
    if (!this.strategyRunner) {
      try {
        const { StrategyRunner } = require("../../strategies/src/index");
        this.strategyRunner = new StrategyRunner(this);
      } catch {
        throw new Error("@ton-agent-kit/strategies package required for strategies.");
      }
    }
    this.strategyRunner.use(strategy);
    return this;
  }

  /**
   * Execute a registered strategy once and return the result.
   *
   * @param name - The strategy name to run.
   * @param variables - Optional runtime variables to inject into the strategy.
   * @returns The strategy execution result.
   * @throws {Error} When no strategies have been loaded via {@link useStrategy}.
   *
   * @since 1.0.0
   */
  async runStrategy(name: string, variables?: Record<string, any>): Promise<any> {
    if (!this.strategyRunner) throw new Error("No strategies loaded. Call agent.useStrategy() first.");
    return this.strategyRunner.run(name, variables);
  }

  /**
   * Start a strategy running on its configured schedule (e.g. interval-based).
   *
   * @param name - The strategy name to start.
   * @param variables - Optional runtime variables to inject into the strategy.
   * @throws {Error} When no strategies have been loaded via {@link useStrategy}.
   *
   * @since 1.0.0
   */
  startStrategy(name: string, variables?: Record<string, any>): void {
    if (!this.strategyRunner) throw new Error("No strategies loaded. Call agent.useStrategy() first.");
    this.strategyRunner.start(name, variables);
  }

  /**
   * Stop a running strategy by name.
   *
   * @param name - The strategy name to stop.
   * @returns `true` if the strategy was running and is now stopped, `false` otherwise.
   *
   * @since 1.0.0
   */
  stopStrategy(name: string): boolean {
    return this.strategyRunner?.stop(name) || false;
  }

  /**
   * Stop all currently running strategies.
   *
   * @since 1.0.0
   */
  stopAllStrategies(): void {
    this.strategyRunner?.stopAll();
  }

  /**
   * Get the names of all currently running strategies.
   *
   * @returns An array of active strategy names, or an empty array if none are running.
   *
   * @since 1.0.0
   */
  getActiveStrategies(): string[] {
    return this.strategyRunner?.getActive() || [];
  }

  // ============================================================
  // Autonomous Agent Loop
  // ============================================================

  /**
   * Run an autonomous agent loop that uses an LLM to pursue a natural-language goal.
   *
   * The loop iterates up to `maxIterations` times, calling the LLM with all registered
   * actions as tools. The LLM decides which actions to call, and this method executes
   * them via {@link runAction}. When the LLM stops emitting tool calls (or the iteration
   * limit is reached), the loop ends with a summary.
   *
   * Requires the `openai` npm package and an API key (set via options or the `OPENAI_API_KEY`
   * environment variable). Compatible with any OpenAI-compatible endpoint.
   *
   * @param goal - A natural-language description of what the agent should accomplish.
   * @param options - Optional loop configuration (model, API key, callbacks, etc.).
   * @returns A {@link RunLoopResult} containing the goal, executed steps, and LLM summary.
   * @throws {Error} When no API key is provided.
   *
   * @example
   * ```typescript
   * const result = await agent.runLoop(
   *   "Check my TON balance and swap 1 TON for USDT if balance > 5",
   *   { model: "gpt-4.1-nano", maxIterations: 10 },
   * );
   * console.log(result.summary);
   * ```
   *
   * @since 1.0.0
   */
  async runLoop(
    goal: string,
    options?: RunLoopOptions,
  ): Promise<RunLoopResult> {
    const maxIterations = options?.maxIterations ?? 5;
    const model = options?.model || process.env.AI_MODEL || "gpt-4.1-nano";
    const apiKey = options?.apiKey || process.env.OPENAI_API_KEY || readEnvKey("OPENAI_API_KEY");
    const baseURL = options?.baseURL || process.env.OPENAI_BASE_URL;
    const verbose = options?.verbose ?? true;

    if (!apiKey) {
      throw new Error(
        "runLoop requires an AI provider API key. Set OPENAI_API_KEY in .env",
      );
    }

    // Dynamic import so the SDK works without openai installed
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey, baseURL });

    // Ensure plugins are initialized
    if (!this.initialized) {
      await this.initializePlugins();
      this.initialized = true;
    }

    // Build OpenAI tools from available actions
    const actions = this.getAvailableActions();
    const tools: Array<{
      type: "function";
      function: { name: string; description: string; parameters: any };
    }> = actions.map((action) => ({
      type: "function" as const,
      function: {
        name: action.name,
        description: action.description,
        parameters: (() => {
            const { $schema, ...schema } = toJSONSchema(action.schema);
            return schema;
          })(),
      },
    }));

    // Build system prompt
    const actionList = actions
      .map((a) => {
        const jsonSchema = toJSONSchema(a.schema) as any;
        const paramNames = JSON.stringify(Object.keys(jsonSchema.properties || {}));
        return `- ${a.name}: ${a.description}\n  Parameters: ${paramNames}`;
      })
      .join("\n");
    const systemPrompt = `You are an autonomous AI agent with a TON blockchain wallet. You have access to the following actions:\n${actionList}\n\nIMPORTANT: When calling functions, use EXACTLY the parameter names listed above. Do NOT rename parameters (e.g. use "to" not "destination", "token" not "token_address").\n\nExecute the user's goal by calling the appropriate actions. When done, provide a summary of what you accomplished.`;

    const messages: Array<any> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: goal },
    ];

    const steps: Array<{ action: string; params: any; result: any }> = [];

    for (let i = 0; i < maxIterations; i++) {
      if (options?.onIteration) {
        options.onIteration(i + 1, maxIterations);
      } else if (verbose) {
        console.log(`\n🔄 Iteration ${i + 1}/${maxIterations}`);
      }

      const response = await client.chat.completions.create({
        model,
        messages,
        tools,
      });

      const choice = response.choices[0];
      if (!choice.message) break;

      messages.push(choice.message);

      // If no tool calls, the LLM is done
      if (
        !choice.message.tool_calls ||
        choice.message.tool_calls.length === 0
      ) {
        if (options?.onComplete) {
          options.onComplete();
        } else if (verbose) {
          console.log("✅ Agent finished reasoning");
        }
        return {
          goal,
          steps,
          summary: choice.message.content || "Goal completed.",
        };
      }

      // Execute each tool call
      for (const toolCall of choice.message.tool_calls as any[]) {
        const actionName = toolCall.function.name;
        let params: any;
        try {
          params = JSON.parse(toolCall.function.arguments);
        } catch {
          params = {};
        }

        // Remap misnamed parameters to match the action schema
        const matchedAction = actions.find((a) => a.name === actionName);
        if (matchedAction) {
          const expectedSchema = toJSONSchema(matchedAction.schema) as any;
          const expectedKeys = new Set(Object.keys(expectedSchema.properties || {}));
          const paramKeys = Object.keys(params);
          for (const key of paramKeys) {
            if (!expectedKeys.has(key)) {
              // Find a matching expected key that isn't already provided
              for (const expected of expectedKeys) {
                if (!(expected in params) && key.toLowerCase().includes(expected.toLowerCase())) {
                  params[expected] = params[key];
                  delete params[key];
                  break;
                }
              }
            }
          }
        }

        if (options?.onActionStart) {
          options.onActionStart(actionName, params);
        } else if (verbose) {
          console.log(`  ▶ ${actionName}(${JSON.stringify(params)})`);
        }

        let result: any;
        try {
          result = await this.runAction(actionName, params);
        } catch (err) {
          result = { error: (err as Error).message };
        }

        if (options?.onActionResult) {
          options.onActionResult(actionName, params, result);
        } else if (verbose) {
          console.log(
            `  ◀ ${typeof result === "string" ? result : JSON.stringify(result)}`,
          );
        }

        steps.push({ action: actionName, params, result });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content:
            typeof result === "string" ? result : JSON.stringify(result),
        });
      }
    }

    // Max iterations reached — ask LLM for a final summary
    messages.push({
      role: "user",
      content:
        "Max iterations reached. Summarize what you accomplished so far.",
    });

    const finalResponse = await client.chat.completions.create({
      model,
      messages,
    });

    return {
      goal,
      steps,
      summary:
        finalResponse.choices[0]?.message?.content ||
        `Completed ${steps.length} steps.`,
    };
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

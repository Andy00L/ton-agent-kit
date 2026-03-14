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

export interface RunLoopOptions {
  maxIterations?: number;
  provider?: "openai";
  model?: string;
  apiKey?: string;
  baseURL?: string;
  verbose?: boolean;
  /** Called at the start of each LLM iteration */
  onIteration?: (iteration: number, maxIterations: number) => void;
  /** Called before an action is executed */
  onActionStart?: (actionName: string, params: any) => void;
  /** Called after an action returns */
  onActionResult?: (actionName: string, params: any, result: any) => void;
  /** Called when the agent finishes (no more tool calls) */
  onComplete?: () => void;
}

export interface RunLoopResult {
  goal: string;
  steps: Array<{ action: string; params: any; result: any }>;
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

  /**
   * Returns OpenAI-compatible function calling tools, ready to use with any LLM provider
   * (OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Together).
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
  // Autonomous Agent Loop
  // ============================================================

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

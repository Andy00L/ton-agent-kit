import type { Plugin, Action } from "./types";

/**
 * Central registry that manages registered plugins and their actions.
 *
 * The registry enforces uniqueness of plugin names and action names across all
 * registered plugins, preventing conflicts at registration time.
 *
 * @example
 * ```typescript
 * const registry = new PluginRegistry();
 * registry.register(TokenPlugin);
 * registry.register(DefiPlugin);
 *
 * const action = registry.getAction("transfer_ton");
 * console.log(registry.actionCount); // total registered actions
 * ```
 *
 * @since 1.0.0
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private actions: Map<string, Action> = new Map();

  /**
   * Register a plugin and all of its actions with the registry.
   *
   * @param plugin - The plugin to register.
   * @throws {Error} When a plugin with the same name is already registered.
   * @throws {Error} When any action name conflicts with an already-registered action.
   *
   * @since 1.0.0
   */
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered.`);
    }

    // Check for action name conflicts
    for (const action of plugin.actions) {
      if (this.actions.has(action.name)) {
        throw new Error(
          `Action "${action.name}" from plugin "${plugin.name}" conflicts with an existing action.`
        );
      }
    }

    // Register plugin and its actions
    this.plugins.set(plugin.name, plugin);
    for (const action of plugin.actions) {
      this.actions.set(action.name, action);
    }
  }

  /**
   * Retrieve a registered action by its unique name.
   *
   * @param name - The action name (e.g. `"transfer_ton"`).
   * @returns The matching {@link Action}, or `undefined` if not found.
   *
   * @since 1.0.0
   */
  getAction(name: string): Action | undefined {
    return this.actions.get(name);
  }

  /**
   * Return all registered actions across every plugin.
   *
   * @returns An array of all {@link Action} instances in registration order.
   *
   * @since 1.0.0
   */
  getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }

  /**
   * Return all registered plugins.
   *
   * @returns An array of all {@link Plugin} instances in registration order.
   *
   * @since 1.0.0
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check whether a plugin with the given name is already registered.
   *
   * @param name - The plugin name to look up.
   * @returns `true` if the plugin is registered, `false` otherwise.
   *
   * @since 1.0.0
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * The total number of registered actions across all plugins.
   *
   * @since 1.0.0
   */
  get actionCount(): number {
    return this.actions.size;
  }

  /**
   * The total number of registered plugins.
   *
   * @since 1.0.0
   */
  get pluginCount(): number {
    return this.plugins.size;
  }
}

/**
 * Create a type-safe plugin definition.
 *
 * This is a helper that provides editor auto-complete and compile-time
 * validation for the {@link Plugin} shape without altering the value at runtime.
 *
 * @param plugin - The plugin object containing a name, actions array, and optional initializer.
 * @returns The same plugin object, now typed as {@link Plugin}.
 *
 * @example
 * ```typescript
 * import { definePlugin, defineAction } from "@ton-agent-kit/core";
 *
 * const MyPlugin = definePlugin({
 *   name: "my-plugin",
 *   actions: [transferAction, balanceAction],
 * });
 * ```
 *
 * @since 1.0.0
 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

/**
 * Create a type-safe action definition.
 *
 * This is a helper that provides editor auto-complete and compile-time
 * validation for the {@link Action} shape. The generic type parameters are
 * inferred from the Zod schema and handler return type.
 *
 * @typeParam TInput - The Zod-validated input type (inferred from `schema`).
 * @typeParam TOutput - The handler return type (inferred from `handler`).
 * @param action - The action object containing name, description, schema, and handler.
 * @returns The same action object, now typed as `Action<TInput, TOutput>`.
 *
 * @example
 * ```typescript
 * import { defineAction } from "@ton-agent-kit/core";
 * import { z } from "zod";
 *
 * const getBalance = defineAction({
 *   name: "get_balance",
 *   description: "Get the TON balance of the agent wallet",
 *   schema: z.object({}),
 *   handler: async (ctx) => {
 *     // ... fetch balance
 *     return { balance: "1.5", balanceRaw: "1500000000", address: "EQ..." };
 *   },
 * });
 * ```
 *
 * @since 1.0.0
 */
export function defineAction<TInput, TOutput>(action: Action<TInput, TOutput>): Action<TInput, TOutput> {
  return action;
}

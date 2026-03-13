import type { Plugin, Action } from "./types";

/**
 * Plugin registry — manages action registration and lookup.
 */
export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private actions: Map<string, Action> = new Map();

  /**
   * Register a plugin and all its actions
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
   * Get an action by name
   */
  getAction(name: string): Action | undefined {
    return this.actions.get(name);
  }

  /**
   * Get all registered actions
   */
  getAllActions(): Action[] {
    return Array.from(this.actions.values());
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Get action count
   */
  get actionCount(): number {
    return this.actions.size;
  }

  /**
   * Get plugin count
   */
  get pluginCount(): number {
    return this.plugins.size;
  }
}

/**
 * Helper to define a plugin with type safety
 */
export function definePlugin(plugin: Plugin): Plugin {
  return plugin;
}

/**
 * Helper to define an action with type safety
 */
export function defineAction<TInput, TOutput>(action: Action<TInput, TOutput>): Action<TInput, TOutput> {
  return action;
}

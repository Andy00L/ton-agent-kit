import { definePlugin } from "@ton-agent-kit/core";
import { FileMemoryStore } from "./stores/file-store";
import type { MemoryStore } from "./stores/types";
import { createSaveContextAction } from "./actions/save-context";
import { createGetContextAction } from "./actions/get-context";
import { createListContextAction } from "./actions/list-context";
import { createDeleteContextAction } from "./actions/delete-context";

/**
 * Create a Memory Plugin with a custom store backend.
 *
 * Supports pluggable storage: file-based (default), Redis (production), or
 * in-memory (tests). The returned plugin exposes four CRUD actions for
 * namespaced key-value context entries.
 *
 * Actions:
 * - `save_context` -- Save a key-value entry to persistent memory
 * - `get_context` -- Retrieve a memory entry by key
 * - `list_context` -- List all entries in a namespace
 * - `delete_context` -- Remove a memory entry
 *
 * @example
 * ```typescript
 * // Default -- file-based, zero config
 * import MemoryPlugin from "@ton-agent-kit/plugin-memory";
 * agent.use(MemoryPlugin);
 *
 * // Redis -- production
 * import { createMemoryPlugin, RedisMemoryStore } from "@ton-agent-kit/plugin-memory";
 * agent.use(createMemoryPlugin(new RedisMemoryStore(redisClient)));
 *
 * // In-memory -- tests
 * import { createMemoryPlugin, InMemoryStore } from "@ton-agent-kit/plugin-memory";
 * agent.use(createMemoryPlugin(new InMemoryStore()));
 * ```
 *
 * @since 1.0.0
 */
export function createMemoryPlugin(store?: MemoryStore) {
  const memoryStore = store || new FileMemoryStore();

  return definePlugin({
    name: "memory",
    actions: [
      createSaveContextAction(memoryStore),
      createGetContextAction(memoryStore),
      createListContextAction(memoryStore),
      createDeleteContextAction(memoryStore),
    ],
  });
}

/**
 * Memory Plugin -- Persistent context storage for AI agents.
 *
 * Provides namespaced key-value storage so agents can remember context across
 * sessions. Ships with file-based persistence by default; swap in Redis or
 * an in-memory store via {@link createMemoryPlugin}.
 *
 * Actions:
 * - `save_context` -- Save a key-value entry to memory
 * - `get_context` -- Retrieve a memory entry by key
 * - `list_context` -- List all entries in a namespace
 * - `delete_context` -- Remove a memory entry
 *
 * Default backend: FileMemoryStore (`.agent-memory.json`)
 *
 * @example
 * ```typescript
 * import MemoryPlugin from "@ton-agent-kit/plugin-memory";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(MemoryPlugin);
 * await agent.runAction("save_context", { key: "last_swap", value: "10 TON" });
 * ```
 *
 * @since 1.0.0
 */
const MemoryPlugin = createMemoryPlugin();
/** @since 1.0.0 */
export default MemoryPlugin;

// Stores
export { FileMemoryStore } from "./stores/file-store";
export { InMemoryStore } from "./stores/memory-store";
export { RedisMemoryStore } from "./stores/redis-store";
export type { RedisClient } from "./stores/redis-store";

// Types
export type { MemoryStore, MemoryEntry } from "./stores/types";

// Action factories
export { createSaveContextAction } from "./actions/save-context";
export { createGetContextAction } from "./actions/get-context";
export { createListContextAction } from "./actions/list-context";
export { createDeleteContextAction } from "./actions/delete-context";

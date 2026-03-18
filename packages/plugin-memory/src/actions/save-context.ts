import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";
import type { MemoryStore } from "../stores/types";

export function createSaveContextAction(store: MemoryStore) {
  return defineAction({
    name: "save_context",
    description:
      "Save a value to persistent memory so you can recall it in future conversations. Use this to remember user preferences, past decisions, trade history, or any context that should survive between runs.",
    schema: z.object({
      key: z.string().describe("Unique key for this memory entry"),
      value: z.string().describe("Value to store (use JSON.stringify for objects)"),
      namespace: z
        .string()
        .optional()
        .describe("Namespace to isolate memory per agent/user/session. Defaults to 'default'."),
      ttl: z
        .number()
        .optional()
        .describe("Time to live in seconds. Memory expires after this duration. No expiration if omitted."),
    }),
    handler: async (_agent, params) => {
      const namespace = params.namespace || "default";
      const savedAt = new Date().toISOString();
      await store.set(namespace, params.key, params.value, params.ttl);
      return {
        saved: true,
        key: params.key,
        namespace,
        expiresIn: params.ttl || null,
        savedAt,
      };
    },
  });
}

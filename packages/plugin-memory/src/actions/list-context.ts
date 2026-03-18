import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";
import type { MemoryStore } from "../stores/types";

export function createListContextAction(store: MemoryStore) {
  return defineAction({
    name: "list_context",
    description:
      "List all saved memory entries in a namespace. Optionally filter by key prefix (e.g., 'trade_' to list all trade memories).",
    schema: z.object({
      namespace: z
        .string()
        .optional()
        .describe("Namespace to list. Defaults to 'default'."),
      prefix: z
        .string()
        .optional()
        .describe("Optional key prefix filter (e.g., 'trade_' to list all trade memories)."),
    }),
    handler: async (_agent, params) => {
      const namespace = params.namespace || "default";
      const entries = await store.list(namespace, params.prefix);
      return {
        namespace,
        entries,
        count: entries.length,
      };
    },
  });
}

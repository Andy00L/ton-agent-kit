import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";
import type { MemoryStore } from "../stores/types";

export function createDeleteContextAction(store: MemoryStore) {
  return defineAction({
    name: "delete_context",
    description:
      "Delete a memory entry by key. Use this to clean up outdated context or remove sensitive data that should no longer be retained.",
    schema: z.object({
      key: z.string().describe("Key to delete"),
      namespace: z
        .string()
        .optional()
        .describe("Namespace to delete from. Defaults to 'default'."),
    }),
    handler: async (_agent, params) => {
      const namespace = params.namespace || "default";
      const deleted = await store.delete(namespace, params.key);
      return {
        deleted,
        key: params.key,
        namespace,
      };
    },
  });
}

import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";
import type { MemoryStore } from "../stores/types";

export function createGetContextAction(store: MemoryStore) {
  return defineAction({
    name: "get_context",
    description:
      "Retrieve a previously saved memory entry by key. Use this to recall past context, user preferences, or cached data from earlier conversations.",
    schema: z.object({
      key: z.string().describe("Key to retrieve"),
      namespace: z
        .string()
        .optional()
        .describe("Namespace to look in. Defaults to 'default'."),
    }),
    handler: async (_agent, params) => {
      const namespace = params.namespace || "default";
      const entry = await store.get(namespace, params.key);
      if (!entry) {
        return {
          found: false,
          key: params.key,
          namespace,
          message: "No memory found for this key.",
        };
      }
      return {
        found: true,
        ...entry,
      };
    },
  });
}

import { z } from "zod";
import { defineAction } from "@ton-agent-kit/core";

/**
 * What this action reads off the memory plugin's results. Another plugin's
 * output is external to this package, so it is validated rather than trusted.
 * sourceRef: packages/plugin-memory/src/actions/list-context.ts
 */
const ListContextResult = z.object({
  entries: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});

/** sourceRef: packages/plugin-memory/src/actions/get-context.ts */
const GetContextResult = z.object({
  found: z.boolean().optional(),
  value: z.string().optional(),
});


export const processPendingRatingsAction = defineAction({
  name: "process_pending_ratings",
  description:
    "Process pending reputation ratings left by completed escrow deals. Each escrow completion (release, auto-release, refund) creates pending ratings for both buyer and seller. Call this to review or auto-submit them.",
  schema: z.object({
    autoSubmit: z
      .boolean()
      .optional()
      .describe("Automatically submit all pending ratings with suggested success values. Defaults to false (returns pending list for review)."),
  }),
  handler: async (agent, params) => {
    // Load pending ratings from memory
    let entries: Array<{ key: string; value: string }> = [];
    try {
      const listed = ListContextResult.safeParse(
        await agent.runAction?.("list_context", { namespace: "pending_ratings" }),
      );
      entries = listed.success ? (listed.data.entries ?? []) : [];
    } catch {
      return {
        processed: 0,
        pending: 0,
        ratings: [],
        message: "Memory plugin not available. Cannot process pending ratings.",
      };
    }

    if (entries.length === 0) {
      return {
        processed: 0,
        pending: 0,
        ratings: [],
        message: "No pending ratings to process.",
      };
    }

    // Parse entries
    const pending: any[] = [];
    for (const entry of entries) {
      try {
        const data = JSON.parse(entry.value);
        pending.push({ ...data, memoryKey: entry.key });
      } catch {
        continue;
      }
    }

    if (!params.autoSubmit) {
      return {
        processed: 0,
        pending: pending.length,
        ratings: pending.map((p) => ({
          escrowId: p.escrowId,
          raterRole: p.raterRole,
          targetAddress: p.targetAddress,
          suggestedSuccess: p.suggestedSuccess,
          escrowOutcome: p.escrowOutcome,
        })),
        message: `${pending.length} pending rating(s) found. Set autoSubmit=true to submit them.`,
      };
    }

    // Auto-submit ratings
    let processed = 0;
    const results: any[] = [];

    for (const rating of pending) {
      try {
        // Find the target agent ID by address match in the registry
        // Use a simple name-based lookup: the target address is stored in the rating
        await agent.runAction?.("get_agent_reputation", {
          agentId: rating.targetAddress,
          addTask: true,
          success: rating.suggestedSuccess,
        });

        // Delete the processed rating from memory
        try {
          await agent.runAction?.("delete_context", {
            key: rating.memoryKey,
            namespace: "pending_ratings",
          });
        } catch {}

        processed++;
        results.push({
          escrowId: rating.escrowId,
          raterRole: rating.raterRole,
          targetAddress: rating.targetAddress,
          success: rating.suggestedSuccess,
          submitted: true,
        });
      } catch (err: any) {
        results.push({
          escrowId: rating.escrowId,
          raterRole: rating.raterRole,
          targetAddress: rating.targetAddress,
          submitted: false,
          error: err.message,
        });
      }
    }

    return {
      processed,
      pending: pending.length - processed,
      ratings: results,
      message: `Processed ${processed}/${pending.length} ratings.`,
    };
  },
});

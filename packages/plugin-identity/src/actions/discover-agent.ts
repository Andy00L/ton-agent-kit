import { z } from "zod";
import { Address } from "@ton/core";
import { defineAction, toFriendlyAddress } from "@ton-agent-kit/core";
import { loadAgentRegistry } from "../utils";
import { resolveContractAddress } from "../reputation-config";
import {
  callContractGetter,
  computeCapabilityHash,
  lookupAgentIndex,
  parseAgentDataFromStack,
  parseIndexCell,
} from "../reputation-helpers";

const SCAN_ALL_THRESHOLD = 5000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function safeFriendly(raw: string, network: string): string {
  if (!raw) return "";
  try { return toFriendlyAddress(Address.parse(raw), network); }
  catch { return raw; }
}

export function createDiscoverAgentAction(contractAddress?: string) {
  return defineAction({
    name: "discover_agent",
    description:
      "Discover registered agents. For registries with 5000+ agents, a 'capability' or 'name' filter is REQUIRED. " +
      "Filter by name for instant O(1) lookup. Filter by capability to find agents offering a specific service. " +
      "Unfiltered scan is available for small registries (< 5000 agents) with pagination.",
    schema: z.object({
      capability: z
        .string()
        .optional()
        .describe("Filter by capability name (recommended for large registries)"),
      name: z.string().optional().describe("Filter by exact agent name (fastest, O(1) lookup)"),
      includeOffline: z
        .boolean()
        .optional()
        .describe("Include offline/unavailable agents. Defaults to false."),
      limit: z.number().optional().describe("Max agents to return (default 50, max 200)"),
      offset: z.number().optional().describe("Skip N agents for pagination (default 0)"),
    }),
    handler: async (agent, params) => {
      const addr = resolveContractAddress(contractAddress, agent.network);
      const apiBase =
        agent.network === "testnet"
          ? "https://testnet.tonapi.io/v2"
          : "https://tonapi.io/v2";

      const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
      const offset = params.offset || 0;

      // ── FAST PATH: O(1) name lookup via on-chain getter ──
      if (params.name && addr) {
        try {
          const idx = await lookupAgentIndex(apiBase, addr, params.name, agent.config.TONAPI_KEY);
          if (idx !== null) {
            const dataRes = await callContractGetter(
              apiBase, addr, "agentData", [idx.toString()], agent.config.TONAPI_KEY,
            );
            const parsed = parseAgentDataFromStack(dataRes?.stack);
            if (parsed && (params.includeOffline || parsed.available)) {
              const rep = parsed.totalTasks > 0
                ? Math.round((parsed.successes / parsed.totalTasks) * 100)
                : 0;
              // Merge with JSON registry for local metadata
              const registry = loadAgentRegistry();
              const jsonAgent: any = Object.values(registry).find(
                (a: any) => a.name === params.name,
              );
              return {
                query: { name: params.name, includeOffline: params.includeOffline },
                count: 1,
                total: 1,
                agents: [{
                  id: jsonAgent?.id,
                  name: params.name,
                  address: parsed.owner,
                  friendlyAddress: safeFriendly(parsed.owner, agent.network),
                  capabilities: jsonAgent?.capabilities || [],
                  available: parsed.available,
                  description: jsonAgent?.description,
                  endpoint: jsonAgent?.endpoint,
                  reputation: { score: rep, totalTasks: parsed.totalTasks, successfulTasks: parsed.successes },
                  registeredAt: parsed.registeredAt,
                  onChain: true,
                }],
                onChain: true,
                contractAddress: addr,
              };
            }
          }
        } catch {
          // On-chain lookup failed — fall through to JSON
        }
      }

      // ── FAST PATH: O(n) capability lookup via on-chain index ──
      if (params.capability && addr) {
        try {
          const capHash = computeCapabilityHash(params.capability);
          const indexRes = await callContractGetter(
            apiBase, addr, "agentsByCapability",
            ["0x" + capHash.toString(16)], agent.config.TONAPI_KEY,
          );
          if (indexRes?.stack?.[0]?.cell) {
            const indexes = parseIndexCell(indexRes.stack[0].cell);
            const agents: any[] = [];
            let skipped = 0;
            for (const idx of indexes) {
              if (agents.length >= limit) break;
              try {
                const dataRes = await callContractGetter(
                  apiBase, addr, "agentData", [idx.toString()], agent.config.TONAPI_KEY,
                );
                const parsed = parseAgentDataFromStack(dataRes?.stack);
                if (!parsed) continue;
                if (!params.includeOffline && !parsed.available) continue;
                if (skipped < offset) { skipped++; continue; }
                const rep = parsed.totalTasks > 0
                  ? Math.round((parsed.successes / parsed.totalTasks) * 100)
                  : 0;
                agents.push({
                  agentIndex: idx,
                  address: parsed.owner,
                  friendlyAddress: safeFriendly(parsed.owner, agent.network),
                  capabilities: [params.capability],
                  available: parsed.available,
                  reputation: { score: rep, totalTasks: parsed.totalTasks, successfulTasks: parsed.successes },
                  registeredAt: parsed.registeredAt,
                  onChain: true,
                });
              } catch { continue; }
            }
            return {
              query: { capability: params.capability, includeOffline: params.includeOffline },
              agents,
              count: agents.length,
              total: indexes.length,
              hasMore: agents.length >= limit,
              nextOffset: offset + agents.length,
              onChain: true,
              indexed: true,
              contractAddress: addr,
            };
          }
        } catch {
          // On-chain lookup failed — fall through to JSON
        }
      }

      // ── Threshold check for unfiltered scans ──
      if (addr && !params.capability && !params.name) {
        try {
          const countRes = await callContractGetter(
            apiBase, addr, "agentCount", [], agent.config.TONAPI_KEY,
          );
          if (countRes?.stack?.[0]?.num) {
            const raw = countRes.stack[0].num;
            const agentCount = Number(BigInt(raw.startsWith("-0x") ? "-" + raw.slice(1) : raw));
            if (agentCount > SCAN_ALL_THRESHOLD) {
              return {
                error: "Registry too large for unfiltered scan",
                agentCount,
                suggestion: "Use 'capability' or 'name' filter. Example: discover_agent({ capability: 'price_feed' })",
                availableFilters: {
                  name: "Exact name lookup — O(1), instant",
                  capability: "By service — reads only matching agents",
                },
              };
            }
          }
        } catch {
          // Contract unreachable — continue with JSON only
        }
      }

      // ── HYBRID PATH: JSON registry + on-chain enrichment (paginated) ──
      const registry = loadAgentRegistry();
      let results = Object.values(registry);

      if (!params.includeOffline) {
        results = results.filter((a: any) => a.available !== false);
      }
      if (params.capability) {
        const cap = params.capability.toLowerCase();
        results = results.filter((a: any) =>
          a.capabilities.some((c: string) => c.toLowerCase().includes(cap)),
        );
      }
      if (params.name) {
        const name = params.name.toLowerCase();
        results = results.filter((a: any) => a.name.toLowerCase().includes(name));
      }

      const total = results.length;
      // Apply pagination
      results = results.slice(offset, offset + limit);

      // Enrich paginated slice with on-chain reputation
      if (addr) {
        for (const a of results as any[]) {
          try {
            const idx = await lookupAgentIndex(apiBase, addr, a.name, agent.config.TONAPI_KEY);
            if (idx !== null) {
              const dataRes = await callContractGetter(
                apiBase, addr, "agentData", [idx.toString()], agent.config.TONAPI_KEY,
              );
              const parsed = parseAgentDataFromStack(dataRes?.stack);
              if (parsed) {
                const rep = parsed.totalTasks > 0
                  ? Math.round((parsed.successes / parsed.totalTasks) * 100)
                  : 0;
                a.reputation = { score: rep, totalTasks: parsed.totalTasks, successfulTasks: parsed.successes };
                a.onChain = true;
              }
            }
          } catch {
            // On-chain lookup failed for this agent — keep JSON data
          }
        }
      }

      return {
        query: { capability: params.capability, name: params.name, includeOffline: params.includeOffline },
        count: results.length,
        total,
        hasMore: offset + results.length < total,
        nextOffset: offset + results.length,
        agents: results.map((a: any) => ({
          id: a.id,
          name: a.name,
          address: a.address,
          friendlyAddress: a.address ? safeFriendly(a.address, agent.network) : "",
          capabilities: a.capabilities,
          available: a.available !== false,
          description: a.description,
          endpoint: a.endpoint,
          reputation: a.reputation,
          registeredAt: a.registeredAt,
          onChain: a.onChain || false,
        })),
        onChain: !!addr,
        contractAddress: addr || undefined,
      };
    },
  });
}

export const discoverAgentAction = createDiscoverAgentAction();

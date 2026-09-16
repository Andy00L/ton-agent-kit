import { existsSync, readFileSync, writeFileSync } from "fs";
import { describeError } from "@ton-agent-kit/core";

const REGISTRY_FILE = ".agent-registry.json";

/** Task counters the registry keeps next to each agent. */
export interface AgentReputation {
  score: number;
  totalTasks: number;
  successfulTasks: number;
}

/**
 * One agent as the local JSON registry stores it.
 *
 * The file is written by this plugin and by the service bot, and older entries
 * predate several of these fields, so everything except the address is
 * optional. On-chain data is the source of truth; this registry only carries
 * the metadata the contract does not hold, such as names and capabilities.
 */
export interface RegisteredAgent {
  id?: string;
  /** Index of the agent in the on-chain registry, for records read on-chain. */
  agentIndex?: number;
  name?: string;
  address: string;
  friendlyAddress?: string;
  capabilities?: string[];
  available?: boolean;
  description?: string;
  endpoint?: string | null;
  network?: string;
  reputation?: AgentReputation;
  registeredAt?: string;
  onChain?: boolean;
}

export function loadAgentRegistry(): Record<string, RegisteredAgent> {
  try {
    if (existsSync(REGISTRY_FILE)) {
      return JSON.parse(readFileSync(REGISTRY_FILE, "utf-8"));
    }
  } catch (error: unknown) {
    console.error(
      `[loadAgentRegistry] Failed to load agent registry: ${describeError(error)}`,
    );
  }
  return {};
}

export function saveAgentRegistry(
  registry: Record<string, RegisteredAgent>,
): void {
  try {
    writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), "utf-8");
  } catch (error: unknown) {
    console.error(
      `[saveAgentRegistry] Failed to save agent registry: ${describeError(error)}`,
    );
  }
}

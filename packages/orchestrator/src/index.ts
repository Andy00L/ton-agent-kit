/**
 * Orchestrator package — multi-agent coordination, task planning, dispatch, and agent lifecycle management for TON.
 *
 * @packageDocumentation
 * @since 1.0.0
 */

/** Multi-agent orchestrator: decomposes goals into parallel task plans and executes them */
export { Orchestrator } from "./orchestrator";
/** LLM-powered task planner that breaks natural language goals into validated task graphs */
export { Planner } from "./planner";
/** Task dispatcher with parallel execution, dependency resolution, and retry logic */
export { Dispatcher } from "./dispatcher";
/** Agent lifecycle manager: deploy, start, stop, restart, and monitor agents */
export { AgentManager } from "./agent-manager";
/** Types for agent lifecycle configuration, status snapshots, state, and event hooks */
export type { ManagedAgentConfig, ManagedAgentStatus, AgentState, AgentManagerHooks } from "./agent-manager";
/** Core type definitions for tasks, results, agent config, swarm options, and swarm results */
export * from "./types";

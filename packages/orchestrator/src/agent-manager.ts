/**
 * Represents the lifecycle state of a managed agent.
 *
 * @since 1.0.0
 */
export type AgentState = "deployed" | "running" | "stopped" | "crashed" | "restarting";

/**
 * Configuration options for a managed agent's lifecycle behavior.
 * Controls restart policies, health checks, runtime limits, and execution mode.
 *
 * @since 1.0.0
 */
export interface ManagedAgentConfig {
  /** Whether the agent should automatically restart on crash */
  autoRestart?: boolean;
  /** Maximum number of restart attempts before giving up (default: 3) */
  maxRestarts?: number;
  /** Maximum runtime duration before the agent is stopped (e.g., "1h", "30m") */
  maxRuntime?: string;
  /** Interval for health check polling (e.g., "30s", "5m") */
  healthCheck?: string;
  /** Action name to invoke for health checks (default: "get_balance") */
  healthAction?: string;
  /** Error handling policy: restart the agent, stop it, or just log the error */
  onError?: "restart" | "stop" | "log";
  /** Name of a strategy to run in a loop while the agent is active */
  strategy?: string;
  /** Natural language goal for an LLM-driven run loop */
  runLoopGoal?: string;
  /** Configuration for the LLM-driven run loop */
  runLoopConfig?: { model?: string; apiKey?: string; baseURL?: string; maxIterations?: number };
  /** Arbitrary metadata attached to the agent */
  metadata?: Record<string, any>;
}

/**
 * A snapshot of a managed agent's current status, returned by {@link AgentManager.status}.
 *
 * @since 1.0.0
 */
export interface ManagedAgentStatus {
  /** Unique identifier of the agent */
  id: string;
  /** Current lifecycle state */
  state: AgentState;
  /** Current uptime in milliseconds (0 if not running) */
  uptime: number;
  /** Human-readable uptime string (e.g., "1h30m") */
  uptimeFormatted: string;
  /** ISO timestamp when the agent was last started, or null */
  startedAt: string | null;
  /** ISO timestamp when the agent was last stopped, or null */
  stoppedAt: string | null;
  /** Number of times the agent has been restarted */
  restarts: number;
  /** Configured maximum restart attempts */
  maxRestarts: number;
  /** Total error count */
  errors: number;
  /** Message from the most recent error, or null */
  lastError: string | null;
  /** Name of the last executed action, or null */
  lastAction: string | null;
  /** ISO timestamp of the last executed action, or null */
  lastActionAt: string | null;
  /** ISO timestamp of the last health check, or null */
  lastHealthCheck: string | null;
  /** Current health status based on the most recent health check */
  healthStatus: "healthy" | "unhealthy" | "unknown";
  /** The agent's lifecycle configuration */
  config: ManagedAgentConfig;
  /** Arbitrary metadata attached to the agent */
  metadata?: Record<string, any>;
}

/**
 * Lifecycle event hooks for the {@link AgentManager}.
 * All hooks are optional and called synchronously during state transitions.
 *
 * @since 1.0.0
 */
export interface AgentManagerHooks {
  /** Called when an agent is deployed */
  onDeploy?: (id: string, config: ManagedAgentConfig) => void;
  /** Called when an agent starts running */
  onStart?: (id: string) => void;
  /** Called when an agent is stopped, with the reason for the stop */
  onStop?: (id: string, reason: string) => void;
  /** Called when an agent crashes with an unrecoverable error */
  onCrash?: (id: string, error: Error) => void;
  /** Called on each restart attempt, with the current attempt number */
  onRestart?: (id: string, attempt: number) => void;
  /** Called after each health check with the result */
  onHealthCheck?: (id: string, healthy: boolean, result?: any) => void;
  /** Called when an agent exceeds its configured maximum runtime */
  onMaxRuntime?: (id: string, runtime: string) => void;
  /** Called when an agent has exhausted its maximum restart attempts */
  onMaxRestarts?: (id: string, restarts: number) => void;
}

interface ManagedAgent {
  id: string;
  agent: any;
  config: ManagedAgentConfig;
  state: AgentState;
  startedAt: number | null;
  stoppedAt: number | null;
  restarts: number;
  errors: number;
  lastError: string | null;
  lastAction: string | null;
  lastActionAt: number | null;
  lastHealthCheck: number | null;
  healthStatus: "healthy" | "unhealthy" | "unknown";
  healthInterval: ReturnType<typeof setInterval> | null;
  runtimeTimeout: ReturnType<typeof setTimeout> | null;
  runningPromise: Promise<any> | null;
  stopped: boolean;
}

/**
 * Manages the full lifecycle of multiple TON agents: deploy, start, stop, restart, and monitor.
 * Supports health checks, auto-restart policies, maximum runtime limits, and strategy/goal-driven execution loops.
 *
 * @example
 * ```ts
 * const manager = new AgentManager({
 *   onCrash: (id, err) => console.error(`Agent ${id} crashed:`, err),
 *   onRestart: (id, attempt) => console.log(`Restarting ${id} (attempt ${attempt})`),
 * });
 *
 * manager.deploy("wallet-agent", walletAgent, { autoRestart: true, healthCheck: "30s" });
 * await manager.start("wallet-agent");
 * console.log(manager.status("wallet-agent"));
 * ```
 *
 * @since 1.0.0
 */
export class AgentManager {
  private agents: Map<string, ManagedAgent> = new Map();
  private hooks: AgentManagerHooks;

  /**
   * Creates a new AgentManager instance with optional lifecycle hooks.
   *
   * @param hooks - Optional event hooks invoked during agent state transitions
   * @since 1.0.0
   */
  constructor(hooks?: AgentManagerHooks) {
    this.hooks = hooks || {};
  }

  /**
   * Register and deploy a new agent without starting it.
   * The agent enters the "deployed" state and can be started with {@link start}.
   *
   * @param id - Unique identifier for the managed agent
   * @param agent - A TonAgentKit instance to manage
   * @param config - Optional lifecycle and execution configuration
   * @returns this (chainable)
   * @throws {Error} If an agent with the given id is already deployed
   * @since 1.0.0
   */
  deploy(id: string, agent: any, config?: ManagedAgentConfig): AgentManager {
    if (this.agents.has(id)) throw new Error(`Agent "${id}" already deployed. Stop and remove it first.`);
    this.agents.set(id, {
      id, agent, config: config || {}, state: "deployed",
      startedAt: null, stoppedAt: null, restarts: 0, errors: 0,
      lastError: null, lastAction: null, lastActionAt: null,
      lastHealthCheck: null, healthStatus: "unknown",
      healthInterval: null, runtimeTimeout: null, runningPromise: null, stopped: false,
    });
    this.hooks.onDeploy?.(id, config || {});
    return this;
  }

  /**
   * Start a deployed agent, transitioning it to the "running" state.
   * Initiates health checks, runtime timers, and any configured strategy or goal loop.
   *
   * @param id - Unique identifier of the agent to start
   * @throws {Error} If the agent is not found or is already running
   * @since 1.0.0
   */
  async start(id: string): Promise<void> {
    const m = this.get(id);
    if (m.state === "running") throw new Error(`Agent "${id}" is already running.`);
    m.state = "running";
    m.startedAt = Date.now();
    m.stoppedAt = null;
    m.stopped = false;
    this.hooks.onStart?.(id);
    this.startHealthChecks(m);
    this.startRuntimeTimer(m);
    if (m.config.strategy) this.runStrategyLoop(m);
    else if (m.config.runLoopGoal) this.runGoalLoop(m);
  }

  /**
   * Stop a running agent, transitioning it to the "stopped" state.
   * Clears health check intervals and runtime timers.
   *
   * @param id - Unique identifier of the agent to stop
   * @param reason - Human-readable reason for stopping (default: "manual")
   * @throws {Error} If the agent is not found
   * @since 1.0.0
   */
  async stop(id: string, reason?: string): Promise<void> {
    const m = this.get(id);
    m.stopped = true;
    m.state = "stopped";
    m.stoppedAt = Date.now();
    if (m.healthInterval) { clearInterval(m.healthInterval); m.healthInterval = null; }
    if (m.runtimeTimeout) { clearTimeout(m.runtimeTimeout); m.runtimeTimeout = null; }
    this.hooks.onStop?.(id, reason || "manual");
  }

  /**
   * Restart an agent by stopping it (if running) and starting it again.
   * Increments the agent's restart counter.
   *
   * @param id - Unique identifier of the agent to restart
   * @throws {Error} If the agent is not found
   * @since 1.0.0
   */
  async restart(id: string): Promise<void> {
    const m = this.get(id);
    if (m.state === "running") await this.stop(id, "restart");
    m.restarts += 1;
    this.hooks.onRestart?.(id, m.restarts);
    await this.start(id);
  }

  /**
   * Remove a managed agent entirely, stopping it first if it is running.
   *
   * @param id - Unique identifier of the agent to remove
   * @since 1.0.0
   */
  async remove(id: string): Promise<void> {
    const m = this.agents.get(id);
    if (m) {
      if (m.state === "running") await this.stop(id, "removed");
      this.agents.delete(id);
    }
  }

  /**
   * Retrieve the current status snapshot of a managed agent.
   *
   * @param id - Unique identifier of the agent
   * @returns A {@link ManagedAgentStatus} snapshot with uptime, health, and error information
   * @throws {Error} If the agent is not found
   * @since 1.0.0
   */
  status(id: string): ManagedAgentStatus {
    const m = this.get(id);
    const now = Date.now();
    const uptime = m.startedAt && m.state === "running" ? now - m.startedAt : 0;
    return {
      id: m.id, state: m.state, uptime, uptimeFormatted: this.formatDuration(uptime),
      startedAt: m.startedAt ? new Date(m.startedAt).toISOString() : null,
      stoppedAt: m.stoppedAt ? new Date(m.stoppedAt).toISOString() : null,
      restarts: m.restarts, maxRestarts: m.config.maxRestarts || 3,
      errors: m.errors, lastError: m.lastError,
      lastAction: m.lastAction, lastActionAt: m.lastActionAt ? new Date(m.lastActionAt).toISOString() : null,
      lastHealthCheck: m.lastHealthCheck ? new Date(m.lastHealthCheck).toISOString() : null,
      healthStatus: m.healthStatus, config: m.config, metadata: m.config.metadata,
    };
  }

  /**
   * List status snapshots of all managed agents.
   *
   * @returns An array of {@link ManagedAgentStatus} for every deployed agent
   * @since 1.0.0
   */
  list(): ManagedAgentStatus[] {
    return Array.from(this.agents.keys()).map(id => this.status(id));
  }

  /**
   * Get an aggregate count of agents by state.
   *
   * @returns An object with counts for total, running, stopped, crashed, and deployed agents
   * @since 1.0.0
   */
  summary(): { total: number; running: number; stopped: number; crashed: number; deployed: number } {
    let running = 0, stopped = 0, crashed = 0, deployed = 0;
    for (const [, m] of this.agents) {
      if (m.state === "running") running++;
      else if (m.state === "stopped") stopped++;
      else if (m.state === "crashed") crashed++;
      else if (m.state === "deployed") deployed++;
    }
    return { total: this.agents.size, running, stopped, crashed, deployed };
  }

  /**
   * Stop all running agents in parallel.
   *
   * @param reason - Human-readable reason for stopping all agents (default: "stopAll")
   * @since 1.0.0
   */
  async stopAll(reason?: string): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const [id, m] of this.agents) {
      if (m.state === "running") promises.push(this.stop(id, reason || "stopAll"));
    }
    await Promise.all(promises);
  }

  /**
   * Retrieve the underlying TonAgentKit instance for a managed agent.
   *
   * @param id - Unique identifier of the agent
   * @returns The TonAgentKit instance
   * @throws {Error} If the agent is not found
   * @since 1.0.0
   */
  getAgent(id: string): any {
    return this.get(id).agent;
  }

  // ── Private ──

  private get(id: string): ManagedAgent {
    const m = this.agents.get(id);
    if (!m) throw new Error(`Agent "${id}" not found. Deploy it first.`);
    return m;
  }

  private startHealthChecks(m: ManagedAgent): void {
    if (!m.config.healthCheck) return;
    const ms = this.parseDuration(m.config.healthCheck);
    if (!ms) return;
    const action = m.config.healthAction || "get_balance";
    m.healthInterval = setInterval(async () => {
      if (m.state !== "running") return;
      try {
        const result = await m.agent.runAction(action, {});
        m.lastHealthCheck = Date.now();
        m.healthStatus = "healthy";
        m.lastAction = action;
        m.lastActionAt = Date.now();
        this.hooks.onHealthCheck?.(m.id, true, result);
      } catch (err: any) {
        m.lastHealthCheck = Date.now();
        m.healthStatus = "unhealthy";
        m.errors += 1;
        m.lastError = err.message;
        this.hooks.onHealthCheck?.(m.id, false);
        if (m.config.onError === "restart") await this.handleCrash(m, err);
        else if (m.config.onError === "stop") await this.stop(m.id, "health check failed");
      }
    }, ms);
  }

  private startRuntimeTimer(m: ManagedAgent): void {
    if (!m.config.maxRuntime) return;
    const ms = this.parseDuration(m.config.maxRuntime);
    if (!ms) return;
    m.runtimeTimeout = setTimeout(async () => {
      if (m.state === "running") {
        this.hooks.onMaxRuntime?.(m.id, m.config.maxRuntime!);
        await this.stop(m.id, `max runtime exceeded (${m.config.maxRuntime})`);
      }
    }, ms);
  }

  private async runStrategyLoop(m: ManagedAgent): Promise<void> {
    const name = m.config.strategy!;
    m.runningPromise = (async () => {
      while (m.state === "running" && !m.stopped) {
        try {
          await m.agent.runStrategy(name);
          m.lastAction = `strategy:${name}`;
          m.lastActionAt = Date.now();
          await new Promise(r => setTimeout(r, 1000));
        } catch (err: any) {
          m.errors += 1;
          m.lastError = err.message;
          await this.handleCrash(m, err);
          if (m.state !== "running") break;
        }
      }
    })();
  }

  private async runGoalLoop(m: ManagedAgent): Promise<void> {
    const goal = m.config.runLoopGoal!;
    const cfg = m.config.runLoopConfig || {};
    m.runningPromise = (async () => {
      try {
        await m.agent.runLoop(goal, {
          model: cfg.model || "gpt-4o",
          apiKey: cfg.apiKey || process.env.OPENAI_API_KEY || "",
          baseURL: cfg.baseURL || process.env.OPENAI_BASE_URL,
          maxIterations: cfg.maxIterations || 5,
        });
        m.lastAction = `runLoop:${goal.slice(0, 50)}`;
        m.lastActionAt = Date.now();
      } catch (err: any) {
        m.errors += 1;
        m.lastError = err.message;
        await this.handleCrash(m, err);
      }
    })();
  }

  private async handleCrash(m: ManagedAgent, error: Error): Promise<void> {
    this.hooks.onCrash?.(m.id, error);
    const maxRestarts = m.config.maxRestarts ?? 3;
    const shouldRestart = m.config.autoRestart || m.config.onError === "restart";
    if (shouldRestart && m.restarts < maxRestarts && !m.stopped) {
      m.state = "restarting";
      m.restarts += 1;
      this.hooks.onRestart?.(m.id, m.restarts);
      const backoff = Math.min(1000 * Math.pow(2, m.restarts - 1), 30000);
      await new Promise(r => setTimeout(r, backoff));
      if (!m.stopped) { m.state = "running"; m.startedAt = Date.now(); }
    } else {
      m.state = "crashed";
      m.stoppedAt = Date.now();
      if (m.restarts >= maxRestarts) this.hooks.onMaxRestarts?.(m.id, m.restarts);
      if (m.healthInterval) { clearInterval(m.healthInterval); m.healthInterval = null; }
      if (m.runtimeTimeout) { clearTimeout(m.runtimeTimeout); m.runtimeTimeout = null; }
    }
  }

  private parseDuration(d: string): number | null {
    const match = d.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
    if (!match) return null;
    const v = parseInt(match[1], 10);
    const u = match[2].toLowerCase();
    const mult: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return v * (mult[u] || 0);
  }

  private formatDuration(ms: number): string {
    if (ms <= 0) return "0s";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h % 24 > 0) parts.push(`${h % 24}h`);
    if (m % 60 > 0) parts.push(`${m % 60}m`);
    if (s % 60 > 0 && d === 0) parts.push(`${s % 60}s`);
    return parts.join("") || "0s";
  }
}

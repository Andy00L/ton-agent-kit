/**
 * Parse a human-readable schedule string into a millisecond interval.
 * Supports "once" (returns null) and "every Xms/s/m/h/d" patterns.
 *
 * @param schedule - Schedule expression, e.g., "once", "every 5m", "every 1h"
 * @returns The interval in milliseconds, or `null` for a one-shot schedule
 * @throws {Error} If the schedule string does not match a recognized pattern
 *
 * @example
 * ```ts
 * parseSchedule("once");       // null
 * parseSchedule("every 30s");  // 30000
 * parseSchedule("every 1h");   // 3600000
 * parseSchedule("every 30d");  // throws: past the delay Node timers accept
 * ```
 *
 * @since 1.0.0
 */
/**
 * Longest delay Node's timers accept, 2^31-1 milliseconds, about 24.8 days.
 * Anything larger overflows the 32-bit field and Node substitutes 1 ms, so a
 * monthly schedule fired roughly a hundred times a second.
 * sourceRef: TimeoutOverflowWarning in node:internal/timers
 */
const MAX_TIMER_DELAY_MS = 2_147_483_647;

export function parseSchedule(schedule: string): number | null {
  if (schedule === "once") {
    return null;
  }

  const match = schedule.match(/^every\s+(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) {
    throw new Error(`Invalid schedule: "${schedule}". Use "every Xms/s/m/h/d" or "once".`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const MILLISECONDS_PER_UNIT: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  // The regex admits these five units and nothing else, so the lookup always
  // hits and the unreachable default arm that stood here is gone.
  const intervalMs = value * MILLISECONDS_PER_UNIT[unit];

  if (intervalMs <= 0) {
    throw new Error(
      `Invalid schedule: "${schedule}". An interval of zero would run the strategy on every turn of the event loop.`,
    );
  }
  if (intervalMs > MAX_TIMER_DELAY_MS) {
    throw new Error(
      `Invalid schedule: "${schedule}" is ${intervalMs} ms, past the ${MAX_TIMER_DELAY_MS} ms Node timers accept. Node would silently run it every millisecond instead. Use "every 24d" or less and check the date inside the strategy.`,
    );
  }
  return intervalMs;
}

/**
 * Manages interval-based scheduling of named callbacks.
 * Used internally by {@link StrategyRunner} to run strategies on a repeating schedule.
 *
 * @since 1.0.0
 */
export class StrategyScheduler {
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  /**
   * Start a named interval that repeatedly invokes a callback.
   * If an interval with the same name is already running, it is stopped first.
   *
   * @param name - Unique identifier for this scheduled task
   * @param intervalMs - Repeat interval in milliseconds
   * @param callback - Function to invoke on each tick (may be async)
   * @since 1.0.0
   */
  start(name: string, intervalMs: number, callback: () => void | Promise<void>): void {
    if (this.intervals.has(name)) {
      this.stop(name);
    }

    // setInterval does not wait for an async callback, so a tick that outlives
    // its interval used to start again on top of itself. Two runs of the same
    // strategy share one context, and the second one's reset() clears the
    // results the first is still reading.
    let tickRunning = false;
    const interval = setInterval(async () => {
      if (tickRunning) return;
      tickRunning = true;
      try {
        await callback();
      } catch (_error) {
        // Scheduler silently catches errors; error handling is done in the runner
      } finally {
        tickRunning = false;
      }
    }, intervalMs);

    this.intervals.set(name, interval);
  }

  /**
   * Stop and remove a named scheduled interval.
   *
   * @param name - The identifier of the interval to stop
   * @returns `true` if the interval was found and stopped, `false` if it was not running
   * @since 1.0.0
   */
  stop(name: string): boolean {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      return true;
    }
    return false;
  }

  /**
   * Stop all running scheduled intervals.
   *
   * @since 1.0.0
   */
  stopAll(): void {
    for (const [name] of this.intervals) {
      this.stop(name);
    }
  }

  /**
   * Check whether a named interval is currently active.
   *
   * @param name - The identifier to check
   * @returns `true` if the interval is running, `false` otherwise
   * @since 1.0.0
   */
  isRunning(name: string): boolean {
    return this.intervals.has(name);
  }

  /**
   * Get the names of all currently active scheduled intervals.
   *
   * @returns An array of interval identifiers
   * @since 1.0.0
   */
  getActive(): string[] {
    return Array.from(this.intervals.keys());
  }
}

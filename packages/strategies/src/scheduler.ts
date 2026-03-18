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
 * ```
 *
 * @since 1.0.0
 */
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

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
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

    const interval = setInterval(async () => {
      try {
        await callback();
      } catch (_error) {
        // Scheduler silently catches errors; error handling is done in the runner
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

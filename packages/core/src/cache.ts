/**
 * A single entry stored in the {@link ActionCache}.
 *
 * @since 1.0.0
 */
export interface CacheEntry {
  /** The cached action result. */
  result: any;
  /** Unix-epoch timestamp (ms) when the entry was stored. */
  timestamp: number;
  /** Time-to-live in milliseconds for this entry. */
  ttl: number;
}

/**
 * Configuration options for the {@link ActionCache}.
 *
 * @since 1.0.0
 */
export interface CacheConfig {
  /** Whether caching is enabled. Defaults to `true`. */
  enabled?: boolean;
  /** Default TTL in milliseconds for actions without a specific TTL. Defaults to `15000`. */
  defaultTTL?: number;
  /** Maximum number of cache entries before eviction. Defaults to `500`. */
  maxEntries?: number;
  /** Per-action TTL overrides keyed by action name. */
  actionTTLs?: Record<string, number>;
  /** Action names that should never be cached (e.g. write operations). */
  noCacheActions?: string[];
}

/**
 * TTL-based cache for read-only action results.
 *
 * Automatically caches the output of read actions (e.g. `get_balance`, `get_price`)
 * and invalidates related cache entries when write actions (e.g. `transfer_ton`) execute.
 * Entries expire after their TTL and the cache evicts the oldest entry when full.
 *
 * @example
 * ```typescript
 * const cache = new ActionCache({ defaultTTL: 10000, maxEntries: 200 });
 * cache.set("get_balance", { address: "EQ..." }, { balance: "1.5" });
 * const cached = cache.get("get_balance", { address: "EQ..." });
 * console.log(cache.stats()); // { hits: 1, misses: 0, size: 1, ... }
 * ```
 *
 * @since 1.0.0
 */
export class ActionCache {
  private cache: Map<string, CacheEntry> = new Map();
  private enabled: boolean;
  private defaultTTL: number;
  private maxEntries: number;
  private actionTTLs: Record<string, number>;
  private noCacheActions: Set<string>;
  private _hits: number = 0;
  private _misses: number = 0;

  /**
   * Create a new ActionCache instance.
   *
   * @param config - Optional cache configuration overrides.
   *
   * @since 1.0.0
   */
  constructor(config?: CacheConfig) {
    this.enabled = config?.enabled !== false;
    this.defaultTTL = config?.defaultTTL || 15000;
    this.maxEntries = config?.maxEntries || 500;

    this.actionTTLs = {
      get_price: 30000, get_token_price: 30000,
      get_balance: 10000, get_jetton_balance: 10000,
      get_wallet_info: 15000,
      get_staking_info: 60000, get_staking_pools: 60000, get_yield_pools: 60000,
      get_nft_info: 120000, get_nft_collection: 120000, get_jetton_info: 120000,
      resolve_domain: 300000, lookup_address: 300000, get_domain_info: 300000,
      get_transaction_history: 10000, get_portfolio_metrics: 30000, get_equity_curve: 60000,
      get_escrow_info: 10000, get_agent_reputation: 30000, discover_agent: 30000,
      get_open_disputes: 15000, discover_intents: 15000, get_offers: 10000,
      get_agent_cleanup_info: 30000,
      ...(config?.actionTTLs || {}),
    };

    this.noCacheActions = new Set([
      "transfer_ton", "transfer_jetton", "transfer_nft",
      "deploy_jetton", "deploy_reputation_contract",
      "swap_dedust", "swap_stonfi", "swap_best_price",
      "create_dca_order", "create_limit_order", "cancel_order",
      "yield_deposit", "yield_withdraw", "stake_ton", "unstake_ton",
      "create_escrow", "deposit_to_escrow", "release_escrow", "refund_escrow",
      "confirm_delivery", "auto_release_escrow",
      "open_dispute", "join_dispute", "vote_release", "vote_refund",
      "claim_reward", "fallback_settle", "seller_stake_escrow",
      "register_agent", "process_pending_ratings",
      "withdraw_reputation_fees", "trigger_cleanup",
      "broadcast_intent", "send_offer", "accept_offer",
      "settle_deal", "cancel_intent",
      "pay_for_resource", "simulate_transaction",
      "wait_for_transaction", "subscribe_webhook",
      ...(config?.noCacheActions || []),
    ]);
  }

  /**
   * Retrieve a cached result for the given action and parameters.
   *
   * Returns `null` on a cache miss, when the entry has expired, or when the
   * action is in the no-cache list.
   *
   * @param actionName - The action name to look up (e.g. `"get_balance"`).
   * @param params - The action parameters used to build the cache key.
   * @returns The cached result, or `null` if not found or expired.
   *
   * @since 1.0.0
   */
  get(actionName: string, params: any): any | null {
    if (!this.enabled || this.noCacheActions.has(actionName)) return null;
    const key = this.makeKey(actionName, params);
    const entry = this.cache.get(key);
    if (!entry) { this._misses++; return null; }
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.result;
  }

  /**
   * Store an action result in the cache.
   *
   * If the cache is at capacity, the oldest entry is evicted. Write actions
   * listed in `noCacheActions` are silently ignored.
   *
   * @param actionName - The action name to cache under (e.g. `"get_balance"`).
   * @param params - The action parameters used to build the cache key.
   * @param result - The action result to store.
   *
   * @since 1.0.0
   */
  set(actionName: string, params: any, result: any): void {
    if (!this.enabled || this.noCacheActions.has(actionName)) return;
    const key = this.makeKey(actionName, params);
    const ttl = this.actionTTLs[actionName] || this.defaultTTL;
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { result, timestamp: Date.now(), ttl });
  }

  /**
   * Remove all entries from the cache and reset hit/miss counters.
   *
   * @since 1.0.0
   */
  clear(): void {
    this.cache.clear();
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Remove all cached entries whose key starts with the given action name.
   *
   * @param actionName - The action name prefix to invalidate (e.g. `"get_balance"`).
   *
   * @since 1.0.0
   */
  invalidate(actionName: string): void {
    const prefix = actionName + ":";
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  /**
   * Invalidate cache entries for actions that are affected by a write operation.
   *
   * For example, executing `"transfer_ton"` automatically invalidates cached
   * results for `"get_balance"`, `"get_wallet_info"`, and other related reads.
   *
   * @param actionName - The write action that was just executed.
   *
   * @since 1.0.0
   */
  invalidateRelated(actionName: string): void {
    if (actionName === "transfer_ton" || actionName === "transfer_jetton") {
      this.invalidate("get_balance"); this.invalidate("get_jetton_balance");
      this.invalidate("get_wallet_info"); this.invalidate("get_transaction_history");
      this.invalidate("get_portfolio_metrics");
    }
    if (actionName.startsWith("swap_")) {
      this.invalidate("get_balance"); this.invalidate("get_jetton_balance"); this.invalidate("get_price");
    }
    if (actionName.includes("escrow") || actionName.includes("dispute") ||
        actionName.includes("vote_") || actionName.includes("claim_") ||
        actionName === "confirm_delivery" || actionName === "seller_stake_escrow") {
      this.invalidate("get_escrow_info"); this.invalidate("get_balance"); this.invalidate("get_open_disputes");
    }
    if (actionName === "register_agent" || actionName === "trigger_cleanup") {
      this.invalidate("discover_agent"); this.invalidate("get_agent_reputation"); this.invalidate("get_agent_cleanup_info");
    }
    if (actionName === "broadcast_intent" || actionName === "cancel_intent") {
      this.invalidate("discover_intents");
    }
    if (actionName === "send_offer" || actionName === "accept_offer") {
      this.invalidate("get_offers"); this.invalidate("discover_intents");
    }
  }

  /**
   * Return cache performance statistics.
   *
   * @returns An object containing hit count, miss count, current size, hit rate percentage, and enabled flag.
   *
   * @since 1.0.0
   */
  stats(): { hits: number; misses: number; size: number; hitRate: string; enabled: boolean } {
    const total = this._hits + this._misses;
    return {
      hits: this._hits, misses: this._misses, size: this.cache.size,
      hitRate: total > 0 ? ((this._hits / total) * 100).toFixed(1) + "%" : "0%",
      enabled: this.enabled,
    };
  }

  /**
   * Check whether the given action's results can be cached.
   *
   * Returns `false` if caching is globally disabled or the action is listed
   * in `noCacheActions`.
   *
   * @param actionName - The action name to check.
   * @returns `true` if results for this action would be cached.
   *
   * @since 1.0.0
   */
  isCacheable(actionName: string): boolean {
    return this.enabled && !this.noCacheActions.has(actionName);
  }

  /**
   * Get the TTL (in milliseconds) that would be used for the given action.
   *
   * Returns the action-specific TTL if configured, otherwise the default TTL.
   *
   * @param actionName - The action name to look up.
   * @returns The TTL in milliseconds.
   *
   * @since 1.0.0
   */
  getTTL(actionName: string): number {
    return this.actionTTLs[actionName] || this.defaultTTL;
  }

  private makeKey(actionName: string, params: any): string {
    const paramStr = params ? JSON.stringify(params, Object.keys(params).sort()) : "{}";
    return actionName + ":" + paramStr;
  }
}

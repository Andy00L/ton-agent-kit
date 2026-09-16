import { z } from "zod";
import { Address } from "@ton/core";
import {
  defineAction,
  definePlugin,
  describeError,
  fetchJson,
  toFriendlyAddress,
  type DnsInfo,
} from "@ton-agent-kit/core";

/** The fields the DNS actions read off the TonAPI DNS endpoints. */
const DnsResolveResponse = z.object({
  wallet: z.object({ address: z.string().optional() }).optional(),
  expiring_at: z.number().optional(),
});

/** The reverse-resolution endpoint answers with the domain name. */
const DnsBackResolveResponse = z.object({
  name: z.string().optional(),
});


// ============================================================
// resolve_domain: Resolve .ton domain to address
// ============================================================
const resolveDomainAction = defineAction<{ domain: string }, DnsInfo & { resolved: boolean }>({
  name: "resolve_domain",
  description:
    "Resolve a .ton domain name to its associated wallet address. For example, resolve 'alice.ton' to get the wallet address.",
  schema: z.object({
    domain: z.string().describe("Domain name to resolve (e.g., 'alice.ton' or 'alice')"),
  }),
  handler: async (agent, params) => {
    const domain = params.domain.replace(/\.ton$/i, ""); // strip .ton suffix
    const fullDomain = `${domain}.ton`;

    // Use TONAPI for reliable DNS resolution
    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const headers: Record<string, string> = {};
    if (agent.config.TONAPI_KEY) {
      headers["Authorization"] = `Bearer ${agent.config.TONAPI_KEY}`;
    }

    try {
      const response = await fetchJson(
        `${apiBase}/dns/${encodeURIComponent(fullDomain)}/resolve`,
        DnsResolveResponse,
        { headers },
      );

      if (!response.ok) {
        return { domain: fullDomain, address: undefined, resolved: false };
      }

      const walletAddress = response.value.wallet?.address;

      return {
        domain: fullDomain,
        address: walletAddress,
        friendlyAddress: walletAddress ? toFriendlyAddress(Address.parse(walletAddress), agent.network) : undefined,
        resolved: !!walletAddress,
      };
    } catch {
      return { domain: fullDomain, address: undefined, friendlyAddress: undefined, resolved: false };
    }
  },
});

// ============================================================
// lookup_address: Reverse lookup from address to domain
// ============================================================
const lookupAddressAction = defineAction<
  { address: string },
  { address: string; domain?: string }
>({
  name: "lookup_address",
  description:
    "Reverse lookup: find the .ton domain associated with a wallet address (if any).",
  schema: z.object({
    address: z.string().describe("TON wallet address to look up"),
  }),
  handler: async (agent, params) => {
    // Reverse DNS lookup is done via TONAPI or indexer
    // For MVP: use TONAPI if available, otherwise return not found
    const addr = Address.parse(params.address);

    try {
      const tonApiKey = agent.config.TONAPI_KEY;
      if (tonApiKey) {
        const response = await fetchJson(
          `https://tonapi.io/v2/accounts/${addr.toRawString()}/dns/backresolve`,
          DnsBackResolveResponse,
          { headers: { Authorization: `Bearer ${tonApiKey}` } }
        );
        if (response.ok) {
          return { address: params.address, friendlyAddress: toFriendlyAddress(addr, agent.network), domain: response.value.name };
        }
      }
    } catch (error: unknown) {
      console.error(`[lookupAddressAction] TONAPI error: ${describeError(error)}`);
    }

    return { address: params.address, friendlyAddress: toFriendlyAddress(addr, agent.network), domain: undefined };
  },
});

// ============================================================
// get_domain_info: Get detailed domain registration info
// ============================================================
const getDomainInfoAction = defineAction<
  { domain: string },
  DnsInfo
>({
  name: "get_domain_info",
  description: "Get detailed information about a .ton domain including expiration date.",
  schema: z.object({
    domain: z.string().describe("Domain name (e.g., 'alice.ton')"),
  }),
  handler: async (agent, params) => {
    const domain = params.domain.replace(/\.ton$/i, "");

    try {
      const tonApiKey = agent.config.TONAPI_KEY;
      if (tonApiKey) {
        const response = await fetchJson(
          `https://tonapi.io/v2/dns/${encodeURIComponent(domain + ".ton")}/resolve`,
          DnsResolveResponse,
          { headers: { Authorization: `Bearer ${tonApiKey}` } }
        );
        if (response.ok) {
          const resolvedAddr = response.value.wallet?.address;
          return {
            domain: `${domain}.ton`,
            address: resolvedAddr,
            friendlyAddress: resolvedAddr ? toFriendlyAddress(Address.parse(resolvedAddr), agent.network) : undefined,
            expiresAt: response.value.expiring_at,
          };
        }
      }
    } catch (error: unknown) {
      console.error(`[getDomainInfoAction] TONAPI error: ${describeError(error)}`);
    }

    // Fallback: resolve on-chain
    return {
      domain: `${domain}.ton`,
      address: undefined,
      friendlyAddress: undefined,
      expiresAt: undefined,
    };
  },
});

// ============================================================
// Plugin export
// ============================================================

/**
 * DNS Plugin -- TON DNS domain resolution and reverse lookups.
 *
 * Resolves human-readable `.ton` domain names to wallet addresses, performs
 * reverse lookups from addresses to domains, and retrieves detailed domain
 * registration information including expiration dates.
 *
 * Actions:
 * - `resolve_domain` -- Resolve a `.ton` domain name to its associated wallet address
 * - `lookup_address` -- Reverse lookup: find the `.ton` domain for a wallet address
 * - `get_domain_info` -- Get detailed domain registration info (owner, expiry, etc.)
 *
 * @example
 * ```typescript
 * import DnsPlugin from "@ton-agent-kit/plugin-dns";
 * const agent = new TonAgentKit(wallet, rpcUrl).use(DnsPlugin);
 * const info = await agent.runAction("resolve_domain", { domain: "alice.ton" });
 * ```
 *
 * @since 1.0.0
 */
const DnsPlugin = definePlugin({
  name: "dns",
  actions: [resolveDomainAction, lookupAddressAction, getDomainInfoAction],
});

/** @since 1.0.0 */
export default DnsPlugin;
export { resolveDomainAction, lookupAddressAction, getDomainInfoAction };

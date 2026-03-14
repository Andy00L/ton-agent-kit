import { z } from "zod";
import { Address } from "@ton/core";
import { definePlugin, defineAction, type DnsInfo } from "@ton-agent-kit/core";

// ============================================================
// resolve_domain — Resolve .ton domain to address
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
      const response = await fetch(
        `${apiBase}/dns/${encodeURIComponent(fullDomain)}/resolve`,
        { headers },
      );

      if (!response.ok) {
        return { domain: fullDomain, address: undefined, resolved: false };
      }

      const data = await response.json();
      const walletAddress = data.wallet?.address;

      return {
        domain: fullDomain,
        address: walletAddress,
        resolved: !!walletAddress,
      };
    } catch {
      return { domain: fullDomain, address: undefined, resolved: false };
    }
  },
});

// ============================================================
// lookup_address — Reverse lookup: address to domain
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
        const response = await fetch(
          `https://tonapi.io/v2/accounts/${addr.toRawString()}/dns/backresolve`,
          { headers: { Authorization: `Bearer ${tonApiKey}` } }
        );
        if (response.ok) {
          const data = await response.json();
          return { address: params.address, domain: data.name };
        }
      }
    } catch {}

    return { address: params.address, domain: undefined };
  },
});

// ============================================================
// get_domain_info — Get detailed domain registration info
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
        const response = await fetch(
          `https://tonapi.io/v2/dns/${encodeURIComponent(domain + ".ton")}/resolve`,
          { headers: { Authorization: `Bearer ${tonApiKey}` } }
        );
        if (response.ok) {
          const data = await response.json();
          return {
            domain: `${domain}.ton`,
            address: data.wallet?.address,
            expiresAt: data.expiring_at,
          };
        }
      }
    } catch {}

    // Fallback: resolve on-chain
    return {
      domain: `${domain}.ton`,
      address: undefined,
      expiresAt: undefined,
    };
  },
});

// ============================================================
// Plugin export
// ============================================================
const DnsPlugin = definePlugin({
  name: "dns",
  actions: [resolveDomainAction, lookupAddressAction, getDomainInfoAction],
});

export default DnsPlugin;
export { resolveDomainAction, lookupAddressAction, getDomainInfoAction };

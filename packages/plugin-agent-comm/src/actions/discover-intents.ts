import { z } from "zod";
import { Address, Cell } from "@ton/core";
import { defineAction } from "@ton-agent-kit/core";
import { resolveContractAddress } from "../../../plugin-identity/src/reputation-config";
import { callContractGetter, parseIndexCell } from "../../../plugin-identity/src/reputation-helpers";
import { createHash } from "crypto";

function computeServiceHash(service: string): bigint {
  return BigInt("0x" + createHash("sha256").update(service).digest("hex"));
}

const parseNum = (item: any): number =>
  item?.type === "num"
    ? Number(BigInt(item.num.startsWith("-0x") ? "-" + item.num.slice(1) : item.num))
    : 0;

const parseBigNum = (item: any): bigint =>
  item?.type === "num"
    ? BigInt(item.num.startsWith("-0x") ? "-" + item.num.slice(1) : item.num)
    : 0n;

const parseBool = (item: any): boolean =>
  item?.type === "num"
    ? BigInt(item.num.startsWith("-0x") ? "-" + item.num.slice(1) : item.num) !== 0n
    : false;

function parseString(item: any): string {
  if (!item) return "";
  if (item.type === "cell" && item.cell) {
    try {
      const cell = Cell.fromBoc(Buffer.from(item.cell, "hex"))[0];
      return cell.beginParse().loadStringTail();
    } catch {
      try {
        const cell = Cell.fromBoc(Buffer.from(item.cell, "base64"))[0];
        return cell.beginParse().loadStringTail();
      } catch {}
    }
  }
  return "";
}

function parseAddress(item: any): string {
  if (!item) return "";
  if (item.type === "slice" && item.slice) {
    try {
      return Address.parse(item.slice).toRawString();
    } catch {
      return item.slice;
    }
  }
  if (item.type === "cell" && item.cell) {
    try {
      const cell = Cell.fromBoc(Buffer.from(item.cell, "hex"))[0];
      const slice = cell.beginParse();
      const addr = slice.loadAddress();
      return addr ? addr.toRawString() : "";
    } catch {
      try {
        const cell = Cell.fromBoc(Buffer.from(item.cell, "base64"))[0];
        const slice = cell.beginParse();
        const addr = slice.loadAddress();
        return addr ? addr.toRawString() : "";
      } catch {}
      return "";
    }
  }
  return "";
}

export const discoverIntentsAction = defineAction({
  name: "discover_intents",
  description:
    "Discover open intents on-chain. Optionally filter by service name. Returns active (non-expired, status==open) intents from newest to oldest.",
  schema: z.object({
    service: z.string().optional().describe("Filter by service name (exact match via SHA-256 hash)"),
    limit: z.number().optional().describe("Maximum number of intents to return (default: 20)"),
  }),
  handler: async (agent, params) => {
    const contractAddr = resolveContractAddress(undefined, agent.network);
    if (!contractAddr) {
      return { message: "No reputation contract configured" };
    }

    const apiBase =
      agent.network === "testnet"
        ? "https://testnet.tonapi.io/v2"
        : "https://tonapi.io/v2";

    const limit = params.limit || 20;
    const targetHash = params.service ? computeServiceHash(params.service) : null;

    // FAST PATH: use intentsByServiceHash index if searching by service
    if (params.service) {
      try {
        const indexRes = await callContractGetter(
          apiBase, contractAddr, "intentsByServiceHash",
          ["0x" + targetHash!.toString(16)], agent.config.TONAPI_KEY,
        );
        if (indexRes?.stack?.[0]?.cell) {
          const indexes = parseIndexCell(indexRes.stack[0].cell);
          const intents: any[] = [];
          const nowUnix = Math.floor(Date.now() / 1000);
          for (const idx of indexes) {
            if (intents.length >= limit) break;
            try {
              const dataRes = await callContractGetter(apiBase, contractAddr, "intentData", [idx.toString()], agent.config.TONAPI_KEY);
              if (!dataRes?.stack) continue;
              let items = dataRes.stack;
              if (items[0]?.type === "tuple" && items[0].tuple) items = items[0].tuple;
              if (items.length < 9) continue;
              const status = parseNum(items[5]);
              const isExpired = parseBool(items[7]);
              if (status !== 0 || isExpired) continue;
              intents.push({
                intentIndex: idx,
                buyer: parseAddress(items[0]),
                serviceHash: "0x" + parseBigNum(items[1]).toString(16),
                serviceName: parseString(items[2]),
                budget: parseBigNum(items[3]).toString(),
                deadline: new Date(parseNum(items[4]) * 1000).toISOString(),
                status: "open",
                acceptedOffer: parseNum(items[6]),
                description: parseString(items[8]),
              });
            } catch {}
          }
          return {
            intents, count: intents.length, onChain: true, indexed: true,
            contractAddress: contractAddr,
            message: `Found ${intents.length} open intent(s) for "${params.service}" (indexed)`,
          };
        }
      } catch {}
    }

    // SLOW PATH: iterate all intents (fallback or no service filter)
    try {
      // Read intentCount
      const countRes = await callContractGetter(
        apiBase,
        contractAddr,
        "intentCount",
        [],
        agent.config.TONAPI_KEY
      );

      let totalCount = 0;
      if (countRes?.stack?.[0]?.num) {
        const raw = countRes.stack[0].num;
        totalCount = Number(BigInt(raw.startsWith("-0x") ? "-" + raw.slice(1) : raw));
      }

      if (totalCount === 0) {
        return { intents: [], count: 0, total: 0, onChain: true };
      }

      const intents: any[] = [];
      const nowUnix = Math.floor(Date.now() / 1000);

      // Iterate from newest to oldest
      for (let i = totalCount - 1; i >= 0 && intents.length < limit; i--) {
        try {
          const dataRes = await callContractGetter(
            apiBase,
            contractAddr,
            "intentData",
            [i.toString()],
            agent.config.TONAPI_KEY
          );

          if (!dataRes?.stack || dataRes.stack.length === 0) continue;

          // Parse the intent tuple
          let items = dataRes.stack;
          if (items[0]?.type === "tuple" && items[0].tuple) {
            items = items[0].tuple;
          }

          if (items.length < 9) continue;

          // Fields: buyer address, serviceHash num, serviceName cell, budget num, deadline num, status num, acceptedOffer num, isExpired bool, description cell
          const buyer = parseAddress(items[0]);
          const serviceHash = parseBigNum(items[1]);
          const serviceName = parseString(items[2]);
          const budget = parseBigNum(items[3]);
          const deadline = parseNum(items[4]);
          const status = parseNum(items[5]);
          const acceptedOffer = parseNum(items[6]);
          const isExpired = parseBool(items[7]);
          const description = parseString(items[8]);

          // Filter: only open (status==0) and not expired
          if (status !== 0) continue;
          if (isExpired) continue;

          // If service filter provided, match by hash
          if (targetHash !== null && serviceHash !== targetHash) continue;

          intents.push({
            intentIndex: i,
            buyer,
            serviceHash: "0x" + serviceHash.toString(16),
            serviceName,
            budget: budget.toString(),
            deadline: new Date(deadline * 1000).toISOString(),
            status: "open",
            acceptedOffer,
            description,
          });
        } catch {
          // Skip intents that fail to read
          continue;
        }
      }

      return {
        intents,
        count: intents.length,
        total: totalCount,
        onChain: true,
        indexed: false,
        contractAddress: contractAddr,
      };
    } catch (err: any) {
      return {
        intents: [],
        count: 0,
        error: err.message,
        message: `Failed to discover intents: ${err.message}`,
      };
    }
  },
});

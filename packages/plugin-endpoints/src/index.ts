import { definePlugin, defineAction } from "../../core/src/plugin";
import { z } from "zod";

export interface EndpointConfig {
  price: string;
  dataAction: string;
  dataParams: Record<string, string>;
  description: string;
  createdAt: string;
  served: number;
}

export interface EndpointPluginOptions {
  port: number;
  getPublicUrl: () => string;
  routes: Map<string, EndpointConfig>;
}

export function createEndpointPlugin(options: EndpointPluginOptions) {
  const { port, getPublicUrl, routes } = options;

  return definePlugin({
    name: "x402-endpoints",
    actions: [
      defineAction({
        name: "open_x402_endpoint",
        description:
          "Open a paid x402 endpoint on your HTTP server. Other agents pay TON to access it. The endpoint calls the specified SDK action to fetch LIVE blockchain data. Query params from buyer override dataParams. IMPORTANT: When you send_offer, use the URL from this endpoint.",
        schema: z.object({
          path: z.string().describe("URL path starting with /"),
          price: z.string().describe("Price in TON per request"),
          dataAction: z.string().describe("SDK action name for data"),
          dataParams: z.string().optional().describe('Default params as JSON string'),
          description: z.string().optional().describe("Description"),
        }),
        handler: async (_agent: any, params: any) => {
          const path = params.path.startsWith("/") ? params.path : "/" + params.path;
          routes.set(path, {
            price: params.price,
            dataAction: params.dataAction,
            dataParams: params.dataParams ? (typeof params.dataParams === "string" ? JSON.parse(params.dataParams) : params.dataParams) : {},
            description: params.description || params.dataAction + " data",
            createdAt: new Date().toISOString(),
            served: 0,
          });
          console.log(`    [x402] Opened ${path} → ${params.dataAction} @ ${params.price} TON`);
          return { success: true, path, url: `${getPublicUrl()}${path}`, price: params.price, dataAction: params.dataAction, message: `Endpoint live. Use this URL in send_offer.` };
        },
      }),
      defineAction({
        name: "close_x402_endpoint",
        description: "Close a paid x402 endpoint.",
        schema: z.object({ path: z.string().describe("URL path to close") }),
        handler: async (_agent: any, params: any) => {
          const path = params.path.startsWith("/") ? params.path : "/" + params.path;
          const c = routes.get(path);
          const existed = routes.delete(path);
          return { success: true, closed: path, existed, totalServed: c?.served || 0 };
        },
      }),
      defineAction({
        name: "list_x402_endpoints",
        description: "List all open x402 endpoints with prices and request counts.",
        schema: z.object({}),
        handler: async () => {
          const eps: any[] = [];
          for (const [p, c] of routes) eps.push({ path: p, url: `${getPublicUrl()}${p}`, price: c.price, dataAction: c.dataAction, served: c.served });
          return { endpoints: eps, count: eps.length, serverPort: port };
        },
      }),
    ],
  });
}

export default createEndpointPlugin;

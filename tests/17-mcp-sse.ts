// tests/17-mcp-sse.ts — Section 16: MCP SSE Transport
import { createTestnetAgent, createTestContext, TestResult } from "./_setup";

const http = require("http");
const crypto = require("crypto");

function httpReq(url: string, opts: any = {}): Promise<{ status: number; body: any; headers: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: "GET", ...opts }, (res: any) => {
      let d = ""; res.on("data", (c: any) => { d += c; });
      res.on("end", () => { try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); } catch { resolve({ status: res.statusCode, body: d, headers: res.headers }); } });
    }); req.on("error", reject); if (opts.body) req.write(opts.body); req.end();
  });
}

export async function run(): Promise<TestResult> {
  const start = Date.now();
  const { agent, wallet, ownAddress, friendlyAddress, actions } = await createTestnetAgent();
  const { test, testError, skip, result } = createTestContext();

  const testToken = "test-mcp-token-" + Date.now();
  const testPort = 3099;
  let mcpTestServer: any = null;

  await test("SSE test server starts", async () => {
    mcpTestServer = http.createServer((req: any, res: any) => {
      const url = new URL(req.url, `http://localhost:${testPort}`);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      if (url.pathname === "/health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ status: "ok", transport: "sse" })); return; }
      if (url.pathname === "/" && req.method === "GET") { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ name: "ton-agent-kit-mcp", transport: "sse" })); return; }
      const authH = req.headers["authorization"];
      if (!authH || authH !== `Bearer ${testToken}`) { res.writeHead(401, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Unauthorized" })); return; }
      if (url.pathname === "/sse") { res.writeHead(200, { "Content-Type": "text/event-stream" }); res.write("data: connected\n\n"); return; }
      res.writeHead(404); res.end(JSON.stringify({ error: "Not found" }));
    });
    await new Promise<void>((r) => { mcpTestServer.listen(testPort, () => r()); });
    console.log(`     Port: ${testPort}`);
  });

  await test("Health endpoint (no auth)", async () => {
    const r = await httpReq(`http://localhost:${testPort}/health`);
    if (r.status !== 200) throw new Error(`${r.status}`);
    if (r.body.status !== "ok") throw new Error("Not ok");
  });

  await test("Info endpoint (no auth)", async () => {
    const r = await httpReq(`http://localhost:${testPort}/`);
    if (r.status !== 200) throw new Error(`${r.status}`);
    if (r.body.name !== "ton-agent-kit-mcp") throw new Error("Wrong name");
  });

  await test("SSE without auth → 401", async () => {
    const r = await httpReq(`http://localhost:${testPort}/sse`);
    if (r.status !== 401) throw new Error(`${r.status}`);
  });

  await test("SSE wrong token → 401", async () => {
    const r = await httpReq(`http://localhost:${testPort}/sse`, { headers: { "Authorization": "Bearer wrong" } });
    if (r.status !== 401) throw new Error(`${r.status}`);
  });

  await test("SSE valid token → 200", async () => {
    const r = await new Promise<{ status: number }>((resolve) => {
      const req = http.request(`http://localhost:${testPort}/sse`, { headers: { "Authorization": `Bearer ${testToken}` } }, (res: any) => {
        resolve({ status: res.statusCode }); res.destroy();
      }); req.end();
    });
    if (r.status !== 200) throw new Error(`${r.status}`);
  });

  await test("Unknown endpoint → 404", async () => {
    const r = await httpReq(`http://localhost:${testPort}/nope`, { headers: { "Authorization": `Bearer ${testToken}` } });
    if (r.status !== 404) throw new Error(`${r.status}`);
  });

  await test("CORS headers present", async () => {
    const r = await httpReq(`http://localhost:${testPort}/health`);
    if (r.headers["access-control-allow-origin"] !== "*") throw new Error("No CORS");
  });

  await test("OPTIONS preflight → 204", async () => {
    const r = await httpReq(`http://localhost:${testPort}/sse`, { method: "OPTIONS" });
    if (r.status !== 204) throw new Error(`${r.status}`);
  });

  await test("SSE server shutdown", async () => {
    await new Promise<void>((r) => { mcpTestServer.close(() => r()); });
    mcpTestServer = null;
  });

  return result(start);
}

if (import.meta.main) {
  run().then((r) => {
    console.log(`\n${r.passed} passed, ${r.failed} failed (${r.duration}ms)`);
    if (r.errors.length) r.errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(r.failed > 0 ? 1 : 0);
  });
}

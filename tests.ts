/**
 * TON Agent Kit — Interactive Test Runner
 *
 * Usage:
 *   bun run tests.ts              Interactive menu
 *   bun run tests.ts 1            Run test #1
 *   bun run tests.ts 1-5          Run tests 1 through 5
 *   bun run tests.ts 1,3,7-9      Run specific tests
 *   bun run tests.ts all          Run all tests
 */

import { writeFileSync, mkdirSync } from "fs";
import * as readline from "readline";

// ═══ Test registry ═══
const TESTS: Array<[number, string, string]> = [
  [1, "Plugin system & toAITools", "./tests/01-plugin-system.ts"],
  [2, "Token plugin", "./tests/02-token-plugin.ts"],
  [3, "DeFi plugin", "./tests/03-defi-plugin.ts"],
  [4, "NFT plugin", "./tests/04-nft-plugin.ts"],
  [5, "DNS plugin", "./tests/05-dns-plugin.ts"],
  [6, "Analytics plugin", "./tests/06-analytics-plugin.ts"],
  [7, "Staking plugin", "./tests/07-staking-plugin.ts"],
  [8, "Live transfer", "./tests/08-live-transfer.ts"],
  [9, "Transfer edge cases", "./tests/09-transfer-edge-cases.ts"],
  [10, "Escrow on-chain", "./tests/10-escrow-onchain.ts"],
  [11, "Identity plugin", "./tests/11-identity-plugin.ts"],
  [12, "Schema validation", "./tests/12-schema-validation.ts"],
  [13, "Cross-plugin edge cases", "./tests/13-cross-plugin-edge.ts"],
  [14, "Strategy engine", "./tests/14-strategy-engine.ts"],
  [15, "Agent lifecycle", "./tests/15-agent-lifecycle.ts"],
  [16, "Cache layer", "./tests/16-cache-layer.ts"],
  [17, "MCP SSE transport", "./tests/17-mcp-sse.ts"],
  [18, "Escrow advanced", "./tests/18-escrow-advanced.ts"],
  [19, "Orchestrator", "./tests/19-orchestrator.ts"],
  [20, "x402 security", "./tests/20-x402-security.ts"],
  [21, "Commerce E2E", "./tests/21-commerce-e2e.ts"],
  [22, "Strategies advanced", "./tests/22-strategies-advanced.ts"],
  [23, "Agent manager", "./tests/23-agent-manager.ts"],
  [24, "Memory plugin", "./tests/24-memory-plugin.ts"],
  [25, "Omniston", "./tests/25-omniston.ts"],
  [26, "Autonomous 5-agent sim", "./tests/26-autonomous-5agents.ts"],
  [27, "Demo runloop", "./tests/27-demo-runloop.ts"],
  [28, "Demo commerce", "./tests/28-demo-commerce.ts"],
];

// ═══ Parse selection ═══
function parseSelection(input: string, max: number): number[] {
  const selected = new Set<number>();
  for (const part of input.split(",").map((s) => s.trim())) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (!isNaN(a) && !isNaN(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1 && i <= max) selected.add(i);
        }
      }
    } else {
      const n = Number(part);
      if (!isNaN(n) && n >= 1 && n <= max) selected.add(n);
    }
  }
  return [...selected].sort((a, b) => a - b);
}

// ═══ Capture console ═══
function captureConsole(): { logs: string[]; restore: () => void } {
  const logs: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  console.log = (...args: any[]) => logs.push(args.map(String).join(" "));
  console.error = (...args: any[]) => logs.push("[ERROR] " + args.map(String).join(" "));
  console.warn = (...args: any[]) => logs.push("[WARN] " + args.map(String).join(" "));
  return {
    logs,
    restore: () => {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
    },
  };
}

// ═══ Run one test ═══
async function runTest(
  num: number,
  name: string,
  path: string,
): Promise<{ passed: number; failed: number; errors: string[]; duration: number; logs: string[] }> {
  const capture = captureConsole();
  try {
    const mod = await import(path);
    if (typeof mod.run !== "function") {
      capture.restore();
      return { passed: 0, failed: 1, errors: [`${name}: no run() exported`], duration: 0, logs: capture.logs };
    }
    const result = await mod.run();
    capture.restore();
    return { ...result, logs: capture.logs };
  } catch (err: any) {
    capture.restore();
    return { passed: 0, failed: 1, errors: [`${name}: CRASH \u2014 ${err.message}`], duration: 0, logs: capture.logs };
  }
}

// ═══ Main ═══
async function main() {
  const cliArg = process.argv[2];
  let selected: number[];

  if (cliArg) {
    // Non-interactive: parse CLI argument
    if (cliArg.toLowerCase() === "all") {
      selected = TESTS.map(([n]) => n);
    } else {
      selected = parseSelection(cliArg, TESTS.length);
    }
  } else {
    // Interactive: show menu
    process.stdout.write("\n  \x1b[1mTON Agent Kit \u2014 Test Runner\x1b[0m\n\n");
    for (const [num, name] of TESTS) {
      process.stdout.write(`  [\x1b[36m${String(num).padStart(2)}\x1b[0m] ${name}\n`);
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await new Promise<string>((resolve) => {
      rl.question("\n  Which tests? (ex: 1, 2-5, 1,3,7-9, all): ", resolve);
    });
    rl.close();

    if (answer.trim().toLowerCase() === "all") {
      selected = TESTS.map(([n]) => n);
    } else {
      selected = parseSelection(answer, TESTS.length);
    }
  }

  if (selected.length === 0) {
    process.stdout.write("\n  No tests selected.\n");
    process.exit(0);
  }

  process.stdout.write(`\n  Running ${selected.length} test(s)...\n\n`);

  const allResults: Array<{
    num: number;
    name: string;
    passed: number;
    failed: number;
    errors: string[];
    duration: number;
    logs: string[];
  }> = [];

  for (const num of selected) {
    const entry = TESTS.find(([n]) => n === num);
    if (!entry) continue;
    const [, name, path] = entry;

    process.stdout.write(
      `  [\x1b[36m${String(num).padStart(2)}\x1b[0m] ${name.padEnd(30)} \x1b[33m\u23F3 running...\x1b[0m`,
    );

    const r = await runTest(num, name, path);
    allResults.push({ num, name, ...r });

    const status =
      r.failed === 0
        ? `\x1b[32m\u2705 ${r.passed}/${r.passed}\x1b[0m`
        : `\x1b[31m\u274C ${r.passed}/${r.passed + r.failed} (${r.failed} failed)\x1b[0m`;
    const dur = r.duration > 1000 ? `${(r.duration / 1000).toFixed(1)}s` : `${r.duration}ms`;
    process.stdout.write(
      `\r  [\x1b[36m${String(num).padStart(2)}\x1b[0m] ${name.padEnd(30)} ${status}  ${dur}\n`,
    );
  }

  // Summary
  const totalPassed = allResults.reduce((a, r) => a + r.passed, 0);
  const totalFailed = allResults.reduce((a, r) => a + r.failed, 0);
  const suitesOk = allResults.filter((r) => r.failed === 0).length;
  const suitesFail = allResults.filter((r) => r.failed > 0).length;

  process.stdout.write(`\n  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n`);
  process.stdout.write(`  ${totalPassed} passed, ${totalFailed} failed across ${selected.length} suite(s)\n`);
  process.stdout.write(`  Suites: ${suitesOk} ok, ${suitesFail} failed\n`);

  // Save results
  mkdirSync("tests/results", { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const logPath = `tests/results/${ts}.log`;

  let log = `TON Agent Kit \u2014 Test Results\n`;
  log += `Date: ${new Date().toISOString()}\n`;
  log += `Tests: ${selected.join(", ")}\n`;
  log += `Total: ${totalPassed} passed, ${totalFailed} failed\n`;
  log += `${"=".repeat(50)}\n\n`;

  for (const r of allResults) {
    log += `[${String(r.num).padStart(2)}] ${r.name}\n`;
    log += `    Passed: ${r.passed}, Failed: ${r.failed}, Duration: ${r.duration}ms\n`;
    if (r.errors.length) {
      log += `    Errors:\n`;
      for (const e of r.errors) log += `      - ${e}\n`;
    }
    if (r.logs.length) {
      log += `    -- Console output --\n`;
      for (const l of r.logs) log += `    ${l}\n`;
    }
    log += `\n`;
  }

  writeFileSync(logPath, log);
  process.stdout.write(`\n  Results saved: ${logPath}\n\n`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Runner crashed:", err);
  process.exit(1);
});

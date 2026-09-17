// Recompile both Tact contracts and prove the result matches what is committed.
//
// The committed `.code.boc` files are what a third party checks the deployed
// code against, and the `.ts` bindings the packages publish embed the same code
// cell. Nothing regenerates either automatically, so the two could drift from
// `escrow.tact` and `reputation.tact` without anybody noticing, and the source
// everyone reads would stop describing the contract holding the money.
//
// The build is reproducible: compiling the committed sources with the pinned
// compiler yields byte-identical code cells. This check keeps it that way.
//
//   node contracts/verify-build.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

/** The two projects tact.config.json builds, and where each one's code cell lands. */
const PROJECTS = [
  { name: "Escrow", source: "escrow.tact", artifact: "Escrow_Escrow.code.boc" },
  { name: "Reputation", source: "reputation.tact", artifact: "Reputation_Reputation.code.boc" },
];

const contractsDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = join(contractsDir, "..");

const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const workspace = mkdtempSync(join(tmpdir(), "tact-verify-"));
let mismatches = 0;

try {
  for (const project of PROJECTS) {
    copyFileSync(join(contractsDir, project.source), join(workspace, project.source));
  }
  writeFileSync(
    join(workspace, "tact.config.json"),
    JSON.stringify(
      {
        projects: PROJECTS.map((project) => ({
          name: project.name,
          path: `./${project.source}`,
          output: "./out",
          options: { debug: false, external: false },
        })),
      },
      null,
      2,
    ),
  );

  execFileSync("npx", ["tact", "--config", join(workspace, "tact.config.json")], {
    cwd: repoRoot,
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  for (const project of PROJECTS) {
    const committed = join(contractsDir, "output", project.artifact);
    const rebuilt = join(workspace, "out", project.artifact);
    if (!existsSync(rebuilt)) {
      mismatches++;
      console.log(`  FAIL  ${project.name}: the compiler produced no ${project.artifact}`);
      continue;
    }
    const committedHash = digest(committed);
    const rebuiltHash = digest(rebuilt);
    if (committedHash === rebuiltHash) {
      console.log(`  pass  ${project.name}: committed code cell matches the source  (${committedHash.slice(0, 16)})`);
    } else {
      mismatches++;
      console.log(`  FAIL  ${project.name}: ${project.source} no longer compiles to the committed code cell`);
      console.log(`        committed ${committedHash}`);
      console.log(`        rebuilt   ${rebuiltHash}`);
      console.log(`        Rebuild and copy the bindings as contracts/README.md describes.`);
    }
  }
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

console.log(`\n${PROJECTS.length - mismatches}/${PROJECTS.length} contracts reproduce`);
process.exit(mismatches === 0 ? 0 : 1);

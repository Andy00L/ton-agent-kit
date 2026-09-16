// Regression checks for FileStore's delete paths. Before the 2026-09-16 audit
// deleteFile went through getFile, which answered null whenever the blob was
// missing from disk, so a row whose file had vanished could never be deleted:
// it held part of the user's 50 MB quota forever, and cleanupExpired
// re-selected it on every sweep and returned 0 each time.
//
//   bun packages/wallet-store/test/file-store.test.mjs

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, unlinkSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Database } from "bun:sqlite";
import { FileStore } from "../src/index.ts";

let failures = 0;
let total = 0;
function check(name, run) {
  total++;
  const root = mkdtempSync(join(tmpdir(), "ton-file-store-"));
  try {
    run(new FileStore(new Database(":memory:"), root), root);
    console.log(`  pass  ${name}`);
  } catch (error) {
    failures++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${error.message}`);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const saveOne = (store, uid, name) =>
  store.save(uid, name, "text/plain", Buffer.from("payload"), "test", "a file");

console.log("FileStore delete paths");

check("a row whose blob is gone is still deleted", (store) => {
  const id = saveOne(store, 1, "note.txt");
  assert.equal(store.getUserStorage(1), 7);

  // Simulate the blob vanishing: a failed write, a manual delete, a restored
  // backup. The row must not become immortal.
  unlinkSync(store.getFile(id).path);
  assert.equal(store.getFile(id), null, "getFile answers null once the blob is gone");

  assert.equal(store.deleteFile(id), true, "deleteFile refused a row with no blob");
  assert.equal(store.getUserStorage(1), 0, "the quota was never released");
});

check("deleting a file that was never stored answers false", (store) => {
  assert.equal(store.deleteFile("nope"), false);
});

check("deleteAllFiles removes every row and every blob", (store) => {
  const ids = ["a.txt", "b.txt", "c.txt"].map((name) => saveOne(store, 7, name));
  const paths = ids.map((id) => store.getFile(id).path);

  assert.equal(store.deleteAllFiles(7), 3);
  assert.equal(store.getUserStorage(7), 0);
  for (const path of paths) {
    assert.equal(existsSync(path), false, `${path} survived`);
  }
});

check("deleteAllFiles still counts rows whose blob is already gone", (store) => {
  const ids = ["a.txt", "b.txt"].map((name) => saveOne(store, 8, name));
  unlinkSync(store.getFile(ids[0]).path);

  assert.equal(store.deleteAllFiles(8), 2, "a missing blob must not skip its row");
  assert.equal(store.getUserStorage(8), 0);
});

check("cleanupExpired makes progress instead of returning 0 forever", (store, root) => {
  const id = saveOne(store, 9, "stale.txt");
  unlinkSync(store.getFile(id).path);

  // Age the row past its TTL without waiting for it.
  store.db.prepare("UPDATE user_files SET expires_at = 0").run();

  assert.equal(store.cleanupExpired(), 1, "the sweep skipped a row with no blob");
  assert.equal(store.cleanupExpired(), 0, "nothing should be left to sweep");
  assert.equal(store.getUserStorage(9), 0);
  assert.equal(existsSync(join(root, "9")), false, "the empty user directory was left behind");
});

check("an unexpired file survives the sweep", (store) => {
  const id = saveOne(store, 10, "fresh.txt");
  assert.equal(store.cleanupExpired(), 0);
  assert.ok(store.getFile(id), "a live file was swept");
});

check("one user's files are untouched by another's delete", (store, root) => {
  saveOne(store, 11, "mine.txt");
  const theirs = saveOne(store, 12, "theirs.txt");

  assert.equal(store.deleteAllFiles(11), 1);
  assert.ok(store.getFile(theirs), "the other user's file was deleted too");
  assert.deepEqual(readdirSync(root), ["12"]);
});

console.log(`\n${total - failures}/${total} passed`);
process.exit(failures === 0 ? 0 : 1);

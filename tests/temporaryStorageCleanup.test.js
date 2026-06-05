const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  cleanupOldTemporaryFiles,
  cleanupTemporaryFile,
  isPathInsideDirectory
} = require("../src/utils/temporaryStorageCleanup");

test("temporary cleanup deletes only old files inside allowed private folders", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clearsteps-cleanup-"));
  const uploads = path.join(root, "uploads");
  fs.mkdirSync(uploads);

  const oldFile = path.join(uploads, "old-upload.tmp");
  const freshFile = path.join(uploads, "fresh-upload.tmp");
  const keepFile = path.join(uploads, ".gitkeep");
  fs.writeFileSync(oldFile, "old");
  fs.writeFileSync(freshFile, "fresh");
  fs.writeFileSync(keepFile, "");

  const now = Date.now();
  fs.utimesSync(oldFile, new Date(now - 7200000), new Date(now - 7200000));
  fs.utimesSync(freshFile, new Date(now), new Date(now));

  const result = cleanupOldTemporaryFiles({
    directories: [uploads],
    maxAgeMs: 3600000,
    logger: { warn() {} },
    now: () => now
  });

  assert.equal(result.deletedCount, 1);
  assert.equal(fs.existsSync(oldFile), false);
  assert.equal(fs.existsSync(freshFile), true);
  assert.equal(fs.existsSync(keepFile), true);
});

test("temporary cleanup refuses paths outside allowed folders", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clearsteps-refuse-"));
  const allowed = path.join(root, "allowed");
  const outside = path.join(root, "outside.tmp");
  fs.mkdirSync(allowed);
  fs.writeFileSync(outside, "do not delete");

  const result = cleanupTemporaryFile({
    filePath: outside,
    allowedDirectories: [allowed],
    logger: { warn() {} }
  });

  assert.equal(result.deleted, false);
  assert.equal(fs.existsSync(outside), true);
});

test("path guard recognises files inside the allowed directory", () => {
  const root = path.join(os.tmpdir(), "clearsteps-path-guard");
  assert.equal(isPathInsideDirectory(path.join(root, "file.tmp"), root), true);
  assert.equal(isPathInsideDirectory(path.join(root, "..", "other.tmp"), root), false);
});

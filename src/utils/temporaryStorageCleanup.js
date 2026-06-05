const fs = require("node:fs");
const path = require("node:path");

function isPathInsideDirectory(filePath, directory) {
  if (!filePath || !directory) return false;
  const resolvedFile = path.resolve(filePath);
  const resolvedDirectory = path.resolve(directory);
  const relativePath = path.relative(resolvedDirectory, resolvedFile);
  return Boolean(relativePath) && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
}

function cleanupTemporaryFile({ filePath, allowedDirectories, logger = console }) {
  const allowed = (allowedDirectories || []).some((directory) => isPathInsideDirectory(filePath, directory));
  if (!allowed || path.basename(filePath || "") === ".gitkeep") {
    return { deleted: false, reason: "not_allowed" };
  }

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      fs.unlinkSync(filePath);
      return { deleted: true };
    }
  } catch (error) {
    logger.warn?.("Temporary file cleanup failed for one private file.");
    return { deleted: false, reason: "cleanup_failed" };
  }

  return { deleted: false, reason: "missing" };
}

function cleanupOldTemporaryFiles({ directories, maxAgeMs, logger = console, now = () => Date.now() }) {
  const safeMaxAgeMs = Math.max(60000, Number(maxAgeMs) || 3600000);
  const allowedDirectories = directories || [];
  let deletedCount = 0;

  for (const directory of allowedDirectories) {
    let entries = [];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch (error) {
      logger.warn?.("Temporary storage cleanup skipped for one private folder.");
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || entry.name === ".gitkeep") continue;

      const filePath = path.join(directory, entry.name);
      try {
        const stat = fs.statSync(filePath);
        if (now() - stat.mtimeMs < safeMaxAgeMs) continue;
      } catch (error) {
        logger.warn?.("Temporary storage cleanup could not inspect one private file.");
        continue;
      }

      const result = cleanupTemporaryFile({ filePath, allowedDirectories, logger });
      if (result.deleted) deletedCount += 1;
    }
  }

  return { deletedCount };
}

module.exports = {
  cleanupOldTemporaryFiles,
  cleanupTemporaryFile,
  isPathInsideDirectory
};

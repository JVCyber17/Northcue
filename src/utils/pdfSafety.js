function inspectPdfPageLimit(pdfBuffer, maxPages = 5) {
  const text = Buffer.isBuffer(pdfBuffer)
    ? pdfBuffer.toString("latin1")
    : String(pdfBuffer || "");
  const pageMatches = text.match(/\/Type\s*\/Page\b/g) || [];
  const pageCount = pageMatches.length;

  // Some PDFs are compressed enough that this simple public-MVP check cannot
  // see page objects. In that case, allow the file and avoid storing contents.
  if (pageCount === 0) {
    return { allowed: true, pageCount: null };
  }

  return {
    allowed: pageCount <= maxPages,
    pageCount
  };
}

module.exports = { inspectPdfPageLimit };

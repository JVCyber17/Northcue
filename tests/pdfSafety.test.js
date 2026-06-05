const assert = require("node:assert/strict");
const test = require("node:test");

const { inspectPdfPageLimit } = require("../src/utils/pdfSafety");

function fakePdfWithPages(count) {
  const pages = Array.from({ length: count }, (_, index) => `${index + 1} 0 obj << /Type /Page >> endobj`);
  return Buffer.from(`%PDF-1.4\n${pages.join("\n")}\n%%EOF`, "latin1");
}

test("PDF safety allows files at or below the page limit", () => {
  const result = inspectPdfPageLimit(fakePdfWithPages(5), 5);
  assert.equal(result.allowed, true);
  assert.equal(result.pageCount, 5);
});

test("PDF safety rejects files above the page limit", () => {
  const result = inspectPdfPageLimit(fakePdfWithPages(6), 5);
  assert.equal(result.allowed, false);
  assert.equal(result.pageCount, 6);
});

test("PDF safety allows compressed or unknown PDFs without storing content", () => {
  const result = inspectPdfPageLimit(Buffer.from("%PDF-1.4\ncompressed\n%%EOF"), 5);
  assert.equal(result.allowed, true);
  assert.equal(result.pageCount, null);
});

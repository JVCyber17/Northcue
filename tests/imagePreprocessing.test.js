// Guards the orientation step that turns a photographed page upright before OCR.
//
// WHY EVERY ONE OF THE EIGHT VALUES IS PINNED. A wrong orientation mapping does
// not crash. It produces a rotated page, which OCRs into confident-looking
// nonsense, which is the failure this whole area exists to prevent. It happened
// during development of this very change: a fixture was tagged 6 when its pixels
// needed 8, and the result read 0 of 17 keywords in a way that looked exactly like
// a genuine OCR failure rather than a mislabelled file.
//
// The expected transform for each value is written out from the TIFF specification
// and implemented HERE, on raw pixels, independently of sharp. A test that built
// its fixtures with the same library it is testing would only prove the library
// agrees with itself.
//
// No tesseract binary is required. Orientation is verified by comparing pixels, so
// this runs in CI and on a production host where OCR is not installed.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const REPO = path.join(__dirname, "..");
const { preprocessImageForOcr, discardPreprocessedImage } = require(path.join(REPO, "src", "services", "imagePreprocessing"));

let sharp;
try { sharp = require("sharp"); } catch { sharp = null; }

const W = 120;
const H = 180;

// Four distinct quadrants, so every rotation and every mirror produces a different
// arrangement and none of the eight can be confused with another.
const QUADRANTS = {
  topLeft: [220, 40, 40],
  topRight: [40, 170, 60],
  bottomLeft: [50, 90, 220],
  bottomRight: [245, 245, 245]
};

function uprightPixels() {
  const buf = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      const top = y < H / 2;
      const left = x < W / 2;
      const c = top ? (left ? QUADRANTS.topLeft : QUADRANTS.topRight)
                    : (left ? QUADRANTS.bottomLeft : QUADRANTS.bottomRight);
      const i = (y * W + x) * 3;
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
    }
  }
  return { data: buf, width: W, height: H };
}

// --- raw pixel transforms, written here rather than taken from sharp -----------
const at = (img, x, y) => {
  const i = (y * img.width + x) * 3;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
};
function build(width, height, pick) {
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const c = pick(x, y);
      const i = (y * width + x) * 3;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
    }
  }
  return { data, width, height };
}
const flipHorizontal = (img) => build(img.width, img.height, (x, y) => at(img, img.width - 1 - x, y));
const flipVertical = (img) => build(img.width, img.height, (x, y) => at(img, x, img.height - 1 - y));
const rotate180 = (img) => build(img.width, img.height, (x, y) => at(img, img.width - 1 - x, img.height - 1 - y));
// The four that swap width and height. Output is (height x width), and the source
// index must swap x and y with it: reading at(img, x, ...) here would index past
// the source width whenever the image is taller than it is wide.
// Checked by where the input top-left corner lands:
//   rotate90 clockwise      top-left -> top-right
//   rotate270 anticlockwise top-left -> bottom-left
//   transpose               reflection across the main diagonal
//   transverse              reflection across the anti-diagonal
const rotate90 = (img) => build(img.height, img.width, (x, y) => at(img, y, img.height - 1 - x));
const rotate270 = (img) => build(img.height, img.width, (x, y) => at(img, img.width - 1 - y, x));
const transpose = (img) => build(img.height, img.width, (x, y) => at(img, y, x));
const transverse = (img) => build(img.height, img.width, (x, y) => at(img, img.width - 1 - y, img.height - 1 - x));

// EXIF orientation, from the TIFF specification: the transform that must be
// applied to the STORED pixels to display the image correctly. The value stored in
// a file therefore describes where the original top-left corner ended up.
//
// To build a test file for value N we need the INVERSE, which is what puts the
// upright page into the arrangement N describes. Five of the eight are their own
// inverse: two mirrors and two diagonal reflections and the identity. Only 6 and 8
// are a pair.
const INVERSE_OF = {
  1: (img) => img,
  2: flipHorizontal,
  3: rotate180,
  4: flipVertical,
  5: transpose,
  6: rotate270,
  7: transverse,
  8: rotate90
};

// Compares the four quadrants by mean colour, sampled from well inside each one.
// Point sampling on a grid was tried first and gave false failures: the samples
// landed on the quadrant boundary, where JPEG blends the two colours together.
// A wrong orientation moves an entire quadrant, so quadrant means detect it with
// no ambiguity at all.
function quadrantMeans(img) {
  const out = [];
  for (const [qy, qx] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
    const x0 = Math.round((qx * img.width) / 2 + img.width * 0.08);
    const x1 = Math.round(((qx + 1) * img.width) / 2 - img.width * 0.08);
    const y0 = Math.round((qy * img.height) / 2 + img.height * 0.08);
    const y1 = Math.round(((qy + 1) * img.height) / 2 - img.height * 0.08);
    const sum = [0, 0, 0];
    let n = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const p = at(img, x, y);
        sum[0] += p[0]; sum[1] += p[1]; sum[2] += p[2];
        n += 1;
      }
    }
    out.push(sum.map((v) => Math.round(v / Math.max(1, n))));
  }
  return out;
}

function sameImage(a, b) {
  if (a.width !== b.width || a.height !== b.height) return false;
  const qa = quadrantMeans(a);
  const qb = quadrantMeans(b);
  for (let q = 0; q < 4; q += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (Math.abs(qa[q][c] - qb[q][c]) > 25) return false;
    }
  }
  return true;
}

test("image preprocessing, orientation", { skip: sharp ? false : "sharp not installed" }, async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "northcue-orient-"));
  const upright = uprightPixels();

  // sharp keeps a file-descriptor cache, so writing the same NAME twice in one
  // process can fail with "unable to open for write". Each call gets a unique
  // name, and the cache is off, because a test that fails for that reason looks
  // exactly like a real orientation failure.
  sharp.cache(false);
  let written = 0;
  const writeTagged = async (orientation) => {
    const stored = INVERSE_OF[orientation](upright);
    written += 1;
    const file = path.join(dir, "orient-" + orientation + "-" + written + ".jpg");
    await sharp(stored.data, { raw: { width: stored.width, height: stored.height, channels: 3 } })
      .jpeg({ quality: 95 })
      .withMetadata({ orientation })
      .toFile(file);
    return file;
  };

  const readPixels = async (file) => {
    const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  };

  try {
    for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
      await t.test("orientation " + orientation + " lands upright", async () => {
        const file = await writeTagged(orientation);
        const result = await preprocessImageForOcr({ filePath: file });
        const got = await readPixels(result.path);

        assert.ok(sameImage(got, upright),
          "orientation " + orientation + " did not come back upright: got " +
          got.width + "x" + got.height + ", expected " + upright.width + "x" + upright.height);

        if (orientation === 1) {
          // Already upright, so nothing should be written and no second process run.
          assert.equal(result.applied, false);
          assert.equal(result.reason, "already_upright");
        } else {
          assert.equal(result.applied, true);
          assert.equal(result.reason, "exif_orientation_" + orientation);
        }
        discardPreprocessedImage(result);
      });
    }

    await t.test("a present flag never triggers orientation detection", async () => {
      // THE COST GUARANTEE. Orientation detection is a second Tesseract process.
      // It must only ever run when there is no flag to read, so a phone photo,
      // which always carries one, cannot pay for it. Asserted on the reason code
      // because that is the observable difference between the two paths.
      for (const orientation of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const file = await writeTagged(orientation);
        const result = await preprocessImageForOcr({ filePath: file });
        assert.doesNotMatch(String(result.reason), /^osd_/,
          "orientation " + orientation + " reached the detection path despite carrying a flag");
        discardPreprocessedImage(result);
      }
    });

    await t.test("the original file is never modified", async () => {
      const file = await writeTagged(6);
      const before = fs.readFileSync(file);
      const result = await preprocessImageForOcr({ filePath: file });
      assert.notEqual(result.path, file, "a rotated image must be written to a new file");
      assert.deepEqual(fs.readFileSync(file), before, "the upload itself must be untouched");
      discardPreprocessedImage(result);
      assert.ok(fs.existsSync(file), "discarding the derived file must not remove the upload");
    });

    await t.test("the derived file is removed, and only the derived file", async () => {
      const file = await writeTagged(8);
      const result = await preprocessImageForOcr({ filePath: file });
      assert.ok(fs.existsSync(result.path));
      discardPreprocessedImage(result);
      assert.equal(fs.existsSync(result.path), false, "the derived file must be cleaned up");
      assert.ok(fs.existsSync(file), "the upload must survive");
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("image preprocessing never fails a request", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "northcue-defensive-"));

  try {
    await t.test("a file that does not exist falls back", async () => {
      const missing = path.join(dir, "nothing-here.jpg");
      const result = await preprocessImageForOcr({ filePath: missing });
      assert.equal(result.path, missing);
      assert.equal(result.applied, false);
      assert.equal(result.reason, "missing_file");
    });

    await t.test("a file that is not an image at all falls back to itself", async () => {
      const notAnImage = path.join(dir, "actually-text.jpg");
      fs.writeFileSync(notAnImage, "This is not a JPEG. Not even slightly.");
      const result = await preprocessImageForOcr({ filePath: notAnImage });
      assert.equal(result.path, notAnImage, "OCR must still be handed the original path");
      assert.equal(result.applied, false);
    });

    await t.test("a truncated image falls back rather than throwing", async () => {
      const truncated = path.join(dir, "half-a-jpeg.jpg");
      // A valid JPEG header and then nothing.
      fs.writeFileSync(truncated, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]));
      const result = await preprocessImageForOcr({ filePath: truncated });
      assert.equal(result.path, truncated);
      assert.equal(result.applied, false);
    });

    await t.test("empty input, null and undefined all fall back without throwing", async () => {
      for (const value of [null, undefined, ""]) {
        const result = await preprocessImageForOcr({ filePath: value });
        assert.equal(result.applied, false);
        assert.equal(result.reason, "missing_file");
      }
    });

    await t.test("discarding is safe on every shape of result", () => {
      // Must never throw, including on a result that applied nothing, or a file
      // that has already gone.
      discardPreprocessedImage(null);
      discardPreprocessedImage(undefined);
      discardPreprocessedImage({ applied: false, path: "/no/such/file.jpg" });
      discardPreprocessedImage({ applied: true, path: path.join(dir, "already-gone.jpg") });
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

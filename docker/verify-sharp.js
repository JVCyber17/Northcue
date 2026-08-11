// Build-time proof that sharp actually works in the image. Runs during docker
// build; a non-zero exit fails the build.
//
// WHY THIS HAS TO EXIST. src/services/imagePreprocessing.js loads sharp inside a
// try/catch that sets the module to null and logs NOTHING, because a preprocessing
// failure must never cost a reader their document. That is the right runtime
// behaviour and it is also why a broken install is completely invisible: no error,
// no log line, no failed request. Orientation correction and the size cap would
// simply stop happening, every photo would go to OCR sideways and full size, and
// the only symptom would be readers being told their photos are hard to read.
//
// So the check belongs here, where failing is safe: Render keeps the previous
// deploy serving when a build fails.
"use strict";

function fail(message, error) {
  console.error("SHARP VERIFY FAILED: " + message);
  if (error) console.error(error.stack || String(error));
  process.exit(1);
}

let sharp;
try {
  sharp = require("sharp");
} catch (error) {
  fail("require('sharp') threw. The native binary is missing or unloadable.", error);
}

// Assert the exact platform package, not merely that some sharp resolved. This is
// what catches --omit=optional, a lockfile that lost its linux entries, and an
// accidental arm64 build that would install cleanly and then not run on Render.
try {
  require.resolve("@img/sharp-linux-x64/sharp.node");
} catch (error) {
  fail("@img/sharp-linux-x64 is not installed. Check that npm ci did not omit optional dependencies, and that the build platform is linux/amd64.", error);
}

console.log("sharp " + sharp.versions.sharp + ", libvips " + sharp.versions.vips);

// libvips reports its own version only once the native library has genuinely been
// loaded, so this catches a JS wrapper resolving against a broken .so.
if (!sharp.versions.vips) fail("libvips did not load.");
if (!sharp.format.jpeg.input.buffer) fail("libvips has no JPEG input support.");
if (!sharp.format.png.input.buffer) fail("libvips has no PNG input support.");

// Real pixels through the real pipeline: create, encode, decode, rotate, resize,
// re-encode, read back. A library that loads but cannot process anything fails here.
sharp({ create: { width: 64, height: 48, channels: 3, background: { r: 200, g: 40, b: 40 } } })
  .png()
  .toBuffer()
  .then((png) => sharp(png).rotate(90).resize(32).jpeg({ quality: 80 }).toBuffer())
  .then((jpeg) => sharp(jpeg).metadata())
  .then((meta) => {
    // rotate(90) swaps the axes, then resize(32) constrains the width.
    if (meta.format !== "jpeg") fail("round trip produced " + meta.format + ", expected jpeg");
    if (meta.width !== 32) fail("round trip width was " + meta.width + ", expected 32");
    console.log("SHARP OK: round trip produced " + meta.format + " " + meta.width + "x" + meta.height);
  })
  .catch((error) => fail("pixel round trip threw.", error));

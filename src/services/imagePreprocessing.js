// Turns a photographed page the right way up before OCR reads it.
//
// WHY THIS EXISTS. A phone does not rotate the pixels when you turn it. The sensor
// writes them in its own order and records an EXIF orientation flag saying how to
// turn them for display. Nothing in this codebase read that flag, so a letter
// photographed in portrait reached Tesseract on its side and came back as 313
// letters of glyph fragments with none of the words on the page in it.
//
// WHAT IT DELIBERATELY DOES NOT DO. Greyscale and contrast normalisation were
// measured on the synthetic set and changed the extracted text on ZERO of eight
// images, so they are not here. The honest null result is worth more than an
// unmeasured claim, and every operation costs a re-encode. If a future session
// adds them, measure first and record the numbers.
//
// THE POSTURE THAT MATTERS MOST. Every failure path returns the ORIGINAL file.
// A missing module, a corrupt image, a throw, a zero-byte result: all of them fall
// back rather than failing the request. This is a cosmetic improvement to how well
// a document reads, and it must never be the reason someone cannot read their
// letter at all. That is not a hypothetical: photo capture is broken in production
// today precisely because a missing binary was allowed to become a hard failure.

const fs = require("node:fs");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

// Orientation detection is a second Tesseract invocation, so it is only ever run
// when there is no EXIF flag to read. A photo from a phone always carries one, so
// the common path never pays this.
const OSD_TIMEOUT_MS = 15000;

// Every real page measured on the synthetic set read between 10.08 and 16.91.
// The floor is set far below that range on purpose rather than tuned to it: with
// eight samples, a threshold fitted to the observed minimum would be overfitting.
// Its job is only to reject a near-random guess, and the real protection is that a
// failed or zero reading produces no rotation at all.
const MIN_ORIENTATION_CONFIDENCE = 2;

const ROTATIONS = new Set([90, 180, 270]);

let sharpModule;
let sharpLoadAttempted = false;

// Loaded lazily and cached, including the failure. A native module that will not
// load must not take the process down at require time, and must not be retried on
// every upload either.
function loadSharp() {
  if (sharpLoadAttempted) return sharpModule;
  sharpLoadAttempted = true;
  try {
    sharpModule = require("sharp");
  } catch (error) {
    sharpModule = null;
  }
  return sharpModule;
}

// Tesseract's own orientation and script detection. Used only for images with no
// EXIF flag, which in practice means screenshots: the upload copy invites "a
// letter, bill, notice, or screenshot", and a screenshot carries no camera
// metadata at all.
async function detectOrientationWithOsd(filePath) {
  try {
    const { stdout } = await execFileAsync(
      "tesseract",
      [filePath, "stdout", "--psm", "0"],
      { maxBuffer: 1024 * 1024, windowsHide: true, timeout: OSD_TIMEOUT_MS }
    );
    const rotate = Number((/^Rotate:\s*(\d+)/mi.exec(stdout) || [])[1]);
    const confidence = Number((/^Orientation confidence:\s*([\d.]+)/mi.exec(stdout) || [])[1]);
    if (!Number.isFinite(rotate) || !Number.isFinite(confidence)) return null;
    return { rotate, confidence };
  } catch (error) {
    // No binary, no osd.traineddata, a timeout, or an image it cannot read at all.
    // All of them mean the same thing here: no opinion about orientation.
    return null;
  }
}

function orientedPathFor(filePath) {
  const parsed = path.parse(filePath);
  // Written beside the upload so the existing temporary-file sweeper covers it as
  // a backstop, in addition to the explicit delete the caller performs.
  return path.join(parsed.dir, parsed.name + ".oriented" + (parsed.ext || ".jpg"));
}

// A written file is only accepted if it exists and is not empty. An image library
// that writes a zero-byte file on a malformed input would otherwise hand OCR
// nothing at all and look like an unreadable document.
function wroteSomething(outputPath) {
  try {
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Returns the path OCR should read, plus what was done and why.
 * The returned path is the original whenever anything at all goes wrong, and
 * `applied` is false in that case. This function does not throw.
 */
async function preprocessImageForOcr({ filePath }) {
  const unchanged = (reason) => ({ path: filePath, applied: false, reason });

  if (!filePath || !fs.existsSync(filePath)) return unchanged("missing_file");

  const sharp = loadSharp();
  if (!sharp) return unchanged("sharp_unavailable");

  let orientation;
  try {
    orientation = (await sharp(filePath).metadata()).orientation;
  } catch (error) {
    return unchanged("unreadable_metadata");
  }

  // A flag of 1 means the camera has already told us the pixels are upright.
  // Nothing to do, and no reason to spend a second Tesseract call asking.
  if (orientation === 1) return unchanged("already_upright");

  const outputPath = orientedPathFor(filePath);

  try {
    if (Number.isFinite(orientation) && orientation > 1) {
      // rotate() with no argument applies the EXIF orientation, and sharp drops the
      // flag from the output, so the result cannot be double-corrected downstream.
      await sharp(filePath).rotate().toFile(outputPath);
      if (!wroteSomething(outputPath)) return unchanged("empty_output");
      return { path: outputPath, applied: true, reason: "exif_orientation_" + orientation };
    }

    // No flag at all. Ask Tesseract what it thinks, and act only on a confident,
    // non-zero answer.
    const detected = await detectOrientationWithOsd(filePath);
    if (!detected) return unchanged("no_exif_no_osd");
    if (!ROTATIONS.has(detected.rotate)) return unchanged("osd_says_upright");
    if (detected.confidence < MIN_ORIENTATION_CONFIDENCE) return unchanged("osd_low_confidence");

    await sharp(filePath).rotate(detected.rotate).toFile(outputPath);
    if (!wroteSomething(outputPath)) return unchanged("empty_output");
    return { path: outputPath, applied: true, reason: "osd_rotate_" + detected.rotate };
  } catch (error) {
    return unchanged("preprocessing_failed");
  }
}

// Deleting the derived file is the caller's job, and it is deliberately separate:
// the caller knows when OCR has finished with it. Failure to delete is ignored
// because the sweeper will collect it, and because a failed cleanup must not turn
// a successful read into an error.
function discardPreprocessedImage(preprocessed) {
  if (!preprocessed || !preprocessed.applied) return;
  try {
    fs.unlinkSync(preprocessed.path);
  } catch (error) {
    // Swept later. Nothing here is worth failing a request over.
  }
}

module.exports = {
  preprocessImageForOcr,
  discardPreprocessedImage,
  MIN_ORIENTATION_CONFIDENCE
};

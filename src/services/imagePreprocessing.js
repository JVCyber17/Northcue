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

// THE LONGEST EDGE OCR IS ALLOWED TO SEE, AND WHY IT IS A CEILING NOT A TARGET.
//
// A4 at 300dpi is 2480 by 3508 pixels, and 300dpi is where Tesseract's accuracy
// peaks: past it, accuracy does not improve and can degrade, while cost keeps
// climbing. 3500 is that long edge, so a full page arrives at roughly the density
// the engine wants.
//
// The reason this is not merely an optimisation. The instance has 512MB. Uploads
// are capped at 15MB (server.js), and a 15MB JPEG is routinely 40 to 100
// megapixels. Leptonica decodes the whole bitmap uncompressed, so 50MP is about
// 200MB in the OCR child alone, on top of Node already holding the request body
// and its multipart copy. When the cgroup limit trips, the kernel kills the
// largest process, which is the OCR child. That rejection is indistinguishable
// from any other, so textExtraction returns "This document is hard to read",
// and a reader whose photo was perfectly good is told their photo was the
// problem. Capping the pixels is what stops that.
//
// withoutEnlargement is set so a small image is never upscaled: interpolating a
// low resolution photo invents detail and gives OCR more to be wrong about.
const OCR_MAX_EDGE = 3500;

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

function derivedPathFor(filePath, tag) {
  const parsed = path.parse(filePath);
  // Written beside the upload so the existing temporary-file sweeper covers it as
  // a backstop, in addition to the explicit delete the caller performs.
  return path.join(parsed.dir, parsed.name + "." + tag + (parsed.ext || ".jpg"));
}

function removeQuietly(target) {
  try {
    fs.unlinkSync(target);
  } catch (error) {
    // The sweeper collects it. Never worth failing a request over.
  }
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

  let metadata;
  try {
    metadata = await sharp(filePath).metadata();
  } catch (error) {
    return unchanged("unreadable_metadata");
  }

  const orientation = metadata.orientation;
  const hasExifFlag = Number.isFinite(orientation);
  const needsExifRotation = hasExifFlag && orientation > 1;
  const longestEdge = Math.max(metadata.width || 0, metadata.height || 0);
  const needsDownscale = longestEdge > OCR_MAX_EDGE;

  // A flag of 1 means the camera has already said the pixels are upright, and if
  // the image is also within the size cap there is nothing to do. Returning here
  // is what keeps the common path free of a second Tesseract process.
  if (hasExifFlag && !needsExifRotation && !needsDownscale) return unchanged("already_upright");

  const notes = [];
  let workingPath = filePath;

  try {
    // ONE DECODE for the rotation and the size cap together. rotate() with no
    // argument applies the EXIF orientation, and sharp drops the flag from the
    // output so nothing downstream can double-correct it.
    if (needsExifRotation || needsDownscale) {
      const prepared = derivedPathFor(filePath, "prepared");
      let pipeline = sharp(filePath);
      if (needsExifRotation) {
        pipeline = pipeline.rotate();
        notes.push("exif_orientation_" + orientation);
      }
      if (needsDownscale) {
        pipeline = pipeline.resize({
          width: OCR_MAX_EDGE,
          height: OCR_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true
        });
        notes.push("downscaled_" + longestEdge + "_to_" + OCR_MAX_EDGE);
      }
      await pipeline.toFile(prepared);
      if (!wroteSomething(prepared)) return unchanged("empty_output");
      workingPath = prepared;
    }

    // Orientation detection, only when the file carried no flag to read. It runs
    // against the working file, which is already inside the size cap, so a very
    // large upload cannot make this pass expensive either.
    if (!hasExifFlag) {
      const detected = await detectOrientationWithOsd(workingPath);
      const usable = detected
        && ROTATIONS.has(detected.rotate)
        && detected.confidence >= MIN_ORIENTATION_CONFIDENCE;

      if (usable) {
        const rotated = derivedPathFor(filePath, "rotated");
        await sharp(workingPath).rotate(detected.rotate).toFile(rotated);
        if (!wroteSomething(rotated)) {
          if (workingPath !== filePath) removeQuietly(workingPath);
          return unchanged("empty_output");
        }
        if (workingPath !== filePath) removeQuietly(workingPath);
        workingPath = rotated;
        notes.push("osd_rotate_" + detected.rotate);
      } else if (workingPath === filePath) {
        // Nothing was written and there is nothing to correct.
        if (!detected) return unchanged("no_exif_no_osd");
        if (!ROTATIONS.has(detected.rotate)) return unchanged("osd_says_upright");
        return unchanged("osd_low_confidence");
      }
    }

    if (workingPath === filePath) return unchanged("no_change_needed");
    return { path: workingPath, applied: true, reason: notes.join("+") };
  } catch (error) {
    if (workingPath !== filePath) removeQuietly(workingPath);
    return unchanged("preprocessing_failed");
  }
}

// Deleting the derived file is the caller's job, and it is deliberately separate:
// the caller knows when OCR has finished with it. Failure to delete is ignored
// because the sweeper will collect it, and because a failed cleanup must not turn
// a successful read into an error.
function discardPreprocessedImage(preprocessed) {
  if (!preprocessed || !preprocessed.applied) return;
  removeQuietly(preprocessed.path);
}

module.exports = {
  preprocessImageForOcr,
  discardPreprocessedImage,
  MIN_ORIENTATION_CONFIDENCE,
  OCR_MAX_EDGE
};

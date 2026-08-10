# OCR calibration samples

Nine captured outputs, used to calibrate and then guard the plausibility check in
`rateInputQuality` (`src/services/textExtraction.js`).

**None of this came from a real document.** Every one was produced from a synthetic
letter generated for the purpose: an invented council, an invented reference of
`TEST-0000-0000`, an invented amount, invented dates. No reader's document was
used, at any point, to build or calibrate this gate.

## What each file is

| file | what it is | must |
|---|---|---|
| `01-straight.txt` | the control: straight on, well lit | pass |
| `02-rotated-pixels.txt` | the same page rotated 90 degrees | **fail** |
| `03-rotated-exif.txt` | the same rotated pixels plus an EXIF orientation flag | **fail** |
| `04-angled.txt` | photographed at an angle, rotated and sheared | pass |
| `05-dark-background.txt` | the page lit, on a dark surface | pass |
| `06-fold-shadow.txt` | a fold shadow band across the middle | pass |
| `07-low-light.txt` | darkened and contrast crushed | pass |
| `08-unreadable-noise.txt` | pure noise, no page at all (empty output) | **fail** |
| `09-pdf-textlayer.txt` | a real PDF text layer, not OCR at all | pass |

`02` and `03` are byte identical on purpose. That is the finding, not a mistake:
nothing in the extraction path reads the EXIF orientation flag, so setting it
changes nothing. Both must fail the gate, and both did rate `good` before it
existed, which is what the gate was added to stop.

## Why the text and not the images

The images are roughly 3MB and are not committed. The check under test is pure,
text in and a verdict out, so the fixtures are the OCR output rather than its
input. That also means the suite runs without a `tesseract` binary installed,
which matters because production does not have one.

To regenerate: render a synthetic letter to JPEG, apply the transform named in the
table, run it through `extractTextFromImage`, and save the returned text. `03` is
`02` with a minimal EXIF APP1 segment spliced in after the SOI marker carrying
`Orientation = 6`.

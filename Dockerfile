# Northcue runtime image.
#
# WHY THIS FILE EXISTS. OCR has never worked in production. extractTextFromImage
# shells out to the `tesseract` binary, and Render's native Node runtime does not
# include it and gives no way to install it: no root, no apt. Every photograph any
# reader has ever uploaded failed with "We could not read enough text from this
# document", not because the photo was poor but because the binary was absent.
# Docker is the supported way to control what is present in the runtime, so this
# image installs tesseract and the language data it needs.
#
# IMPORTANT, AND NOT OBVIOUS: committing this file is not enough on its own.
# Render stores the runtime as a service setting chosen at creation time and does
# not re-detect it on push. Until the service's runtime is explicitly changed to
# docker (Render API PATCH, or a Blueprint sync), this file is inert and builds
# continue to use the Node runtime. A deploy will go green while changing nothing.

FROM --platform=linux/amd64 node:22.23.2-trixie-slim

# --- OCR engine and language data -------------------------------------------
#
# Versions are pinned exactly, verified against Debian trixie's own Packages
# index. apt-get exits 100 with "Version ... was not found" if a pin cannot be
# satisfied, which fails the build. That is deliberate: a rebuild must never
# silently float onto a tesseract version nobody measured OCR accuracy against.
#
# tesseract-ocr-osd is listed explicitly even though tesseract-ocr already depends
# on it. It carries osd.traineddata, which is what makes `tesseract --psm 0` work,
# and that call is how a screenshot with no EXIF orientation gets turned upright
# (src/services/imagePreprocessing.js). If it ever went missing, that code cannot
# tell the difference between absent data and an absent binary: both return null,
# rotation silently stops happening, and the reader is told their image is hard to
# read. Pinning it names the dependency instead of relying on someone else's.
#
# The epoch on the language packages is load-bearing. The published filename is
# tesseract-ocr-eng_4.1.0-2_all.deb, but Debian filenames strip the epoch and the
# apt version is 1:4.1.0-2. Writing 4.1.0-2 fails the build for the wrong reason.
# The version looks mismatched against the 5.5.0 engine because the data comes
# from a different source package, tesseract-lang. That is correct, not a typo.
#
# THE FOUR INDIC PACKS, and why they are not optional. OCR ran -l eng for
# everyone. A photographed Gujarati notice came back as transliterated Latin
# nonsense, "oilelsy UzLALL SIGsUa", with zero Gujarati characters recovered, and
# because that output is word-shaped every plausibility signal passed: the reader
# got six confident cue cards built on nothing. That is the one place this product
# guessed rather than refused. Measured recall on a synthetic notice went from
# 0/10 to 10/10 with the pack present.
#
# They cost 3.8 MB installed, all four together, and 6.8 MB of peak process memory
# when a second language is loaded alongside English.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        tesseract-ocr=5.5.0-1+b1 \
        tesseract-ocr-eng=1:4.1.0-2 \
        tesseract-ocr-osd=1:4.1.0-2 \
        tesseract-ocr-guj=1:4.1.0-2 \
        tesseract-ocr-hin=1:4.1.0-2 \
        tesseract-ocr-ben=1:4.1.0-2 \
        tesseract-ocr-pan=1:4.1.0-2; \
    rm -rf /var/lib/apt/lists/*; \
    tesseract --version; \
    for lang in eng osd guj hin ben pan; do \
        tesseract --list-langs 2>&1 | grep -qx "$lang" \
            || (echo "tesseract language data missing: $lang" && exit 1); \
    done

WORKDIR /app

# --- Dependencies -----------------------------------------------------------
#
# Copied before the source so this layer caches: a change to server.js does not
# reinstall tesseract or node_modules.
COPY package.json package-lock.json ./

# npm has a long-standing bug where regenerating a lockfile from an existing
# node_modules strips other platforms' optional dependencies. If that happens on a
# developer machine, sharp's linux binary vanishes from the lockfile, `npm ci`
# still exits 0 here, and sharp fails only at runtime, silently. Fail loudly and
# early instead, with a message that says how to fix it.
RUN grep -q '@img/sharp-linux-x64' package-lock.json \
    || (echo "package-lock.json has no @img/sharp-linux-x64 entry. Regenerate it with node_modules deleted, not just the lockfile." && exit 1); \
    grep -q '@napi-rs/canvas-linux-x64-gnu' package-lock.json \
    || (echo "package-lock.json has no @napi-rs/canvas-linux-x64-gnu entry, which pdfjs-dist needs." && exit 1)

# --omit=dev only. NOT --omit=optional and NOT --no-optional: sharp's binary and
# pdfjs-dist's canvas are optional dependencies, and omitting them leaves an
# install that exits 0 and then fails at require time.
RUN npm ci --omit=dev

# --- Prove the native modules actually work ---------------------------------
#
# Both sharp and tesseract are loaded behind catch-all error handling that logs
# nothing, so neither can report its own absence at runtime. These assertions are
# the only place a broken install can be caught, and failing here is safe: Render
# keeps the previous deploy serving when a build fails.
COPY docker/verify-sharp.js ./docker/verify-sharp.js
RUN node docker/verify-sharp.js

COPY . .

# NODE_ENV is deliberately NOT set here. server.js gates two hard startup asserts
# on it (assertSafeFileRetentionConfig, assertSafeMeasurementLanguageConfig), so
# setting it in the image could newly refuse to boot on a config that boots today.
# Whatever Render supplies continues to apply, exactly as it does now.
#
# No USER directive, so the container runs as root and can create
# private_storage/uploads at boot. server.js calls ensurePrivateFolders() at import
# time with an unguarded mkdirSync; under a non-root user that throws before the
# server listens, which fails loudly rather than silently, but there is no reason
# to introduce it here.
#
# No EXPOSE needed: server.js binds process.env.PORT on all interfaces.
CMD ["node", "server.js"]

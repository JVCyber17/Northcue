from pathlib import Path
import math

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("This script needs Pillow. Install it with: python -m pip install Pillow") from exc


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "public" / "icons" / "northcue"
OUTPUT_DIR = SOURCE_DIR / "foreground"
ICON_SIZE = 256
KEEP_PADDING = 2

FOREGROUND_ICONS = [
    "act-next-step",
    "add-deadline",
    "auto-detect",
    "bill-document",
    "chat-message",
    "comfort-break",
    "deadline",
    "document",
    "document-check",
    "document-stack",
    "fake-document",
    "focus-mode",
    "folder",
    "letter-document",
    "need-help",
    "overwhelmed",
    "people",
    "private-secure",
    "reminder-bell",
    "safety-check",
    "search",
    "shield-check",
    "time",
    "time-message",
    "upload",
    "upload-add",
    "what-matters-most",
    "what-to-do",
    "wrong-file",
]


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def saturation(r: int, g: int, b: int) -> float:
    hi = max(r, g, b)
    lo = min(r, g, b)
    return 0.0 if hi == 0 else (hi - lo) / hi


def trim_alpha(img: Image.Image, padding: int = KEEP_PADDING) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return img
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    bottom = min(img.height, bbox[3] + padding)
    return img.crop((left, top, right, bottom))


def sample_circle_colour(img: Image.Image) -> tuple[int, int, int]:
    rgba = img.convert("RGBA")
    cx = rgba.width / 2
    cy = rgba.height / 2
    radius = min(rgba.width, rgba.height) * 0.43
    samples: list[tuple[int, int, int]] = []

    for y in range(rgba.height):
        for x in range(rgba.width):
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            if dx * dx + dy * dy > radius * radius:
                continue
            r, g, b, a = rgba.getpixel((x, y))
            if a == 0:
                continue
            lum = luminance(r, g, b)
            sat = saturation(r, g, b)
            if 170 < lum < 250 and sat < 0.18 and not (r > 248 and g > 248 and b > 248):
                samples.append((r, g, b))

    if not samples:
        return (236, 240, 231)

    avg_r = round(sum(px[0] for px in samples) / len(samples))
    avg_g = round(sum(px[1] for px in samples) / len(samples))
    avg_b = round(sum(px[2] for px in samples) / len(samples))
    return (avg_r, avg_g, avg_b)


def build_foreground(img: Image.Image, circle_rgb: tuple[int, int, int]) -> Image.Image:
    rgba = img.convert("RGBA")
    foreground = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    bg_r, bg_g, bg_b = circle_rgb
    cx = rgba.width / 2
    cy = rgba.height / 2
    radius = min(rgba.width, rgba.height) * 0.44

    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = rgba.getpixel((x, y))
            if a == 0:
                continue

            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            if dx * dx + dy * dy > radius * radius:
                continue

            lum = luminance(r, g, b)
            sat = saturation(r, g, b)
            dist = math.sqrt((r - bg_r) ** 2 + (g - bg_g) ** 2 + (b - bg_b) ** 2)

            dark_alpha = max(0, min(255, round((190 - lum) * 3.8)))
            colour_alpha = 0
            if lum < 232 and sat > 0.08:
                colour_alpha = max(0, min(255, round((dist - 20) * 4.0)))

            alpha = max(dark_alpha, colour_alpha)
            if alpha > 8:
                foreground.putpixel((x, y), (r, g, b, alpha))

    return trim_alpha(foreground)


def fit_foreground_to_canvas(img: Image.Image) -> Image.Image:
    canvas = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    x = (ICON_SIZE - img.width) // 2
    y = (ICON_SIZE - img.height) // 2
    canvas.alpha_composite(img, (x, y))
    return canvas


def export_foreground_icon(name: str) -> Path:
    source_path = SOURCE_DIR / f"{name}.png"
    if not source_path.exists():
        raise FileNotFoundError(f"Missing source icon: {source_path}")

    source = Image.open(source_path).convert("RGBA")
    circle_rgb = sample_circle_colour(source)
    foreground = build_foreground(source, circle_rgb)
    canvas = fit_foreground_to_canvas(foreground)

    output_path = OUTPUT_DIR / f"{name}.png"
    canvas.save(output_path)
    return output_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    written = [export_foreground_icon(name) for name in FOREGROUND_ICONS]
    print(f"Created {len(written)} foreground icons in {OUTPUT_DIR}")
    for path in written:
        print(path.name)


if __name__ == "__main__":
    main()

from pathlib import Path
import math
import re

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError as exc:
    raise SystemExit("This script needs Pillow. Install it with: python -m pip install Pillow") from exc


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "icons" / "northcue"
CANVAS_SIZE = 256
MAIN_CIRCLE_SIZE = 118
MAIN_ART_MAX_SIDE = 70
UTILITY_MAX_SIDE = 90
PROGRESS_DOT_MAX_SIDE = 64
SKIPPED_FINAL_ICONS = {
    "saved",
    "theme-colour",
    "text-size",
    "close",
    "more",
}

SOURCES = {
    "page1": Path(r"C:\Users\jashv\Downloads\my-project-page-1 (10).jpeg"),
    "page2": Path(r"C:\Users\jashv\Downloads\my-project-page-1 (11) (1).jpeg"),
    "page3": Path(r"C:\Users\jashv\Downloads\my-project-page-1 (12).jpeg"),
    "sheet": Path(r"C:\Users\jashv\Downloads\my-project-page-1 (13) (1).jpeg"),
    "utility": Path(r"C:\Users\jashv\Downloads\my-project-page-1 (14).png"),
}

MAIN_ICONS = [
    ("page1", "document", (220, 504), 360),
    ("page1", "upload", (614, 504), 360),
    ("page1", "auto-detect", (1008, 504), 360),
    ("page1", "focus-mode", (382, 1082), 360),
    ("page1", "document-check", (814, 1082), 360),
    ("page2", "deadline", (220, 504), 360),
    ("page2", "safety-check", (614, 504), 360),
    ("page2", "what-matters-most", (1008, 504), 360),
    ("page2", "what-to-do", (382, 1082), 360),
    ("page2", "act-next-step", (814, 1082), 360),
    ("page3", "overwhelmed", (220, 504), 360),
    ("page3", "fake-document", (614, 504), 360),
    ("page3", "wrong-file", (1008, 504), 360),
    ("page3", "need-help", (382, 1082), 360),
    ("page3", "private-secure", (814, 1082), 360),
    ("sheet", "letter-document", (196, 219), 226),
    ("sheet", "bill-document", (482, 219), 226),
    ("sheet", "folder", (758, 219), 226),
    ("sheet", "document-stack", (1029, 219), 226),
    ("sheet", "chat-message", (1302, 219), 226),
    ("sheet", "search", (194, 511), 226),
    ("sheet", "time", (486, 511), 226),
    ("sheet", "people", (758, 511), 226),
    ("sheet", "reminder-bell", (1030, 511), 226),
    ("sheet", "add-deadline", (1300, 511), 226),
    ("sheet", "comfort-break", (308, 786), 226),
    ("sheet", "shield-check", (584, 786), 226),
    ("sheet", "time-message", (866, 786), 226),
    ("sheet", "upload-add", (1148, 786), 226),
]

UTILITY_ICONS = [
    ("utility", "light-mode", (225, 395, 535, 740)),
    ("utility", "dark-mode", (805, 395, 1132, 730)),
    ("utility", "text-size", (1380, 430, 1705, 705)),
    ("utility", "saved", (1980, 430, 2285, 740)),
    ("utility", "theme-colour", (2580, 410, 2920, 760)),
    ("utility", "back-arrow", (120, 1190, 450, 1445)),
    ("utility", "close", (675, 1190, 925, 1445)),
    ("utility", "next-arrow", (1120, 1190, 1450, 1445)),
    ("utility", "more", (1680, 1185, 1805, 1445)),
    ("utility", "progress-dot-active", (2070, 1190, 2395, 1410)),
    ("utility", "progress-dot-inactive", (2600, 1180, 2948, 1410)),
]

UTILITY_ICON_SETTINGS = {
    "saved": {"max_side": 88},
    "theme-colour": {"max_side": 90},
    "back-arrow": {"max_side": 86},
    "next-arrow": {"max_side": 86},
    "close": {"max_side": 84},
    "more": {"max_side": 86},
    "progress-dot-active": {"max_side": 74},
    "progress-dot-inactive": {"max_side": 74},
}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def circle_mask(size: int) -> Image.Image:
    scale = 4
    mask = Image.new("L", (size * scale, size * scale), 0)
    draw = ImageDraw.Draw(mask)
    inset = 2 * scale
    draw.ellipse((inset, inset, size * scale - inset, size * scale - inset), fill=255)
    return mask.resize((size, size), Image.Resampling.LANCZOS)


def luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def saturation(r: int, g: int, b: int) -> float:
    hi = max(r, g, b)
    lo = min(r, g, b)
    return 0 if hi == 0 else (hi - lo) / hi


def crop_square(img: Image.Image, center: tuple[int, int], size: int) -> Image.Image:
    x, y = center
    half = size // 2
    return img.crop((x - half, y - half, x + half, y + half))


def sample_circle_colour(crop: Image.Image) -> tuple[int, int, int, int]:
    rgba = crop.convert("RGBA")
    cx = rgba.width / 2
    cy = rgba.height / 2
    radius = min(rgba.width, rgba.height) * 0.42
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
            if 166 < lum < 250 and not (r > 248 and g > 248 and b > 248) and sat < 0.18:
                samples.append((r, g, b))

    if not samples:
        return (235, 241, 229, 255)

    r = round(sum(px[0] for px in samples) / len(samples))
    g = round(sum(px[1] for px in samples) / len(samples))
    b = round(sum(px[2] for px in samples) / len(samples))
    return (r, g, b, 255)


def extract_main_art(crop: Image.Image, circle_colour: tuple[int, int, int, int]) -> Image.Image:
    rgba = crop.convert("RGBA")
    art = Image.new("RGBA", rgba.size, (0, 0, 0, 0))
    br, bg, bb, _ = circle_colour
    cx = rgba.width / 2
    cy = rgba.height / 2
    radius = min(rgba.width, rgba.height) * 0.43

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
            dist = math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2)
            dark_alpha = max(0, min(255, round((186 - lum) * 3.6)))
            colour_alpha = max(0, min(255, round((dist - 22) * 4.2))) if lum < 232 and sat > 0.08 else 0
            alpha = max(dark_alpha, colour_alpha)
            if alpha > 8:
                art.putpixel((x, y), (r, g, b, alpha))

    return trim_alpha(art, padding=2)


def fit_to_canvas(art: Image.Image, max_side: int) -> Image.Image:
    art = art.convert("RGBA")
    max_current = max(art.width, art.height)
    if max_current > 0:
        scale = max_side / max_current
        art = art.resize((max(1, round(art.width * scale)), max(1, round(art.height * scale))), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    pos = ((CANVAS_SIZE - art.width) // 2, (CANVAS_SIZE - art.height) // 2)
    canvas.alpha_composite(art, pos)
    return canvas


def draw_clean_circle(colour: tuple[int, int, int, int]) -> Image.Image:
    circle = Image.new("RGBA", (MAIN_CIRCLE_SIZE, MAIN_CIRCLE_SIZE), (0, 0, 0, 0))
    mask = circle_mask(MAIN_CIRCLE_SIZE)
    fill = Image.new("RGBA", (MAIN_CIRCLE_SIZE, MAIN_CIRCLE_SIZE), colour)
    circle.alpha_composite(fill)
    circle.putalpha(mask)
    return circle


def export_main_icon(img: Image.Image, name: str, center: tuple[int, int], size: int) -> Path:
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    crop = crop_square(img.convert("RGBA"), center, size)
    circle_colour = sample_circle_colour(crop)
    circle = draw_clean_circle(circle_colour)
    circle_pos = ((CANVAS_SIZE - MAIN_CIRCLE_SIZE) // 2, (CANVAS_SIZE - MAIN_CIRCLE_SIZE) // 2)
    canvas.alpha_composite(circle, circle_pos)
    art_canvas = fit_to_canvas(extract_main_art(crop, circle_colour), MAIN_ART_MAX_SIDE)
    canvas.alpha_composite(art_canvas)
    out = OUT_DIR / f"{slug(name)}.png"
    canvas.save(out)
    return out


def trim_alpha(img: Image.Image, padding: int = 8) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        return img
    left = max(0, bbox[0] - padding)
    top = max(0, bbox[1] - padding)
    right = min(img.width, bbox[2] + padding)
    bottom = min(img.height, bbox[3] + padding)
    return img.crop((left, top, right, bottom))


def export_utility_icon(img: Image.Image, name: str, box: tuple[int, int, int, int]) -> Path:
    crop = img.convert("RGBA").crop(box)
    crop = trim_alpha(crop, padding=10)
    max_side = max(crop.width, crop.height)
    settings = UTILITY_ICON_SETTINGS.get(name, {})
    target_side = settings.get("max_side", PROGRESS_DOT_MAX_SIDE if name.startswith("progress-dot") else UTILITY_MAX_SIDE)
    if max_side > target_side:
        scale = target_side / max_side
        crop = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x_offset, y_offset = settings.get("offset", (0, 0))
    pos = ((CANVAS_SIZE - crop.width) // 2 + x_offset, (CANVAS_SIZE - crop.height) // 2 + y_offset)
    canvas.alpha_composite(crop, pos)
    out = OUT_DIR / f"{slug(name)}.png"
    canvas.save(out)
    return out


def create_extraction_sheet(files: list[Path]) -> Path:
    gap = 24
    cols = 5
    rows = math.ceil(len(files) / cols)
    width = cols * CANVAS_SIZE + (cols - 1) * gap
    height = rows * CANVAS_SIZE + (rows - 1) * gap
    sheet = Image.new("RGBA", (width, height), (0, 0, 0, 0))

    for index, path in enumerate(files):
        icon = Image.open(path).convert("RGBA")
        col = index % cols
        row = index // cols
        x = col * (CANVAS_SIZE + gap)
        y = row * (CANVAS_SIZE + gap)
        sheet.alpha_composite(icon, (x, y))

    out = OUT_DIR / "northcue icons extraction sheet.png"
    sheet.save(out)
    return out


def preview_label(name: str, width: int, draw: ImageDraw.ImageDraw, font: ImageFont.ImageFont) -> list[str]:
    words = name.replace("-", " ").split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= width - 16:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines[:2]


def create_preview(files: list[Path]) -> Path:
    thumb = 220
    cell_w = 260
    cell_h = 276
    cols = 5
    rows = math.ceil(len(files) / cols)
    preview = Image.new("RGBA", (cols * cell_w, rows * cell_h + 28), (250, 249, 245, 255))
    draw = ImageDraw.Draw(preview)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()

    for index, path in enumerate(files):
        icon = Image.open(path).convert("RGBA")
        icon.thumbnail((thumb, thumb), Image.Resampling.LANCZOS)
        col = index % cols
        row = index // cols
        x = col * cell_w
        y = row * cell_h
        icon_x = x + (cell_w - icon.width) // 2
        icon_y = y + 18 + (thumb - icon.height) // 2
        preview.alpha_composite(icon, (icon_x, icon_y))
        name = path.stem
        lines = preview_label(name, cell_w, draw, font)
        for line_i, line in enumerate(lines):
            text_w = draw.textlength(line, font=font)
            draw.text((x + (cell_w - text_w) / 2, y + 244 + line_i * 16), line, fill=(26, 43, 43, 255), font=font)

    out = OUT_DIR / "northcue icons preview.png"
    preview.convert("RGB").save(out)
    return out


def create_notes() -> Path:
    out = OUT_DIR / "manual-review-notes.txt"
    skipped = "\n".join(f"- {name}" for name in sorted(SKIPPED_FINAL_ICONS))
    out.write_text(
        "Skipped icons needing manual review\n"
        "===================================\n\n"
        f"{skipped}\n\n"
        "These five icons are excluded from the final usable icon set. "
        "Replace them manually later or recreate them separately before using them in the website.\n",
        encoding="utf-8",
    )
    return out


def main() -> None:
    for name, source in SOURCES.items():
        if not source.exists():
            raise SystemExit(f"Missing source for {name}: {source}")

    if OUT_DIR.exists():
        for old_png in OUT_DIR.glob("*.png"):
            old_png.unlink()
    else:
        OUT_DIR.mkdir(parents=True, exist_ok=True)

    outputs: list[Path] = []
    opened = {name: Image.open(path) for name, path in SOURCES.items()}
    try:
        for source_name, icon_name, center, size in MAIN_ICONS:
            if icon_name in SKIPPED_FINAL_ICONS:
                continue
            outputs.append(export_main_icon(opened[source_name], icon_name, center, size))
        for source_name, icon_name, box in UTILITY_ICONS:
            if icon_name in SKIPPED_FINAL_ICONS:
                continue
            outputs.append(export_utility_icon(opened[source_name], icon_name, box))
    finally:
        for img in opened.values():
            img.close()

    extraction_sheet = create_extraction_sheet(outputs)
    preview = create_preview(outputs)
    notes = create_notes()
    print(f"Exported {len(outputs)} icons to {OUT_DIR}")
    print(f"Created extraction sheet: {extraction_sheet}")
    print(f"Created preview sheet: {preview}")
    print(f"Created manual-review notes: {notes}")


if __name__ == "__main__":
    main()

from pathlib import Path

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("This script needs Pillow. Install it with: python -m pip install Pillow") from exc


ROOT = Path(__file__).resolve().parents[1]
ICON_SOURCE_DIR = ROOT / "public" / "icons" / "northcue" / "foreground"
ICON_OUTPUT_DIR = ROOT / "public" / "icons" / "northcue" / "foreground-light"
UTILITY_SOURCE_DIR = ROOT / "public" / "icons" / "northcue"
UTILITY_OUTPUT_DIR = ROOT / "public" / "icons" / "northcue" / "utility-light"
ASSET_SOURCE = ROOT / "public" / "assets" / "northcue-mark-transparent.png"
ASSET_OUTPUT = ROOT / "public" / "assets" / "northcue-mark-light.png"

LIGHT_ICON_RGB = (227, 236, 219)
LIGHT_LOGO_RGB = (248, 244, 235)
UTILITY_NAMES = ["light-mode", "dark-mode"]


def recolor_image(source_path: Path, output_path: Path, rgb: tuple[int, int, int]) -> None:
    image = Image.open(source_path).convert("RGBA")
    pixels = image.load()

    for y in range(image.height):
      for x in range(image.width):
        _, _, _, alpha = pixels[x, y]
        if alpha == 0:
          continue
        pixels[x, y] = (rgb[0], rgb[1], rgb[2], alpha)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path)


def export_foreground_light_icons() -> list[str]:
    exported = []
    for path in sorted(ICON_SOURCE_DIR.glob("*.png")):
        out = ICON_OUTPUT_DIR / path.name
        recolor_image(path, out, LIGHT_ICON_RGB)
        exported.append(path.name)
    return exported


def export_utility_light_icons() -> list[str]:
    exported = []
    for name in UTILITY_NAMES:
        source = UTILITY_SOURCE_DIR / f"{name}.png"
        out = UTILITY_OUTPUT_DIR / f"{name}.png"
        recolor_image(source, out, LIGHT_ICON_RGB)
        exported.append(out.name)
    return exported


def export_light_logo() -> None:
    recolor_image(ASSET_SOURCE, ASSET_OUTPUT, LIGHT_LOGO_RGB)


def main() -> None:
    foreground_icons = export_foreground_light_icons()
    utility_icons = export_utility_light_icons()
    export_light_logo()
    print(f"Created {len(foreground_icons)} light foreground icons in {ICON_OUTPUT_DIR}")
    print(f"Created {len(utility_icons)} light utility icons in {UTILITY_OUTPUT_DIR}")
    print(f"Created {ASSET_OUTPUT.name}")


if __name__ == "__main__":
    main()

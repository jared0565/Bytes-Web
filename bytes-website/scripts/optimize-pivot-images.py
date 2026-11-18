"""Crop and re-encode the Pivot Parlor showcase images.

Run after capture-pivot-shops.mjs, or after copying new workspace frames from a
Pivot Parlor handoff. It works from any directory: the images folder is found from
this file's own location.

    python -P bytes-website/scripts/optimize-pivot-images.py

Tests: test_optimize_pivot_images.py, beside this file.

Needs Pillow. Idempotent: a second run leaves every file byte-identical.
- Shop captures are quantised to a 256-colour palette with Floyd-Steinberg dithering.
- Workspace frames, still 1440 px wide as handed off, lose the 240 px navigation
  sidebar, have the empty space below their content trimmed to 40 px, and are
  quantised to 256 colours without dithering. Frames already cropped are left alone.
Prints each file's pixel size, so the catalogue's width and height can be checked.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'public' / 'projects'
SHOPS = ['pivot-parlor', 'pivot-linden-lark']
FRAMES = ['pivot-bookings', 'pivot-walkin-queue', 'pivot-till', 'pivot-inventory',
          'pivot-staff-today', 'pivot-operator-onboarding']
SIDEBAR, PAD, MAX_HEIGHT, THRESHOLD = 240, 40, 1000, 24


def content_bottom(image):
    """Last row whose sampled pixels differ from the bottom-right background."""
    pixels = image.load()
    width, height = image.size
    background = pixels[width - 10, height - 5]
    last = 0
    for y in range(height):
        if any(sum(abs(a - b) for a, b in zip(pixels[x, y], background)) > THRESHOLD
               for x in range(0, width, 4)):
            last = y
    return last


def report(path):
    with Image.open(path) as image:
        print(f'{path.name} {image.width}x{image.height} {path.stat().st_size}')


def main(root=ROOT):
    for name in SHOPS:
        path = root / f'{name}.png'
        with Image.open(path) as image:
            if image.mode != 'P':
                palette = image.convert('RGB').quantize(
                    colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
                palette.save(path, optimize=True)
        report(path)
    for name in FRAMES:
        path = root / f'{name}.png'
        with Image.open(path) as image:
            if image.width == 1440:
                cropped = image.convert('RGB').crop((SIDEBAR, 0, 1440, image.height))
                height = min(content_bottom(cropped) + 1 + PAD, MAX_HEIGHT)
                cropped.crop((0, 0, cropped.width, height)).quantize(
                    colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
                ).save(path, optimize=True)
        report(path)


if __name__ == '__main__':
    main()

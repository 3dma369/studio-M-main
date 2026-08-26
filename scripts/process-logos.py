#!/usr/bin/env python3
"""
Logo processing pipeline — converts source JPGs in public/logos/src/ into
TIGHT-CROPPED TRANSPARENT PNGs in public/logos/.

Run automatically before each `vite build` (see package.json "prebuild" hook).

Why this exists:
- Telegram always re-compresses images to JPG, killing the alpha channel.
- A logo JPG inherently has a WHITE BACKGROUND we don't want.
- This script strips near-white pixels (RGB >= 235) → fully transparent,
  feathers the edge (RGB 200-235) → smooth alpha,
  then tight-crops the result to the opaque content bbox.

Drop a new JPG into public/logos/src/<name>-src.jpg and the matching PNG
will be generated automatically on the next build.
"""
import os, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / 'public' / 'logos' / 'src'
OUT_DIR = ROOT / 'public' / 'logos'

# Every source JPG: src/<basename>-src.jpg  →  out/<basename>.png
# Map of source filename (without -src.jpg) → output filename
JOBS = [
    ('toyverse-src', 'toy-verse.png'),
    ('vibex-src',    'vibe-x.png'),
    # savvy-price is hand-drawn SVG-equivalent, no source JPG for it
]

WHITE_THRESHOLD = 235  # pixels brighter than this become fully transparent
FEATHER_LOW = 200      # pixels at this brightness get feathered alpha
FEATHER_HIGH = 235
PADDING = 6            # transparent padding around tight crop


def feather_alpha(rgb_min: int) -> int:
    """Map min(R,G,B) to alpha. white→0, mid-tone→feather, dark→255."""
    if rgb_min >= WHITE_THRESHOLD:
        return 0
    if rgb_min <= FEATHER_LOW:
        return 255
    # Linear feather from FEATHER_LOW (255) to WHITE_THRESHOLD (0)
    span = WHITE_THRESHOLD - FEATHER_LOW
    return int((WHITE_THRESHOLD - rgb_min) * 255 / span)


def strip_white(src_jpg: Path, out_png: Path) -> None:
    img = Image.open(src_jpg).convert('RGBA')
    px = img.load()
    w, h = img.size

    # 1) White-strip pass
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            mn = min(r, g, b)
            new_a = feather_alpha(mn)
            if new_a == 0:
                px[x, y] = (r, g, b, 0)
            else:
                # Pre-blend: light pixels become lighter so feathered edge fades gracefully
                px[x, y] = (r, g, b, new_a)

    # 2) Find tight bbox of opaque content
    minx, miny, maxx, maxy = w, h, -1, -1
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 100:
                minx = min(minx, x); maxx = max(maxx, x)
                miny = min(miny, y); maxy = max(maxy, y)

    if maxx < 0:
        print(f'  {src_jpg.name}: no opaque pixels found — skipping')
        return

    # 3) Tight crop with padding
    minx = max(0, minx - PADDING)
    miny = max(0, miny - PADDING)
    maxx = min(w - 1, maxx + PADDING)
    maxy = min(h - 1, maxy + PADDING)
    cropped = img.crop((minx, miny, maxx + 1, maxy + 1))
    cropped.save(out_png, 'PNG', optimize=True)
    print(f'  {src_jpg.name} → {out_png.name}: tight {cropped.size}, '
          f'{os.path.getsize(out_png):,} bytes')


def main():
    os.chdir(ROOT)
    if not SRC_DIR.exists():
        print(f'No {SRC_DIR} directory; logo processing skipped.')
        return 0

    print(f'Processing logos from {SRC_DIR} → {OUT_DIR}')
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for src_base, out_name in JOBS:
        src_jpg = SRC_DIR / f'{src_base}.jpg'
        if not src_jpg.exists():
            print(f'  skip {src_base}.jpg (not found)')
            continue
        out_png = OUT_DIR / out_name
        strip_white(src_jpg, out_png)
    return 0


if __name__ == '__main__':
    sys.exit(main())

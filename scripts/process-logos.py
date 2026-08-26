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


def strip_with_corner_fill(src_jpg: Path, out_png: Path) -> None:
    """Corner flood-fill + interior-blob removal using scipy.ndimage.

    Why this works: a JPEG logo dropped from any chat app has white space
    surrounding the actual logo. The white space touches the image edges,
    so we flood-fill from the four corners and mark ALL edge-connected
    white pixels as transparent. After that pass we still have interior
    white blobs (e.g. white text on a transparent badge) which we keep
    by removing only those smaller than the largest non-white component.
    """
    from scipy import ndimage
    import numpy as np

    img = Image.open(src_jpg).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    r = arr[:, :, 0].astype(int)
    g = arr[:, :, 1].astype(int)
    b = arr[:, :, 2].astype(int)

    # 1) Mask of near-white pixels
    is_white = (r >= 240) & (g >= 240) & (b >= 240)

    # 2) Label connected white regions; mark edge-touching ones
    labels, _ = ndimage.label(is_white)
    edge_labels = {labels[y, x] for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]}
    edge_white = np.isin(labels, list(edge_labels))
    arr[:, :, 3] = np.where(edge_white, 0, arr[:, :, 3])

    # 3) Interior white blobs smaller than the largest non-white region: kill them too
    op_mask = arr[:, :, 3] > 50
    r0 = arr[:, :, 0].astype(int)
    g0 = arr[:, :, 1].astype(int)
    b0 = arr[:, :, 2].astype(int)
    interior_white = op_mask & (r0 >= 210) & (g0 >= 210) & (b0 >= 210)
    non_white = op_mask & ~interior_white
    non_white_labels, n_non = ndimage.label(non_white)
    if n_non > 0:
        sizes = ndimage.sum(non_white, non_white_labels, range(1, n_non + 1))
        biggest = int(np.argmax(sizes)) + 1
        biggest_mask = non_white_labels == biggest
        kill = interior_white & ~biggest_mask
        arr[:, :, 3] = np.where(kill, 0, arr[:, :, 3])

    # 4) Tight crop to opaque bbox + padding
    op = arr[:, :, 3] > 100
    ys, xs = np.where(op)
    if len(ys) == 0:
        print(f'  {src_jpg.name}: no opaque content found')
        return
    y0, y1 = max(0, ys.min() - PADDING), min(h - 1, ys.max() + PADDING)
    x0, x1 = max(0, xs.min() - PADDING), min(w - 1, xs.max() + PADDING)
    cropped = arr[y0:y1 + 1, x0:x1 + 1, :]
    Image.fromarray(cropped, 'RGBA').save(out_png, 'PNG', optimize=True)


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
        strip_with_corner_fill(src_jpg, out_png)
    return 0


if __name__ == '__main__':
    sys.exit(main())

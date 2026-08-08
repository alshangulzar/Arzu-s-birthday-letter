"""
Installs Gulzar's illustration pack into src/assets/.

Source: Design.pdf on the Desktop, which embeds the whole pack as 60 transparent
PNGs. This script pulls them out, gives them real names, and derives the three
layers each envelope needs for the opening animation.

WHY THE DERIVATION EXISTS
The pack's closed envelopes are single flat PNGs. The app animates an envelope
by turning its flap back on rotateX while the letter slides up out of the
pocket — which needs the flap and the front panel as separate images. Every
closed envelope in the pack is drawn on the same template: an X of fold lines
meeting at one point just past halfway down. So the flap and the front are cut
along those lines that are already drawn in the art. Nothing is redrawn; the
pixels are Gulzar's, only masked.

The three "open" designs (open lemon / open sky / open azure) ship as separate
pieces already — pocket, letter, flap — so those are composed, not cut.

Run:  python3 tools/install_assets.py
"""

import os
import shutil
from collections import Counter

from PIL import Image, ImageDraw, ImageFilter

SRC_PDF = os.path.expanduser('~/Desktop/Design.pdf')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'assets')
RAW = os.path.join(ROOT, 'tools', '.pack-raw')

# Where the fold lines cross on the closed-envelope template, as a fraction of
# the artwork's own bounding box. Measured off the pack, shared by all of them.
APEX_Y = 0.56


def extract():
    from pypdf import PdfReader

    os.makedirs(RAW, exist_ok=True)
    page = PdfReader(SRC_PDF).pages[0]
    for i, im in enumerate(page.images):
        with open(os.path.join(RAW, f'{i:02d}.png'), 'wb') as f:
            f.write(im.data)


def raw(i):
    return Image.open(os.path.join(RAW, f'{i:02d}.png')).convert('RGBA')


def bbox(im):
    return im.getbbox()


def body_colour(im):
    """The envelope's dominant fill, for patching the area the flap vacates."""
    c = Counter(p[:3] for p in im.getdata() if p[3] > 200)
    tot = sum(c.values())
    best, cluster = None, 0
    for col, n in c.most_common(60):
        near = sum(m for other, m in c.items() if sum((other[k] - col[k]) ** 2 for k in range(3)) < 30 ** 2)
        if near > cluster:
            cluster, best = near, col
    return best or (222, 189, 97)


def mask_to(im, poly, invert=False):
    """Keep (or drop) the part of `im` inside `poly`. Feathered by a pixel so the
    cut lands on the drawn fold line instead of beside it."""
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(0.6))
    if invert:
        m = Image.eval(m, lambda v: 255 - v)
    out = im.copy()
    a = out.getchannel('A')
    out.putalpha(Image.eval(Image.merge('L', [a]).point(lambda v: v), lambda v: v))
    out.putalpha(Image.composite(a, Image.new('L', im.size, 0), m))
    return out


def derive_layers(im, name):
    """back / front / flap from one flat closed envelope."""
    x0, y0, x1, y1 = bbox(im)
    w, h = x1 - x0, y1 - y0
    apex = (x0 + w / 2, y0 + h * APEX_Y)
    flap_poly = [(x0 - 2, y0 - 2), (x1 + 2, y0 - 2), apex]

    flap = mask_to(im, flap_poly)
    front = mask_to(im, flap_poly, invert=True)

    # the back is the whole envelope with the flap's area filled flat, so that
    # when the flap turns away there's body behind it and not a hole
    back = im.copy()
    patch = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(patch)
    col = body_colour(im)
    d.polygon([(x0, y0), (x1, y0), (x0 + w / 2, y0 + h * (APEX_Y + 0.02))], fill=(*col, 255))
    patch = patch.filter(ImageFilter.GaussianBlur(0.4))
    back.alpha_composite(patch)

    # crop everything to the same box so the layers stack without offsets
    box = (x0, y0, x1, y1)
    return back.crop(box), front.crop(box), flap.crop((x0, y0, x1, int(y0 + h * APEX_Y) + 2))


def compose_open(pocket, letter, sprigs=(), pad_top=0.55):
    """The three already-open designs: pocket in front, letter behind it."""
    pw, ph = pocket.size
    W = int(pw * 1.06)
    H = int(ph + ph * pad_top * 2.2)
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    px = (W - pw) // 2
    py = H - ph

    for spr, sx, sy, sc in sprigs:
        s = spr.copy()
        s = s.resize((int(s.width * sc), int(s.height * sc)), Image.LANCZOS)
        canvas.alpha_composite(s, (int(px + pw * sx - s.width / 2), int(py + ph * sy - s.height)))

    lw = int(pw * 0.62)
    lt = letter.resize((lw, int(letter.height * lw / letter.width)), Image.LANCZOS)
    canvas.alpha_composite(lt, ((W - lw) // 2, py - int(lt.height * 0.58)))
    canvas.alpha_composite(pocket, (px, py))
    return canvas


# ---------------------------------------------------------------- the mapping
CLOSED = {
    'lemon': 6,
    'azure': 7,
    'sunshine': 11,
    'deep-blue': 12,
    'fiore': 15,
    'airmail': 16,
    'pink': 17,
    'tied': 22,
    'gingham': 23,
}

SIMPLE = {
    # loose pieces used as-is
    'heart-lemon': 24,
    'heart-pink': 25,
    'heart-azure-outline': 26,
    'heart-sunshine': 27,
    'heart-pink-outline': 28,
    'heart-cream': 29,
    'lemon-sprig': 30,
    'olive-sprig': 31,
    'doily': 59,
    'ciao': 32,
    'letter-paper': 4,
    'flap-azure': 3,
}

STICKERS_IT = {
    'sole': 33, 'gelato': 34, 'spritz': 35, 'caffe': 36, 'vino': 37, 'uva': 38,
    'pomodoro': 39, 'farfalle': 40, 'margherita': 41, 'fiocco': 42, 'camera': 43, 'vespa': 44,
}

STICKERS_UK = {
    'big-ben': 45, 'union-jack': 46, 'double-decker': 47, 'phone-box': 48, 'post-box': 49,
    'crown': 50, 'corgi': 51, 'black-cab': 52, 'brolly': 53, 'cuppa': 54, 'bowler': 55,
    'bow-tie': 56, 'paw': 57,
}

# already-open designs: (pocket index, letter index)
OPEN = {
    'open-lemon': (10, 9),
    'open-sky': (14, 13),
    'open-azure': (21, 20),
}


def main():
    extract()
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    manifest = []

    for name, idx in CLOSED.items():
        im = raw(idx)
        back, front, flap = derive_layers(im, name)
        back.save(f'{OUT}/envelope-{name}-back.png')
        front.save(f'{OUT}/envelope-{name}-front.png')
        flap.save(f'{OUT}/envelope-{name}-flap.png')
        manifest.append((f'envelope-{name}', back.size, flap.size))

    lemon_sprig = raw(30)
    olive_sprig = raw(31)
    for name, (pi, li) in OPEN.items():
        pocket, letter = raw(pi), raw(li)
        pocket = pocket.crop(pocket.getbbox())
        letter = letter.crop(letter.getbbox())
        sprigs = [(lemon_sprig, 0.34, 0.1, 0.5), (olive_sprig, 0.66, 0.06, 0.45)] if 'lemon' in name or 'azure' in name else []
        img = compose_open(pocket, letter, sprigs)
        img.save(f'{OUT}/envelope-{name}-back.png')
        # the pocket alone is the front layer; there is no flap on an open one
        f = Image.new('RGBA', img.size, (0, 0, 0, 0))
        f.alpha_composite(pocket, ((img.width - pocket.width) // 2, img.height - pocket.height))
        f.save(f'{OUT}/envelope-{name}-front.png')
        manifest.append((f'envelope-{name}', img.size, None))

    for name, idx in SIMPLE.items():
        im = raw(idx)
        im = im.crop(im.getbbox())
        im.save(f'{OUT}/{name}.png')
        manifest.append((name, im.size, None))

    # Stickers get normalised onto one square canvas. In the pack they're all
    # different shapes — Big Ben is tall and thin, a double-decker is wide and
    # short — so at their natural sizes they read as wildly different scales
    # sitting next to each other. Scaling the longest side to a common length
    # and padding to a square means every sticker occupies the same box, and
    # one width in CSS sizes all of them identically.
    STICKER_BOX = 240
    STICKER_ART = 208  # longest side, leaving a little air inside the square
    for name, idx in {**{f'sticker-{k}': v for k, v in STICKERS_IT.items()},
                      **{f'sticker-{k}': v for k, v in STICKERS_UK.items()}}.items():
        im = raw(idx)
        im = im.crop(im.getbbox())
        scale = STICKER_ART / max(im.size)
        im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
        square = Image.new('RGBA', (STICKER_BOX, STICKER_BOX), (0, 0, 0, 0))
        square.alpha_composite(im, ((STICKER_BOX - im.width) // 2, (STICKER_BOX - im.height) // 2))
        square.save(f'{OUT}/{name}.png')
        manifest.append((name, square.size, None))

    # The page grain. The pack ships it as one big plate meant to sit over a
    # whole page, so a straight crop tiles with visible seams. Mirroring a
    # quarter into all four corners makes it seamless by construction.
    q = raw(58).crop((300, 800, 428, 928)).convert('RGBA')
    tile = Image.new('RGBA', (256, 256))
    tile.paste(q, (0, 0))
    tile.paste(q.transpose(Image.FLIP_LEFT_RIGHT), (128, 0))
    tile.paste(q.transpose(Image.FLIP_TOP_BOTTOM), (0, 128))
    tile.paste(q.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.FLIP_TOP_BOTTOM), (128, 128))
    tile.save(f'{OUT}/paper-grain.png')

    # The sealed state wants a tiny heart padlock and the pack hasn't got one.
    # Rather than draw a foreign icon, this borrows the pack's own cream heart
    # and adds a shackle in the pack's own ink colour.
    heart = raw(29)
    heart = heart.crop(heart.getbbox())
    hw, hh = heart.size
    pad = Image.new('RGBA', (hw, int(hh * 1.5)), (0, 0, 0, 0))
    d = ImageDraw.Draw(pad)
    r = hw * 0.26
    cx, cy = hw / 2, hh * 0.52
    d.arc([cx - r, cy - r, cx + r, cy + r], start=180, end=360,
          fill=(41, 76, 104, 255), width=max(2, int(hw * 0.07)))
    pad.alpha_composite(heart, (0, int(hh * 0.5)))
    kx, ky = int(hw * 0.5), int(hh * 0.5 + hh * 0.52)
    kr = max(2, int(hw * 0.055))
    d2 = ImageDraw.Draw(pad)
    d2.ellipse([kx - kr, ky - kr, kx + kr, ky + kr], fill=(41, 76, 104, 255))
    d2.line([kx, ky, kx, ky + kr * 2.6], fill=(41, 76, 104, 255), width=max(2, int(hw * 0.045)))
    pad.save(f'{OUT}/padlock-heart.png')

    # every intrinsic size, so each <img> can carry width/height and reserve its
    # own space before the PNG has loaded
    import json
    sizes = {}
    for f in sorted(os.listdir(OUT)):
        if f.endswith('.png'):
            with Image.open(os.path.join(OUT, f)) as im:
                sizes[f[:-4]] = list(im.size)
    with open(os.path.join(OUT, 'manifest.json'), 'w') as fh:
        json.dump(sizes, fh, indent=0, sort_keys=True)

    print(f'installed {len(os.listdir(OUT))} files into src/assets')
    for n, s, f in sorted(manifest):
        print(f'  {n:34s} {s}  flap={f}')


if __name__ == '__main__':
    main()

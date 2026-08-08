"""
Placeholder illustration generator for "Letters For You".

These are STAND-INS. Every file it writes into src/assets/ is meant to be
replaced by Gulzar's hand-drawn PNGs. The app never draws illustrations in
CSS or SVG — it only ever renders <img src> pointing at these filenames, so
swapping the art needs no code changes at all.

The one thing the real art must match is the LAYER SPLIT. An envelope is three
separate transparent PNGs, all 600x400 except the flap:

    envelope-<color>-back.png   600x400  the whole envelope body, flat
    envelope-<color>-front.png  600x400  ONLY the front pocket panel (bottom V),
                                         transparent above it
    envelope-<color>-flap.png   600x200  ONLY the top triangle, hinge along y=0

The letter sits in the DOM between back and front, so it slides up out of the
pocket and passes behind the front panel. The flap is its own image so it can
rotate on rotateX without dragging the body with it.

Run:  python3 tools/make_placeholder_assets.py
"""

import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

random.seed(14)

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "assets")
os.makedirs(OUT, exist_ok=True)

# ---- palette (the only colours allowed anywhere in this project) -----------
SAGE = (156, 176, 97)
DEEP_SAGE = (117, 136, 74)
SOFT_PINK = (245, 184, 206)
DEEP_PINK = (232, 143, 180)
CREAM = (250, 243, 220)
HEART_RED = (244, 86, 107)
LILAC = (168, 123, 200)
OLIVE_BG = (179, 183, 144)

INK = DEEP_SAGE  # single outline colour, the way a linocut has one key plate

ENVELOPES = {"sage": SAGE, "pink": SOFT_PINK, "cream": CREAM}

W, H = 600, 400
SS = 3  # supersample factor — draw big, shrink down, get smooth edges


def rgba(c, a=255):
    return (c[0], c[1], c[2], a)


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def canvas(w, h):
    img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def finish(img, w, h):
    return img.resize((w, h), Image.LANCZOS)


def s(pts):
    """scale a point list into supersampled space"""
    return [(x * SS, y * SS) for x, y in pts]


def wobble(pts, amount=3.0):
    """nudge each vertex a little so nothing looks machine-straight"""
    return [(x + random.uniform(-amount, amount), y + random.uniform(-amount, amount)) for x, y in pts]


def ink_polygon(draw, pts, fill, width=5, closed=True, jitter=2.5):
    p = wobble(pts, jitter)
    if fill is not None:
        draw.polygon(s(p), fill=fill)
    line = p + [p[0]] if closed else p
    # two passes at slightly different offsets reads as a pressed, uneven line
    draw.line(s(line), fill=rgba(INK), width=int(width * SS), joint="curve")
    draw.line(s([(x + 0.8, y + 0.6) for x, y in line]), fill=rgba(INK, 90), width=int(width * SS * 0.7), joint="curve")


def grain(img, strength=10):
    """a whisper of gouache texture so flat fills don't look like CSS"""
    w, h = img.size
    noise = Image.effect_noise((w, h), 42).convert("L").filter(ImageFilter.GaussianBlur(1.2))
    px = img.load()
    npx = noise.load()
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            d = (npx[x, y] - 128) / 128 * strength
            px[x, y] = (
                max(0, min(255, int(r + d))),
                max(0, min(255, int(g + d))),
                max(0, min(255, int(b + d))),
                a,
            )
    return img


def heart_points(cx, cy, size, n=90):
    pts = []
    for i in range(n):
        t = i / n * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 32, cy - y * size / 32))
    return pts


# ---------------------------------------------------------------- envelopes
# The pocket's top edge has to sit HIGH enough that a letter parked at 48% of
# the envelope's height is completely hidden behind it, and the flap's tip has
# to reach past the pocket's apex so the closed envelope has no gap through it.
BODY = [(18, 8), (582, 8), (582, 392), (18, 392)]
POCKET = [(18, 392), (582, 392), (582, 130), (300, 190), (18, 130)]
FLAP = [(18, 2), (582, 2), (300, 200)]
FLAP_H = 210  # canvas height for the flap layer, hinged along y = 0


def envelope_back(color):
    img, d = canvas(W, H)
    ink_polygon(d, BODY, rgba(color), width=5)
    # the two side folds, drawn faintly so the body still reads as one piece
    d.line(s(wobble([(18, 130), (300, 190)], 2)), fill=rgba(INK, 70), width=int(3 * SS))
    d.line(s(wobble([(582, 130), (300, 190)], 2)), fill=rgba(INK, 70), width=int(3 * SS))
    return grain(finish(img, W, H))


def envelope_front(color):
    img, d = canvas(W, H)
    ink_polygon(d, POCKET, rgba(mix(color, DEEP_SAGE, 0.14)), width=5)
    return grain(finish(img, W, H))


def envelope_flap(color):
    img, d = canvas(W, FLAP_H)
    ink_polygon(d, FLAP, rgba(mix(color, CREAM, 0.22)), width=5)
    return grain(finish(img, W, FLAP_H))


for name, color in ENVELOPES.items():
    envelope_back(color).save(f"{OUT}/envelope-{name}-back.png")
    envelope_front(color).save(f"{OUT}/envelope-{name}-front.png")
    envelope_flap(color).save(f"{OUT}/envelope-{name}-flap.png")


# -------------------------------------------------------------- wax seal
# Two halves so the seal can BREAK rather than fade — each half is drawn in a
# full-width canvas and then cropped, so they line up perfectly when together.
def seal_halves():
    img, d = canvas(160, 160)
    ink_polygon(d, heart_points(80, 84, 116), rgba(HEART_RED), width=5, jitter=1.2)
    full = grain(finish(img, 160, 160), 8)
    left = full.crop((0, 0, 80, 160))
    right = full.crop((80, 0, 160, 160))
    pad_l = Image.new("RGBA", (80, 160), (0, 0, 0, 0))
    pad_l.paste(left, (0, 0))
    pad_r = Image.new("RGBA", (80, 160), (0, 0, 0, 0))
    pad_r.paste(right, (0, 0))
    return pad_l, pad_r


l, r = seal_halves()
l.save(f"{OUT}/seal-left.png")
r.save(f"{OUT}/seal-right.png")


# --------------------------------------------------------- heart padlock
def padlock():
    img, d = canvas(120, 140)
    # shackle
    d.arc(s([(30, 14), (90, 82)]), start=180, end=360, fill=rgba(INK), width=int(9 * SS))
    ink_polygon(d, heart_points(60, 92, 84), rgba(CREAM), width=5, jitter=1.0)
    d.ellipse(s([(52, 88), (68, 104)]), fill=rgba(INK))
    d.line(s([(60, 100), (60, 114)]), fill=rgba(INK), width=int(5 * SS))
    return finish(img, 120, 140)


padlock().save(f"{OUT}/padlock-heart.png")


# ------------------------------------------------------------ loose hearts
def loose_heart(color, filled=True):
    img, d = canvas(120, 120)
    pts = heart_points(60, 64, 96)
    ink_polygon(d, pts, rgba(color) if filled else None, width=6, jitter=1.4)
    return grain(finish(img, 120, 120), 7)


for nm, c in [("red", HEART_RED), ("pink", SOFT_PINK), ("cream", CREAM), ("sage", SAGE), ("lilac", LILAC)]:
    loose_heart(c).save(f"{OUT}/heart-{nm}.png")
loose_heart(DEEP_PINK, filled=False).save(f"{OUT}/heart-outline.png")


# ----------------------------------------------------------------- doily
def doily():
    img, d = canvas(320, 320)
    cx = cy = 160
    scallop = []
    for i in range(360):
        t = math.radians(i)
        rr = 148 + 9 * math.sin(t * 18)
        scallop.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    d.polygon(s(scallop), fill=rgba(SAGE, 235))
    for ring, count in ((118, 26), (88, 20), (58, 14), (26, 7)):
        for i in range(count):
            t = 2 * math.pi * i / count
            x, y = cx + ring * math.cos(t), cy + ring * math.sin(t)
            d.ellipse(s([(x - 7, y - 7), (x + 7, y + 7)]), fill=(0, 0, 0, 0))
    return grain(finish(img, 320, 320), 8)


doily().save(f"{OUT}/doily.png")


# --------------------------------------------------------- lavender sprig
def sprig(w=160, h=300):
    img, d = canvas(w, h)
    stem = [(w / 2 + 6 * math.sin(i / 6.0), h - 6 - i * (h - 60) / 60.0) for i in range(61)]
    d.line(s(stem), fill=rgba(DEEP_SAGE), width=int(5 * SS), joint="curve")
    for i in range(5):
        y = h - 40 - i * 28
        for side in (-1, 1):
            leaf = [(w / 2, y), (w / 2 + side * 34, y - 16), (w / 2 + side * 20, y + 12)]
            ink_polygon(d, leaf, rgba(SAGE), width=3, jitter=1.0)
    for i in range(14):
        t = i / 13
        y = 60 - t * 46
        x = w / 2 + (10 if i % 2 else -10) * (1 - t)
        rr = 11 * (1 - t * 0.45)
        d.ellipse(s([(x - rr, y - rr), (x + rr, y + rr)]), fill=rgba(LILAC), outline=rgba(INK), width=int(2 * SS))
    return grain(finish(img, w, h), 7)


sprig().save(f"{OUT}/lavender-sprig.png")
sprig(120, 190).save(f"{OUT}/pressed-flower.png")


# ------------------------------------------ hero: open envelope w/ lavender
def hero():
    HW, HH = 720, 640
    ox, oy = 60, 250  # top-left of the envelope body
    out = Image.new("RGBA", (HW, HH), (0, 0, 0, 0))

    # sprigs poking out of the top, behind everything
    for dx, sc, rot in ((130, 1.0, -16), (300, 1.2, 3), (470, 0.9, 18)):
        sp = sprig().rotate(rot, expand=True, resample=Image.BICUBIC)
        sp = sp.resize((int(sp.width * sc * 0.8), int(sp.height * sc * 0.8)), Image.LANCZOS)
        out.alpha_composite(sp, (int(ox + dx - sp.width / 2), 8))

    # flap, laid open behind the letter
    fl, fd = canvas(HW, HH)
    ink_polygon(fd, [(ox + 8, oy + 6), (ox + 592, oy + 6), (ox + 300, oy - 168)],
                rgba(mix(SOFT_PINK, CREAM, 0.3)), width=5)
    out.alpha_composite(grain(finish(fl, HW, HH), 8))

    # the letter, standing up out of the pocket
    ll, ld = canvas(HW, HH)
    ink_polygon(ld, [(ox + 92, oy - 150), (ox + 508, oy - 150), (ox + 508, oy + 210), (ox + 92, oy + 210)],
                rgba(CREAM), width=5, jitter=1.5)
    for i in range(3):
        y = oy - 108 + i * 32
        ld.line(s(wobble([(ox + 132, y), (ox + 468 - (110 if i == 2 else 0), y)], 1.6)),
                fill=rgba(SAGE, 210), width=int(4 * SS))
    ink_polygon(ld, heart_points(ox + 300, oy - 8, 74), rgba(HEART_RED), width=5, jitter=1.0)
    out.alpha_composite(grain(finish(ll, HW, HH), 8))

    # envelope body + front pocket in front of the letter
    bb, bd = canvas(HW, HH)
    ink_polygon(bd, [(ox + 8, oy), (ox + 592, oy), (ox + 592, oy + 384), (ox + 8, oy + 384)],
                rgba(SOFT_PINK), width=5)
    ink_polygon(bd, [(ox + 8, oy + 384), (ox + 592, oy + 384), (ox + 592, oy + 168),
                     (ox + 300, oy + 284), (ox + 8, oy + 168)],
                rgba(mix(SOFT_PINK, DEEP_PINK, 0.5)), width=5)
    out.alpha_composite(grain(finish(bb, HW, HH), 8))
    return out


hero().save(f"{OUT}/envelope-open-lavender.png")

print("wrote placeholders to", OUT)
for f in sorted(os.listdir(OUT)):
    print("  ", f)

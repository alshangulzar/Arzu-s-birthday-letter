"""
Converts dist/assets/*.png to WebP, for the single-file preview build only.

Your source assets in src/assets/ are never touched — this runs on the throwaway
dist/ output. WebP at q88 takes the pack from 1.69 MB to 0.33 MB with no
visible difference, which is what makes a one-file build small enough to hand
round as a link.
"""
from PIL import Image
import glob, os

total_png = total_webp = 0
for f in glob.glob('dist/assets/*.png'):
    im = Image.open(f).convert('RGBA')
    total_png += os.path.getsize(f)
    out = f + '.webp'
    im.save(out, 'WEBP', quality=88, method=6)
    total_webp += os.path.getsize(out)

print(f"  webp: {total_png/1024/1024:.2f} MB png -> {total_webp/1024/1024:.2f} MB")

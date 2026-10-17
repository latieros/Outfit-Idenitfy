#!/usr/bin/env python3
"""Build the Chrome/Brave extension into dist/outfit-tag-extension/ and a zip next to it.

The bundled tool page is index.html with the API-key provider block swapped for
extension/tool-provider.html, and it loads tags.js, core.js and app.js from the repo.

Usage: python3 build_extension.py [out_dir]
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path

root = Path(__file__).resolve().parent
src = root / "extension"
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist" / "outfit-tag-extension"
if out.exists():
    shutil.rmtree(out)
(out / "tool").mkdir(parents=True)
(out / "icons").mkdir()

for f in ("manifest.json", "background.js", "claude.js", "content.js", "bridge.js", "options.html", "options.js"):
    shutil.copy(src / f, out / f)
for f in ("tags.js", "core.js", "app.js"):
    shutil.copy(root / f, out / "tool" / f)
shutil.copy(src / "tool-provider.js", out / "tool" / "provider.js")

# Tool page: same markup as index.html, extension provider instead of the API-key form.
html = (root / "index.html").read_text()
def between(text, start, end):
    i = text.index(start) + len(start)
    return text[i:text.index(end, i)]
page = between(html, "<!-- page:start -->", "<!-- page:end -->").strip()
body = between(html, "<!-- body:start -->", "<!-- body:end -->")
body = body.replace(between(body, "<!-- provider:start -->", "<!-- provider:end -->"), "\n" + (src / "tool-provider.html").read_text())
body = re.sub(r"\s*<!-- [a-z-]+:(start|end) -->", "", body)
scripts = "".join(f'<script src="{s}"></script>\n' for s in ("tags.js", "core.js", "../claude.js", "app.js", "provider.js"))
tool = f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n{page}\n</head>\n<body>\n{body}\n{scripts}</body>\n</html>\n'
# Extension pages forbid inline scripts and inline event handlers.
assert "<script>" not in tool and not re.search(r"\son[a-z]+=", tool), "inline script or handler in the tool page"
(out / "tool" / "index.html").write_text(tool)

# Icons: a white luggage tag on the accent color.
try:
    from PIL import Image, ImageDraw
    for size in (16, 32, 48, 128):
        s = size * 4
        im = Image.new("RGBA", (s, s), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, s - 1, s - 1), radius=s // 5, fill=(122, 77, 232, 255))
        m = s * 0.2
        d.polygon([(m, s * 0.5), (s * 0.38, m), (s - m, m), (s - m, s - m), (s * 0.38, s - m)], fill=(255, 255, 255, 255))
        r = s * 0.075
        d.ellipse((s * 0.36 - r, s * 0.5 - r, s * 0.36 + r, s * 0.5 + r), fill=(122, 77, 232, 255))
        im.resize((size, size), Image.LANCZOS).save(out / "icons" / f"{size}.png")
except ImportError:
    print("Pillow not installed: building without icons")
    manifest = (out / "manifest.json").read_text()
    manifest = re.sub(r',\s*"default_icon": \{[^}]*\}', "", manifest)
    manifest = re.sub(r',\s*"icons": \{[^}]*\}', "", manifest)
    (out / "manifest.json").write_text(manifest)

zip_path = out.with_suffix(".zip")
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(out.rglob("*")):
        if p.is_file():
            z.write(p, p.relative_to(out.parent))
print(f"built {out}\nzipped {zip_path} ({zip_path.stat().st_size // 1024} KB)")

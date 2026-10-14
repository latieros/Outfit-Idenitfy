#!/usr/bin/env python3
"""Build the claude.ai artifact version of the interpreter.

Takes index.html, swaps the API-key provider for the claude.ai `sample` provider
(artifact/provider.html + artifact/provider.js), inlines tags.js and app.js, and
drops the document wrapper (the artifact host adds its own).

Usage: python3 build_artifact.py [output.html]
"""
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text()

def between(text, start, end):
    i = text.index(start) + len(start)
    return text[i:text.index(end, i)]

page = between(html, "<!-- page:start -->", "<!-- page:end -->").strip()
body = between(html, "<!-- body:start -->", "<!-- body:end -->")
body = body.replace(between(body, "<!-- provider:start -->", "<!-- provider:end -->"), "\n" + (root / "artifact/provider.html").read_text())
scripts = "\n".join(
    f"<script>\n{(root / f).read_text()}\n</script>" for f in ("tags.js", "core.js", "app.js", "artifact/provider.js")
)
out = re.sub(r"\s*<!-- [a-z-]+:(start|end) -->", "", f"{page}\n{body}\n{scripts}\n")
assert 'id="apiKey"' not in out and "OTI_PROVIDER" in out
dest = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "artifact" / "build" / "outfit-tag-interpreter.html"
dest.parent.mkdir(parents=True, exist_ok=True)
dest.write_text(out)
print(f"wrote {dest} ({len(out)} bytes)")

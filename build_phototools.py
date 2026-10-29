#!/usr/bin/env python3
"""Build the Photo Tools copy of the interpreter: one self-contained page, outfit-tags.html.

Photo Tools (github.com/latieros/Photo-Tools-Personal) is a suite of single-page tools that share a head block,
a light/dark switch, a tool switcher and a look. This takes the shared parts from an existing Photo Tools page,
so the copy always matches the suite, and inlines this repo's tags.js, core.js and app.js with the
Photo Tools provider (your API key on the website, your Claude account inside Claude).

Usage: python3 build_phototools.py /path/to/Photo-Tools-Personal
Then, in Photo Tools: python3 dev/build.py stamp && python3 dev/build.py check && python3 dev/test.py
"""
import re
import sys
from pathlib import Path

PAGE = "outfit-tags.html"
LINK = f'<a href="{PAGE}">Outfits</a>'
root = Path(__file__).resolve().parent
if len(sys.argv) < 2:
    sys.exit(__doc__)
pt = Path(sys.argv[1]).resolve()
ref = (pt / "metadata-scrubber.html").read_text(encoding="utf-8")   # any Photo Tools page works as the reference


def between(text, start, end):
    i = text.index(start) + len(start)
    return text[i:text.index(end, i)]


# ---- shared head: everything up to the end of the light/dark switch script, with our own title
head = ref[:ref.index('})();</script>', ref.index('<script id="pt-theme-js">')) + len('})();</script>')]
head = re.sub(r"<title>[^<]*</title>", "<title>Outfit Tags</title>", head, count=1)

# ---- shared header styles (.top, .brand, .switch) from the reference page
top_css = re.search(r"\.top\{.*?\.switch a:focus-visible\{[^}]*\}", ref, re.S).group(0)

# ---- this tool's own styles: everything after the old header rules in index.html
html = (root / "index.html").read_text(encoding="utf-8")
own_css = between(html, "<style>", "</style>")
own_css = own_css[own_css.index("  main {"):]
own_css = own_css.replace("main { max-width: 1180px;", "main { max-width: 1240px;")

TOKENS = """
/* Layout: photos and model settings on the left, tags on the right; on phones it stacks photos → settings → tags */
:root{
  --bg:#F2F1F6; --panel:#FFFFFF; --ink:#18161F; --muted:#686577; --line:#DDDAE6;
  --accent:#5B3DF5; --accent-ink:#FFFFFF; --good:#16794A; --good-bg:#E2F3E9; --warn:#9A4A00; --warn-bg:#FCEEDB; --bad:#B4232C;
  --ok:var(--good); --code:#F2F1F6;
  --chip:#ECE8FF; --chip-ink:#3B23B8; --chip-custom:#FCEEDB; --chip-custom-ink:#9A4A00; --chip-off:#EEEDF2; --chip-off-ink:#9D9AAE; --chip-warn:#FCE4E6;
  --f-display:"Unbounded","Familjen Grotesk",system-ui,sans-serif;
  --f-body:"Familjen Grotesk",system-ui,-apple-system,"Segoe UI",sans-serif;
  --f-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#121118; --panel:#1B1A23; --ink:#EEEDF4; --muted:#9D9AAE; --line:#2F2D3B;
  --accent:#9C88FF; --accent-ink:#141020; --good:#5BD69A; --good-bg:#16302A; --warn:#F5B94A; --warn-bg:#3A2A12; --bad:#FF7A82;
  --code:#121118; --chip:#2A2445; --chip-ink:#D3CBFF; --chip-custom:#3A2A12; --chip-custom-ink:#F5B94A; --chip-off:#24232D; --chip-off-ink:#6E6B7D; --chip-warn:#3A1C20; color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#121118; --panel:#1B1A23; --ink:#EEEDF4; --muted:#9D9AAE; --line:#2F2D3B;
  --accent:#9C88FF; --accent-ink:#141020; --good:#5BD69A; --good-bg:#16302A; --warn:#F5B94A; --warn-bg:#3A2A12; --bad:#FF7A82;
  --code:#121118; --chip:#2A2445; --chip-ink:#D3CBFF; --chip-custom:#3A2A12; --chip-custom-ink:#F5B94A; --chip-off:#24232D; --chip-off-ink:#6E6B7D; --chip-warn:#3A1C20; color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 var(--f-body);padding-inline:16px;padding-block:18px 48px}
[hidden]{display:none!important}
.panel h2{font:600 13px/1.2 var(--f-body)}
pre.out{font-family:var(--f-mono)}
#keyMode,#claudeMode{display:flex;flex-direction:column;gap:12px}
"""
PHONE = """
@media (max-width:900px){
  body{padding-inline:12px}
  .top p{display:none}
  input[type=text],input[type=password],input[type=search],select,textarea{font-size:16px}
}
"""
css = TOKENS + top_css + "\n" + own_css + PHONE

# ---- header: the suite's switcher with this tool added and marked current
nav = re.search(r'<nav class="switch".*?</nav>', ref, re.S).group(0)
nav = nav.replace(' aria-current="page"', "")
if LINK not in nav:
    nav = nav.replace("</nav>", LINK + "</nav>")
nav = nav.replace(LINK, f'<a href="{PAGE}" aria-current="page">Outfits</a>')
header = f'''<header class="top">
  <h1 class="brand">Outfit <span>Tags</span></h1>
  {nav}
  <p>Read the outfit in a photo and turn it into Danbooru tags or prompts for anime art. The photo is sent to an AI model to be read.</p>
</header>'''

# ---- body: index.html's body without its own header, with the Photo Tools provider block
body = between(html, "<!-- body:start -->", "<!-- body:end -->")
body = re.sub(r"\s*<header>.*?</header>", "", body, count=1, flags=re.S)
body = body.replace(between(body, "<!-- provider:start -->", "<!-- provider:end -->"), "\n" + (root / "phototools/provider.html").read_text())
body = re.sub(r"\s*<!-- [a-z-]+:(start|end) -->", "", body)

# ---- scripts: shared code, then the suite's switcher and hand-off helpers, then the provider
handoff = re.search(r"const HANDOFF=\{name:'pt-handoff',.*?return out;\},", ref, re.S).group(0).rstrip(",") + "};"
art = re.search(r"const ART=\{[^}]*\}", ref).group(0)   # `dev/build.py stamp` keeps this in step with dev/artifacts.json
suite_js = f"""
/* ================= switching tools ================= */
let topLevel=false;try{{topLevel=window.top===window.self;}}catch(e){{}}
(function(){{
  {art};
  document.querySelectorAll('.switch a').forEach(a=>{{
    if(a.getAttribute('aria-current')){{a.addEventListener('click',e=>e.preventDefault());return;}}
    if(!topLevel){{const u=ART[a.getAttribute('href')];if(u&&!u.startsWith('__')){{a.href=u;a.target='_blank';a.rel='noopener';}}return;}}
  }});
}})();
/* ================= photos passed in from other tools and from the Share menu (installed app only) ================= */
{handoff}
"""
scripts = "\n".join(f"<script>\n{(root / f).read_text(encoding='utf-8')}\n</script>" for f in ("tags.js", "core.js", "app.js"))
scripts += f"\n<script>{suite_js}\n{(root / 'phototools/provider.js').read_text(encoding='utf-8')}\n</script>"

fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600&family=Unbounded:wght@600&display=swap">')
page = f"{head}\n\n{fonts}\n<style>{css}</style>\n</head>\n<body>\n{header}\n{body}\n{scripts}\n</body>\n</html>\n"
assert 'id="apiKey"' in page and "OTI_PROVIDER" in page and 'aria-current="page"' in page
(pt / PAGE).write_text(page, encoding="utf-8")
print(f"wrote {pt / PAGE} ({len(page) // 1024} KB)")

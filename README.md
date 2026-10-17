# Outfit Tag Interpreter

Read an outfit from a photo or a piece of anime art and turn it into prompts for anime image generators:
Danbooru-style tags grouped per garment, or natural-language sentences for models that read prose.
It runs as a web page, as a claude.ai artifact, and as a Chrome/Brave extension that works from any image's right-click menu.

## Files

| File | Purpose |
|---|---|
| `index.html` | The interpreter page: markup plus the API-key provider (Anthropic or OpenAI-compatible). |
| `app.js` | Page logic: photo queue, results, catalog, variants, tag checking, remix. Talks to a provider object. |
| `core.js` | Logic shared by every surface, with no DOM access: schemas, prompts, generator presets, prompt formatting, sentences, Danbooru identity checks. |
| `tags.js` | Danbooru-style tag vocabulary by category, plus an alias table for common misspellings. |
| `artifact/` | The claude.ai artifact provider, which asks Claude through the viewer's account. `python3 build_artifact.py` builds the single-file artifact page. |
| `phototools/` | The provider for the Photo Tools copy: your API key on the website, your Claude account inside Claude. `python3 build_phototools.py /path/to/Photo-Tools-Personal` writes `outfit-tags.html` into that suite, matching its header, switcher and look. |
| `extension/` | The browser extension: service worker, on-page panel, options page and the provider for its bundled copy of the page. `python3 build_extension.py` builds `dist/outfit-tag-extension/` and a zip. |

## Run the page

Serve the folder with any static server and open `index.html`:

```
python3 -m http.server 8000
```

1. Drop, choose or paste up to 5 images.
2. Pick a provider. Anthropic (Claude) is the default and uses `claude-opus-5-5` unless you type another model.
   The OpenAI-compatible option works with OpenAI, OpenRouter, Ollama, LM Studio and similar servers that expose `/v1/chat/completions` with vision.
3. Paste an API key. It is stored in this browser's `localStorage` only and sent only to the chosen provider.
4. Click **Interpret**.

## Install the extension (Chrome or Brave)

```
python3 build_extension.py
```

Open `chrome://extensions` or `brave://extensions`, turn on Developer mode, choose **Load unpacked** and pick `dist/outfit-tag-extension`.
The settings page opens on install: add an Anthropic API key there. Calls are billed to that key's Console account.

Right-click menu:

- **Read outfit tags**: a panel on the page with the prompt, grouped tags, copy buttons and save.
- **Open in Outfit Tag Interpreter**: the full page with the image loaded and read.
- **Add to outfit queue**: collect up to 5 images across pages; the toolbar badge counts them and the toolbar button opens them together.
- **Read all outfits on this page**: reads the largest images on the page and saves each to the catalog.

On Danbooru and Gelbooru-style post pages the panel also compares Claude's tags with the post's real tags.

## Features

- **Sections.** A bar under the title switches between Tags, Map, New outfits, Catalog and Settings; the photo panel stays in place through all of them.
- **What to read.** Outfit only; outfit and character (hair, face, body, framing); or everything, with checkboxes for background, composition, lighting, colors and visual aesthetic. Each becomes its own tag group, in Danbooru's grouping, and unchecked groups are left out even if the model fills them.
- **Map.** The picture with a label pointing at the hair and each garment. The model gives a bounding box for every item; positions are approximate, so dots can be dragged to fix them (**Undo moves** restores the model's), and "show boxes" draws the boxes. On phones the dots are numbered and the labels are listed below. Needs the kept picture, so it works for outfits read after this feature was added.
- **Queue.** Up to 5 photos at once, read one after another. Photo tabs above the tags switch which outfit you are working on; exclusions stay with each outfit.
- **Generator presets.** Illustrious XL, NoobAI XL, Pony V6, Animagine XL 4, NovelAI V4.5 and Flux. Each wraps the prompt with that model's quality prefix or suffix, adds its standard negative tags, and writes weights in its syntax. Prefix, suffix and negative are editable per preset.
- **Formats.** Tags with underscores or spaces, tags weighted by confidence, hybrid (tags plus one sentence on layering and fit), and prose (sentences only). Claude writes the sentence and prose in the same call as the tags; after edits, **Rewrite it** updates them.
- **Characters, series and named outfits.** Claude names fictional characters, their series and iconic outfits as Danbooru tags, with its confidence and the evidence it used. It never identifies real people, though it can name the character a cosplayer is dressed as. Where Danbooru can be reached (the page and the extension), each guess is checked: name order is fixed (`miku_hatsune` → `hatsune_miku`), near misses are corrected through Danbooru's autocomplete, and tags Danbooru has never heard of are flagged and left out of the prompt until you put them back.
- **Page context.** The extension sends the page title, the image's alt text and nearby caption with the image, marked as untrusted text, so Claude can use a Pixiv title or a wiki caption to recognize a character.
- **Catalog.** Every read is saved with a thumbnail, a 768px copy of the picture for the map, and where it came from (the file name, or the page it was read from in the extension, as a link). Name it, add labels and notes, star it, and mark it "to try" or "done". Search across everything, and export or import JSON.
- **Design 3 variants.** Three new outfits from any outfit: a restyle, a genre shift and a season or formality flip, or your own direction.
- **Check tags.** Fixes alias spellings and, where Danbooru can be reached, shows post counts: green is common, orange under 5,000 posts, red under 500 or not found.
- **Remix.** Delete and add tags, swap a garment for one from another saved outfit, add or remove garments, then update the outfit or save a copy.
- **Copy** the full prompt, the negative prompt, the outfit only, or any single group.

## How the model is called

Claude is called through the Messages API with the image as base64 (downscaled to 1568px on the longest side),
a prompt containing the tag vocabulary, and a JSON schema through `output_config.format` so the reply always parses.
Server-side refusal fallbacks are enabled. Calls made from a browser page carry the `anthropic-dangerous-direct-browser-access` header:
fine for a personal tool, but do not publish the page with a key in it.

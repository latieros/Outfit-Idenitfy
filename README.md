# Outfit Tag Interpreter

A small static site: upload a photo, have an AI vision model read the outfit, and get it back as
Danbooru-style tags grouped per garment, ready to paste into an image generator prompt.

## Files

| File | Purpose |
|---|---|
| `index.html` | The interpreter page: markup plus the API-key provider (Anthropic or OpenAI-compatible). |
| `app.js` | Shared UI logic: interpretation, catalog, variants, tag checking, remix. Talks to a provider object. |
| `tags.js` | Danbooru-style tag vocabulary by category, plus an alias table for common misspellings. |
| `artifact/` | The claude.ai artifact provider (asks Claude through the viewer's account). `python3 build_artifact.py` builds the single-file artifact page. |

## Run it

Serve the folder with any static server and open `index.html` (opening the file directly also works in most browsers):

```
python3 -m http.server 8000
```

Then:

1. Drop, browse, or paste an image.
2. Pick a provider. Anthropic (Claude) is the default and uses `claude-opus-5-5` unless you type another model.
   The OpenAI-compatible option works with OpenAI, OpenRouter, Ollama, LM Studio and similar servers that expose `/v1/chat/completions` with vision.
3. Paste an API key. It is stored in this browser's `localStorage` only and sent only to the chosen provider.
4. Click **Interpret outfit**.

## Output

- Tags are grouped: subject, hair, face, one group per garment or accessory, style, framing.
- Purple chips are tags found in `tags.js`. Orange chips are phrases the model invented. Click a chip to drop it from the prompt.
- Format switch: `danbooru` (underscores), `spaces`, or `weighted` which turns per-item confidence into `(tag:0.8..1.2)` weights.
- Min confidence hides items the model was unsure about (hidden or cropped garments).
- Copy the prompt, copy or download the JSON, and every run is saved to `localStorage["oti.history"]` with a thumbnail.

## Features

- **Catalog.** Every interpretation is saved with a thumbnail. Name it, add labels and notes, star it, and mark it "to try" or "done". Search across names, labels, notes and tags. Export and import as JSON to back up or move between browsers.
- **Design 3 variants.** From any outfit, ask the model for three new outfits as tag sets: a restyle, a genre shift and a season/formality flip, or give your own direction. Open one to work on it, or save it straight to the catalog as "to try".
- **Check tags.** Fixes alias spellings from `tags.js` (thigh_highs → thighhighs) and, in the repo version, looks every tag up on Danbooru to show post counts: green is common, orange under 5,000 posts, red under 500 or not found. Inside the artifact the live lookup is blocked, so only the alias fix and vocabulary match run.
- **Remix.** Delete tags, add tags per garment, swap a garment for one from another saved outfit, add or remove garments, then update the outfit or save it as a copy.
- **Copy outfit only** gives just the clothing and accessory tags for pasting onto an existing character prompt.

## How the model is called

Claude is called from the browser via the Messages API with the image as base64 (downscaled to 1568px on the longest side),
a system prompt containing the tag vocabulary, and a JSON schema through `output_config.format` so the reply always parses.
Server-side refusal fallbacks are enabled. Because the call is made from the browser, the request carries the
`anthropic-dangerous-direct-browser-access` header. That is fine for a personal tool, but do not publish this page with a key in it.

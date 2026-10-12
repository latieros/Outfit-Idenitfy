# Outfit Tag Interpreter

A small static site: upload a photo, have an AI vision model read the outfit, and get it back as
Danbooru-style tags grouped per garment, ready to paste into an image generator prompt.

## Files

| File | Purpose |
|---|---|
| `index.html` | The interpreter tool (step 1). Single page, no build step. |
| `tags.js` | Danbooru-style tag vocabulary by category. Steers the model and classifies its output as canonical vs custom. |
| `mannequin.html` | three.js mannequin dressed and posed by tags (hair, headwear, tops, outerwear, dresses, skirts, pants, legwear, shoes, accessories, colors, patterns, materials, poses, camera framing). |
| `visualizer.html` | three.js tag-space view: tags clustered by category, sized by frequency, linked by co-occurrence. |

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

## How the model is called

Claude is called from the browser via the Messages API with the image as base64 (downscaled to 1568px on the longest side),
a system prompt containing the tag vocabulary, and a JSON schema through `output_config.format` so the reply always parses.
Server-side refusal fallbacks are enabled. Because the call is made from the browser, the request carries the
`anthropic-dangerous-direct-browser-access` header. That is fine for a personal tool, but do not publish this page with a key in it.

## 3D pages

Both 3D pages load three.js r128 from cdnjs and read the interpreter's saved results from the same browser.
`mannequin.html` lists which tags it understood and which it ignored; colors work as prefixes (`red_necktie`), and standalone pattern or material tags apply to the main garment.

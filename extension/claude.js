// Claude Messages API call shared by the extension's service worker and its tool page.
// Classic script: defines self.OTI_CLAUDE. Works in a service worker (no DOM).
self.OTI_CLAUDE = (() => {
  const DEFAULTS = { apiKey: "", model: "claude-opus-5-5", effort: "medium", focus: "full", batchMax: 12, apiBase: "https://api.anthropic.com" };

  async function settings() {
    const got = await chrome.storage.local.get("oti.settings");
    return Object.assign({}, DEFAULTS, got["oti.settings"] || {});
  }

  // image: { mediaType, base64 } or null. Returns { json, servedBy }.
  async function call({ apiKey, model, effort, apiBase, image, prompt, schema, signal }) {
    if (!apiKey) throw new Error("Add your Anthropic API key in the extension settings.");
    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
    content.push({ type: "text", text: prompt });
    const base = (apiBase || DEFAULTS.apiBase).replace(/\/+$/, "");
    const res = await fetch(base + "/v1/messages", {
      method: "POST", signal,
      headers: {
        "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01", "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: model || DEFAULTS.model, max_tokens: 16000, fallbacks: "default",
        output_config: { effort: effort || DEFAULTS.effort, format: { type: "json_schema", schema } },
        messages: [{ role: "user", content }]
      })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("The API key was rejected. Check it in the extension settings.");
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${data.error?.message || res.statusText}`);
    if (data.stop_reason === "refusal") throw new Error("Claude declined this image" + (data.stop_details?.category ? ` (${data.stop_details.category})` : "") + ".");
    if (data.stop_reason === "max_tokens") throw new Error("The answer was cut off. Try again.");
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return { json: JSON.parse(text), servedBy: data.model || model };
  }

  // Danbooru post counts for a list of tags: Map<name, { post_count, category }>.
  async function lookupTags(tags) {
    const map = new Map();
    for (let i = 0; i < tags.length; i += 50) {
      const batch = tags.slice(i, i + 50);
      const res = await fetch("https://danbooru.donmai.us/tags.json?limit=100&only=name,post_count,category&search[name_comma]=" + encodeURIComponent(batch.join(",")));
      if (!res.ok) throw new Error("danbooru " + res.status);
      (await res.json()).forEach(t => map.set(t.name, { post_count: t.post_count, category: t.category }));
    }
    return map;
  }

  return { DEFAULTS, settings, call, lookupTags };
})();

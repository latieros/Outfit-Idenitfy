// Provider for the Photo Tools copy of the interpreter.
// On the website it calls the model with the user's own API key; inside a Claude artifact it uses
// the viewer's Claude account (the `sample` capability), since an artifact can't reach api.anthropic.com.
(() => {
  const $ = (id) => document.getElementById(id);
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  const inClaude = !!(window.claude && typeof window.claude.use === "function");
  $("claudeMode").hidden = !inClaude; $("keyMode").hidden = inClaude; $("clearKey").hidden = inClaude;

  // ---------- website: the user's own API key ----------
  const LS = { key: "oti.apiKey", provider: "oti.provider", model: "oti.model", baseUrl: "oti.baseUrl", effort: "oti.effort" };
  $("apiKey").value = ls(LS.key) || ""; $("provider").value = ls(LS.provider) || "anthropic"; $("model").value = ls(LS.model) || ""; $("baseUrl").value = ls(LS.baseUrl) || ""; $("effort").value = ls(LS.effort) || "medium";
  const sync = () => { const p = $("provider").value; $("openaiExtra").hidden = p !== "openai"; $("effortWrap").hidden = p !== "anthropic"; $("model").placeholder = p === "anthropic" ? "claude-opus-5-5" : "gpt-4o"; };
  sync();
  $("provider").addEventListener("change", () => { ls(LS.provider, $("provider").value); sync(); });
  $("model").addEventListener("change", () => ls(LS.model, $("model").value)); $("baseUrl").addEventListener("change", () => ls(LS.baseUrl, $("baseUrl").value));
  $("apiKey").addEventListener("change", () => ls(LS.key, $("apiKey").value)); $("effort").addEventListener("change", () => ls(LS.effort, $("effort").value));
  $("clearKey").addEventListener("click", () => { $("apiKey").value = ""; try { localStorage.removeItem(LS.key); } catch {} OTI.setStatus("API key forgotten.", "ok"); });
  // With the Outfit Tag extension installed, its key, model and effort fill in whatever is left blank here.
  const extSettings = () => (bridge && bridge.cache["oti.settings"]) || {};
  const settings = () => { const x = $("provider").value === "anthropic" ? extSettings() : {}; return { provider: $("provider").value, apiKey: $("apiKey").value.trim() || x.apiKey || "", model: $("model").value.trim() || ($("apiKey").value.trim() ? "" : x.model || ""), baseUrl: $("baseUrl").value.trim(), effort: $("effort").value }; };

  // ---------- the Outfit Tag extension, when it is installed ----------
  // Its content script answers on this page; then the catalog, pictures and a few choices live in the
  // extension's storage, shared with the right-click panel and the extension's own copy of the tool.
  let bridge = null;
  const KEYS = ["oti.history", "oti.fmt", "oti.minConf", "oti.preset", "oti.presetOverrides", "oti.settings"];
  function connectBridge() {
    if (inClaude || !document.documentElement.dataset.otiBridge) return Promise.resolve(null);
    return new Promise((resolve) => {
      const send = (m) => window.postMessage(Object.assign({ otiPage: true }, m), location.origin);
      const waits = new Map(); let n = 0;
      const onMsg = (ev) => {
        if (ev.source !== window || !ev.data || !ev.data.otiBridge) return;
        const m = ev.data;
        if (m.type === "snapshot" && !bridge) {
          clearTimeout(timer);
          const cache = Object.assign({}, m.data);
          const ask = (op, id, data) => new Promise(res => { const reqId = ++n; waits.set(reqId, res); send({ type: "preview", op, id, data, reqId }); setTimeout(() => { if (waits.delete(reqId)) res(null); }, 10000); });
          bridge = { cache, version: m.version, send, previews: { put: (id, data) => ask("put", id, data), get: (id) => ask("get", id), delete: (id) => ask("delete", id) } };
          resolve(bridge);
        } else if (m.type === "preview") { const res = waits.get(m.reqId); if (res) { waits.delete(m.reqId); res(m.data ?? null); } }
        else if (m.type === "changed" && bridge) {
          if (bridge.cache[m.key] === m.value) return;
          bridge.cache[m.key] = m.value;
          if (m.key === "oti.history" && window.OTI) OTI.reloadCatalog();
          if (m.key === "oti.settings") noteBridge();
        }
      };
      window.addEventListener("message", onMsg);
      const timer = setTimeout(() => resolve(null), 3000);
      send({ type: "hello" });
    });
  }
  function noteBridge() {
    const x = extSettings(), own = !!$("apiKey").value.trim();
    $("bridgeNote").hidden = !bridge;
    if (bridge) $("bridgeNote").textContent = "The Outfit Tag extension is installed, so this page shares its catalog" + (!own && x.apiKey ? " and uses its API key." : own ? ". The key entered here is used instead of the extension's." : ". Add an API key here or in the extension.");
  }
  // Outfits saved on this page before the extension came along move over once; the copy here stays as a backup.
  async function mergeLocalCatalog() {
    if (!bridge || ls("oti.mergedIntoExtension")) return;
    let mine = []; try { mine = JSON.parse(ls("oti.history") || "[]"); } catch {}
    let shared = []; try { shared = JSON.parse(bridge.cache["oti.history"] || "[]"); } catch {}
    const have = new Set(shared.map(e => e.id)), add = mine.filter(e => e && e.id && !have.has(e.id));
    if (add.length) {
      bridge.cache["oti.history"] = JSON.stringify(shared.concat(add)); bridge.send({ type: "set", key: "oti.history", value: bridge.cache["oti.history"] });
      for (const e of add) { const pic = await OTI_CORE.previews.get(e.id).catch(() => null); if (pic) await bridge.previews.put(e.id, pic); }
      OTI.setStatus(`Moved ${add.length} outfit${add.length > 1 ? "s" : ""} saved on this site into the extension's catalog.`, "ok");
    }
    ls("oti.mergedIntoExtension", "1");
  }

  async function anthropic({ image, prompt, schema }) {
    const s = settings(), content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.base64 } });
    content.push({ type: "text", text: prompt });
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": s.apiKey, "anthropic-version": "2023-06-01", "anthropic-beta": "server-side-fallback-2026-07-01", "anthropic-dangerous-direct-browser-access": "true" },
      body: JSON.stringify({ model: s.model || "claude-opus-5-5", max_tokens: 16000, fallbacks: "default", output_config: { effort: s.effort, format: { type: "json_schema", schema } }, messages: [{ role: "user", content }] })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("The API key was rejected. Check it and try again.");
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${data.error?.message || res.statusText}`);
    if (data.stop_reason === "refusal") throw new Error("Claude declined this request" + (data.stop_details?.category ? ` (${data.stop_details.category})` : "") + ".");
    if (data.stop_reason === "max_tokens") throw new Error("The answer was cut off. Try again.");
    return { json: JSON.parse((data.content || []).filter(b => b.type === "text").map(b => b.text).join("")), servedBy: data.model };
  }
  async function openai({ image, prompt, schema }) {
    const s = settings(), base = (s.baseUrl || "https://api.openai.com/v1").replace(/\/+$/, "");
    const content = []; if (image) content.push({ type: "image_url", image_url: { url: image.dataUrl } }); content.push({ type: "text", text: prompt + "\nRespond with JSON only." });
    const body = { model: s.model || "gpt-4o", max_tokens: 6000, response_format: { type: "json_schema", json_schema: { name: "outfit", schema, strict: false } }, messages: [{ role: "user", content }] };
    const headers = { "content-type": "application/json" }; if (s.apiKey) headers.authorization = "Bearer " + s.apiKey;
    let res = await fetch(base + "/chat/completions", { method: "POST", headers, body: JSON.stringify(body) }); let data = await res.json().catch(() => ({}));
    if (!res.ok && /response_format|json_schema/i.test(data.error?.message || "")) { body.response_format = { type: "json_object" }; res = await fetch(base + "/chat/completions", { method: "POST", headers, body: JSON.stringify(body) }); data = await res.json().catch(() => ({})); }
    if (!res.ok) throw new Error(`${base} ${res.status}: ${data.error?.message || res.statusText}`);
    const m = (data.choices?.[0]?.message?.content || "").match(/\{[\s\S]*\}/); if (!m) throw new Error("No JSON in the model's reply.");
    return { json: JSON.parse(m[0]), servedBy: data.model };
  }
  async function danbooru(tags) {
    const map = new Map();
    for (let i = 0; i < tags.length; i += 50) {
      const res = await fetch("https://danbooru.donmai.us/tags.json?limit=100&only=name,post_count,category&search[name_comma]=" + encodeURIComponent(tags.slice(i, i + 50).join(",")));
      if (!res.ok) throw new Error("danbooru " + res.status);
      (await res.json()).forEach(t => map.set(t.name, { post_count: t.post_count, category: t.category }));
    }
    return map;
  }

  // ---------- inside Claude: the viewer's Claude account ----------
  let sample = null, downloads = null, ctl = null;
  if (inClaude) $("tier").value = ls("oti.tier") || "default";
  $("tier").addEventListener("change", () => ls("oti.tier", $("tier").value));
  const claudeReady = inClaude ? (async () => {
    sample = await window.claude.use("sample");
    if (!sample) { OTI.setStatus("Claude isn't available in this view, so photos can't be read here.", "warn"); return false; }
    const caps = await sample.limits().catch(() => null);
    if (!caps?.images) OTI.setStatus("Claude is available, but this app version may not let the page send photos. You can still try.", "warn");
    return true;
  })() : Promise.resolve(false);
  if (inClaude) (async () => { downloads = await window.claude.use("downloads"); if (!downloads) $("dlJson").hidden = true; })();
  $("stop").addEventListener("click", () => ctl?.abort());
  async function askClaude({ image, prompt, schema, fresh }) {
    ctl = new AbortController(); $("stop").hidden = false;
    try {
      const opts = { modelTier: $("tier").value, signal: ctl.signal, cache: fresh ? false : true, onText: () => OTI.setStatus("Writing…") };
      if (image) opts.images = image.blob;
      const json = await sample.json(prompt + "\n\nReply with ONLY one JSON object, no prose and no code fence, matching this JSON schema exactly (every required key present):\n" + JSON.stringify(schema), opts);
      return { json, servedBy: "Claude (" + $("tier").selectedOptions[0].textContent.toLowerCase() + ")" };
    } finally { $("stop").hidden = true; }
  }
  const ERR = {
    not_granted: "You didn't allow this page to use Claude. Reload to be asked again.",
    sampling_disabled: "Claude isn't available for this account.",
    rate_limited: "Too many requests, or a usage limit was reached. Wait a bit and try again.",
    refused: "Claude declined this request. Try a different photo or wording.",
    invalid_json: "The reply wasn't readable. Try again.",
    image_rejected: "That photo was rejected. Try a JPG or PNG under 20 MB.",
    images_unavailable: "This view can't send photos to Claude.",
    cancelled: "Stopped.", empty_completion: "Claude returned nothing. Try again.", upstream_error: "Connection problem. Try again."
  };

  window.OTI_PROVIDER = {
    name: inClaude ? "claude.ai" : "api",
    unavailableMessage: inClaude ? "Claude isn't available in this view yet." : "Enter an API key first.",
    ready: async () => inClaude ? claudeReady : (settings().provider === "openai" || !!settings().apiKey),
    interpret: (a) => inClaude ? askClaude(a) : settings().provider === "anthropic" ? anthropic(a) : openai(a),
    text: (a) => inClaude ? askClaude(a) : settings().provider === "anthropic" ? anthropic(a) : openai(a),
    errorMessage: (e) => ERR[e?.code] || e?.message || ERR.upstream_error,
    lookupTags: inClaude ? undefined : danbooru,
    download: inClaude ? async (filename, data) => { if (!downloads) throw { code: "unavailable" }; await downloads.save({ filename, data }); } : undefined
  };
  connectBridge().then(async (b) => {
    if (b) {
      window.OTI_PROVIDER.store = { get: (k) => KEYS.includes(k) ? (b.cache[k] ?? null) : ls(k), set: (k, v) => { if (!KEYS.includes(k)) return ls(k, v); b.cache[k] = v; b.send({ type: "set", key: k, value: v }); } };
      window.OTI_PROVIDER.previews = b.previews;
      $("apiKey").addEventListener("input", noteBridge);
    }
    OTI.init();
    if (b) { noteBridge(); await mergeLocalCatalog(); OTI.reloadCatalog(); }
    // Photos passed in from another tool or from the phone's Share menu.
    HANDOFF.take().then(files => { const imgs = files.filter(f => (f.type || "").startsWith("image/")); if (imgs.length) OTI.loadFiles(imgs); });
  });
})();

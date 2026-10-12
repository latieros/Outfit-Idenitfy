(() => {
  const $ = (id) => document.getElementById(id);
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } };
  $("tier").value = ls("oti.tier") || "default"; $("tier").addEventListener("change", () => ls("oti.tier", $("tier").value));
  const use = (n) => (window.claude && typeof window.claude.use === "function") ? window.claude.use(n) : Promise.resolve(null);
  let sample = null, downloads = null, ctl = null;
  const readyP = (async () => {
    sample = await use("sample");
    if (!sample) { OTI.setStatus("Claude is not available in this view. Open this page from your claude.ai artifacts to use it.", "warn"); return false; }
    const caps = await sample.limits().catch(() => null);
    if (!caps?.images) OTI.setStatus("Claude is available, but this app version may not let the page send images. You can still try.", "warn");
    return true;
  })();
  (async () => { downloads = await use("downloads"); if (!downloads) $("dlJson").hidden = true; })();
  $("stop").addEventListener("click", () => ctl?.abort());
  const ERR = {
    not_granted: "You did not allow this page to use Claude. Reload to be asked again.",
    sampling_disabled: "Claude is not available for this account.",
    rate_limited: "Too many requests or usage limit reached. Wait a bit and try again.",
    refused: "Claude declined this request. Try a different photo or wording.",
    invalid_json: "The reply was not valid JSON. Try again.",
    image_rejected: "That image was rejected. Try a JPEG or PNG under 20 MB.",
    images_unavailable: "This view cannot send images to Claude.",
    cancelled: "Stopped.", empty_completion: "Claude returned nothing. Try again.", upstream_error: "Connection problem. Try again."
  };
  async function ask({ image, prompt, schema, fresh }) {
    ctl = new AbortController(); $("stop").hidden = false;
    try {
      const full = prompt + "\n\nReply with ONLY one JSON object, no prose and no code fence, matching this JSON schema exactly (every required key present):\n" + JSON.stringify(schema);
      const opts = { modelTier: $("tier").value, signal: ctl.signal, cache: fresh ? false : true, onText: () => OTI.setStatus("Writing…") };
      if (image) opts.images = image.blob;
      const json = await sample.json(full, opts);
      return { json, servedBy: "claude (" + $("tier").value + ")" };
    } finally { $("stop").hidden = true; }
  }
  window.OTI_PROVIDER = {
    name: "claude.ai",
    unavailableMessage: "Claude is not available in this view yet.",
    ready: () => readyP,
    interpret: ask, text: ask,
    errorMessage: (e) => ERR[e?.code] || e?.message || ERR.upstream_error,
    download: async (filename, data) => { if (!downloads) throw { code: "unavailable" }; await downloads.save({ filename, data }); }
  };
  OTI.init();
})();

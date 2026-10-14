// Outfit Tag Interpreter — shared UI logic.
// Expects window.OUTFIT_TAGS (tags.js) and window.OTI_PROVIDER, an object with:
//   name: string
//   ready(): Promise<boolean>                                  — can the provider be used right now?
//   interpret({ image, prompt, schema }): Promise<{ json, servedBy }>   — vision call, image = { blob, dataUrl, mediaType }
//   text({ prompt, schema }): Promise<{ json, servedBy }>            — text-only call (variants)
//   onStatus?(msg, kind)                                        — optional, receives status messages
//   download?(filename, text): Promise<void>                    — optional file save
//   lookupTags?(tags): Promise<Map<tag, {post_count, category}>> — optional live Danbooru lookup
window.OTI = (() => {
  const $ = (id) => document.getElementById(id);
  const T = window.OUTFIT_TAGS;
  const P = () => window.OTI_PROVIDER;
  const LS = { catalog: "oti.history", fmt: "oti.fmt", minConf: "oti.minConf", preset: "oti.preset", overrides: "oti.presetOverrides" };

  const C = self.OTI_CORE;
  const { SCHEMA, VARIANTS_SCHEMA, interpretPrompt, variantsPrompt, normalizeResult } = C;
  // Storage goes through the provider when it supplies one (the extension uses chrome.storage), else localStorage.
  const defaultStore = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => localStorage.setItem(k, v) };
  const store = () => (P() && P().store) || defaultStore;

  // ======================= state =======================
  let image = null;       // { dataUrl, mediaType, blob, w, h, name, thumb }
  let result = null;      // normalized breakdown
  let current = null;     // catalog entry currently loaded (or null if unsaved)
  let excluded = new Set();
  let remix = false;
  let catalog = [];        // loaded in init(), once the provider (and its storage) exists
  let lookup = new Map();  // tag -> { post_count, category } from live lookup
  let filter = { q: "", view: "all" };

  const clone = (x) => JSON.parse(JSON.stringify(x));

  // ======================= status =======================
  function setStatus(msg, kind) { const s = $("status"); s.textContent = msg; s.className = "status" + (kind ? " " + kind : ""); }
  function ls(k, v) { try { if (v === undefined) return store().get(k); store().set(k, v); } catch { return null; } }

  // ======================= image input =======================
  function bindImageInput() {
    const drop = $("drop");
    $("file").addEventListener("change", async (e) => { await loadFiles(e.target.files); e.target.value = ""; });
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("over"); }));
    drop.addEventListener("drop", (e) => { if (e.dataTransfer.files && e.dataTransfer.files.length) loadFiles(e.dataTransfer.files); });
    window.addEventListener("paste", (e) => { const item = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith("image/")); if (item) loadFile(item.getAsFile()); });
    $("pickBtn").addEventListener("click", () => { try { $("file").click(); } catch {} });
    $("clearQueue").addEventListener("click", clearQueue);
    let pickerTimer = null;
    $("file").addEventListener("click", () => { setStatus("Opening the file picker…"); clearTimeout(pickerTimer); pickerTimer = setTimeout(() => { if (!queue.length) setStatus("No file picker appeared. This viewer may not support uploads. Open the link in a browser, or paste an image into the box below.", "warn"); }, 4000); });
    $("file").addEventListener("change", () => clearTimeout(pickerTimer));
    const pasteBox = $("pasteBox");
    pasteBox.addEventListener("paste", (e) => {
      const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); pasteBox.textContent = ""; loadFile(f); return; }
      setTimeout(() => { const img = pasteBox.querySelector("img"); if (img && img.src.startsWith("data:image/")) fetch(img.src).then(r => r.blob()).then(b => loadFile(new File([b], "pasted." + (b.type.split("/")[1] || "png"), { type: b.type }))).catch(() => setStatus("Could not read the pasted image.", "bad")); pasteBox.textContent = ""; }, 50);
    });
  }
  function prepareImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX = 1568; const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h);
        const mediaType = "image/jpeg"; const dataUrl = c.toDataURL(mediaType, 0.9);
        const t = document.createElement("canvas"); t.width = t.height = 128; const side = Math.min(w, h);
        t.getContext("2d").drawImage(c, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 128, 128);
        c.toBlob((blob) => resolve({ dataUrl, mediaType, blob, base64: dataUrl.split(",")[1], w, h, name: file.name, thumb: t.toDataURL("image/jpeg", 0.7) }), mediaType, 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode failed")); };
      img.src = url;
    });
  }

  // ======================= interpret =======================
  // ======================= queue =======================
  // Up to QUEUE_MAX photos wait here; "Interpret" reads every waiting one in turn,
  // and the photo tabs above the tags switch which outfit the page works on.
  const QUEUE_MAX = 5;
  let queue = [];        // [{ id, image, name, status: waiting|reading|done|failed, result, entryId, excluded, error }]
  let selected = null;   // the queue item shown in the results, or null (e.g. a catalog entry is open)
  let busy = false;

  async function loadFile(file, context) {
    if (!file || !file.type || !file.type.startsWith("image/")) { setStatus("That file is not an image.", "bad"); return false; }
    if (queue.length >= QUEUE_MAX) { setStatus(`The queue holds ${QUEUE_MAX} outfits. Remove one to add another.`, "warn"); return false; }
    setStatus("Loading image…");
    try {
      const img = await prepareImage(file);
      const item = { id: "q" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), image: img, name: (file.name || "outfit").replace(/\.[^.]+$/, ""), status: "waiting", result: null, entryId: null, excluded: new Set(), error: "", context: context || null };
      queue.push(item);
      $("imgInfo").textContent = `${file.name} · ${img.w}×${img.h} · ${Math.round(img.blob.size / 1024)} KB`;
      if (!busy && (!selected || !selected.result)) select(item); else renderQueue();
      const waiting = queue.filter(q => q.status === "waiting").length;
      setStatus(`${waiting} waiting in the queue. Click “${runLabel()}”.`);
      return true;
    } catch (err) { setStatus("Could not read the image: " + err.message, "bad"); return false; }
  }
  async function loadFiles(files) {
    const list = [...files].filter(f => f.type && f.type.startsWith("image/"));
    const room = QUEUE_MAX - queue.length;
    for (const f of list.slice(0, Math.max(0, room))) await loadFile(f);
    if (list.length > room) setStatus(`Added ${Math.max(0, room)} of ${list.length}: the queue holds ${QUEUE_MAX} outfits.`, "warn");
  }
  function runLabel() {
    const n = queue.filter(q => q.status === "waiting" || q.status === "failed").length;
    if (n > 1) return `Interpret ${n} outfits`;
    if (n === 1) return "Interpret outfit";
    return selected && selected.result ? "Regenerate" : "Interpret outfit";
  }
  function updateRunButton() {
    $("run").textContent = busy ? "Reading…" : runLabel();
    $("run").disabled = busy || !(queue.some(q => q.status === "waiting" || q.status === "failed") || (selected && selected.result));
  }
  function select(item) {
    if (selected && selected !== item) selected.excluded = excluded;   // exclusions stay with their outfit
    selected = item; image = item ? item.image : null;
    variants = []; $("variantsOut").innerHTML = ""; remix = false; lookup = new Map();
    if (item && item.result) { result = item.result; excluded = item.excluded || new Set(); current = catalog.find(e => e.id === item.entryId) || null; headerFor = undefined; render(); }
    else { result = null; excluded = new Set(); current = null; showPending(item); }
    renderQueue();
  }
  function showPending(item) {
    $("out").hidden = true; $("outputControls").hidden = true; $("empty").hidden = false;
    if (!item) { $("empty").textContent = "Results will show up here as grouped, toggleable tags."; return; }
    const msg = item.status === "reading" ? "Reading this outfit…" : item.status === "failed" ? "Failed: " + item.error : `Not read yet. Click “${runLabel()}”.`;
    $("empty").innerHTML = `<img src="${item.image.dataUrl}" alt="" style="max-height:260px;max-width:100%;border-radius:8px;display:block;margin:0 auto 8px"><span>${esc(msg)}</span>`;
  }
  function removeItem(item) {
    if (item.status === "reading") { setStatus("Wait for this outfit to finish reading.", "warn"); return; }
    queue = queue.filter(q => q !== item);
    if (selected === item) select(queue.find(q => q.result) || queue[0] || null); else renderQueue();
  }
  function clearQueue() {
    const keep = queue.filter(q => q.status === "reading");
    queue = keep;
    if (selected && !keep.includes(selected)) select(keep[0] || null); else renderQueue();
    setStatus(keep.length ? "Cleared everything except the outfit being read." : "Queue cleared. Saved outfits stay in the catalog.", "ok");
  }
  function renderQueue() {
    const strip = $("queue"), sel = $("queueSel");
    strip.innerHTML = ""; sel.innerHTML = "";
    $("queueCount").textContent = queue.length ? `${queue.length} of ${QUEUE_MAX}` : "";
    $("clearQueue").hidden = !queue.length;
    sel.hidden = queue.length < 2;
    const label = { waiting: "waiting", reading: "reading…", done: "done", failed: "failed" };
    queue.forEach((item, i) => {
      const t = document.createElement("div");
      t.className = "qthumb " + item.status + (item === selected ? " active" : "");
      t.title = `${item.name} · ${label[item.status]}`; t.tabIndex = 0;
      t.innerHTML = `<img src="${item.image.thumb}" alt=""><span class="qdot"></span>`;
      t.addEventListener("click", () => select(item));
      t.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(item); } });
      const x = btn("×", (e) => { e.stopPropagation(); removeItem(item); }, "qx"); x.title = "Remove from the queue"; x.setAttribute("aria-label", "Remove " + item.name + " from the queue");
      t.appendChild(x); strip.appendChild(t);

      const b = document.createElement("button"); b.type = "button";
      b.className = "qtab " + item.status + (item === selected ? " active" : "");
      b.setAttribute("aria-pressed", item === selected ? "true" : "false");
      b.innerHTML = `<img src="${item.image.thumb}" alt=""><span class="qtext"><span class="qname">${i + 1}. ${esc(item.name)}</span><span class="qstat">${label[item.status]}</span></span>`;
      b.addEventListener("click", () => select(item)); sel.appendChild(b);
    });
    if (selected && !selected.result) showPending(selected);
    updateRunButton();
  }

  // ======================= interpret =======================
  async function run() {
    if (busy) return;
    let todo = queue.filter(q => q.status === "waiting" || q.status === "failed");
    const regenerate = !todo.length && selected && selected.result;
    if (regenerate) todo = [selected];
    if (!todo.length) return;
    if (!(await P().ready())) { setStatus(P().unavailableMessage || "The model provider is not available.", "bad"); return; }
    busy = true; updateRunButton();
    const t0 = performance.now(); let ok = 0, servedBy = "";
    for (const [i, item] of todo.entries()) {
      item.status = "reading"; item.error = ""; renderQueue();
      setStatus(todo.length > 1 ? `Reading ${i + 1} of ${todo.length}… (10–60 s each)` : "Thinking… (usually 10–60 s)");
      try {
        const r = await P().interpret({ image: item.image, prompt: interpretPrompt($("focus").value, $("notes").value.trim(), item.context), schema: SCHEMA, fresh: !!regenerate });
        item.result = normalizeResult(r.json); item.excluded = new Set(); servedBy = r.servedBy;
        await verifyIdentityOf(item.result);
        item.excluded = new Set(C.unverifiedIdentity(item.result));
        item.status = "done"; ok++;
        item.entryId = addEntry({ name: item.name, thumb: item.image.thumb, source: "photo", model: r.servedBy, result: item.result }).id;
        // Show the first finished outfit, and keep showing whatever the user picked after that.
        if (selected === item || !selected || !selected.result) select(item); else { renderQueue(); renderCatalog(); }
      } catch (e) {
        console.error(e); item.status = "failed";
        item.error = P().errorMessage ? P().errorMessage(e) : (e.message || e.code || String(e)); renderQueue();
      }
    }
    busy = false; updateRunButton();
    const secs = ((performance.now() - t0) / 1000).toFixed(1), failed = todo.filter(q => q.status === "failed");
    if (todo.length === 1) setStatus(ok ? `Done in ${secs}s via ${servedBy}. Saved to the catalog.` : failed[0].error, ok ? "ok" : "bad");
    else setStatus(`Read ${ok} of ${todo.length} in ${secs}s and saved them to the catalog.` + (failed.length ? ` ${failed.length} failed; click “${runLabel()}” to retry.` : " Use the photo tabs to switch outfits."), failed.length ? "warn" : "ok");
  }

  // ======================= variants =======================
  let variants = [];
  async function makeVariants() {
    if (!result) return;
    if (!(await P().ready())) { setStatus(P().unavailableMessage || "The model provider is not available.", "bad"); return; }
    $("variantsBtn").disabled = true; $("variantsOut").innerHTML = '<p class="tiny">Designing three new outfits… (20–60 s)</p>';
    try {
      const r = await P().text({ prompt: variantsPrompt(result, $("variantDir").value.trim()), schema: VARIANTS_SCHEMA, fresh: true });
      variants = (r.json.variants || []).slice(0, 3).map(v => ({ title: v.title || "Variant", direction: v.direction || "", result: normalizeResult({ description: v.description, subject: result.subject, outfit: v.outfit, style_tags: v.style_tags, framing_tags: result.framing_tags, negative_prompt: v.negative_prompt, caption: v.caption, prose: v.prose }) }));
      variants.forEach(v => { v.result.character_tags = [...(result.character_tags || [])]; v.result.copyright_tags = [...(result.copyright_tags || [])]; v.result.identity_info = clone(result.identity_info || {}); v.result.identity_check = clone(result.identity_check || {}); });
      renderVariants();
    } catch (e) { console.error(e); $("variantsOut").innerHTML = `<p class="tiny" style="color:var(--bad)">${esc(P().errorMessage ? P().errorMessage(e) : (e.message || e.code || "failed"))}</p>`; }
    finally { $("variantsBtn").disabled = false; }
  }
  function renderVariants() {
    const out = $("variantsOut"); out.innerHTML = "";
    if (!variants.length) return;
    variants.forEach((v, i) => {
      const card = document.createElement("div"); card.className = "vcard";
      const tags = orderedTagsOf(v.result, true).map(x => x.tag);
      card.innerHTML = `<h4>${esc(v.title)}</h4><div class="tiny">${esc(v.direction)}</div><div class="vtags">${tags.map(t => `<span class="chip mini${T.isCanonical(t) ? "" : " custom"}">${esc(t)}</span>`).join("")}</div>`;
      const row = document.createElement("div"); row.className = "row";
      const b1 = btn("Open", () => { result = clone(v.result); current = null; excluded = new Set(); remix = false; lookup = new Map(); $("outfitName").value = v.title; render(); setStatus(`Opened variant “${v.title}”. Save it to keep it.`, "ok"); });
      const b2 = btn("Save to catalog", () => { const e = addEntry({ name: v.title, notes: v.direction, thumb: current?.thumb || image?.thumb || "", source: "variant", parentId: current?.id || null, status: "try", result: clone(v.result) }); b2.textContent = "Saved ✓"; b2.disabled = true; renderCatalog(); setStatus(`Saved “${e.name}” to the catalog (marked “to try”).`, "ok"); });
      const b3 = btn("Copy prompt", () => copy(promptTextOf(v.result), "Variant prompt copied."));
      row.append(b1, b2, b3); card.appendChild(row); out.appendChild(card);
    });
  }

  // ======================= tag validation =======================
  function tagIssues(tag) {
    const canon = T.canonicalize(tag);
    if (canon !== tag) return { kind: "alias", fix: canon };
    if (lookup.size) { const hit = lookup.get(tag); if (!hit) return { kind: "unknown" }; if (hit.post_count < 500) return { kind: "rare", count: hit.post_count }; if (hit.post_count < 5000) return { kind: "uncommon", count: hit.post_count }; return { kind: "common", count: hit.post_count }; }
    if (!T.isCanonical(tag)) return { kind: "custom" };
    return { kind: "ok" };
  }
  function allTags() { return orderedTagsOf(result, true).map(x => x.tag); }
  function applyAliasFixes() {
    if (!result) return 0; let n = 0;
    const fix = (arr) => arr.map(t => { const c = T.canonicalize(t); if (c !== t) n++; return c; });
    result.subject.body_tags = fix(result.subject.body_tags); result.subject.hair_tags = fix(result.subject.hair_tags); result.subject.face_tags = fix(result.subject.face_tags);
    result.subject.count_tag = T.canonicalize(result.subject.count_tag);
    result.outfit.forEach(o => { o.tags = fix(o.tags); }); result.style_tags = fix(result.style_tags); result.framing_tags = fix(result.framing_tags); result.negative_prompt = fix(result.negative_prompt);
    return n;
  }
  // Check character, series and named-outfit guesses on Danbooru, where this view can reach it.
  async function verifyIdentityOf(res) {
    if (!P().lookupTags || !((res.character_tags || []).length + (res.copyright_tags || []).length + (res.named_outfit_tags || []).length)) return null;
    try { return await C.verifyIdentity(res, (names) => P().lookupTags(names)); }
    catch (e) { console.warn("identity check failed", e); return null; }
  }
  async function checkTags() {
    if (!result) return;
    const n = applyAliasFixes(); if (n) setStatus(`Fixed ${n} alias spelling${n > 1 ? "s" : ""}.`, "ok");
    if (!P().lookupTags) { render(); setStatus((n ? `Fixed ${n} aliases. ` : "") + "Live Danbooru lookup is not available in this view; showing vocabulary matches only.", "warn"); return; }
    $("checkBtn").disabled = true; setStatus("Checking tags on Danbooru…");
    try { if (await verifyIdentityOf(result)) C.unverifiedIdentity(result).forEach(t => excluded.add(t)); lookup = await P().lookupTags(allTags()); render(); const unknown = allTags().filter(t => !lookup.get(t)).length; setStatus(`Checked ${lookup.size} tags on Danbooru${unknown ? `, ${unknown} not found` : ""}.`, unknown ? "warn" : "ok"); }
    catch (e) { console.error(e); render(); setStatus("Danbooru lookup failed (blocked or offline). Showing vocabulary matches only.", "warn"); }
    finally { $("checkBtn").disabled = false; }
  }

  // ======================= prompt building =======================
  function orderedTagsOf(res, includeExcluded) {
    if (!res) return []; const seen = new Set(); const out = [];
    const add = (t, c, g) => { if (!t || seen.has(t)) return; if (!includeExcluded && excluded.has(t)) return; seen.add(t); out.push({ tag: t, conf: c, group: g }); };
    add(res.subject.count_tag, 1, "subject"); res.subject.body_tags.forEach(t => add(t, 1, "subject")); res.subject.hair_tags.forEach(t => add(t, 1, "hair")); res.subject.face_tags.forEach(t => add(t, 1, "face"));
    res.outfit.forEach(o => o.tags.forEach(t => add(t, o.confidence, o.item || o.category)));
    res.style_tags.forEach(t => add(t, 0.8, "style")); res.framing_tags.forEach(t => add(t, 1, "framing"));
    return out;
  }
  function fmtTag(t, fmt) { return fmt === "danbooru" ? t : t.replace(/_/g, " "); }
  // ======================= generator presets =======================
  let presetId = "none", overrides = {};
  function loadPresets() {
    presetId = ls(LS.preset) || "none"; if (!C.PRESETS[presetId]) presetId = "none";
    try { overrides = JSON.parse(ls(LS.overrides) || "{}") || {}; } catch { overrides = {}; }
  }
  function formatOpts(res, extra = {}) {
    return Object.assign({ format: $("fmt").value, preset: presetId, overrides, excluded: res === result ? excluded : new Set(), minConf: Number($("minConf").value) }, extra);
  }
  const formatted = (res, extra) => C.formatPrompt(res, formatOpts(res, extra));
  function promptTextOf(res, opts = {}) { return formatted(res, { outfitOnly: !!opts.outfitOnly }).prompt; }
  const promptText = (opts) => promptTextOf(result, opts);
  // One group's tags, in the current format, skipping excluded tags and respecting the confidence cutoff.
  function groupText(list, conf) {
    const fmt = $("fmt").value, min = Number($("minConf").value), p = C.presetOf(presetId, overrides);
    if (conf != null && conf < min) return "";
    return list.filter(t => !excluded.has(t)).map(t => { const f = fmtTag(t, fmt); return fmt === "weighted" ? C.emph(f, conf, p.emphasis) : f; }).join(", ");
  }
  function fillPresetEditor() {
    const p = C.presetOf(presetId, overrides);
    $("presetPrefix").value = p.prefix; $("presetSuffix").value = p.suffix; $("presetNegative").value = p.negative;
    $("presetNote").textContent = p.note || ""; $("presetReset").hidden = !overrides[presetId];
    $("presetEdit").hidden = presetId === "none";
  }
  function bindPresetUI() {
    const sel = $("preset");
    Object.entries(C.PRESETS).forEach(([id, p]) => { const o = document.createElement("option"); o.value = id; o.textContent = p.label; sel.appendChild(o); });
    sel.value = presetId;
    sel.addEventListener("change", () => {
      presetId = sel.value; ls(LS.preset, presetId);
      $("fmt").value = C.PRESETS[presetId].format; ls(LS.fmt, $("fmt").value);   // each generator starts in the format it reads best
      fillPresetEditor(); render();
    });
    ["presetPrefix", "presetSuffix", "presetNegative"].forEach(id => $(id).addEventListener("input", () => {
      overrides[presetId] = { prefix: $("presetPrefix").value, suffix: $("presetSuffix").value, negative: $("presetNegative").value };
      ls(LS.overrides, JSON.stringify(overrides)); $("presetReset").hidden = false; render();
    }));
    $("presetReset").addEventListener("click", () => { delete overrides[presetId]; ls(LS.overrides, JSON.stringify(overrides)); fillPresetEditor(); render(); });
    fillPresetEditor();
  }
  // Ask the model to rewrite the caption and prose for the tags as they are now.
  async function rewriteSentences() {
    if (!result) return;
    if (!(await P().ready())) { setStatus(P().unavailableMessage || "The model provider is not available.", "bad"); return; }
    const b = $("sentenceBtn"); b.disabled = true; b.textContent = "Writing…";
    try {
      const r = await P().text({ prompt: C.sentencePrompt(result, excluded), schema: C.SENTENCE_SCHEMA, fresh: true });
      result.prose = String(r.json.prose || "").trim(); result.caption = String(r.json.caption || "").trim(); result.proseSig = C.tagSig(result, excluded);
      render(); setStatus("Sentence rewritten for the current tags." + (current ? " Click “Update this outfit” to keep it in the catalog." : ""), "ok");
    } catch (e) { console.error(e); setStatus(P().errorMessage ? P().errorMessage(e) : ("Failed: " + (e.message || e.code || e)), "bad"); b.disabled = false; }
  }
  function renderSentenceNote(f) {
    const note = $("sentenceNote"), fmt = $("fmt").value;
    if (fmt !== "prose" && fmt !== "hybrid") { note.hidden = true; return; }
    const s = f.sentences;
    const msg = s.composed ? "This sentence was assembled from the outfit list." : s.stale ? "This sentence was written before your edits, so it may mention tags you removed." : "";
    note.hidden = !msg; $("sentenceMsg").textContent = msg;
    $("sentenceBtn").textContent = s.composed ? "Write it with Claude" : "Rewrite it"; $("sentenceBtn").disabled = false;
  }

  // ======================= render =======================
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function btn(label, fn, cls = "small") { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.textContent = label; b.addEventListener("click", fn); return b; }

  function identityIssue(tag) {
    const info = result && result.identity_info && result.identity_info[tag]; if (!info) return null;
    const chk = (result.identity_check || {})[tag];
    const bits = [`${info.kind === "character" ? "character" : info.kind === "copyright" ? "series" : "named outfit"}, ${Math.round(info.confidence * 100)}% sure`];
    if (info.cosplay) bits.push("cosplay");
    if (info.evidence) bits.push("evidence: " + info.evidence);
    if (chk) bits.push({ ok: `on Danbooru (${chk.posts} posts)`, fixed: `corrected from ${chk.from} (${chk.posts} posts)`, missing: "not found on Danbooru, may be a guess", category: "exists on Danbooru but as a different kind of tag" }[chk.status]);
    const kind = !chk ? "ok" : chk.status === "missing" || chk.status === "category" ? "unknown" : chk.posts >= 5000 ? "common" : chk.posts >= 500 ? "uncommon" : "rare";
    return { kind, count: chk ? chk.posts : null, tip: bits.join(" · "), ident: true };
  }
  function chip(tag, conf, group, onDelete) {
    const el = document.createElement("span"); const iss = identityIssue(tag) || tagIssues(tag);
    el.className = "chip" + (iss.ident ? " ident" : T.isCanonical(tag) ? "" : " custom") + (excluded.has(tag) ? " off" : "") + (iss.kind === "alias" || iss.kind === "unknown" ? " warn" : "");
    const a = document.createElement("a"); a.href = "https://danbooru.donmai.us/wiki_pages/" + encodeURIComponent(tag); a.target = "_blank"; a.rel = "noopener"; a.textContent = tag;
    const tip = iss.tip || { alias: `spelling → ${iss.fix}`, unknown: "not found on Danbooru", rare: `rare on Danbooru (${iss.count} posts)`, uncommon: `${iss.count} posts`, common: `${iss.count} posts`, custom: "custom phrase, may have no wiki page", ok: "Danbooru tag" }[iss.kind];
    a.title = tip + (group ? " · " + group : "") + " · open wiki"; el.appendChild(a);
    if (iss.kind === "alias") { const f = document.createElement("button"); f.type = "button"; f.className = "fix"; f.textContent = "→ " + iss.fix; f.title = "Replace with the canonical spelling"; f.addEventListener("click", () => { renameTag(tag, iss.fix); render(); }); el.appendChild(f); }
    if (iss.count != null) { const d = document.createElement("i"); d.className = "dot " + iss.kind; d.title = tip; el.appendChild(d); }
    if (iss.ident && result.identity_info[tag].cosplay) { const b = document.createElement("span"); b.className = "conf"; b.textContent = "cosplay"; el.appendChild(b); }
    if (iss.ident && (result.identity_check || {})[tag] && result.identity_check[tag].status === "fixed") { const b = document.createElement("span"); b.className = "conf"; b.textContent = "fixed"; b.title = iss.tip; el.appendChild(b); }
    if (conf != null) { const c = document.createElement("span"); c.className = "conf"; c.textContent = conf.toFixed(2); el.appendChild(c); }
    const x = document.createElement("button"); x.type = "button"; x.className = "x";
    if (remix) { x.textContent = "×"; x.title = "Delete this tag"; x.addEventListener("click", () => { onDelete(); render(); }); }
    else { x.textContent = excluded.has(tag) ? "+" : "×"; x.title = excluded.has(tag) ? "Put back in the prompt" : "Remove from the prompt"; x.addEventListener("click", () => { excluded.has(tag) ? excluded.delete(tag) : excluded.add(tag); render(); }); }
    x.setAttribute("aria-label", x.title); el.appendChild(x);
    return el;
  }
  function renameTag(from, to) {
    const f = (arr) => arr.map(t => t === from ? to : t);
    const s = result.subject; s.count_tag = s.count_tag === from ? to : s.count_tag; s.body_tags = f(s.body_tags); s.hair_tags = f(s.hair_tags); s.face_tags = f(s.face_tags);
    result.outfit.forEach(o => o.tags = f(o.tags)); result.style_tags = f(result.style_tags); result.framing_tags = f(result.framing_tags);
    ["character_tags", "copyright_tags", "named_outfit_tags"].forEach(k => { if (result[k]) result[k] = f(result[k]); });
    if (result.identity_info && result.identity_info[from]) { result.identity_info[to] = result.identity_info[from]; delete result.identity_info[from]; }
  }

  function render() {
    if (!result) return;
    $("empty").hidden = true; $("out").hidden = false; $("outputControls").hidden = false;
    const f = formatted(result); $("prompt").textContent = f.prompt; renderSentenceNote(f); $("desc").textContent = result.description;
    $("remixBar").classList.toggle("on", remix); $("remixBtn").textContent = remix ? "Done remixing" : "Remix";
    const g = $("groups"); g.innerHTML = "";
    const addGroup = (title, meta, list, conf, onDelete, extra) => {
      if (!list.length && !remix) return;
      const d = document.createElement("div"); d.className = "group";
      const h = document.createElement("h3"); h.textContent = title; if (meta) { const m = document.createElement("span"); m.className = "meta"; m.textContent = meta; h.appendChild(m); }
      if (extra) h.appendChild(extra); d.appendChild(h);
      const c = document.createElement("div"); c.className = "chips"; list.forEach((t, i) => c.appendChild(chip(t, conf, title, () => onDelete(i))));
      if (remix) { const inp = document.createElement("input"); inp.type = "text"; inp.className = "addtag"; inp.placeholder = "+ add tag"; inp.addEventListener("keydown", (e) => { if (e.key === "Enter" && inp.value.trim()) { const t = T.canonicalize(inp.value); if (t && !list.includes(t)) list.push(t); inp.value = ""; render(); } }); c.appendChild(inp); }
      if (list.length) {
        const cp = btn("copy", () => { const txt = groupText(list, conf); if (!txt) { setStatus("Nothing to copy: every tag in this group is excluded or under the confidence cutoff.", "warn"); return; } copy(txt, `Copied ${title}: ${txt}`); }, "small copygroup");
        cp.title = "Copy this group's tags in the current format"; c.appendChild(cp);
      }
      d.appendChild(c); g.appendChild(d);
    };
    const s = result.subject;
    addGroup("Subject", "", [s.count_tag, ...s.body_tags].filter(Boolean), null, (i) => { if (i === 0 && s.count_tag) s.count_tag = ""; else s.body_tags.splice(s.count_tag ? i - 1 : i, 1); });
    ["character_tags", "copyright_tags", "named_outfit_tags"].forEach(k => { if (!result[k]) result[k] = []; });
    if (!result.identity_info) result.identity_info = {};
    addGroup("Character", "identified by Claude", result.character_tags, null, (i) => result.character_tags.splice(i, 1));
    addGroup("Series", "", result.copyright_tags, null, (i) => result.copyright_tags.splice(i, 1));
    addGroup("Hair", "", s.hair_tags, null, (i) => s.hair_tags.splice(i, 1));
    addGroup("Face", "", s.face_tags, null, (i) => s.face_tags.splice(i, 1));
    addGroup("Named outfit", "", result.named_outfit_tags, null, (i) => result.named_outfit_tags.splice(i, 1));
    result.outfit.forEach((o, oi) => {
      let extra = null;
      if (remix) {
        extra = document.createElement("span"); extra.className = "gtools";
        const sel = document.createElement("select"); sel.innerHTML = '<option value="">swap from catalog…</option>';
        swapOptions(o.category, current?.id).forEach(([label, val]) => { const op = document.createElement("option"); op.value = val; op.textContent = label; sel.appendChild(op); });
        sel.addEventListener("change", () => { const [eid, idx] = sel.value.split(":"); const e = catalog.find(x => x.id === eid); if (e) { result.outfit[oi] = clone(e.result.outfit[Number(idx)]); render(); } });
        extra.append(sel, btn("remove", () => { result.outfit.splice(oi, 1); render(); }));
      }
      addGroup(o.item || o.category, `${o.category}${o.color ? " · " + o.color : ""}${o.material ? " · " + o.material : ""}${o.pattern && o.pattern !== "none" ? " · " + o.pattern : ""}`, o.tags, o.confidence, (i) => o.tags.splice(i, 1), extra);
    });
    if (remix) { const addG = document.createElement("div"); addG.className = "group"; const sel = document.createElement("select"); T.categories.forEach(c => { const op = document.createElement("option"); op.value = c; op.textContent = c.replace(/_/g, " "); sel.appendChild(op); }); const r = document.createElement("div"); r.className = "row"; r.append(sel, btn("+ add garment", () => { result.outfit.push({ category: sel.value, item: "new " + sel.value.replace(/_/g, " "), color: "", material: "", pattern: "", tags: [], confidence: 0.9 }); render(); })); addG.appendChild(r); g.appendChild(addG); }
    addGroup("Style", "", result.style_tags, null, (i) => result.style_tags.splice(i, 1));
    addGroup("Framing / setting", "", result.framing_tags, null, (i) => result.framing_tags.splice(i, 1));
    $("neg").textContent = f.negative;
    $("raw").textContent = JSON.stringify(result, null, 2);
    renderCurrentHeader(); renderCatalog();
  }
  function swapOptions(category, excludeId) {
    const out = [];
    catalog.forEach(e => { if (e.id === excludeId) return; (e.result.outfit || []).forEach((o, i) => { if (o.category === category) out.push([`${o.item || category} — ${e.name}`, `${e.id}:${i}`]); }); });
    return out;
  }

  // ======================= catalog =======================
  function loadCatalog() {
    let h = []; try { h = JSON.parse(store().get(LS.catalog) || "[]"); } catch {}
    // migrate older entries
    return h.map((e, i) => Object.assign({ id: e.id || ("e" + (e.ts || Date.now()) + i), name: e.name ? String(e.name).replace(/\.[^.]+$/, "") : "outfit", notes: "", labels: [], fav: false, status: "new", source: "photo", parentId: null }, e));
  }
  function saveCatalog() {
    for (let attempt = 0; attempt < 5; attempt++) {
      try { store().set(LS.catalog, JSON.stringify(catalog)); return true; }
      catch (e) {
        const quota = e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);
        if (!quota) { storageWarning(); return false; }               // storage unavailable: keep everything in memory
        const victim = catalog.findIndex(x => !x.fav && x !== current); if (victim < 0) { storageWarning(); return false; }
        catalog.splice(victim, 1);                                     // out of room: drop the oldest non-favorite
      }
    }
    return false;
  }
  let warned = false;
  function storageWarning() { if (warned) return; warned = true; setStatus("This browser is not letting the page save the catalog, so outfits will be lost when you leave. Export to keep them.", "warn"); }
  function addEntry(partial) {
    const e = Object.assign({ id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), name: "outfit", notes: "", labels: [], fav: false, status: "new", source: "photo", parentId: null, thumb: "", model: "", result: null }, partial);
    catalog.push(e); while (catalog.length > 150) { const v = catalog.findIndex(x => !x.fav); if (v < 0) break; catalog.splice(v, 1); }
    saveCatalog(); return e;
  }
  function openEntry(e) { if (selected) { selected.excluded = excluded; selected = null; renderQueue(); } current = e; headerFor = undefined; result = clone(e.result); excluded = new Set(C.unverifiedIdentity(result)); remix = false; lookup = new Map(); variants = []; $("variantsOut").innerHTML = ""; render(); setStatus(`Opened “${e.name}”.`, "ok"); }
  let headerFor = undefined; // which entry the header inputs were last filled from
  function renderCurrentHeader() {
    const h = $("currentHeader"); h.hidden = false;
    const key = current ? current.id : null;
    if (!current) {
      $("currentState").textContent = "Unsaved"; $("saveNew").textContent = "Save as new outfit"; $("saveUpdate").hidden = true;
      if (headerFor !== key) { $("outfitLabels").value = ""; $("outfitNotes").value = ""; $("favBtn").textContent = "☆"; $("statusSel").value = "new"; }
      headerFor = key; return;
    }
    $("currentState").textContent = `In catalog · ${new Date(current.ts).toLocaleDateString()}${current.source !== "photo" ? " · " + current.source : ""}`;
    $("saveNew").textContent = "Save as copy"; $("saveUpdate").hidden = false; $("favBtn").textContent = current.fav ? "★" : "☆";
    if (headerFor !== key) { $("outfitName").value = current.name; $("outfitLabels").value = current.labels.join(", "); $("outfitNotes").value = current.notes; $("statusSel").value = current.status; }
    headerFor = key;
  }
  function readHeader() { return { name: $("outfitName").value.trim() || "outfit", labels: $("outfitLabels").value.split(",").map(x => x.trim().toLowerCase()).filter(Boolean), notes: $("outfitNotes").value.trim(), status: $("statusSel").value }; }
  function bindCatalogUI() {
    $("saveUpdate").addEventListener("click", () => { if (!current) return; Object.assign(current, readHeader(), { result: clone(result) }); saveCatalog(); renderCatalog(); setStatus(`Updated “${current.name}”.`, "ok"); });
    $("saveNew").addEventListener("click", () => { if (!result) return; const meta = readHeader(); const e = addEntry(Object.assign(meta, { name: current && meta.name === current.name ? meta.name + " (remix)" : meta.name, thumb: current?.thumb || image?.thumb || "", source: current ? "remix" : "photo", parentId: current?.id || null, fav: current?.fav || false, result: clone(result) })); current = e; headerFor = undefined; render(); setStatus(`Saved “${e.name}”.`, "ok"); });
    $("favBtn").addEventListener("click", () => { if (!current) { $("favBtn").textContent = $("favBtn").textContent === "★" ? "☆" : "★"; return; } current.fav = !current.fav; saveCatalog(); $("favBtn").textContent = current.fav ? "★" : "☆"; renderCatalog(); });
    $("statusSel").addEventListener("change", () => { if (current) { current.status = $("statusSel").value; saveCatalog(); renderCatalog(); } });
    $("deleteBtn").addEventListener("click", () => { if (!current) return; $("deleteYes").hidden = false; setTimeout(() => { $("deleteYes").hidden = true; }, 4000); });
    $("deleteYes").addEventListener("click", () => { catalog = catalog.filter(e => e !== current); saveCatalog(); current = null; $("deleteYes").hidden = true; render(); setStatus("Deleted from the catalog.", "ok"); });
    $("catSearch").addEventListener("input", () => { filter.q = $("catSearch").value.trim().toLowerCase(); renderCatalog(); });
    document.querySelectorAll("#catViews button").forEach(b => b.addEventListener("click", () => { filter.view = b.dataset.view; document.querySelectorAll("#catViews button").forEach(x => x.classList.toggle("on", x === b)); renderCatalog(); }));
    $("exportCat").addEventListener("click", () => download("outfit-catalog.json", JSON.stringify(catalog, null, 2)));
    $("importCat").addEventListener("change", async (e) => { const f = e.target.files[0]; if (!f) return; try { const arr = JSON.parse(await f.text()); if (!Array.isArray(arr)) throw 0; const ids = new Set(catalog.map(x => x.id)); let n = 0; arr.forEach(x => { if (x && x.result && !ids.has(x.id)) { catalog.push(x); n++; } }); saveCatalog(); catalog = loadCatalog(); renderCatalog(); setStatus(`Imported ${n} outfit${n === 1 ? "" : "s"}.`, "ok"); } catch { setStatus("That file is not a catalog export.", "bad"); } e.target.value = ""; });
  }
  function entryMatches(e) {
    if (filter.view === "fav" && !e.fav) return false; if (filter.view === "try" && e.status !== "try") return false; if (filter.view === "done" && e.status !== "done") return false;
    if (!filter.q) return true;
    const hay = [e.name, e.notes, ...e.labels, ...orderedTagsOf(e.result, true).map(x => x.tag)].join(" ").toLowerCase();
    return filter.q.split(/\s+/).every(w => hay.includes(w));
  }
  function renderCatalog() {
    const grid = $("catalog"); grid.innerHTML = "";
    const list = catalog.filter(entryMatches).sort((a, b) => b.ts - a.ts);
    $("catMeta").textContent = `${list.length} of ${catalog.length}`;
    if (!list.length) { grid.innerHTML = `<p class="tiny">${catalog.length ? "Nothing matches." : "No outfits yet. Interpret a photo to start the catalog."}</p>`; return; }
    list.forEach(e => {
      const card = document.createElement("div"); card.className = "card" + (e === current ? " active" : "");
      const tags = orderedTagsOf(e.result, true).filter(x => !["subject", "hair", "face", "framing"].includes(x.group)).slice(0, 6).map(x => x.tag);
      card.innerHTML = `${e.thumb ? `<img src="${e.thumb}" alt="">` : `<div class="noimg">${esc(e.source)}</div>`}<div class="cbody"><div class="cname">${e.fav ? "★ " : ""}${esc(e.name)}</div><div class="tiny">${esc(tags.join(", "))}</div>${e.labels.length ? `<div class="labels">${e.labels.map(l => `<span>${esc(l)}</span>`).join("")}</div>` : ""}<div class="tiny stat ${e.status}">${{ new: "", try: "to try", done: "done" }[e.status] || ""}</div></div>`;
      card.addEventListener("click", () => openEntry(e)); grid.appendChild(card);
    });
  }

  // ======================= copy / export =======================
  async function copy(text, msg) { try { await navigator.clipboard.writeText(text); setStatus(msg, "ok"); } catch { setStatus("Clipboard blocked; select the text manually.", "warn"); } }
  async function download(filename, text) {
    if (P().download) { try { await P().download(filename, text); setStatus("Saved " + filename, "ok"); } catch (e) { if (e?.code !== "cancelled") setStatus("Could not save the file. Use copy instead.", "warn"); } return; }
    const blob = new Blob([text], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportObj() { const f = formatted(result); return { ...result, prompt: f.prompt, negative: f.negative, generator: presetId, excluded: [...excluded], format: $("fmt").value, name: current?.name || null, exported_at: new Date().toISOString() }; }

  // ======================= init =======================
  function init() {
    catalog = loadCatalog();
    $("importBtn").addEventListener("click", () => $("importCat").click());
    bindImageInput(); bindCatalogUI(); renderQueue();
    loadPresets(); $("fmt").value = ls(LS.fmt) || C.PRESETS[presetId].format; if (!$("fmt").value) $("fmt").value = "danbooru"; $("minConf").value = ls(LS.minConf) || "0.5";
    bindPresetUI(); $("sentenceBtn").addEventListener("click", rewriteSentences);
    $("fmt").addEventListener("change", () => { ls(LS.fmt, $("fmt").value); render(); }); $("minConf").addEventListener("change", () => { ls(LS.minConf, $("minConf").value); render(); });
    $("run").addEventListener("click", run);
    $("copyPrompt").addEventListener("click", () => copy(promptText(), "Prompt copied."));
    $("copyNeg").addEventListener("click", () => { const n = formatted(result).negative; n ? copy(n, "Negative prompt copied.") : setStatus("This generator has no negative prompt.", "warn"); });
    $("copyOutfit").addEventListener("click", () => copy(promptText({ outfitOnly: true }), "Outfit-only prompt copied."));
    $("copyJson").addEventListener("click", () => copy(JSON.stringify(exportObj(), null, 2), "JSON copied."));
    $("dlJson").addEventListener("click", () => download((current?.name || "outfit").replace(/[^\w.-]+/g, "_") + ".tags.json", JSON.stringify(exportObj(), null, 2)));
    $("variantsBtn").addEventListener("click", makeVariants);
    $("checkBtn").addEventListener("click", checkTags);
    $("remixBtn").addEventListener("click", () => { remix = !remix; render(); if (remix) setStatus("Remix mode: × deletes tags, add tags per group, swap garments from the catalog, then save.", "ok"); });
    if (P().download === undefined && P().hideDownload) $("dlJson").hidden = true;
    renderCatalog();
    if (catalog.length) { const last = catalog[catalog.length - 1]; openEntry(last); setStatus("Showing your latest outfit. Drop a new photo to interpret another."); }
  }
  // Re-read the catalog after another part of the app (e.g. the browser extension) changed storage.
  function reloadCatalog() { catalog = loadCatalog(); if (current) current = catalog.find(e => e.id === current.id) || null; renderCatalog(); }
  function openById(id) { const e = catalog.find(x => x.id === id); if (e) openEntry(e); return !!e; }
  return { init, setStatus, loadFile, loadFiles, run, get queueRoom() { return QUEUE_MAX - queue.length; }, reloadCatalog, openById, get result() { return result; }, get catalog() { return catalog; } };
})();

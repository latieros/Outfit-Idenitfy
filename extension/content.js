// Outfit Tag Interpreter — on-page result panel. Injected on demand by the service worker.
(() => {
  if (window.__otiPanel) return;                         // already running in this page
  document.getElementById("oti-panel-host")?.remove();   // leftover from a reloaded extension
  window.__otiPanel = true;

  const CSS = `
    :host { all: initial; }
    .panel { --bg:#ffffff; --ink:#1c1b1a; --muted:#6b6762; --line:#e4e1db; --accent:#7a4de8; --accent-ink:#fff; --chip:#efecf8; --chip-ink:#3b2a73;
      --custom:#fff3e4; --custom-ink:#7a4a10; --off:#f1f0ee; --off-ink:#9a958e; --code:#f1efea; --ok:#2f8f5b; --bad:#c7392f; --warn:#c7731d;
      width: 360px; max-width: calc(100vw - 32px); max-height: calc(100vh - 32px); display: flex; flex-direction: column; background: var(--bg); color: var(--ink);
      border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,.25); font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    @media (prefers-color-scheme: dark) { .panel { --bg:#1d1d21; --ink:#ececea; --muted:#a09c96; --line:#34343b; --accent:#9b7bff; --accent-ink:#0f0b1f; --chip:#2a2340; --chip-ink:#d7cbff;
      --custom:#3a2d1a; --custom-ink:#f3c98a; --off:#26262b; --off-ink:#6c6a66; --code:#121215; } }
    header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--line); cursor: move; user-select: none; }
    header b { font-size: 14px; } header .sp { flex: 1; }
    .body { overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .body > * { flex-shrink: 0; }
    button { font: inherit; padding: 5px 10px; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); cursor: pointer; }
    button.primary { background: var(--accent); color: var(--accent-ink); border-color: transparent; font-weight: 600; }
    button.icon { padding: 2px 8px; font-size: 15px; line-height: 1.2; }
    button:disabled { opacity: .5; cursor: default; }
    button:focus-visible, select:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
    select { font: inherit; padding: 4px 6px; max-width: 100%; border-radius: 8px; border: 1px solid var(--line); background: var(--bg); color: var(--ink); }
    .top { display: flex; gap: 10px; align-items: center; }
    .top img { width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); flex: none; }
    .status { color: var(--muted); } .status.bad { color: var(--bad); } .status.ok { color: var(--ok); }
    .spin { display: inline-block; width: 10px; height: 10px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: s 0.8s linear infinite; margin-right: 6px; vertical-align: -1px; }
    @keyframes s { to { transform: rotate(360deg); } } @media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
    .row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    pre { margin: 0; padding: 8px; background: var(--code); border: 1px solid var(--line); border-radius: 8px; white-space: pre-wrap; word-break: break-word; font: 12px/1.5 ui-monospace, Menlo, monospace; max-height: 120px; overflow: auto; user-select: text; }
    .group { border-top: 1px solid var(--line); padding-top: 8px; }
    .group h4 { margin: 0 0 5px; font-size: 12.5px; display: flex; gap: 6px; align-items: baseline; flex-wrap: wrap; }
    .group h4 .meta { color: var(--muted); font-weight: normal; font-size: 11.5px; }
    .chips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .chip { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; background: var(--chip); color: var(--chip-ink); font-size: 12px; border: 1px solid transparent; }
    .chip.custom { background: var(--custom); color: var(--custom-ink); } .chip.off { background: var(--off); color: var(--off-ink); } .chip.off a { text-decoration: line-through; }
    .chip.match { border-color: var(--ok); } .chip.ident { box-shadow: inset 0 0 0 1px var(--accent); } .chip.idwarn { border: 1px dashed var(--bad); } .chip.miss { opacity: .55; }
    .chip a { color: inherit; text-decoration: none; border-bottom: 1px dotted currentColor; }
    .chip .x { all: unset; cursor: pointer; opacity: .6; padding: 0 2px; } .chip .x:hover { opacity: 1; }
    .chip .conf { font-size: 10.5px; opacity: .7; }
    .cp { padding: 1px 8px; font-size: 11px; border-radius: 999px; color: var(--muted); }
    .item { display: flex; gap: 8px; align-items: flex-start; border-top: 1px solid var(--line); padding-top: 8px; }
    .item img, .item .ph { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; flex: none; background: var(--chip); }
    .item .nm { font-weight: 600; } .item .st { font-size: 11.5px; } .st.saved { color: var(--ok); } .st.failed { color: var(--bad); } .st.reading { color: var(--accent); }
    .muted { color: var(--muted); font-size: 12px; }
  `;

  const host = document.createElement("div");
  host.id = "oti-panel-host";
  host.style.cssText = "all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647;";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${CSS}</style><div class="panel" role="dialog" aria-label="Outfit tags"><header><b>Outfit tags</b><span class="sp"></span>
    <button class="icon" data-act="tool" title="Open the full interpreter">↗</button><button class="icon" data-act="close" title="Close (Esc)">×</button></header><div class="body"></div></div>`;
  document.documentElement.appendChild(host);
  const body = root.querySelector(".body");

  let state = null, excluded = new Set(), fmt = "danbooru", preset = "none", overrides = {}, savedId = null;
  const C = self.OTI_CORE;   // injected just before this script (tool/core.js)
  // Generator and format are shared with the tool page through extension storage.
  chrome.storage.local.get(["oti.fmt", "oti.preset", "oti.presetOverrides"]).then((v) => {
    fmt = v["oti.fmt"] || "danbooru"; preset = C.PRESETS[v["oti.preset"]] ? v["oti.preset"] : "none";
    try { overrides = JSON.parse(v["oti.presetOverrides"] || "{}") || {}; } catch {}
    render();
  });
  const saveChoice = (k, v) => chrome.storage.local.set({ [k]: v }).catch(() => {});

  // ---------- helpers ----------
  const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v != null) e.setAttribute(k, v); } kids.flat().forEach(k => k != null && e.append(k)); return e; };
  const send = (msg) => chrome.runtime.sendMessage(msg).catch(() => null);
  const fmtTag = (t) => fmt === "danbooru" ? t : t.replace(/_/g, " ");
  const fmtOpts = (extra) => Object.assign({ format: fmt, preset, overrides, excluded }, extra || {});
  const promptOf = (res, outfitOnly) => C.formatPrompt(res, fmtOpts({ outfitOnly })).prompt;
  let flashTimer = null;
  function flash(msg, kind) { const s = root.querySelector(".flash"); if (!s) return; s.textContent = msg; s.className = "flash status " + (kind || "ok"); clearTimeout(flashTimer); flashTimer = setTimeout(() => { s.textContent = ""; }, 3500); }
  async function copy(text, label) {
    if (!text) return flash("Nothing to copy.", "bad");
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch {} ta.remove(); }
    flash("Copied " + label + ".");
  }
  async function save() {
    if (savedId) return savedId;
    const r = await send({ type: "oti:save", entry: { name: state.name || "outfit", thumb: state.thumb || "", preview: state.preview || "", result: state.result, model: state.servedBy || "", labels: state.pageUrl ? [new URL(state.pageUrl).hostname.replace(/^www\./, "")] : [], sourceUrl: state.pageUrl || "", sourceName: state.name || "" } });
    if (r && r.id) { savedId = r.id; render(); flash("Saved to the catalog."); return savedId; }
    flash("Could not save: " + ((r && r.error) || "no answer from the extension"), "bad"); return null;
  }

  // ---------- render ----------
  function chip(tag, conf, extraClass, readOnly, tip, badge) {
    const a = el("a", { href: "https://danbooru.donmai.us/wiki_pages/" + encodeURIComponent(tag), target: "_blank", rel: "noopener", title: (tip ? tip + " · " : "") + "Open the Danbooru wiki" }, tag);
    const x = el("button", { class: "x", title: excluded.has(tag) ? "Put back in the prompt" : "Remove from the prompt", onclick: () => { excluded.has(tag) ? excluded.delete(tag) : excluded.add(tag); render(); } }, excluded.has(tag) ? "+" : "×");
    return el("span", { class: "chip" + (!readOnly && excluded.has(tag) ? " off" : "") + (extraClass ? " " + extraClass : "") }, a, badge ? el("span", { class: "conf" }, badge) : null, conf != null ? el("span", { class: "conf" }, conf.toFixed(2)) : null, readOnly ? null : x);
  }
  // Character, series and named-outfit chips carry Claude's confidence and evidence plus the Danbooru check.
  function identityChip(res, tag) {
    const info = (res.identity_info || {})[tag] || {}, chk = (res.identity_check || {})[tag];
    const tip = [`${Math.round((info.confidence || 0) * 100)}% sure`, info.evidence ? "evidence: " + info.evidence : "",
      chk ? { ok: `on Danbooru (${chk.posts} posts)`, fixed: `corrected from ${chk.from}`, missing: "not found on Danbooru, may be a guess", category: "on Danbooru as a different kind of tag" }[chk.status] : ""].filter(Boolean).join(" · ");
    const bad = chk && (chk.status === "missing" || chk.status === "category");
    return chip(tag, null, "ident" + (bad ? " idwarn" : ""), false, tip, info.cosplay ? "cosplay" : chk && chk.status === "fixed" ? "fixed" : null);
  }
  function identityGroup(res, title, tags) {
    if (!tags || !tags.length) return null;
    const live = () => tags.filter(t => !excluded.has(t)).map(fmtTag).join(", ");
    return el("div", { class: "group" }, el("h4", {}, title, el("span", { class: "meta" }, "identified by Claude")),
      el("div", { class: "chips" }, tags.map(t => identityChip(res, t)), el("button", { class: "cp", title: "Copy this group", onclick: () => copy(live(), title) }, "copy")));
  }
  function group(title, meta, tags, conf) {
    if (!tags.length) return null;
    const p = C.presetOf(preset, overrides);
    const live = () => tags.filter(t => !excluded.has(t)).map(t => fmt === "weighted" ? C.emph(fmtTag(t), conf, p.emphasis) : fmtTag(t)).join(", ");
    return el("div", { class: "group" }, el("h4", {}, title, meta ? el("span", { class: "meta" }, meta) : null),
      el("div", { class: "chips" }, tags.map(t => chip(t, conf)), el("button", { class: "cp", title: "Copy this group", onclick: () => copy(live(), title) }, "copy")));
  }
  function renderSingle() {
    const s = state, res = s.result;
    const statusLine = s.error ? el("div", { class: "status bad" }, s.error)
      : res ? el("div", { class: "status" }, `via ${s.servedBy || "Claude"}`)
      : el("div", { class: "status" }, el("span", { class: "spin" }), s.status || "Working…");
    body.append(el("div", { class: "top" }, s.thumb ? el("img", { src: s.thumb, alt: "" }) : null, el("div", {}, el("div", { style: "font-weight:600" }, s.name || "Image"), statusLine)));
    if (s.error) {
      body.append(el("div", { class: "row" },
        s.needsKey ? el("button", { class: "primary", onclick: () => send({ type: "oti:options" }) }, "Open settings") : null,
        s.srcUrl ? el("button", { onclick: () => send({ type: "oti:retry", srcUrl: s.srcUrl, frameId: s.frameId }) }, "Try again") : null));
      return;
    }
    if (!res) return;
    const f = C.formatPrompt(res, fmtOpts());
    const fmtSel = el("select", { title: "Format", onchange: (e) => { fmt = e.target.value; saveChoice("oti.fmt", fmt); render(); } },
      [["danbooru", "tags_"], ["spaces", "tags"], ["weighted", "weighted"], ["hybrid", "hybrid"], ["prose", "prose"]].map(([v, l]) => el("option", { value: v }, l)));
    fmtSel.value = fmt;
    const genSel = el("select", { title: "Generator", onchange: (e) => { preset = e.target.value; fmt = C.PRESETS[preset].format; saveChoice("oti.preset", preset); saveChoice("oti.fmt", fmt); render(); } },
      Object.entries(C.PRESETS).map(([id, p]) => el("option", { value: id }, p.label)));
    genSel.value = preset;
    const stale = (fmt === "prose" || fmt === "hybrid") && f.sentences.stale ? el("div", { class: "muted" }, "The sentence was written before your edits; the full tool can rewrite it.") : null;
    body.append(...[el("div", { class: "row" }, genSel, fmtSel), el("pre", {}, f.prompt), stale,
      el("div", { class: "row" },
        el("button", { class: "primary", onclick: () => copy(C.formatPrompt(res, fmtOpts()).prompt, "the prompt") }, "Copy prompt"),
        el("button", { title: "Clothing and accessories only", onclick: () => copy(promptOf(res, true), "the outfit tags") }, "Copy outfit"),
        el("button", { onclick: () => copy(C.formatPrompt(res, fmtOpts()).negative, "the negative prompt") }, "Copy negative")),
      el("div", { class: "row" },
        el("button", { disabled: savedId ? "" : null, onclick: save }, savedId ? "Saved ✓" : "Save to catalog"),
        el("button", { onclick: async () => { const id = await save(); if (id) send({ type: "oti:open", id }); } }, "Open in tool")),
      el("div", { class: "flash status" })].filter(Boolean));
    if (res.description) body.append(el("div", { class: "muted" }, res.description));
    const sub = res.subject;
    body.append(...[group("Subject", "", [sub.count_tag, ...sub.body_tags].filter(Boolean)), identityGroup(res, "Character", res.character_tags), identityGroup(res, "Series", res.copyright_tags),
      group("Hair", "", sub.hair_tags), group("Face", "", sub.face_tags), identityGroup(res, "Named outfit", res.named_outfit_tags),
      ...res.outfit.map(o => group(o.item || o.category, [o.category, o.color, o.material].filter(Boolean).join(" · "), o.tags, o.confidence)),
      group("Style", "", res.style_tags),
      ...C.SCENE_GROUPS.map(g => group(g.label, "", g.key === "framing_tags" ? res.framing_tags : ((res.scene || {})[g.key] || [])))].filter(Boolean));
    if (f.negative) body.append(el("div", { class: "group" }, el("h4", {}, "Negative", el("button", { class: "cp", onclick: () => copy(f.negative, "the negative prompt") }, "copy")), el("div", { class: "muted" }, f.negative)));
    if (s.siteTags && s.siteTags.tags.length) {
      const predicted = new Set(C.orderedTags(res).map(x => x.tag));
      const matched = s.siteTags.tags.filter(t => predicted.has(t));
      body.append(el("div", { class: "group" }, el("h4", {}, `Tags on this ${s.siteTags.site} post`, el("span", { class: "meta" }, `${matched.length} of ${s.siteTags.tags.length} matched`)),
        el("div", { class: "chips" }, s.siteTags.tags.map(t => chip(t, null, predicted.has(t) ? "match" : "miss", true))),
        el("div", { class: "muted", style: "margin-top:4px" }, "Green outline: Claude found it too. Faded: Claude missed it.")));
    }
  }
  function renderBatch() {
    const s = state, done = s.items.filter(i => ["saved", "failed", "skipped"].includes(i.status)).length, saved = s.items.filter(i => i.status === "saved").length;
    body.append(el("div", { class: "status" + (s.error ? " bad" : "") }, s.error ? s.error : s.running ? [el("span", { class: "spin" }), `Reading ${done + 1} of ${s.items.length}…`] : `Done: ${saved} of ${s.items.length} saved to the catalog.`));
    body.append(el("div", { class: "row" },
      s.running ? el("button", { onclick: () => { send({ type: "oti:batch-stop" }); flash("Stopping after the current image…"); } }, "Stop") : null,
      s.needsKey ? el("button", { class: "primary", onclick: () => send({ type: "oti:options" }) }, "Open settings") : null,
      !s.running && saved ? el("button", { class: "primary", onclick: () => send({ type: "oti:open" }) }, "Open catalog") : null), el("div", { class: "flash status" }));
    s.items.forEach(i => body.append(el("div", { class: "item" }, i.thumb ? el("img", { src: i.thumb, alt: "" }) : el("div", { class: "ph" }),
      el("div", { style: "min-width:0" }, el("div", { class: "nm" }, i.name), el("div", { class: "st " + i.status }, { queued: "queued", reading: "reading…", saved: "saved", failed: "failed: " + (i.error || ""), skipped: "skipped" }[i.status]),
        i.summary ? el("div", { class: "muted" }, i.summary) : null,
        i.id ? el("button", { class: "cp", onclick: () => send({ type: "oti:open", id: i.id }) }, "open") : null))));
  }
  function render() {
    body.textContent = "";
    if (!state) return;
    state.mode === "batch" ? renderBatch() : renderSingle();
  }

  // ---------- chrome ----------
  root.querySelector('[data-act="close"]').addEventListener("click", () => { host.style.display = "none"; });
  root.querySelector('[data-act="tool"]').addEventListener("click", async () => { const id = state && state.result ? await save() : null; send({ type: "oti:open", id }); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && host.style.display !== "none") host.style.display = "none"; });
  const head = root.querySelector("header");
  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button")) return;
    const r = host.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = (ev) => { host.style.left = Math.max(0, Math.min(innerWidth - 80, ev.clientX - dx)) + "px"; host.style.top = Math.max(0, Math.min(innerHeight - 40, ev.clientY - dy)) + "px"; host.style.right = "auto"; };
    const up = () => { removeEventListener("pointermove", move); removeEventListener("pointerup", up); };
    addEventListener("pointermove", move); addEventListener("pointerup", up);
  });

  chrome.runtime.onMessage.addListener((msg, sender, respond) => {
    if (msg.type === "oti:show") {
      const next = msg.state;
      // A different image, a different mode, or a fresh result starts clean: no exclusions, not yet saved.
      if (!state || next.mode !== state.mode || next.srcUrl !== state.srcUrl || (next.result && !state.result)) { excluded = new Set(next.result ? C.unverifiedIdentity(next.result) : []); savedId = null; }
      state = next; host.style.display = ""; render();
    }
    if (msg.type === "oti:hide") { host.style.visibility = "hidden"; respond(true); }
    if (msg.type === "oti:unhide") { host.style.visibility = ""; respond(true); }
  });
})();

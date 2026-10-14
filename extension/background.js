// Outfit Tag Interpreter — extension service worker.
// Context menus, image grabbing, Claude calls, and catalog writes shared with the tool page.
self.window = self; // tags.js and core.js publish their globals on window/self
importScripts("tool/tags.js", "tool/core.js", "claude.js");

const MENU = { READ: "oti-read", SEND: "oti-send", QUEUE: "oti-queue", OPENQ: "oti-open-queue", BATCH: "oti-batch" };
const QUEUE_KEY = "oti.queue", QUEUE_MAX = 5;
const CATALOG_KEY = "oti.history";
const TOOL_URL = chrome.runtime.getURL("tool/index.html");

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU.READ, title: "Read outfit tags", contexts: ["image"] });
    chrome.contextMenus.create({ id: MENU.SEND, title: "Open in Outfit Tag Interpreter", contexts: ["image"] });
    chrome.contextMenus.create({ id: MENU.QUEUE, title: "Add to outfit queue (0/5)", contexts: ["image"] });
    chrome.contextMenus.create({ id: MENU.OPENQ, title: "Open outfit queue (0)", contexts: ["image", "page", "action"], enabled: false });
    chrome.contextMenus.create({ id: MENU.BATCH, title: "Read all outfits on this page", contexts: ["page"] });
    syncQueueUI();
  });
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(() => syncQueueUI());
// The toolbar button opens the queue when it has images, otherwise the plain tool.
chrome.action.onClicked.addListener(async () => openTool((await getQueue()).length ? "?queue=1" : ""));
chrome.contextMenus.onClicked.addListener((info, tab) => handleMenu(info, tab));

function handleMenu(info, tab) {
  if (info.menuItemId === MENU.READ) return readHere(info, tab);
  if (info.menuItemId === MENU.SEND) return sendToTool(info, tab);
  if (info.menuItemId === MENU.QUEUE) return addToQueue(info, tab);
  if (info.menuItemId === MENU.OPENQ) return openTool("?queue=1");
  if (info.menuItemId === MENU.BATCH) return readAll(tab);
}

// ---------- helpers ----------
const errMsg = (e) => String((e && e.message) || e || "unknown error");
function openTool(query = "") { return chrome.tabs.create({ url: TOOL_URL + query }); }

// A Claude call can take longer than the worker's 30 s idle limit; calling an
// extension API every 20 s keeps the worker alive until the work finishes.
async function keepAlive(promise) {
  const t = setInterval(() => chrome.runtime.getPlatformInfo(), 20000);
  try { return await promise; } finally { clearInterval(t); }
}

function guessName(srcUrl, alt, title) {
  if (alt && alt.trim()) return alt.trim().slice(0, 60);
  try {
    const last = decodeURIComponent(new URL(srcUrl).pathname.split("/").pop() || "").replace(/\.[a-z0-9]+$/i, "");
    if (last && !/^[0-9a-f_-]{16,}$/i.test(last) && last.length > 2) return last.replace(/[_-]+/g, " ").slice(0, 60);
  } catch {}
  return (title || "outfit").slice(0, 60);
}
const hostOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };

// ---------- getting the image ----------
async function fetchImage(url) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const blob = await res.blob();
  if (blob.type && !blob.type.startsWith("image/") && blob.type !== "application/octet-stream") throw new Error("not an image (" + blob.type + ")");
  return blob;
}

// Runs inside the page: read the pixels of an <img> through a canvas, or report where it is on screen.
function grabFromPage(src) {
  const img = [...document.images].find(i => i.currentSrc === src || i.src === src);
  if (!img) return { error: "image not found on the page" };
  try {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return { dataUrl: c.toDataURL("image/png") };
  } catch {
    img.scrollIntoView({ block: "center", inline: "center" });
    const r = img.getBoundingClientRect();
    return { rect: { x: r.x, y: r.y, w: r.width, h: r.height }, dpr: devicePixelRatio };
  }
}

// Image as a Blob: direct fetch, else canvas in the page, else a crop of a screenshot.
async function getImageBlob(srcUrl, tab, frameId = 0, allowCapture = true) {
  try { return await fetchImage(srcUrl); } catch (e) { console.warn("direct fetch failed", e); }
  const [{ result: got } = {}] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [frameId] }, func: grabFromPage, args: [srcUrl] });
  if (got?.dataUrl) return await (await fetch(got.dataUrl)).blob();
  if (!got?.rect || !allowCapture || frameId !== 0) throw new Error(got?.error || "the site blocks reading this image");
  await sendPanel(tab.id, { type: "oti:hide" });
  await new Promise(r => setTimeout(r, 200));
  let shot;
  try { shot = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }); } finally { await sendPanel(tab.id, { type: "oti:unhide" }); }
  const bmp = await createImageBitmap(await (await fetch(shot)).blob());
  const s = got.dpr, x = Math.max(0, got.rect.x * s), y = Math.max(0, got.rect.y * s);
  const w = Math.min(bmp.width - x, got.rect.w * s), h = Math.min(bmp.height - y, got.rect.h * s);
  if (w < 20 || h < 20) throw new Error("the image is not visible on screen");
  const c = new OffscreenCanvas(Math.round(w), Math.round(h)); c.getContext("2d").drawImage(bmp, x, y, w, h, 0, 0, c.width, c.height);
  return await c.convertToBlob({ type: "image/png" });
}

async function toBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer()); let s = "";
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
}

// Downscale to <= 1568 px, re-encode as JPEG, and make a 128 px square thumbnail.
async function prepare(blob) {
  let bmp;
  try { bmp = await createImageBitmap(blob); } catch { throw new Error("this image format can't be read (SVG or unsupported)"); }
  const MAX = 1568, scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale));
  const c = new OffscreenCanvas(w, h); const g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); g.drawImage(bmp, 0, 0, w, h);
  const jpg = await c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
  const t = new OffscreenCanvas(128, 128); const side = Math.min(w, h);
  t.getContext("2d").drawImage(c, (w - side) / 2, (h - side) / 2, side, side, 0, 0, 128, 128);
  const base64 = await toBase64(jpg);
  return { mediaType: "image/jpeg", base64, dataUrl: "data:image/jpeg;base64," + base64, thumb: "data:image/jpeg;base64," + await toBase64(await t.convertToBlob({ type: "image/jpeg", quality: 0.7 })), w, h };
}

// ---------- panel ----------
// The panel uses the same tag vocabulary and prompt formatter as the tool page.
async function ensurePanel(tabId) { await chrome.scripting.executeScript({ target: { tabId }, files: ["tool/tags.js", "tool/core.js", "content.js"] }); }
function sendPanel(tabId, msg) { return chrome.tabs.sendMessage(tabId, msg, { frameId: 0 }).catch(() => null); }
const show = (tabId, state) => sendPanel(tabId, { type: "oti:show", state });

// Runs inside the page: tags of the current post on booru sites (best effort).
function readSiteTags() {
  if (!/danbooru|gelbooru|safebooru|yande\.re|konachan|rule34|e621/.test(location.hostname)) return null;
  let tags = [...document.querySelectorAll(".general-tag-list li[data-tag-name]")].map(li => li.dataset.tagName);
  if (!tags.length) tags = [...document.querySelectorAll("li.tag-type-general a[href*='tags=']")].map(a => { try { return new URL(a.href).searchParams.get("tags"); } catch { return ""; } });
  if (!tags.length) { const el = document.querySelector("[data-tags]"); if (el) tags = el.dataset.tags.split(/\s+/); }
  tags = [...new Set(tags.filter(Boolean).map(t => t.trim().toLowerCase()))];
  return tags.length ? { site: location.hostname.replace(/^www\./, ""), tags } : null;
}
async function getSiteTags(tabId) {
  try { const [{ result } = {}] = await chrome.scripting.executeScript({ target: { tabId }, func: readSiteTags }); return result || null; } catch { return null; }
}

// Runs inside the page: text around an image that can name the character or series (title, alt text, caption).
function readPageContext(src) {
  const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
  const img = src ? [...document.images].find(i => i.currentSrc === src || i.src === src) : null;
  let caption = "";
  if (img) {
    caption = img.closest("figure")?.querySelector("figcaption")?.textContent || "";
    for (let el = img.parentElement, i = 0; !caption && el && i < 3; el = el.parentElement, i++) {
      const t = clean(el.innerText, 400); if (t.length > 12 && t.length < 400) caption = t;   // short nearby text only, not whole page chrome
    }
  }
  const meta = (sel) => document.querySelector(sel)?.getAttribute("content") || "";
  return { page_title: clean(document.title, 200), og_title: clean(meta('meta[property="og:title"]'), 200), description: clean(meta('meta[property="og:description"]') || meta('meta[name="description"]'), 300),
    image_alt: clean(img && (img.alt || img.title), 200), caption: clean(caption, 300), url: clean(location.hostname + location.pathname, 160) };
}
async function getPageContext(tabId, src, frameId = 0) {
  try { const [{ result } = {}] = await chrome.scripting.executeScript({ target: { tabId, frameIds: [frameId] }, func: readPageContext, args: [src || null] }); return result || null; } catch { return null; }
}
// Check character, series and named-outfit guesses on Danbooru; a failed lookup leaves them unchecked.
async function checkIdentity(result) {
  try { await OTI_CORE.verifyIdentity(result, (names) => OTI_CLAUDE.lookupTags(names)); } catch (e) { console.warn("identity check failed", e); }
  return result;
}

// ---------- catalog (same storage key and entry shape as the tool page) ----------
let catalogChain = Promise.resolve();
function addEntry(partial) {
  catalogChain = catalogChain.then(async () => {
    const got = await chrome.storage.local.get(CATALOG_KEY);
    let list = []; try { list = JSON.parse(got[CATALOG_KEY] || "[]"); } catch {}
    const e = Object.assign({ id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ts: Date.now(), name: "outfit", notes: "", labels: [], fav: false, status: "new", source: "extension", parentId: null, thumb: "", model: "", result: null }, partial);
    list.push(e);
    await chrome.storage.local.set({ [CATALOG_KEY]: JSON.stringify(list) });
    return e;
  });
  return catalogChain;
}

// ---------- read one image into the on-page panel ----------
async function readHere(info, tab) {
  const tabId = tab.id;
  try { await ensurePanel(tabId); } catch { return sendToTool(info, tab); } // e.g. chrome:// pages or the web store
  const base = { mode: "single", srcUrl: info.srcUrl, frameId: info.frameId || 0, pageUrl: tab.url, name: guessName(info.srcUrl, "", tab.title) };
  show(tabId, { ...base, status: "Reading the image…" });
  const s = await OTI_CLAUDE.settings();
  let img;
  try { img = await prepare(await getImageBlob(info.srcUrl, tab, info.frameId || 0)); }
  catch (e) { return show(tabId, { ...base, error: "Could not read this image: " + errMsg(e) }); }
  base.thumb = img.thumb;
  if (!s.apiKey) return show(tabId, { ...base, needsKey: true, error: "Add your Anthropic API key in the extension settings, then try again." });
  show(tabId, { ...base, status: "Asking Claude… (usually 10–60 s)" });
  const [siteTags, context] = await Promise.all([getSiteTags(tabId), getPageContext(tabId, info.srcUrl, info.frameId || 0)]);
  try {
    const result = await keepAlive((async () => {
      const r = await OTI_CLAUDE.call({ ...s, image: img, prompt: OTI_CORE.interpretPrompt(s.focus, "", context), schema: OTI_CORE.SCHEMA });
      base.servedBy = r.servedBy;
      return checkIdentity(OTI_CORE.normalizeResult(r.json));
    })());
    show(tabId, { ...base, result, siteTags });
  } catch (e) { show(tabId, { ...base, error: errMsg(e) }); }
}

// ---------- hand one image to the full tool ----------
async function sendToTool(info, tab) {
  try {
    const img = await prepare(await getImageBlob(info.srcUrl, tab, info.frameId || 0));
    const context = await getPageContext(tab.id, info.srcUrl, info.frameId || 0);
    await chrome.storage.session.set({ "oti.pending": { dataUrl: img.dataUrl, name: guessName(info.srcUrl, "", tab.title), pageUrl: tab.url, context } });
    return openTool("?pending=1");
  } catch (e) {
    try { await ensurePanel(tab.id); show(tab.id, { mode: "single", srcUrl: info.srcUrl, error: "Could not read this image: " + errMsg(e) }); } catch {}
  }
}

// ---------- queue: collect up to 5 images across pages, open them together ----------
async function getQueue() { return (await chrome.storage.session.get(QUEUE_KEY))[QUEUE_KEY] || []; }
async function syncQueueUI(n) {
  if (n == null) n = (await getQueue()).length;
  chrome.contextMenus.update(MENU.QUEUE, { title: n >= QUEUE_MAX ? `Outfit queue is full (${QUEUE_MAX}/${QUEUE_MAX})` : `Add to outfit queue (${n}/${QUEUE_MAX})`, enabled: n < QUEUE_MAX }, () => void chrome.runtime.lastError);
  chrome.contextMenus.update(MENU.OPENQ, { title: `Open outfit queue (${n})`, enabled: n > 0 }, () => void chrome.runtime.lastError);
  chrome.action.setBadgeBackgroundColor({ color: "#7a4de8" });
  chrome.action.setBadgeText({ text: n ? String(n) : "" });
  chrome.action.setTitle({ title: n ? `Open outfit queue (${n} waiting)` : "Open Outfit Tag Interpreter" });
}
// Keep the menu and badge in step when the tool page takes the queue.
chrome.storage.onChanged.addListener((changes, area) => { if (area === "session" && changes[QUEUE_KEY]) syncQueueUI((changes[QUEUE_KEY].newValue || []).length); });
let queueChain = Promise.resolve();
function addToQueue(info, tab) {
  queueChain = queueChain.then(async () => {
    const list = await getQueue();
    if (list.length >= QUEUE_MAX) { chrome.action.setBadgeText({ text: "full" }); setTimeout(() => syncQueueUI(), 1500); return; }
    try {
      const img = await prepare(await getImageBlob(info.srcUrl, tab, info.frameId || 0));
      list.push({ dataUrl: img.dataUrl, name: guessName(info.srcUrl, "", tab.title), pageUrl: tab.url, context: await getPageContext(tab.id, info.srcUrl, info.frameId || 0) });
      await chrome.storage.session.set({ [QUEUE_KEY]: list });
    } catch (e) {
      try { await ensurePanel(tab.id); show(tab.id, { mode: "single", srcUrl: info.srcUrl, error: "Could not add this image to the queue: " + errMsg(e) }); } catch {}
    }
  });
  return queueChain;
}

// ---------- batch: every large image on the page ----------
function collectImages(max) {
  const seen = new Set(), list = [];
  for (const img of document.images) {
    const src = img.currentSrc || img.src; if (!src || seen.has(src) || src.startsWith("data:image/svg")) continue;
    const r = img.getBoundingClientRect();
    if (img.naturalWidth < 200 || img.naturalHeight < 200 || r.width < 100 || r.height < 100) continue;
    seen.add(src); list.push({ src, alt: (img.alt || "").trim(), area: r.width * r.height });
  }
  return list.sort((a, b) => b.area - a.area).slice(0, max).map(({ src, alt }) => ({ src, alt }));
}
const batchStop = new Set();
async function readAll(tab) {
  const tabId = tab.id;
  try { await ensurePanel(tabId); } catch { return; }
  const s = await OTI_CLAUDE.settings();
  const [{ result: found = [] } = {}] = await chrome.scripting.executeScript({ target: { tabId }, func: collectImages, args: [Number(s.batchMax) || 12] });
  const state = { mode: "batch", pageUrl: tab.url, running: true, items: found.map(f => ({ src: f.src, alt: f.alt, name: guessName(f.src, f.alt, tab.title), status: "queued" })) };
  const pageContext = (await getPageContext(tabId, null)) || {};
  if (!state.items.length) return show(tabId, { ...state, running: false, error: "No large images found on this page. Scroll so the images load, then try again." });
  if (!s.apiKey) return show(tabId, { ...state, running: false, needsKey: true, error: "Add your Anthropic API key in the extension settings, then try again." });
  batchStop.delete(tabId); show(tabId, state);
  const host = hostOf(tab.url);
  await keepAlive((async () => {
    for (const item of state.items) {
      if (batchStop.has(tabId)) { item.status = "skipped"; continue; }
      item.status = "reading"; show(tabId, state);
      try {
        const img = await prepare(await getImageBlob(item.src, tab, 0, false));
        item.thumb = img.thumb; show(tabId, state);
        const r = await OTI_CLAUDE.call({ ...s, image: img, prompt: OTI_CORE.interpretPrompt(s.focus, "", { ...pageContext, image_alt: item.alt || "" }), schema: OTI_CORE.SCHEMA });
        const result = await checkIdentity(OTI_CORE.normalizeResult(r.json));
        const e = await addEntry({ name: item.name, thumb: img.thumb, result, model: r.servedBy, labels: host ? [host, "batch"] : ["batch"], notes: tab.url });
        item.status = "saved"; item.id = e.id;
        item.summary = OTI_CORE.orderedTags(result).filter(x => !["subject", "hair", "face", "framing"].includes(x.group)).slice(0, 8).map(x => x.tag).join(", ");
      } catch (err) { item.status = "failed"; item.error = errMsg(err); }
      show(tabId, state);
    }
  })());
  state.running = false; batchStop.delete(tabId); show(tabId, state);
}

// ---------- messages from the panel ----------
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  const tab = sender.tab;
  if (msg.type === "oti:save") { addEntry(msg.entry).then(e => respond({ id: e.id }), err => respond({ error: errMsg(err) })); return true; }
  if (msg.type === "oti:open") { openTool(msg.id ? "?open=" + encodeURIComponent(msg.id) : ""); }
  if (msg.type === "oti:options") { chrome.runtime.openOptionsPage(); }
  if (msg.type === "oti:retry" && tab) { readHere({ srcUrl: msg.srcUrl, frameId: msg.frameId || 0 }, tab); }
  if (msg.type === "oti:batch-stop" && tab) { batchStop.add(tab.id); }
});

// Exposed for testing from the service worker console.
self.OTI_BG = { handleMenu, readHere, sendToTool, addToQueue, getQueue, readAll, addEntry, prepare };

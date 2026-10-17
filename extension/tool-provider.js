// Provider for the interpreter page bundled inside the extension.
// The catalog lives in chrome.storage.local so the right-click panel and this page share it.
(async () => {
  const $ = (id) => document.getElementById(id);
  const KEYS = ["oti.history", "oti.fmt", "oti.minConf", "oti.preset", "oti.presetOverrides"];
  const cache = await chrome.storage.local.get(KEYS);

  async function showModel() {
    const s = await OTI_CLAUDE.settings();
    $("modelInfo").textContent = s.apiKey ? `Using ${s.model} at ${s.effort} effort. Change it in Settings.` : "No API key yet. Open Settings to add one.";
  }
  const call = async ({ image, prompt, schema }) => OTI_CLAUDE.call({ ...(await OTI_CLAUDE.settings()), image, prompt, schema });

  window.OTI_PROVIDER = {
    name: "extension",
    store: {
      get: (k) => cache[k] ?? null,
      set: (k, v) => { cache[k] = v; chrome.storage.local.set({ [k]: v }); }
    },
    unavailableMessage: "Add your Anthropic API key in Settings first.",
    ready: async () => !!(await OTI_CLAUDE.settings()).apiKey,
    interpret: call,
    text: call,
    lookupTags: (tags) => OTI_CLAUDE.lookupTags(tags)
  };

  // Entries saved from the right-click panel show up here without a reload.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes["oti.history"]) { cache["oti.history"] = changes["oti.history"].newValue; OTI.reloadCatalog(); }
    ["oti.fmt", "oti.preset", "oti.presetOverrides"].forEach(k => { if (changes[k]) cache[k] = changes[k].newValue; });
    if (changes["oti.settings"]) showModel();
  });
  $("openOptions").addEventListener("click", () => chrome.runtime.openOptionsPage());

  OTI.init();
  await showModel();

  const q = new URLSearchParams(location.search);
  if (q.get("open")) OTI.openById(q.get("open"));
  if (q.get("pending")) {
    const got = await chrome.storage.session.get("oti.pending");
    const p = got["oti.pending"];
    if (p) {
      await chrome.storage.session.remove("oti.pending");
      const blob = await (await fetch(p.dataUrl)).blob();
      await OTI.loadFile(new File([blob], (p.name || "outfit") + ".jpg", { type: blob.type }), p.context, p.pageUrl);
      if (await window.OTI_PROVIDER.ready()) OTI.run();
      else OTI.setStatus("Image loaded. Add your API key in Settings, then click “Interpret outfit”.", "warn");
    }
    history.replaceState(null, "", location.pathname);
  }
  if (q.get("queue")) {
    // Images collected with "Add to outfit queue": load as many as fit, leave the rest queued.
    const got = await chrome.storage.session.get("oti.queue");
    const list = got["oti.queue"] || [];
    const take = list.slice(0, OTI.queueRoom);
    await chrome.storage.session.set({ "oti.queue": list.slice(take.length) });
    for (const item of take) {
      const blob = await (await fetch(item.dataUrl)).blob();
      await OTI.loadFile(new File([blob], (item.name || "outfit") + ".jpg", { type: blob.type }), item.context, item.pageUrl);
    }
    history.replaceState(null, "", location.pathname);
    if (take.length && await window.OTI_PROVIDER.ready()) OTI.run();
    else if (take.length) OTI.setStatus(`${take.length} images loaded. Add your API key in Settings, then click Interpret.`, "warn");
    if (list.length > take.length) OTI.setStatus(`The tool's queue is full; ${list.length - take.length} images are still waiting in the extension queue.`, "warn");
  }
})();

// Runs on the Photo Tools copy of the tool. It hands that page the extension's storage, so the website,
// the right-click panel and the bundled page all work from one catalog (and the website can use the
// extension's API key when none is entered there). Only the page itself can talk to it.
(() => {
  const KEYS = ["oti.history", "oti.fmt", "oti.minConf", "oti.preset", "oti.presetOverrides", "oti.settings"];
  const post = (m) => window.postMessage(Object.assign({ otiBridge: true }, m), location.origin);
  document.documentElement.dataset.otiBridge = chrome.runtime.getManifest().version;   // tells the page not to wait for nothing
  const snapshot = chrome.storage.local.get(KEYS);
  window.addEventListener("message", async (ev) => {
    if (ev.source !== window || !ev.data || !ev.data.otiPage) return;
    const m = ev.data;
    try {
      if (m.type === "hello") post({ type: "snapshot", data: await snapshot, version: chrome.runtime.getManifest().version });
      else if (m.type === "set" && KEYS.includes(m.key)) await chrome.storage.local.set({ [m.key]: m.value });
      else if (m.type === "preview") { const r = await chrome.runtime.sendMessage({ type: "oti:preview", op: m.op, id: m.id, data: m.data }); post({ type: "preview", reqId: m.reqId, data: r && r.data }); }
    } catch (e) { if (m.type === "preview") post({ type: "preview", reqId: m.reqId, data: null }); }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    KEYS.forEach(k => { if (changes[k]) post({ type: "changed", key: k, value: changes[k].newValue ?? null }); });
  });
})();

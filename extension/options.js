(async () => {
  const $ = (id) => document.getElementById(id);
  const FIELDS = ["apiKey", "model", "effort", "focus", "batchMax", "apiBase"];
  const s = await OTI_CLAUDE.settings();
  FIELDS.forEach(f => { $(f).value = s[f] ?? ""; });
  $("save").addEventListener("click", async () => {
    const next = {};
    FIELDS.forEach(f => { next[f] = $(f).value.trim(); });
    next.batchMax = Math.max(1, Math.min(40, Number(next.batchMax) || OTI_CLAUDE.DEFAULTS.batchMax));
    next.model = next.model || OTI_CLAUDE.DEFAULTS.model;
    next.apiBase = next.apiBase || OTI_CLAUDE.DEFAULTS.apiBase;
    await chrome.storage.local.set({ "oti.settings": next });
    $("batchMax").value = next.batchMax; $("model").value = next.model; $("apiBase").value = next.apiBase;
    $("saved").textContent = next.apiKey ? "Saved." : "Saved. Add an API key before reading images.";
  });
  $("openTool").addEventListener("click", () => chrome.tabs.create({ url: chrome.runtime.getURL("tool/index.html") }));
})();

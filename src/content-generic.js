// BureauBuddy – Generic content script
// Works on Kivra, Minmyndighetspost, and other portals

(function () {
  "use strict";

  let injected = false;

  function init() {
    const observer = new MutationObserver(debounce(checkForDocument, 800));
    observer.observe(document.body, { childList: true, subtree: true });
    checkForDocument();
  }

  function checkForDocument() {
    if (injected) return;

    // Kivra: document viewer area
    const isKivra = location.hostname.includes("kivra");
    const isMyndighetspost = location.hostname.includes("minmyndighetspost");

    const docArea =
      document.querySelector('[class*="document"], [class*="letter"], [class*="pdf"], [class*="viewer"]') ||
      document.querySelector("main article, .content-area, [role='main']");

    const hasSubstantialText = docArea && docArea.innerText?.trim().length > 200;

    if (hasSubstantialText) {
      injectButton(docArea);
    }
  }

  function injectButton(container) {
    if (document.getElementById("bb-floating-btn")) return;
    injected = true;

    const btn = document.createElement("button");
    btn.id = "bb-floating-btn";
    btn.className = "bb-floating-btn";
    btn.innerHTML = `
      <span class="bb-flag">🇸🇪</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      <span class="bb-flag">🇬🇧</span>
      <span class="bb-btn-text">Explain this letter</span>
    `;

    btn.addEventListener("click", async () => {
      btn.innerHTML = `<span class="bb-spinner"></span> Analyzing…`;

      const text = container.innerText?.trim() || document.body.innerText?.trim();

      if (!text || text.length < 50) {
        alert("BureauBuddy: Could not find document text on this page.");
        return;
      }

      try {
        chrome.runtime.sendMessage(
          { type: "ANALYZE_TEXT", payload: { text } },
          response => {
            btn.innerHTML = `🇸🇪 → 🇬🇧 Explain this letter`;
            if (chrome.runtime.lastError) {
              alert("Extension was reloaded — please refresh this page.");
              return;
            }
            if (response?.ok) {
              showPanel(response.data);
            } else {
              alert("BureauBuddy error: " + (response?.error || "Unknown"));
            }
          }
        );
      } catch {
        btn.innerHTML = `🇸🇪 → 🇬🇧 Explain this letter`;
        alert("Extension was reloaded — please refresh this page.");
      }
    });

    document.body.appendChild(btn);
  }

  function showPanel(analysis) {
    const existing = document.getElementById("bb-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "bb-panel";
    panel.className = "bb-panel";

    const urgencyColor = { high: "#E24B4A", medium: "#EF9F27", low: "#1D9E75" }[analysis.urgency] || "#888";

    panel.innerHTML = `
      <div class="bb-panel-header">
        <div class="bb-panel-logo">BB</div>
        <div class="bb-panel-title">BureauBuddy</div>
        <button class="bb-panel-close" aria-label="Close">✕</button>
      </div>
      <div class="bb-panel-body">
        <div class="bb-meta-row">
          <span class="bb-sender">${analysis.sender || "Unknown"}</span>
          <span class="bb-urgency" style="color:${urgencyColor}">${analysis.urgency} urgency</span>
        </div>
        <div class="bb-section">
          <div class="bb-section-label">Summary</div>
          <p class="bb-summary">${analysis.summary}</p>
        </div>
        ${(analysis.actions || []).length ? `
        <div class="bb-section">
          <div class="bb-section-label">Action required</div>
          <ul class="bb-action-list">${analysis.actions.map(a => `<li>${a}</li>`).join("")}</ul>
        </div>` : ""}
        ${(analysis.deadlines || []).length ? `
        <div class="bb-section">
          <div class="bb-section-label">Deadlines</div>
          ${analysis.deadlines.map(d => `<div class="bb-deadline-item"><span class="bb-deadline-date">${d.date}</span><span class="bb-deadline-desc">${d.description}</span></div>`).join("")}
        </div>` : ""}
      </div>`;

    document.body.appendChild(panel);
    panel.querySelector(".bb-panel-close")?.addEventListener("click", () => panel.remove());
    requestAnimationFrame(() => panel.classList.add("bb-panel-visible"));
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

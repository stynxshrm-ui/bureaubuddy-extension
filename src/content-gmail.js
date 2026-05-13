// BureauBuddy – Gmail content script
// Watches for PDF attachment previews and injects the explain button

(function () {
  "use strict";

  let panelInjected = false;
  let currentPdfText = null;
  let observerActive = false;

  // ── Boot ────────────────────────────────────────────────────────────────────
  function init() {
    if (observerActive) return;
    observerActive = true;

    // Gmail is a heavy SPA — watch for DOM changes
    const observer = new MutationObserver(debounce(scanForPdfViewer, 600));
    observer.observe(document.body, { childList: true, subtree: true });

    // Also run on first load
    scanForPdfViewer();
  }

  // ── Scan for PDF viewer ─────────────────────────────────────────────────────
  function scanForPdfViewer() {
    // Gmail renders PDF previews inside an iframe with a specific URL pattern
    const iframes = document.querySelectorAll("iframe");
    let pdfFrame = null;

    for (const frame of iframes) {
      const src = frame.src || "";
      if (
        src.includes("docs.google.com/viewer") ||
        src.includes("drive.google.com/file") ||
        src.includes(".pdf") ||
        frame.getAttribute("data-attachment-id")
      ) {
        pdfFrame = frame;
        break;
      }
    }

    // Also check for the attachment preview panel Gmail shows inline
    const attachmentPreview = document.querySelector(
      '[data-tooltip="Preview attachment"], .aQH, .nH.bAk'
    );

    if (pdfFrame || attachmentPreview) {
      injectFloatingButton(pdfFrame || attachmentPreview);
    } else {
      // Remove button if we navigated away from a PDF
      removeFloatingButton();
    }
  }

  // ── Inject floating button ──────────────────────────────────────────────────
  function injectFloatingButton(targetEl) {
    if (document.getElementById("bb-floating-btn")) return;

    const btn = document.createElement("button");
    btn.id = "bb-floating-btn";
    btn.className = "bb-floating-btn";
    btn.innerHTML = `
      <span class="bb-flag">🇸🇪</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      <span class="bb-flag">🇬🇧</span>
      <span class="bb-btn-text">Explain this letter</span>
    `;

    btn.addEventListener("click", handleButtonClick);

    // Append to the PDF viewer container, or fallback to body
    const container = findPdfContainer() || document.body;
    container.style.position = "relative";
    container.appendChild(btn);
  }

  function removeFloatingButton() {
    const btn = document.getElementById("bb-floating-btn");
    if (btn) btn.remove();
    panelInjected = false;
  }

  // ── Find best container for the button ─────────────────────────────────────
  function findPdfContainer() {
    // Try to find the attachment preview area Gmail uses
    const selectors = [
      ".aQH",           // attachment preview wrapper
      ".nH.bAk",        // full-screen preview
      '[role="dialog"]', // modal attachment viewers
      ".ii.gt"           // email body area
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // ── Button click handler ────────────────────────────────────────────────────
  async function handleButtonClick() {
    const btn = document.getElementById("bb-floating-btn");
    if (btn) {
      btn.classList.add("bb-loading");
      btn.innerHTML = `<span class="bb-spinner"></span> Analyzing…`;
    }

    try {
      const text = await extractPdfText();

      if (!text || text.trim().length < 50) {
        showPanel({ error: "Could not extract text from this PDF. It may be a scanned image — OCR coming soon." });
        return;
      }

      currentPdfText = text;

      try {
        chrome.runtime.sendMessage(
          { type: "ANALYZE_TEXT", payload: { text } },
          response => {
            if (chrome.runtime.lastError) {
              showPanel({ error: "Extension was reloaded — please refresh this page." });
              return;
            }
            if (!response.ok) {
              showPanel({ error: formatError(response.error) });
              return;
            }
            chrome.runtime.sendMessage({ type: "INCREMENT_USAGE" });
            showPanel({ analysis: response.data });
          }
        );
      } catch {
        showPanel({ error: "Extension was reloaded — please refresh this page." });
      }
    } catch (err) {
      showPanel({ error: err.message });
    } finally {
      // Reset button after a moment
      setTimeout(() => {
        const b = document.getElementById("bb-floating-btn");
        if (b) {
          b.classList.remove("bb-loading");
          b.innerHTML = `<span class="bb-flag">🇸🇪</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg><span class="bb-flag">🇬🇧</span><span class="bb-btn-text">Explain this letter</span>`;
        }
      }, 1000);
    }
  }

  // ── Text extraction ─────────────────────────────────────────────────────────
  async function extractPdfText() {
    let text = "";

    // Strategy 1: Try to get text from Google Docs viewer iframe
    const iframes = document.querySelectorAll("iframe");
    for (const frame of iframes) {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (doc) {
          text = doc.body?.innerText || "";
          if (text.length > 100) break;
        }
      } catch {
        // Cross-origin — skip
      }
    }

    // Strategy 2: Grab visible text from the email body area
    // (Gmail sometimes renders PDF text inline in the preview)
    if (text.length < 100) {
      const emailBody = document.querySelector(".a3s.aiL, .ii.gt .a3s");
      if (emailBody) {
        text = emailBody.innerText || "";
      }
    }

    // Strategy 3: Look for any rendered text in the PDF viewer overlay
    if (text.length < 100) {
      const previewArea = document.querySelector(
        '.nH.bAk, .aQH, [data-message-id] .ii'
      );
      if (previewArea) {
        text = previewArea.innerText || "";
      }
    }

    // Strategy 4: Selected text (user may have selected some)
    if (text.length < 100) {
      const selection = window.getSelection()?.toString();
      if (selection && selection.length > 50) text = selection;
    }

    return text.trim();
  }

  // ── Side panel ──────────────────────────────────────────────────────────────
  function showPanel(data) {
    // Remove existing panel
    const existing = document.getElementById("bb-panel");
    if (existing) existing.remove();

    const panel = document.createElement("div");
    panel.id = "bb-panel";
    panel.className = "bb-panel";

    if (data.error) {
      panel.innerHTML = buildErrorHTML(data.error);
    } else {
      panel.innerHTML = buildPanelHTML(data.analysis);
    }

    document.body.appendChild(panel);

    // Wire up close button
    panel.querySelector(".bb-panel-close")?.addEventListener("click", () => {
      panel.classList.add("bb-panel-closing");
      setTimeout(() => panel.remove(), 250);
    });

    // Wire up follow-up chat
    const chatInput = panel.querySelector("#bb-chat-input");
    const chatSend = panel.querySelector("#bb-chat-send");
    const chatHistory = panel.querySelector("#bb-chat-history");

    if (chatSend && chatInput) {
      chatSend.addEventListener("click", () => sendFollowUp(chatInput, chatHistory));
      chatInput.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendFollowUp(chatInput, chatHistory);
        }
      });
    }

    // Animate in
    requestAnimationFrame(() => panel.classList.add("bb-panel-visible"));
  }

  function sendFollowUp(input, historyEl) {
    const question = input.value.trim();
    if (!question || !currentPdfText) return;

    input.value = "";
    const context = `Based on this document:\n\n${currentPdfText.slice(0, 4000)}\n\nAnswer this question in plain English: ${question}`;

    const userBubble = document.createElement("div");
    userBubble.className = "bb-chat-user";
    userBubble.textContent = question;
    historyEl.appendChild(userBubble);

    const aiBubble = document.createElement("div");
    aiBubble.className = "bb-chat-ai";
    aiBubble.textContent = "Thinking…";
    historyEl.appendChild(aiBubble);
    historyEl.scrollTop = historyEl.scrollHeight;

    try {
      chrome.runtime.sendMessage(
        { type: "ANALYZE_TEXT", payload: { text: context, sourceLanguage: "auto", targetLanguage: "English" } },
        response => {
          if (chrome.runtime.lastError || !response?.ok) {
            aiBubble.textContent = formatError(response?.error);
          } else {
            aiBubble.textContent = response.data?.summary || JSON.stringify(response.data);
          }
          historyEl.scrollTop = historyEl.scrollHeight;
        }
      );
    } catch {
      aiBubble.textContent = "Extension was reloaded — please refresh this page.";
      historyEl.scrollTop = historyEl.scrollHeight;
    }
  }

  // ── HTML builders ───────────────────────────────────────────────────────────
  function buildPanelHTML(a) {
    const urgencyColor = { high: "#E24B4A", medium: "#EF9F27", low: "#1D9E75" }[a.urgency] || "#888";
    const urgencyBg = { high: "#FCEBEB", medium: "#FAEEDA", low: "#E1F5EE" }[a.urgency] || "#f5f5f5";

    const deadlinesHTML = (a.deadlines || []).length
      ? (a.deadlines || []).map(d => `
          <div class="bb-deadline-item">
            <span class="bb-deadline-date">${d.date || "—"}</span>
            <span class="bb-deadline-desc">${d.description || ""}</span>
          </div>`).join("")
      : `<p class="bb-muted">No deadlines mentioned</p>`;

    const actionsHTML = (a.actions || []).length
      ? `<ul class="bb-action-list">${(a.actions).map(ac => `<li>${ac}</li>`).join("")}</ul>`
      : `<p class="bb-muted">No action required</p>`;

    const factsHTML = (a.keyFacts || []).map(f => `<li>${f}</li>`).join("");
    const appealHTML = a.appealInfo ? `<div class="bb-appeal">${a.appealInfo}</div>` : "";

    return `
      <div class="bb-panel-header">
        <div class="bb-panel-logo">BB</div>
        <div class="bb-panel-title">BureauBuddy</div>
        <button class="bb-panel-close" aria-label="Close">✕</button>
      </div>
      <div class="bb-panel-body">
        <div class="bb-meta-row">
          <span class="bb-sender">${a.sender || "Unknown sender"}</span>
          <span class="bb-doc-type">${a.documentType || "Document"}</span>
          <span class="bb-urgency" style="color:${urgencyColor};background:${urgencyBg}">${a.urgency || "low"} urgency</span>
        </div>

        <div class="bb-section">
          <div class="bb-section-label">Summary</div>
          <p class="bb-summary">${a.summary || "No summary available."}</p>
        </div>

        <div class="bb-section">
          <div class="bb-section-label">Action required</div>
          ${actionsHTML}
        </div>

        <div class="bb-section">
          <div class="bb-section-label">Deadlines</div>
          ${deadlinesHTML}
        </div>

        ${factsHTML ? `<div class="bb-section">
          <div class="bb-section-label">Key facts</div>
          <ul class="bb-fact-list">${factsHTML}</ul>
        </div>` : ""}

        ${appealHTML ? `<div class="bb-section">
          <div class="bb-section-label">Appeals & objections</div>
          ${appealHTML}
        </div>` : ""}

        <div class="bb-divider"></div>

        <div class="bb-chat-section">
          <div class="bb-section-label">Ask a follow-up</div>
          <div id="bb-chat-history" class="bb-chat-history"></div>
          <div class="bb-chat-input-row">
            <input id="bb-chat-input" class="bb-chat-input" placeholder="E.g. Can I appeal this?" />
            <button id="bb-chat-send" class="bb-chat-send" aria-label="Send">→</button>
          </div>
        </div>
      </div>`;
  }

  function buildErrorHTML(error) {
    const messages = {
      "NO_API_KEY": "Please add your Anthropic API key in the BureauBuddy extension settings.",
      "INVALID_API_KEY": "Your API key appears to be invalid. Check it in the extension settings.",
      "RATE_LIMIT": "Too many requests. Wait a moment and try again."
    };
    const friendly = messages[error] || error;
    return `
      <div class="bb-panel-header">
        <div class="bb-panel-logo">BB</div>
        <div class="bb-panel-title">BureauBuddy</div>
        <button class="bb-panel-close" aria-label="Close">✕</button>
      </div>
      <div class="bb-panel-body">
        <div class="bb-error-box">
          <div class="bb-error-icon">⚠</div>
          <p>${friendly}</p>
          ${error === "NO_API_KEY" ? '<a href="#" id="bb-open-settings">Open settings →</a>' : ""}
        </div>
      </div>`;
  }

  function formatError(code) {
    const map = {
      "NO_API_KEY": "No API key set. Open extension settings.",
      "INVALID_API_KEY": "Invalid API key.",
      "RATE_LIMIT": "Rate limited — try again in a moment."
    };
    return map[code] || code || "Unknown error";
  }

  // ── Utils ───────────────────────────────────────────────────────────────────
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // ── Start ───────────────────────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

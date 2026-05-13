// BureauBuddy – background service worker
// Handles: Backend API calls, device ID, usage tracking, message routing

// Switch to production URL when deploying:
// const BACKEND_API_URL = "https://api.bureaubuddy.se/api/analyze";
const BACKEND_API_URL = "https://bureaubuddy-backend.vercel.app/api/analyze";
//const BACKEND_API_URL = "http://localhost:3000/api/analyze";

// ── Initialize device ID on install/update ────────────────────────────────────
chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get('deviceId');
  if (!stored.deviceId) {
    const newId = generateUUID();
    await chrome.storage.local.set({ deviceId: newId });
  }
});

// ── Message router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ANALYZE_TEXT") {
    analyzeText(message.payload)
      .then(result => sendResponse({ ok: true, data: result }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === "GET_SETTINGS") {
    chrome.storage.local.get(["deviceId", "usageCount"], data => {
      sendResponse(data);
    });
    return true;
  }

  if (message.type === "INCREMENT_USAGE") {
    chrome.storage.local.get(["usageCount"], data => {
      const count = (data.usageCount || 0) + 1;
      chrome.storage.local.set({ usageCount: count });
      sendResponse({ count });
    });
    return true;
  }
});

// ── Call backend API ──────────────────────────────────────────────────────────
async function analyzeText({ text, sourceLanguage = "Swedish", targetLanguage = "English" }) {
  // Get device ID
  const stored = await chrome.storage.local.get(['deviceId']);
  const deviceId = stored.deviceId;

  if (!deviceId) {
    throw new Error("Device ID not initialized");
  }

  // Call backend
  const response = await fetch(BACKEND_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      deviceId,
      sourceLanguage,
      targetLanguage
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (data.error === "RATE_LIMIT_EXCEEDED") {
      throw new Error("RATE_LIMIT_EXCEEDED: " + data.message);
    }
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error(data.error || `API error ${response.status}`);
  }

  // Update usage count from backend response
  if (data.usage) {
    await chrome.storage.local.set({ usageCount: data.usage.used });
  }

  return data.data;
}

// ── Utility: Generate UUID v4 ─────────────────────────────────────────────────
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// BureauBuddy – popup script
// No API key needed! Shows device ID and usage from backend.

const FREE_LIMIT = 5;

document.addEventListener("DOMContentLoaded", async () => {
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const usageCount = document.getElementById("usage-count");
  const usageBar = document.getElementById("usage-bar");
  const deviceIdEl = document.getElementById("device-id");

  // Load device ID and settings from background
  chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, data => {
    const deviceId = data.deviceId || "unknown";
    deviceIdEl.textContent = deviceId;

    // Status: always ready since no API key needed
    statusDot.classList.add("active");
    statusText.textContent = "Ready to analyze – no setup needed";

    // Show usage
    const count = data.usageCount || 0;
    const pct = Math.min((count / FREE_LIMIT) * 100, 100);
    usageCount.textContent = `${count} / ${FREE_LIMIT} this month`;
    usageBar.style.width = `${pct}%`;

    if (count >= FREE_LIMIT) {
      usageBar.style.background = "#E24B4A";
    } else if (count >= FREE_LIMIT * 0.7) {
      usageBar.style.background = "#EF9F27";
    }
  });
});

// ── Utility functions for BureauBuddy extension ──

/**
 * Generate a UUID v4
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Get or create device ID
 */
export async function getOrCreateDeviceId() {
  const stored = await chrome.storage.local.get('deviceId');

  if (stored.deviceId) {
    return stored.deviceId;
  }

  const newId = generateUUID();
  await chrome.storage.local.set({ deviceId: newId });
  return newId;
}

/**
 * Parse analysis response and extract structured data
 */
export function parseAnalysis(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Failed to parse model response as JSON');
  }
}

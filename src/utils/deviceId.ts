/**
 * Device ID utilities for single-device login enforcement
 * Generates a unique device identifier that persists across app sessions
 */

const DEVICE_ID_KEY = 'minutevault_device_id';

/**
 * Generates a unique device ID combining multiple factors
 * For web: Uses a combination of browser fingerprint data + random UUID
 * For Capacitor (Android/iOS): Would use native device identifiers
 */
function generateDeviceId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  
  // Browser-based fingerprint components
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform || 'unknown';
  
  // Create a hash-like string from fingerprint
  const fingerprint = btoa(`${screenInfo}-${timezone}-${language}-${platform}`).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  
  return `${fingerprint}-${timestamp}-${randomPart}${randomPart2}`;
}

/**
 * Gets the device ID, creating one if it doesn't exist
 * This persists in localStorage so reinstalls on same device work
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}

/**
 * Clears the stored device ID (useful for testing)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}

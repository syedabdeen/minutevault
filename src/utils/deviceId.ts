/**
 * Device ID utilities for single-device login enforcement
 * Generates a unique device identifier that persists across app sessions
 * 
 * Key principle: One registered email = One device
 * - Same device can use the account unlimited times
 * - New device with same email is blocked until admin resets
 */

const DEVICE_ID_KEY = 'minutevault_device_id';
const DEVICE_FINGERPRINT_KEY = 'minutevault_device_fingerprint';

/**
 * Generates a stable device fingerprint based on hardware/browser characteristics
 * This fingerprint is deterministic - same device always generates same fingerprint
 */
function generateStableFingerprint(): string {
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const language = navigator.language;
  const platform = navigator.platform || 'unknown';
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  
  // Combine all stable characteristics
  const fingerprintData = `${screenInfo}-${timezone}-${language}-${platform}-${hardwareConcurrency}-${maxTouchPoints}`;
  
  // Create a deterministic hash-like string
  return btoa(fingerprintData)
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 24);
}

/**
 * Generates a unique device ID combining stable fingerprint + random suffix
 * The random suffix is stored separately to maintain consistency
 */
function generateDeviceId(): string {
  const fingerprint = generateStableFingerprint();
  
  // Check if we have a stored random suffix (for localStorage recovery)
  let randomSuffix = localStorage.getItem('minutevault_device_suffix');
  
  if (!randomSuffix) {
    // Generate new random suffix only on first creation
    randomSuffix = Math.random().toString(36).substring(2, 10) + 
                   Math.random().toString(36).substring(2, 10);
    localStorage.setItem('minutevault_device_suffix', randomSuffix);
  }
  
  return `${fingerprint}-${randomSuffix}`;
}

/**
 * Gets the stable device fingerprint
 * Used for device recovery if localStorage is cleared
 */
export function getDeviceFingerprint(): string {
  let fingerprint = localStorage.getItem(DEVICE_FINGERPRINT_KEY);
  
  if (!fingerprint) {
    fingerprint = generateStableFingerprint();
    localStorage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
  }
  
  return fingerprint;
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
    // Also store the fingerprint for recovery purposes
    getDeviceFingerprint();
  }
  
  return deviceId;
}

/**
 * Clears the stored device ID (useful for testing)
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
  localStorage.removeItem(DEVICE_FINGERPRINT_KEY);
  localStorage.removeItem('minutevault_device_suffix');
}

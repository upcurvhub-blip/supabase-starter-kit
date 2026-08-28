/**
 * Persistent client device identifier.
 * Consent behavior: an "accepted" choice is stored permanently. A "decline"
 * is NOT persisted — the prompt reappears on the next session so users can
 * change their mind. A submitted enquiry counts as an implicit accept
 * (contact info is a stronger signal than a cookie banner).
 */
const STORAGE_KEY = "bt_device_id";
const CONSENT_KEY = "bt_device_tracking_consent"; // only ever set to "accepted"
export const DEVICE_CONSENT_EVENT = "bt-device-consent-change";

function generateDeviceId(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Read-only helper — returns "" when consent not granted. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  if (!hasDeviceConsent()) return "";
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = generateDeviceId();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    return generateDeviceId();
  }
}

/**
 * Mint or return a device id, granting consent implicitly. Use ONLY when the
 * visitor has taken a clear opt-in action (submitted an enquiry, exit-intent
 * form, requirement post, etc.). Fires DEVICE_CONSENT_EVENT so trackers
 * pick it up immediately.
 */
export function ensureDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    if (!hasDeviceConsent()) {
      localStorage.setItem(CONSENT_KEY, "accepted");
      try { window.dispatchEvent(new CustomEvent(DEVICE_CONSENT_EVENT, { detail: { accepted: true } })); } catch {}
    }
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return generateDeviceId();
  }
}

export function useDeviceId(): string {
  return getDeviceId();
}

export function hasDeviceConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === "accepted";
  } catch {
    return false;
  }
}

/**
 * True whenever the prompt should be shown. We only remember accepts;
 * declines are per-tab only (sessionStorage), so the prompt returns on the
 * next visit.
 */
export function shouldShowConsentPrompt(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(CONSENT_KEY) === "accepted") return false;
    if (sessionStorage.getItem("bt_device_consent_dismissed") === "1") return false;
    return true;
  } catch {
    return true;
  }
}

/** Back-compat alias — old callers used this name. */
export function hasAnsweredDeviceConsent(): boolean {
  return !shouldShowConsentPrompt();
}

export function setDeviceConsent(accepted: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (accepted) {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } else {
      // do NOT persist a decline; only hide the prompt for this tab
      try { sessionStorage.setItem("bt_device_consent_dismissed", "1"); } catch {}
      localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent(DEVICE_CONSENT_EVENT, { detail: { accepted } }));
  } catch {}
}

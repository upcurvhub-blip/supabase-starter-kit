/**
 * Sitewide "one popup at a time" gate.
 *
 * Rules enforced here:
 * - Only one auto-triggered popup may be open anywhere at any time.
 * - Maximum one proactive popup per page visit (reset on route change).
 * - Exit-intent is the preferred trigger; an idle nudge may only fire if
 *   exit-intent has not already fired in this session.
 *
 * Sticky/persistent CTA buttons are NOT popups and should not use this gate.
 */

const EXIT_FIRED_KEY = "bt_exit_intent_fired_v1";

let openId: string | null = null;
let usedThisView = false;

function readSession(key: string) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Call on every route change — allows one new proactive popup for the new view. */
export function notePageView() {
  if (!openId) usedThisView = false;
}

export function isPopupOpen() {
  return openId !== null;
}

export function exitIntentFired() {
  return readSession(EXIT_FIRED_KEY) === "1";
}

export function markExitIntentFired() {
  writeSession(EXIT_FIRED_KEY, "1");
}

/** Try to claim the single popup slot. Returns false if another popup owns it. */
export function requestPopup(id: string) {
  if (openId !== null) return false;
  if (usedThisView) return false;
  openId = id;
  usedThisView = true;
  return true;
}

export function releasePopup(id: string) {
  if (openId === id) openId = null;
}

/** Subscribe to desktop exit-intent (mouse leaving through the top of the viewport). */
export function onExitIntent(cb: () => void, armDelayMs = 4000) {
  let armed = false;
  const armTimer = window.setTimeout(() => {
    armed = true;
  }, armDelayMs);

  const onMouseOut = (e: MouseEvent) => {
    if (!armed) return;
    if (e.clientY <= 0 && !e.relatedTarget) cb();
  };

  document.addEventListener("mouseout", onMouseOut);
  return () => {
    window.clearTimeout(armTimer);
    document.removeEventListener("mouseout", onMouseOut);
  };
}

/** Subscribe to user inactivity (no scroll / pointer / key events) for `ms`. */
export function onIdle(cb: () => void, ms = 20000) {
  let timer: number | undefined;
  const arm = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(cb, ms);
  };
  arm();
  const reset = () => arm();
  window.addEventListener("scroll", reset, { passive: true });
  window.addEventListener("pointerdown", reset);
  window.addEventListener("keydown", reset);
  return () => {
    if (timer) window.clearTimeout(timer);
    window.removeEventListener("scroll", reset);
    window.removeEventListener("pointerdown", reset);
    window.removeEventListener("keydown", reset);
  };
}

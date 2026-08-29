import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "bt_chunk_reload_at";

/**
 * Route-level lazy() that survives stale deployments.
 *
 * After a new build is published, the old index bundle still points at hashed
 * chunk files that no longer exist, so the dynamic import throws
 * "Failed to fetch dynamically imported module" and the route renders blank.
 * We retry once (cache-busted); if that still fails, we force a single
 * full reload so the browser picks up the fresh manifest.
 */
export function lazyRoute<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      // second chance — the network may have simply blipped
      try {
        return await factory();
      } catch {
        let last = 0;
        try {
          last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        } catch {
          /* storage unavailable */
        }
        // only reload once per minute to avoid a refresh loop
        if (Date.now() - last > 60_000) {
          try {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          } catch {
            /* storage unavailable */
          }
          window.location.reload();
          // keep Suspense pending while the page reloads
          return await new Promise<{ default: T }>(() => {});
        }
        throw error;
      }
    }
  });
}

export default lazyRoute;

import type { QueryClient } from "@tanstack/react-query";
import { APP_VERSION } from "@/lib/version";

const KEY = "upcurv-query-cache-v3";
const VERSION_KEY = "upcurv-query-cache-version";
const LEGACY_KEYS = ["upcurv-query-cache-v1", "upcurv-query-cache-v2"];
const MAX_AGE = 60 * 60 * 1000; // 1 hour
const MAX_ENTRIES = 120;

type Entry = { key: unknown[]; data: unknown; ts: number };

const PUBLIC_QUERY_PREFIXES = new Set([
  "categories", "category", "products", "product", "related-products", "seller-more-products",
  "services", "service", "service-seller", "more-services", "related-services", "seller-public",
  "seller", "seller-products", "reviews", "cities", "city-hub", "directory", "brands", "brand",
  "search-products", "search-categories", "search-services", "local-page", "requirements-public",
  "business-needs", "subscription-plans",
]);

/**
 * Detail pages must always reflect the latest seller edits. Their cached copy
 * is shown instantly but marked stale on boot so React Query revalidates it
 * in the background on every visit.
 */
const ALWAYS_REVALIDATE = new Set([
  "product", "service", "service-seller", "seller-public", "related-products",
  "seller-more-products", "more-services", "related-services", "reviews",
]);

function isPublicQuery(key: readonly unknown[]) {
  return typeof key[0] === "string" && PUBLIC_QUERY_PREFIXES.has(key[0]);
}

function readEntries(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(entries: Entry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}

/**
 * Remove persisted entries for the given query prefixes so a hard reload can
 * never resurrect pre-edit content (used after seller product/service saves).
 */
export function dropPersistedQueries(prefixes: string[]) {
  if (typeof window === "undefined") return;
  const set = new Set(prefixes);
  writeEntries(readEntries().filter((e) => !set.has(String(e.key?.[0]))));
}

/** Nuke the whole persisted public cache (version bumps, admin content pushes). */
export function clearPersistedQueries() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/**
 * Minimal query-cache persistence for public pages.
 * Restores cached data on boot and writes back (debounced) on cache changes,
 * so returning visitors see content instantly instead of a loading state.
 */
export function hydrateQueryCache(client: QueryClient) {
  if (typeof window === "undefined") return;
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));

  // Version gate: a new app build never reads an older build's cache shape.
  try {
    if (localStorage.getItem(VERSION_KEY) !== APP_VERSION) {
      clearPersistedQueries();
      localStorage.setItem(VERSION_KEY, APP_VERSION);
    }
  } catch { /* ignore */ }

  const now = Date.now();
  for (const e of readEntries()) {
    if (now - e.ts > MAX_AGE) continue;
    const alwaysRevalidate = ALWAYS_REVALIDATE.has(String(e.key?.[0]));
    client.setQueryData(e.key as any, e.data, { updatedAt: alwaysRevalidate ? 0 : e.ts });
  }

  let timer: number | undefined;
  const persist = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const entries: Entry[] = client
        .getQueryCache()
        .getAll()
        .filter((q) => isPublicQuery(q.queryKey) && q.state.status === "success" && q.state.data !== undefined)
        .slice(-MAX_ENTRIES)
        .map((q) => ({
          key: q.queryKey as unknown[],
          data: q.state.data,
          ts: q.state.dataUpdatedAt,
        }));
      writeEntries(entries);
    }, 1500);
  };

  client.getQueryCache().subscribe(persist);
}

/**
 * Cloudflare Worker — Bot UA routing for SEO prerender
 *
 * Deploy this to Cloudflare in front of upcurvtrade.upcurv.in.
 * Routes search-engine bots to the crawler-render edge function
 * (fully server-rendered HTML) while humans get the SPA.
 *
 * Setup:
 *   1. Cloudflare Dashboard -> Workers & Pages -> Create -> paste this file.
 *   2. Add Route: upcurvtrade.upcurv.in/*
 *   3. No secrets needed (crawler-render is public).
 */

const RENDER_ENDPOINT =
  "https://wjtxyoaqtxsfbtrzsimb.supabase.co/functions/v1/crawler-render";

const BOT_UA = /googlebot|bingbot|yandex|duckduckbot|baiduspider|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|applebot|petalbot|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|screaming frog|chrome-lighthouse|google-inspectiontool|google-site-verification/i;

// Paths that should be prerendered when hit by a bot.
const PRERENDER_PREFIXES = [
  "/product/", "/products/", "/service/",
  "/category/", "/categories/",
  "/seller-profile/", "/suppliers/", "/supplier/",
  "/local/",
  "/manufacturers/", "/exporters/", "/wholesalers/",
  "/city/", "/brand/", "/guides/", "/price/", "/near-me/",
];

// Exact static routes that also need unique server-rendered meta tags.
const PRERENDER_EXACT = new Set([
  "/about", "/contact", "/pricing", "/refund-policy", "/privacy-policy", "/terms-of-service",
  "/post-requirement", "/requirements", "/categories", "/search", "/cities", "/find-businesses",
  "/business-needs", "/trade-shows", "/trade-leads", "/distributors", "/guides",
]);


// Paths that must never be routed to prerender (static assets, api, auth,
// and the authenticated seller/admin dashboards).
const SKIP_PREFIXES = [
  "/assets/", "/static/", "/functions/", "/api/",
  "/auth", "/admin", "/seller/", "/buyer",
  "/sitemap", "/robots.txt", "/rss", "/favicon",
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";
    const path = url.pathname;

    // Home page for bots -> prerender too
    const isHome = path === "/" || path === "";
    const segments = path.split("/").filter(Boolean);
    // Bare root-level slugs (e.g. /jai-furnitures-f14c63db) also need real meta.
    const isRootSlug = segments.length === 1 && /^[a-z0-9-]{3,}$/i.test(segments[0]) && !segments[0].includes(".");
    const isPrerenderable =
      isHome ||
      isRootSlug ||
      PRERENDER_EXACT.has(path.replace(/\/$/, "")) ||
      PRERENDER_PREFIXES.some((p) => path.startsWith(p));
    const SKIP_EXACT = new Set(["/seller", "/admin", "/buyer", "/auth"]);
    const isSkipped =
      SKIP_EXACT.has(path.replace(/\/$/, "")) ||
      SKIP_PREFIXES.some((p) => path.startsWith(p));

    if (BOT_UA.test(ua) && isPrerenderable && !isSkipped) {
      const target = new URL(RENDER_ENDPOINT);
      target.searchParams.set("path", path + url.search);
      target.searchParams.set("host", url.host);

      const resp = await fetch(target.toString(), {
        headers: {
          "user-agent": ua,
          "x-forwarded-host": url.host,
          "x-original-url": url.toString(),
        },
        cf: { cacheTtl: 300, cacheEverything: true },
      });

      // Pass through with SEO-friendly headers
      const headers = new Headers(resp.headers);
      headers.set("x-prerendered", "1");
      headers.set("cache-control", "public, max-age=300, s-maxage=600");
      return new Response(resp.body, {
        status: resp.status,
        headers,
      });
    }

    // Humans + non-prerenderable paths -> origin SPA
    return fetch(request);
  },
};

// RSS 2.0 feed for newly added products. Cached for 15 min.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://upcurvtrade.upcurv.in";
const HEADERS = {
  "Content-Type": "application/rss+xml; charset=utf-8",
  "Cache-Control": "public, max-age=900",
  "Access-Control-Allow-Origin": "*",
};

function esc(s: string) {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: prods } = await sb
    .from("products")
    .select("id, name, slug, short_description, description, primary_image_url, price, currency, created_at, updated_at, seller_id, category_id")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  const items = (prods || []).map((p: any) => {
    const link = `${BASE}/product/${p.slug || p.id}`;
    const pubDate = new Date(p.created_at || Date.now()).toUTCString();
    const priceStr = p.price ? ` — ${p.currency || "₹"}${p.price}` : "";
    const desc = p.short_description || p.description || `New product listed on Upcurv Trade${priceStr}`;
    return `    <item>
      <title>${esc(p.name)}${esc(priceStr)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${esc(desc.slice(0, 500))}</description>
      ${p.primary_image_url ? `<enclosure url="${esc(p.primary_image_url)}" type="image/jpeg" />` : ""}
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Upcurv Trade — Newly Added Products</title>
    <link>${BASE}</link>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Latest verified supplier products listed on Upcurv Trade — India's B2B marketplace.</description>
    <language>en-in</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, { headers: HEADERS });
});

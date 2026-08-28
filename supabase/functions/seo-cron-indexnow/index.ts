// Runs periodically (e.g. every 15 minutes) via pg_cron.
// Finds products/pages/sellers/categories updated recently and batches their URLs
// through notify-indexnow so Bing/Yandex/Naver/Google get a fresh crawl signal.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE = "https://upcurvtrade.upcurv.in";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function slugify(s: string) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const url = new URL(req.url);
  const minutes = Number(url.searchParams.get("minutes") || 20);
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const urls = new Set<string>();

  try {
    const { data: products } = await sb.from("products").select("slug,id,updated_at,category_id,seller_profiles:seller_id(city,slug,id),categories:category_id(slug)").eq("is_active", true).gte("updated_at", since).limit(500);
    for (const p of products || []) {
      const s = (p as any).slug || (p as any).id;
      urls.add(`${BASE}/product/${s}`);
      const cat = (p as any).categories?.slug;
      const city = (p as any).seller_profiles?.city;
      if (cat) {
        urls.add(`${BASE}/category/${cat}`);
        urls.add(`${BASE}/manufacturers/${cat}`);
        urls.add(`${BASE}/suppliers/${cat}`);
        if (city) {
          const cs = slugify(city);
          urls.add(`${BASE}/manufacturers/${cat}/${cs}`);
          urls.add(`${BASE}/suppliers/${cat}/${cs}`);
          urls.add(`${BASE}/city/${cs}/${cat}`);
          urls.add(`${BASE}/city/${cs}`);
        }
      }
      const seller = (p as any).seller_profiles;
      if (seller) urls.add(`${BASE}/seller-profile/${seller.slug || seller.id}`);
    }

    const { data: sellers } = await sb.from("seller_profiles").select("slug,id,updated_at").eq("status", "approved").gte("updated_at", since).limit(500);
    for (const s of sellers || []) urls.add(`${BASE}/seller-profile/${(s as any).slug || (s as any).id}`);

    const { data: cats } = await sb.from("categories").select("slug,updated_at").gte("updated_at", since).limit(500);
    for (const c of cats || []) urls.add(`${BASE}/category/${(c as any).slug}`);

    const { data: pages } = await sb.from("local_landing_pages").select("slug,updated_at").eq("is_published", true).gte("updated_at", since).limit(500);
    for (const p of pages || []) urls.add(`${BASE}/local/${(p as any).slug}`);

    const list = Array.from(urls);
    if (!list.length) {
      return new Response(JSON.stringify({ submitted: 0, since }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }
    // Batch to notify-indexnow (Bing/Yandex) in chunks of 100
    let submitted = 0;
    for (let i = 0; i < list.length; i += 100) {
      const batch = list.slice(i, i + 100);
      const r = await fetch(`${SUPABASE_URL}/functions/v1/notify-indexnow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ urls: batch }),
      });
      if (r.ok) submitted += batch.length;
      await r.text().catch(() => "");
    }

    // Also fan out to Google Indexing API (only if service account is configured)
    let google_submitted = 0;
    if (Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON")) {
      // Google: cap at 200/run to respect quota (default 200/day)
      const gbatch = list.slice(0, 200);
      const gr = await fetch(`${SUPABASE_URL}/functions/v1/google-indexing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
        body: JSON.stringify({ urls: gbatch, type: "URL_UPDATED" }),
      });
      if (gr.ok) {
        const j = await gr.json().catch(() => ({}));
        google_submitted = j.ok_count || 0;
      } else {
        await gr.text().catch(() => "");
      }
    }

    return new Response(JSON.stringify({ submitted, google_submitted, total: list.length, since }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});

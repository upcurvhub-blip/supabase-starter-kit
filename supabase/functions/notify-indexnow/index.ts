// Notify Bing/Yandex/Naver via IndexNow AND ping Google of sitemap updates.
// Accepts { urls?: string[], product_id?, seller_id?, category_id?, page_id?, all_local? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://upcurvtrade.upcurv.in";
const HOST = "upcurvtrade.upcurv.in";
const SITEMAP = `${BASE}/sitemap.xml`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: keyRow } = await sb.from("platform_settings").select("value").eq("key", "indexnow_key").maybeSingle();
    const key: string = (keyRow?.value as string) || "bt7f2a9c14b6d3f5e08c2b1d940e6f8a3";

    const body = await req.json().catch(() => ({}));
    let urls: string[] = [];
    if (Array.isArray(body.urls)) urls = [...body.urls];

    if (body.product_id) {
      const { data } = await sb.from("products").select("slug, id, seller_id, category_id").eq("id", body.product_id).maybeSingle();
      if (data) {
        urls.push(`${BASE}/product/${data.slug || data.id}`);
        if (data.seller_id) {
          const { data: s } = await sb.from("seller_profiles").select("slug, id").eq("id", data.seller_id).maybeSingle();
          if (s) urls.push(`${BASE}/seller-profile/${s.slug || s.id}`);
        }
        if (data.category_id) {
          const { data: c } = await sb.from("categories").select("slug").eq("id", data.category_id).maybeSingle();
          if (c?.slug) urls.push(`${BASE}/category/${c.slug}`);
        }
      }
    }
    if (body.seller_id) {
      const { data: s } = await sb.from("seller_profiles").select("slug, id").eq("id", body.seller_id).maybeSingle();
      if (s) urls.push(`${BASE}/seller-profile/${s.slug || s.id}`);
    }
    if (body.category_id) {
      const { data: c } = await sb.from("categories").select("slug").eq("id", body.category_id).maybeSingle();
      if (c?.slug) urls.push(`${BASE}/category/${c.slug}`);
    }
    if (body.page_id) {
      const { data } = await sb.from("local_landing_pages").select("slug").eq("id", body.page_id).maybeSingle();
      if (data?.slug) urls.push(`${BASE}/local/${data.slug}`);
    }
    if (body.all_local) {
      const { data } = await sb.from("local_landing_pages").select("slug").eq("is_published", true).limit(10000);
      urls.push(...(data || []).map((p: any) => `${BASE}/local/${p.slug}`));
    }

    urls = Array.from(new Set(urls.filter((u) => typeof u === "string" && u.startsWith(BASE))));
    if (!urls.length) {
      return new Response(JSON.stringify({ error: "no urls" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Record<string, any> = {};

    try {
      const r = await fetch("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host: HOST, key, keyLocation: `${BASE}/${key}.txt`, urlList: urls }),
      });
      results.indexnow = { status: r.status, ok: r.ok, body: r.status === 200 ? "ok" : await r.text() };
    } catch (e) { results.indexnow = { error: String(e) }; }

    try {
      const r = await fetch(`https://www.bing.com/indexnow?url=${encodeURIComponent(urls[0])}&key=${key}`);
      results.bing = { status: r.status };
    } catch (e) { results.bing = { error: String(e) }; }

    try {
      const r = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP)}`);
      results.google_sitemap_ping = { status: r.status };
    } catch (e) { results.google_sitemap_ping = { error: String(e) }; }

    return new Response(JSON.stringify({ submitted: urls.length, urls, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

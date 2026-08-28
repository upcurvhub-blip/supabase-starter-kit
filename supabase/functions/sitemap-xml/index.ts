// Dynamic sitemap index + child sitemaps for SEO.
// GET /                 -> sitemap index
// GET /?s=static        -> static routes
// GET /?s=products      -> products (paginated by ?p=)
// GET /?s=sellers       -> approved sellers
// GET /?s=categories    -> categories
// GET /?s=local         -> published local landing pages
// GET /?s=citycategory  -> auto city x category permutations
// GET /?s=brands        -> brand hubs (/brand/:slug)
// GET /?s=cities        -> city hubs (/city/:slug)
// GET /?s=roles         -> /manufacturers|/exporters|/suppliers/:cat and /:cat/:city
// GET /?s=guides        -> /guides/:category-slug buying guides
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const BASE = "https://upcurvtrade.upcurv.in";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const HEADERS = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=3600",
  "Access-Control-Allow-Origin": "*",
};

function urlset(entries: { loc: string; lastmod?: string; changefreq?: string; priority?: string }[]) {
  const urls = entries
    .map((e) =>
      `  <url><loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ""}${e.changefreq ? `<changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `<priority>${e.priority}</priority>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
}

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(s: string) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const section = url.searchParams.get("s");
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    if (!section) {
      const shards = ["static","categories","sellers","products","local","citycategory","brands","cities","roles","guides"];
      const idx = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${shards.map(s => `  <sitemap><loc>${BASE}/functions/v1/sitemap-xml?s=${s}</loc></sitemap>`).join("\n")}
</sitemapindex>`;
      return new Response(idx, { headers: HEADERS });
    }

    if (section === "static") {
      const paths = ["/", "/categories", "/search", "/post-requirement", "/requirements", "/find-businesses", "/about", "/contact", "/privacy-policy", "/terms-of-service", "/refund-policy"];
      return new Response(urlset(paths.map((p) => ({ loc: BASE + p, changefreq: "weekly", priority: p === "/" ? "1.0" : "0.6" }))), { headers: HEADERS });
    }

    if (section === "categories") {
      const { data } = await sb.from("categories").select("slug, updated_at").order("name");
      return new Response(urlset((data || []).map((c: any) => ({ loc: `${BASE}/category/${c.slug}`, lastmod: c.updated_at?.slice(0, 10), changefreq: "daily", priority: "0.8" }))), { headers: HEADERS });
    }

    if (section === "sellers") {
      const { data } = await sb.from("seller_profiles").select("slug, id, updated_at").eq("status", "approved").limit(10000);
      return new Response(urlset((data || []).map((s: any) => ({ loc: `${BASE}/seller-profile/${s.slug || s.id}`, lastmod: s.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.7" }))), { headers: HEADERS });
    }

    if (section === "products") {
      const page = Number(url.searchParams.get("p") || 0);
      const from = page * 5000;
      const to = from + 4999;
      const { data } = await sb.from("products").select("slug, id, updated_at").eq("is_active", true).range(from, to);
      // Merge in seo_metadata.generated_at as lastmod when newer
      const ids = (data || []).map((p: any) => p.id);
      let metaMap = new Map<string, string>();
      if (ids.length) {
        const { data: metas } = await sb.from("seo_metadata").select("entity_id, generated_at").eq("entity_type", "product").in("entity_id", ids);
        for (const m of metas || []) metaMap.set((m as any).entity_id, (m as any).generated_at);
      }
      return new Response(urlset((data || []).map((p: any) => {
        const meta = metaMap.get(p.id);
        const lm = meta && meta > (p.updated_at || "") ? meta : p.updated_at;
        return { loc: `${BASE}/product/${p.slug || p.id}`, lastmod: lm?.slice(0, 10), changefreq: "weekly", priority: "0.7" };
      })), { headers: HEADERS });
    }

    if (section === "local") {
      const { data } = await sb.from("local_landing_pages").select("slug, updated_at").eq("is_published", true).limit(10000);
      return new Response(urlset((data || []).map((p: any) => ({ loc: `${BASE}/local/${p.slug}`, lastmod: p.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.8" }))), { headers: HEADERS });
    }

    if (section === "citycategory" || section === "roles") {
      const { data: prods } = await sb.from("products").select("categories:category_id(slug), seller_profiles:seller_id(city)").eq("is_active", true).limit(5000);
      const pair = new Set<string>();
      const cats = new Set<string>();
      for (const p of prods || []) {
        const catSlug = (p as any).categories?.slug;
        const city = (p as any).seller_profiles?.city;
        if (catSlug) cats.add(catSlug);
        if (catSlug && city) pair.add(`${catSlug}||${slugify(city)}`);
      }
      const roles = ["manufacturers", "suppliers", "exporters", "wholesalers"];
      const entries: any[] = [];
      for (const role of roles) {
        for (const c of cats) entries.push({ loc: `${BASE}/${role}/${c}`, changefreq: "weekly", priority: "0.7" });
        for (const k of pair) {
          const [cat, city] = k.split("||");
          entries.push({ loc: `${BASE}/${role}/${cat}/${city}`, changefreq: "weekly", priority: "0.8" });
        }
      }
      for (const k of pair) {
        const [cat, city] = k.split("||");
        entries.push({ loc: `${BASE}/city/${city}/${cat}`, changefreq: "weekly", priority: "0.7" });
        entries.push({ loc: `${BASE}/price/${cat}/${city}`, changefreq: "weekly", priority: "0.6" });
      }
      for (const c of cats) entries.push({ loc: `${BASE}/price/${c}`, changefreq: "weekly", priority: "0.5" });
      return new Response(urlset(entries), { headers: HEADERS });
    }

    if (section === "brands") {
      const entries: any[] = [];
      const { data: brands } = await sb.from("brands").select("slug, updated_at").limit(10000);
      for (const b of brands || []) {
        if (!b.slug) continue;
        entries.push({ loc: `${BASE}/brand/${b.slug}`, lastmod: b.updated_at?.slice(0, 10), changefreq: "weekly", priority: "0.6" });
      }
      // brand x category permutations from product_brands join
      const { data: pb } = await sb.from("product_brands").select("brands:brand_id(slug), products:product_id(categories:category_id(slug))").limit(5000);
      const seen = new Set<string>();
      for (const row of pb || []) {
        const bs = (row as any).brands?.slug;
        const cs = (row as any).products?.categories?.slug;
        if (bs && cs) {
          const key = `${bs}/${cs}`;
          if (!seen.has(key)) { seen.add(key); entries.push({ loc: `${BASE}/brand/${bs}/${cs}`, changefreq: "weekly", priority: "0.6" }); }
        }
      }
      return new Response(urlset(entries), { headers: HEADERS });
    }

    if (section === "cities") {
      const { data } = await sb.from("seller_profiles").select("city").eq("status", "approved").not("city", "is", null).limit(20000);
      const set = new Set<string>();
      for (const s of data || []) if ((s as any).city) set.add(slugify((s as any).city));
      const entries = Array.from(set).filter(Boolean).map((c) => ({ loc: `${BASE}/city/${c}`, changefreq: "weekly", priority: "0.7" }));
      return new Response(urlset(entries), { headers: HEADERS });
    }

    if (section === "guides") {
      const entries: any[] = [];
      const { data: guides } = await sb.from("buying_guides").select("slug, updated_at").limit(10000);
      for (const g of guides || []) {
        if (g.slug) entries.push({ loc: `${BASE}/guides/${g.slug}`, lastmod: g.updated_at?.slice(0, 10), changefreq: "monthly", priority: "0.6" });
      }
      // fallback: category-based guides
      const { data: cats } = await sb.from("categories").select("slug").limit(10000);
      const seen = new Set(entries.map(e => e.loc));
      for (const c of cats || []) {
        const loc = `${BASE}/guides/${c.slug}`;
        if (!seen.has(loc)) entries.push({ loc, changefreq: "monthly", priority: "0.5" });
      }
      return new Response(urlset(entries), { headers: HEADERS });
    }

    return new Response("Not found", { status: 404 });
  } catch (e) {
    return new Response(`<!-- error: ${String(e)} -->`, { status: 500, headers: HEADERS });
  }
});

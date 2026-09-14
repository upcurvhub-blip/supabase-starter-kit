// AI business discovery for admins.
// POST { action: "discover", category, city, state, count }
//   -> researches real businesses in that category + city and returns candidates (no DB writes)
// POST { action: "create", businesses: [...], primary_category_id }
//   -> creates unclaimed seller profiles (pending review) + SEO metadata rows
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BASE = "https://upcurvtrade.upcurv.in";
const MODEL = "google/gemini-3.8-flash";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_HEADERS = { ...CORS, "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function callAI(system: string, prompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(text || `AI ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

function parseJson(raw: string): any {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI returned invalid JSON");
  }
}

function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Deterministic initials logo as an inline SVG data URL. */
function initialsLogo(name: string) {
  const initials = (name || "B")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="hsl(${hash},68%,46%)"/><stop offset="100%" stop-color="hsl(${(hash + 38) % 360},70%,34%)"/></linearGradient></defs><rect width="256" height="256" rx="48" fill="url(#g)"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="112" font-weight="700" fill="#ffffff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DISCOVER_SYSTEM =
  "You are a B2B market researcher who compiles verified business directory listings in India from Google Maps / Google Business Profile style public data and company websites. You never invent a business that does not exist. Leave a field null when you are not confident. Output valid JSON only.";

const FIELDS = `business_name, company_name, business_type (one of Manufacturer, Wholesaler, Distributor, Supplier, Retailer, Service Provider, Exporter), tagline (max 70 chars), description (140-180 chars, plain text), about (2 short paragraphs, 90-150 words total, plain text), address (street/area + city), area (locality name), city, state, pincode, phone (Indian format or null), whatsapp (or null), email (or null), website (https URL or null), established_year (number or null), employee_count (one of "1-10","11-50","51-100","101-250","251-500","501-1000","1000+" or null), annual_turnover (or null), niches (array of 4-8 product/service specialisations), keywords (array of 8-12 search keywords a buyer would type, include city and category words), confidence ("high","medium","low")`;

async function discover(category: string, city: string, state: string, count: number) {
  const raw = await callAI(
    DISCOVER_SYSTEM,
    `List ${count} real, currently operating businesses in the "${category}" space located in ${city}, ${state}, India — the kind of listings that appear on Google Maps / Google Business Profile for that search.

Return STRICT JSON: { "businesses": [ { ${FIELDS} } ] }

Rules:
- Only real, named businesses. No placeholders, no "XYZ Enterprises" style filler.
- Prefer established local businesses with a web/Google presence.
- If a detail is unknown, use null instead of guessing. Do not fabricate phone numbers or websites.
- description and about must be factual, useful for a B2B buyer, and mention the city.
Return ONLY the JSON.`,
  );
  const parsed = parseJson(raw);
  const list: any[] = Array.isArray(parsed.businesses) ? parsed.businesses : [];
  return list.filter((b) => b && typeof b.business_name === "string" && b.business_name.trim());
}

/** Deeper pass for listings that came back thin. */
async function enrich(b: any, category: string) {
  const missing = ["phone", "website", "email", "address", "pincode", "established_year", "employee_count", "about"].filter(
    (k) => !b[k],
  );
  if (!missing.length) return b;
  try {
    const raw = await callAI(
      DISCOVER_SYSTEM,
      `Do deeper research on this specific business and fill in only the missing details you can establish from its website, Google Business Profile, directories or filings.

Business: ${b.business_name}${b.company_name ? ` (${b.company_name})` : ""}
Location: ${[b.area, b.city, b.state].filter(Boolean).join(", ")}
Sector: ${category}
Missing fields: ${missing.join(", ")}

Return STRICT JSON with ONLY those keys you are confident about, from: ${missing.join(", ")}, plus optional "niches" and "keywords" arrays. Use null for anything still unknown. Never invent contact details. Return ONLY the JSON.`,
    );
    const extra = parseJson(raw);
    for (const k of Object.keys(extra || {})) {
      if (extra[k] !== null && extra[k] !== "" && !b[k]) b[k] = extra[k];
    }
  } catch {
    /* enrichment is best-effort */
  }
  return b;
}

function seoFor(b: any) {
  const city = b.city || "";
  const cat = b.business_category || b.category || "";
  const name = b.business_name;
  const title = `${name} — ${cat}${city ? ` in ${city}` : ""} | Contact, Products & Prices`;
  const description =
    (b.description ||
      `${name} is a ${b.business_type || "supplier"} of ${cat}${city ? ` in ${city}` : ""}.`).slice(0, 300);
  const keywords: string[] = Array.isArray(b.keywords) ? b.keywords.slice(0, 14) : [];
  const base = [name, cat && city ? `${cat} in ${city}` : cat, city ? `${cat} suppliers ${city}` : "", city ? `${name} ${city} contact number` : ""].filter(Boolean);
  return { title, description, keywords: Array.from(new Set([...base, ...keywords])).filter(Boolean) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Admin only.
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Not signed in" }, 401);
    const { data: userData } = await sb.auth.getUser(token);
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Not signed in" }, 401);
    const { data: roleRow } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "discover";

    if (action === "discover") {
      const category = String(body.category || "").trim();
      const city = String(body.city || "").trim();
      const state = String(body.state || "").trim();
      const count = Math.min(Math.max(Number(body.count) || 8, 1), 15);
      if (!category || !city) return json({ error: "category and city are required" }, 400);

      let businesses = await discover(category, city, state, count);
      businesses = await Promise.all(
        businesses.map(async (b) => {
          const filled = await enrich(b, category);
          return {
            ...filled,
            city: filled.city || city,
            state: filled.state || state,
            business_category: category,
            logo_url: initialsLogo(filled.business_name),
          };
        }),
      );

      // Flag ones we already have so the admin doesn't create duplicates.
      const names = businesses.map((b) => b.business_name);
      const { data: existing } = await sb
        .from("seller_profiles")
        .select("business_name, slug, city")
        .in("business_name", names);
      const taken = new Set((existing || []).map((e: any) => `${(e.business_name || "").toLowerCase()}|${(e.city || "").toLowerCase()}`));
      for (const b of businesses) {
        b.already_exists = taken.has(`${b.business_name.toLowerCase()}|${(b.city || "").toLowerCase()}`);
      }

      return json({ businesses });
    }

    if (action === "create") {
      const list: any[] = Array.isArray(body.businesses) ? body.businesses : [];
      if (!list.length) return json({ error: "no businesses supplied" }, 400);
      const primaryCategoryId = body.primary_category_id || null;
      const created: any[] = [];
      const failed: any[] = [];

      for (const b of list) {
        try {
          const name = String(b.business_name || "").trim();
          if (!name) continue;
          let slug = slugify(`${name}-${b.city || ""}`);
          const { data: clash } = await sb.from("seller_profiles").select("id").eq("slug", slug).maybeSingle();
          if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

          const niches = Array.isArray(b.niches) ? b.niches.filter(Boolean).slice(0, 10) : [];
          const row = {
            business_name: name,
            company_name: b.company_name || name,
            slug,
            tagline: b.tagline || null,
            about: b.about || null,
            description: b.description || null,
            business_type: b.business_type || "Supplier",
            business_category: b.business_category || null,
            primary_category_id: primaryCategoryId,
            phone: b.phone || null,
            whatsapp: b.whatsapp || b.phone || null,
            email: b.email || null,
            website: b.website || null,
            address: b.address || null,
            city: b.city || null,
            state: b.state || null,
            pincode: b.pincode || null,
            country: "India",
            established_year: Number(b.established_year) || null,
            employee_count: b.employee_count || null,
            annual_turnover: b.annual_turnover || null,
            logo_url: b.logo_url || initialsLogo(name),
            niches,
            // Review-first: stays out of public listings + sitemap until approved.
            status: "pending",
            verification_status: "unverified",
            is_approved: false,
            claim_status: "unclaimed",
            created_by_admin: true,
            user_id: null,
          };

          const { data: inserted, error } = await sb.from("seller_profiles").insert(row).select("id, slug, business_name, city").single();
          if (error) throw error;

          const seo = seoFor({ ...b, business_name: name });
          const canonical = `${BASE}/seller-profile/${inserted.slug || inserted.id}`;
          await sb.from("seo_metadata").upsert(
            {
              entity_type: "seller",
              entity_id: inserted.id,
              h1: `${name}${b.city ? ` — ${b.city}` : ""}`,
              title: seo.title,
              description: seo.description,
              keywords: seo.keywords,
              canonical,
              og_image: null,
              json_ld: {
                "@context": "https://schema.org",
                "@type": "LocalBusiness",
                name,
                description: seo.description,
                url: canonical,
                telephone: b.phone || undefined,
                address: {
                  "@type": "PostalAddress",
                  streetAddress: b.address || undefined,
                  addressLocality: b.city || undefined,
                  addressRegion: b.state || undefined,
                  postalCode: b.pincode || undefined,
                  addressCountry: "IN",
                },
              },
              generated_at: new Date().toISOString(),
            },
            { onConflict: "entity_type,entity_id" },
          );

          created.push(inserted);
        } catch (e) {
          failed.push({ business_name: b?.business_name, error: String(e) });
        }
      }

      return json({ created, failed });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e: any) {
    const status = e?.status && Number(e.status) >= 400 ? Number(e.status) : 500;
    return json({ error: String(e?.message || e) }, status);
  }
});

// Auto-SEO pipeline for products.
// POST { product_id } -> generates unique description, FAQs, keywords, meta title/desc,
// writes seo_metadata + product_faqs, computes internal_links to seller/category/brand/city,
// and pings IndexNow for the product + all impacted directory URLs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BASE = "https://upcurvtrade.upcurv.in";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 96);
}

async function callAI(prompt: string, system: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

async function pingIndexNow(sb: any, urls: string[]) {
  try {
    await sb.functions.invoke("notify-indexnow", { body: { urls } });
  } catch {
    /* noop */
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { product_id } = await req.json();
    if (!product_id) return new Response(JSON.stringify({ error: "product_id required" }), { status: 400, headers: CORS });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Fetch product with joins
    const { data: product, error } = await sb
      .from("products")
      .select("*, categories:category_id(id,name,slug), seller_profiles:seller_id(id,business_name,company_name,city,slug)")
      .eq("id", product_id)
      .maybeSingle();
    if (error || !product) throw new Error(error?.message || "product not found");

    const category = product.categories;
    const seller = product.seller_profiles;
    const city = seller?.city || "";
    const citySlug = slugify(city);
    const brand = product.brand || "";
    const brandSlug = brand ? slugify(brand) : "";
    const productSlug = product.slug || product.id;

    // 2. Generate unique content
    const context = `
Product: ${product.name}
Category: ${category?.name || "—"}
Brand: ${brand || "—"}
Supplier: ${seller?.business_name || seller?.company_name || "—"}
City: ${city || "—"}
Short description: ${product.short_description || product.description || "—"}
Specifications: ${JSON.stringify(product.specifications || {})}
Features: ${(product.features || []).join(", ")}
`.trim();

    const aiRaw = await callAI(
      `Generate SEO content for this Indian B2B marketplace product. Return STRICT JSON with keys:
- meta_title (max 65 chars, include city and buying intent)
- meta_description (max 155 chars, benefit + CTA)
- h1 (max 90 chars, keyword-rich, includes product + city if given)
- intro_html (2 paragraphs, 80-140 words total, plain HTML with <p> tags, unique, mentions product, brand, city, uses)
- description (300-450 words, unique, benefits, applications, buying tips, no fluff, plain text)
- keywords (array of 25-30 long-tail strings: product+city, product+"price", +"manufacturer", +"supplier", +"wholesale", +"dealer", +"near me", +"buy online", +brand variants, +5 nearest major Indian cities)
- alt_texts (array of 5 image alt-text strings, each unique, keyword rich including product, brand, city)
- brand_guess (string or null — if you detect a clear brand from name/spec not already given)
- outline (object with fields: sections (array of {h2, body} 6-8 items covering specs, uses, price, buying guide, delivery, comparison, similar in other cities, why choose us))
- faqs (array of 6-8 items, each {question, answer} — 30-70 words per answer, cover buying, delivery, MOQ, uses, sizes, quality, price, warranty)

${context}

Return ONLY the JSON, no markdown fences.`,
      "You are a senior SEO content strategist for Indian B2B marketplaces (like IndiaMART/TradeIndia). Output valid JSON only."
    );

    let parsed: any = {};
    try {
      const cleaned = aiRaw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    const metaTitle =
      parsed.meta_title ||
      `${brand ? brand + " " : ""}${product.name}${city ? " in " + city : ""} — Buy at Best Price`;
    const metaDesc =
      parsed.meta_description ||
      `Buy ${product.name}${city ? " from " + city : ""} on Upcurv Trade. Compare prices, view specs, request quote.`;
    const h1 = parsed.h1 || `${product.name}${city ? " in " + city : ""}`;
    const introHtml = parsed.intro_html || `<p>${(product.short_description || product.description || product.name)}</p>`;
    const outline = parsed.outline || null;
    const keywords: string[] = Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 30) : [];
    const altTexts: string[] = Array.isArray(parsed.alt_texts) ? parsed.alt_texts.slice(0, 8) : [];
    const brandGuess: string | null = typeof parsed.brand_guess === "string" && parsed.brand_guess.trim() ? parsed.brand_guess.trim() : null;
    const longDesc: string = parsed.description || product.description || product.short_description || "";
    const faqs: { question: string; answer: string }[] = Array.isArray(parsed.faqs) ? parsed.faqs.slice(0, 8) : [];

    const canonicalUrl = `${BASE}/product/${productSlug}`;

    // 3. Write seo_metadata
    const jsonLd = [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        description: longDesc,
        brand: brand ? { "@type": "Brand", name: brand } : undefined,
        category: category?.name,
        image: product.primary_image_url || (product.images as any)?.[0],
        url: canonicalUrl,
        offers: product.price_min
          ? {
              "@type": "Offer",
              priceCurrency: product.currency || "INR",
              price: product.price_min,
              availability: "https://schema.org/InStock",
              seller: { "@type": "Organization", name: seller?.business_name || seller?.company_name },
            }
          : undefined,
      },
      faqs.length
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }
        : null,
    ].filter(Boolean);

    await sb.from("seo_metadata").upsert(
      {
        entity_type: "product",
        entity_id: product.id,
        title: metaTitle,
        description: metaDesc,
        h1,
        intro_html: introHtml,
        content_outline: outline,
        keywords,
        canonical: canonicalUrl,
        og_image: product.primary_image_url || (product.images as any)?.[0] || null,
        json_ld: jsonLd,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "entity_type,entity_id" }
    );

    // 3b. Auto brand extraction
    const brandToUse = brand || brandGuess;
    if (brandToUse) {
      const bSlug = slugify(brandToUse);
      const { data: bRow } = await sb
        .from("brands")
        .upsert({ name: brandToUse, slug: bSlug }, { onConflict: "slug" })
        .select("id")
        .maybeSingle();
      if (bRow?.id) {
        await sb.from("product_brands").upsert(
          { product_id: product.id, brand_id: bRow.id },
          { onConflict: "product_id,brand_id" }
        );
      }
    }

    // 3c. Persist alt-text on product_images (best-effort)
    if (altTexts.length) {
      const { data: imgRows } = await sb
        .from("product_images")
        .select("id")
        .eq("product_id", product.id)
        .order("position", { ascending: true });
      for (let i = 0; i < (imgRows || []).length && i < altTexts.length; i++) {
        await sb.from("product_images").update({ alt_text: altTexts[i] }).eq("id", (imgRows as any)[i].id);
      }
    }


    // 4. Write FAQs (replace existing)
    if (faqs.length) {
      await sb.from("product_faqs").delete().eq("product_id", product.id).eq("source", "ai");
      await sb.from("product_faqs").insert(
        faqs.map((f, i) => ({
          product_id: product.id,
          question: f.question,
          answer: f.answer,
          position: i,
          source: "ai",
        }))
      );
    }

    // 5. Internal linking edges
    const edges: any[] = [];
    if (seller?.id) edges.push({ from_entity_type: "product", from_entity_id: product.id, to_entity_type: "seller", to_entity_id: seller.id, anchor: seller.business_name || seller.company_name, weight: 5 });
    if (category?.id) edges.push({ from_entity_type: "product", from_entity_id: product.id, to_entity_type: "category", to_entity_id: category.id, anchor: category.name, weight: 4 });

    // Related products: same category, excluding self
    if (category?.id) {
      const { data: rel } = await sb
        .from("products")
        .select("id, name")
        .eq("category_id", category.id)
        .eq("is_active", true)
        .neq("id", product.id)
        .limit(8);
      for (const r of rel || []) {
        edges.push({ from_entity_type: "product", from_entity_id: product.id, to_entity_type: "product", to_entity_id: r.id, anchor: r.name, weight: 2 });
      }
    }

    if (edges.length) {
      await sb.from("internal_links").upsert(edges, { onConflict: "from_entity_type,from_entity_id,to_entity_type,to_entity_id" });
    }

    // 6. IndexNow fan-out
    const impactedUrls = [canonicalUrl];
    if (category?.slug) {
      impactedUrls.push(
        `${BASE}/category/${category.slug}`,
        `${BASE}/manufacturers/${category.slug}`,
        `${BASE}/suppliers/${category.slug}`,
        `${BASE}/exporters/${category.slug}`,
      );
      if (citySlug) impactedUrls.push(
        `${BASE}/manufacturers/${category.slug}/${citySlug}`,
        `${BASE}/suppliers/${category.slug}/${citySlug}`,
        `${BASE}/city/${citySlug}/${category.slug}`,
      );
      impactedUrls.push(`${BASE}/guides/${category.slug}`);
    }
    if (citySlug) impactedUrls.push(`${BASE}/city/${citySlug}`);
    if (brandSlug) {
      impactedUrls.push(`${BASE}/brand/${brandSlug}`);
      if (category?.slug) impactedUrls.push(`${BASE}/brand/${brandSlug}/${category.slug}`);
    }
    if (seller?.slug || seller?.id) impactedUrls.push(`${BASE}/seller-profile/${seller.slug || seller.id}`);

    await pingIndexNow(sb, impactedUrls);

    // 6b. Generate the semantic search embedding so the product is findable
    // via semantic-search immediately after publish.
    try {
      await sb.functions.invoke("embed-product", { body: { product_ids: [product.id] } });
    } catch (e) {
      console.error("embed-product invoke failed", e);
    }

    // 7. Bump updated_at on category so sitemap lastmod refreshes
    if (category?.id) await sb.from("categories").update({ updated_at: new Date().toISOString() }).eq("id", category.id);

    return new Response(
      JSON.stringify({ success: true, faqs_written: faqs.length, edges: edges.length, indexed: impactedUrls.length }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("on-product-publish", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});

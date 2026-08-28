// Prerender HTML for search-engine bots. Point a Cloudflare Worker at your domain
// that proxies requests with a bot User-Agent to:
//   https://<project-ref>.supabase.co/functions/v1/crawler-render?path=<encoded path>
// Humans continue to hit the SPA.
//
// Supported paths:
//   /product/:slug
//   /category/:slug
//   /seller-profile/:slug
//   /local/:slug
//   /manufacturers|suppliers|exporters|wholesalers/:cat[/:city]
//   /city/:slug[/:cat]
//   /brand/:slug[/:cat]
//   /guides/:slug
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BASE = "https://upcurvtrade.upcurv.in";
const SITE = "Upcurv Trade";

const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=3600",
  "Access-Control-Allow-Origin": "*",
  "X-Robots-Tag": "index, follow",
};

const BOT_RE = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|discordbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|redditbot|applebot|semrush|ahrefsbot|mj12bot|petalbot|duckduckgo|yandex|baidu|naver/i;

function esc(s: any) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(s: string) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function titleCase(s: string) {
  return (s || "").split(/[-_\s]+/).filter(Boolean).map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
}

function shell(opts: { title: string; description: string; canonical: string; ogImage?: string | null; jsonLd?: any[]; body: string; noindex?: boolean; }) {
  const jsonLdBlocks = (opts.jsonLd || []).filter(Boolean).map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}" />
<link rel="canonical" href="${esc(opts.canonical)}" />
<meta name="robots" content="${opts.noindex ? "noindex,follow" : "index,follow,max-image-preview:large,max-snippet:-1"}" />
<meta property="og:title" content="${esc(opts.title)}" />
<meta property="og:description" content="${esc(opts.description)}" />
<meta property="og:url" content="${esc(opts.canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="${SITE}" />
${opts.ogImage ? `<meta property="og:image" content="${esc(opts.ogImage)}" />\n<meta name="twitter:image" content="${esc(opts.ogImage)}" />` : ""}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(opts.title)}" />
<meta name="twitter:description" content="${esc(opts.description)}" />
${jsonLdBlocks}
<style>body{font-family:system-ui,Arial,sans-serif;max-width:960px;margin:0 auto;padding:20px;color:#111}h1{font-size:28px;margin:8px 0 12px}h2{font-size:20px;margin:24px 0 8px}h3{font-size:16px;margin:16px 0 6px}a{color:#0b57d0}ul{padding-left:20px}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px 10px;text-align:left}.card{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:10px 0}nav.crumbs{font-size:13px;color:#555;margin:8px 0 12px}</style>
</head>
<body>
${opts.body}
<hr /><p><small>© ${new Date().getFullYear()} ${SITE} · <a href="${BASE}/">Home</a> · <a href="${BASE}/categories">Categories</a> · <a href="${BASE}/find-businesses">Find Businesses</a></small></p>
</body></html>`;
}

function breadcrumbs(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

function crumbsHtml(items: { name: string; url: string }[]) {
  return `<nav class="crumbs">${items.map((it, i) => `${i > 0 ? " › " : ""}<a href="${esc(it.url)}">${esc(it.name)}</a>`).join("")}</nav>`;
}

async function renderProduct(sb: any, slug: string): Promise<Response> {
  let productQuery = sb
    .from("products")
    .select("*, categories:category_id(id,name,slug), seller_profiles:seller_id(id,business_name,company_name,city,slug,phone,whatsapp)");
  productQuery = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(slug) ? productQuery.eq("id", slug) : productQuery.eq("slug", slug);
  const { data: product } = await productQuery.maybeSingle();
  if (!product) return new Response(shell({ title: "Not found", description: "", canonical: BASE + "/", body: "<h1>Not found</h1>", noindex: true }), { headers: HEADERS, status: 404 });

  const { data: meta } = await sb.from("seo_metadata").select("*").eq("entity_type", "product").eq("entity_id", product.id).maybeSingle();
  const { data: faqs } = await sb.from("product_faqs").select("question,answer").eq("product_id", product.id).order("position").limit(10);

  const category = product.categories;
  const seller = product.seller_profiles;
  const city = seller?.city || "";
  const canonical = `${BASE}/product/${product.slug || product.id}`;
  const sellerName = seller?.business_name || seller?.company_name || "";
  const title = meta?.title || (`${product.name} — Price, Buy Online & Bulk Quote${city ? " in " + city : ""} | ${SITE}`.length <= 70
    ? `${product.name} — Price, Buy Online & Bulk Quote${city ? " in " + city : ""} | ${SITE}`
    : `${product.name}${city ? " in " + city : ""} | ${SITE}`);
  const description = meta?.description || `Buy ${product.name}${category?.name ? ` (${category.name})` : ""} from ${sellerName || "verified suppliers"}${city ? ` in ${city}` : ""}. ${(product.short_description || product.description || "Compare price, specifications, MOQ and delivery terms.").slice(0, 95)}`.slice(0, 158);
  const h1 = meta?.h1 || `${product.name}${city ? " in " + city : ""}`;
  const intro = meta?.intro_html || `<p>${esc(product.description || product.short_description || product.name)}</p>`;
  const ogImage = meta?.og_image || product.primary_image_url || (product.images as any)?.[0];

  const { data: related } = await sb
    .from("products")
    .select("name, slug, id")
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(10);

  const { data: sameCity } = seller?.city
    ? await sb.from("seller_profiles").select("business_name,company_name,slug,id,city").eq("status", "approved").eq("city", seller.city).neq("id", seller.id).limit(6)
    : { data: [] as any[] };

  const outline = meta?.content_outline as any;
  const outlineHtml = outline?.sections?.map((s: any) => `<h2>${esc(s.h2)}</h2><p>${esc(s.body)}</p>`).join("\n") || "";

  const specs = product.specifications && typeof product.specifications === "object" ? product.specifications : {};
  const specRows = Object.entries(specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");

  const jsonLd: any[] = [
    breadcrumbs([
      { name: "Home", url: BASE },
      ...(category ? [{ name: category.name, url: `${BASE}/category/${category.slug}` }] : []),
      { name: product.name, url: canonical },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: (meta?.description || product.description || product.short_description || product.name).slice(0, 500),
      image: ogImage || undefined,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      category: category?.name,
      url: canonical,
      offers: product.price_min ? { "@type": "Offer", priceCurrency: product.currency || "INR", price: product.price_min, availability: "https://schema.org/InStock", seller: { "@type": "Organization", name: seller?.business_name || seller?.company_name } } : undefined,
    },
    faqs?.length ? {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f: any) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    } : null,
  ];

  const body = `
${crumbsHtml([{ name: "Home", url: BASE }, ...(category ? [{ name: category.name, url: `${BASE}/category/${category.slug}` }] : []), { name: product.name, url: canonical }])}
<h1>${esc(h1)}</h1>
${ogImage ? `<img src="${esc(ogImage)}" alt="${esc(product.name + (city ? " in " + city : ""))}" width="640" />` : ""}
${intro}
${product.price_min ? `<p><strong>Price:</strong> ${esc(product.currency || "INR")} ${esc(product.price_min)}${product.price_max ? ` - ${esc(product.price_max)}` : ""}${product.price_unit ? ` / ${esc(product.price_unit)}` : ""}</p>` : ""}
${product.min_order_quantity ? `<p><strong>Minimum Order:</strong> ${esc(product.min_order_quantity)} ${esc(product.moq_unit || "")}</p>` : ""}
${specRows ? `<h2>Specifications</h2><table>${specRows}</table>` : ""}
${outlineHtml}
${seller ? `<h2>Supplier</h2><div class="card"><h3><a href="${BASE}/seller-profile/${esc(seller.slug || seller.id)}">${esc(seller.business_name || seller.company_name)}</a></h3><p>${esc(seller.city || "")}</p></div>` : ""}
${related?.length ? `<h2>Related ${esc(category?.name || "products")}</h2><ul>${related.map((r: any) => `<li><a href="${BASE}/product/${esc(r.slug || r.id)}">${esc(r.name)}</a></li>`).join("")}</ul>` : ""}
${sameCity?.length ? `<h2>More suppliers in ${esc(seller?.city)}</h2><ul>${sameCity.map((s: any) => `<li><a href="${BASE}/seller-profile/${esc(s.slug || s.id)}">${esc(s.business_name || s.company_name)}</a></li>`).join("")}</ul>` : ""}
${faqs?.length ? `<h2>Frequently asked questions</h2>${faqs.map((f: any) => `<h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p>`).join("")}` : ""}
<h2>Explore ${esc(category?.name || "this category")}</h2>
<ul>
${category?.slug ? `<li><a href="${BASE}/manufacturers/${esc(category.slug)}">${esc(category.name)} manufacturers in India</a></li>
<li><a href="${BASE}/suppliers/${esc(category.slug)}">${esc(category.name)} suppliers</a></li>
<li><a href="${BASE}/exporters/${esc(category.slug)}">${esc(category.name)} exporters</a></li>
<li><a href="${BASE}/wholesalers/${esc(category.slug)}">${esc(category.name)} wholesale</a></li>
${city ? `<li><a href="${BASE}/manufacturers/${esc(category.slug)}/${esc(slugify(city))}">${esc(category.name)} manufacturers in ${esc(city)}</a></li>
<li><a href="${BASE}/suppliers/${esc(category.slug)}/${esc(slugify(city))}">${esc(category.name)} suppliers in ${esc(city)}</a></li>
<li><a href="${BASE}/city/${esc(slugify(city))}/${esc(category.slug)}">${esc(category.name)} in ${esc(city)}</a></li>` : ""}
<li><a href="${BASE}/guides/${esc(category.slug)}">${esc(category.name)} buying guide</a></li>` : ""}
</ul>`;

  return new Response(shell({ title, description, canonical, ogImage, jsonLd, body }), { headers: HEADERS });
}

async function renderService(sb: any, slug: string): Promise<Response> {
  let serviceQuery = sb
    .from("services")
    .select("*, categories:category_id(name,slug), seller_profiles:seller_id(id,business_name,company_name,city,state,slug,logo_url)");
  serviceQuery = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(slug) ? serviceQuery.eq("id", slug) : serviceQuery.eq("slug", slug);
  const { data: service } = await serviceQuery.maybeSingle();
  if (!service) return new Response(shell({ title: "Not found", description: "", canonical: BASE + "/", body: "<h1>Not found</h1>", noindex: true }), { headers: HEADERS, status: 404 });

  const seller = service.seller_profiles;
  const category = service.categories;
  const provider = seller?.business_name || seller?.company_name || "a verified provider";
  const canonical = `${BASE}/service/${service.slug || service.id}`;
  const title = `${service.title}${service.city ? " in " + service.city : ""} | ${SITE}`;
  const description = `${service.title}${service.city ? " in " + service.city : ""} — ${(service.description || "professional service").slice(0, 105)}. Get a quote from ${provider} on ${SITE}.`.slice(0, 158);
  const images = Array.isArray(service.images) ? service.images : [];
  const fields = service.custom_fields && typeof service.custom_fields === "object" ? service.custom_fields : {};
  const highlights = Array.isArray(fields.highlights) ? fields.highlights : [];

  const { data: related } = service.category_id ? await sb.from("services").select("id,slug,title,city,price").eq("category_id", service.category_id).eq("is_active", true).neq("id", service.id).limit(10) : { data: [] };
  const jsonLd = [
    breadcrumbs([{ name: "Home", url: BASE }, ...(category ? [{ name: category.name, url: `${BASE}/category/${category.slug}` }] : []), { name: service.title, url: canonical }]),
    {
      "@context": "https://schema.org", "@type": "Service", name: service.title,
      description: service.description || description, url: canonical, image: images,
      serviceType: category?.name, provider: { "@type": "Organization", name: provider },
      areaServed: service.city ? { "@type": "City", name: service.city } : undefined,
      offers: service.price ? { "@type": "Offer", price: service.price, priceCurrency: service.currency || "INR", unitText: service.unit || undefined, url: canonical } : undefined,
    },
  ];
  const body = `
${crumbsHtml([{ name: "Home", url: BASE }, ...(category ? [{ name: category.name, url: `${BASE}/category/${category.slug}` }] : []), { name: service.title, url: canonical }])}
<h1>${esc(service.title)}${service.city ? " in " + esc(service.city) : ""}</h1>
${images[0] ? `<img src="${esc(images[0])}" alt="${esc(service.title)}" width="640" />` : ""}
<p>${esc(service.description || description)}</p>
${service.price ? `<p><strong>Price:</strong> ₹${esc(service.price)}${service.unit ? ` / ${esc(String(service.unit).replace(/_/g, " "))}` : ""}</p>` : ""}
${highlights.length ? `<h2>Service highlights</h2><ul>${highlights.map((h: any) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}
${seller ? `<h2>Service provider</h2><div class="card"><a href="${BASE}/seller-profile/${esc(seller.slug || seller.id)}">${esc(provider)}</a>${seller.city ? ` — ${esc(seller.city)}` : ""}</div>` : ""}
${related?.length ? `<h2>Similar services</h2><ul>${related.map((item: any) => `<li><a href="${BASE}/service/${esc(item.slug || item.id)}">${esc(item.title)}</a>${item.city ? ` in ${esc(item.city)}` : ""}</li>`).join("")}</ul>` : ""}`;
  return new Response(shell({ title, description, canonical, ogImage: images[0], jsonLd, body }), { headers: HEADERS });
}

async function renderCategory(sb: any, slug: string): Promise<Response> {
  const { data: category } = await sb.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (!category) return new Response(shell({ title: "Not found", description: "", canonical: BASE + "/", body: "<h1>Not found</h1>", noindex: true }), { headers: HEADERS, status: 404 });

  const { data: meta } = await sb.from("seo_metadata").select("*").eq("entity_type", "category").eq("entity_id", category.id).maybeSingle();
  const { data: products } = await sb.from("products").select("name,slug,id,primary_image_url,price_min").eq("category_id", category.id).eq("is_active", true).limit(30);
  const { data: sellers } = await sb.from("seller_profiles").select("business_name,company_name,slug,id,city").eq("status", "approved").limit(20);
  const canonical = `${BASE}/category/${category.slug}`;
  const title = meta?.title || `${category.name} Suppliers & Manufacturers in India — ${SITE}`;
  const description = meta?.description || `Find verified ${category.name.toLowerCase()} suppliers, manufacturers, exporters and wholesalers on ${SITE}. Compare prices, request quotes, connect via WhatsApp.`;

  const jsonLd = [
    breadcrumbs([{ name: "Home", url: BASE }, { name: "Categories", url: `${BASE}/categories` }, { name: category.name, url: canonical }]),
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: canonical, description },
  ];

  const body = `
${crumbsHtml([{ name: "Home", url: BASE }, { name: "Categories", url: `${BASE}/categories` }, { name: category.name, url: canonical }])}
<h1>${esc(category.name)} — Suppliers, Manufacturers & Exporters</h1>
<p>${esc(description)}</p>
<h2>Top ${esc(category.name)} products</h2>
<ul>${(products || []).map((p: any) => `<li><a href="${BASE}/product/${esc(p.slug || p.id)}">${esc(p.name)}</a>${p.price_min ? ` — ₹${esc(p.price_min)}` : ""}</li>`).join("")}</ul>
<h2>Verified suppliers</h2>
<ul>${(sellers || []).map((s: any) => `<li><a href="${BASE}/seller-profile/${esc(s.slug || s.id)}">${esc(s.business_name || s.company_name)}</a>${s.city ? ` — ${esc(s.city)}` : ""}</li>`).join("")}</ul>
<h2>Browse by role</h2>
<ul>
<li><a href="${BASE}/manufacturers/${esc(category.slug)}">${esc(category.name)} manufacturers</a></li>
<li><a href="${BASE}/suppliers/${esc(category.slug)}">${esc(category.name)} suppliers</a></li>
<li><a href="${BASE}/exporters/${esc(category.slug)}">${esc(category.name)} exporters</a></li>
<li><a href="${BASE}/wholesalers/${esc(category.slug)}">${esc(category.name)} wholesale</a></li>
<li><a href="${BASE}/guides/${esc(category.slug)}">${esc(category.name)} buying guide</a></li>
</ul>`;
  return new Response(shell({ title, description, canonical, jsonLd, body }), { headers: HEADERS });
}

async function renderSeller(sb: any, slug: string): Promise<Response> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(slug);
  const sellerQuery = sb.from("seller_profiles").select("*");
  const { data: seller } = await (isUuid ? sellerQuery.eq("id", slug) : sellerQuery.eq("slug", slug)).maybeSingle();
  if (!seller) return new Response(shell({ title: "Not found", description: "", canonical: BASE + "/", body: "<h1>Not found</h1>", noindex: true }), { headers: HEADERS, status: 404 });
  const { data: products } = await sb.from("products").select("name,slug,id").eq("seller_id", seller.id).eq("is_active", true).limit(30);
  const name = seller.business_name || seller.company_name;
  const canonical = `${BASE}/seller-profile/${seller.slug || seller.id}`;
  const title = `${name} — ${seller.city || "India"} — ${SITE}`;
  const description = (seller.about || seller.description || `${name} is a verified supplier on ${SITE}.`).slice(0, 155);
  const jsonLd = [
    breadcrumbs([{ name: "Home", url: BASE }, { name: name, url: canonical }]),
    { "@context": "https://schema.org", "@type": "LocalBusiness", name, url: canonical, address: seller.address, telephone: seller.phone, image: seller.logo_url || undefined },
  ];
  const body = `
<h1>${esc(name)}</h1>
<p>${esc(description)}</p>
${seller.city ? `<p><strong>Location:</strong> ${esc(seller.city)}, ${esc(seller.state || "India")}</p>` : ""}
<h2>Products</h2>
<ul>${(products || []).map((p: any) => `<li><a href="${BASE}/product/${esc(p.slug || p.id)}">${esc(p.name)}</a></li>`).join("")}</ul>`;
  return new Response(shell({ title, description, canonical, ogImage: seller.logo_url, jsonLd, body }), { headers: HEADERS });
}

async function renderRole(sb: any, role: string, catSlug: string, city?: string): Promise<Response> {
  const { data: category } = await sb.from("categories").select("*").eq("slug", catSlug).maybeSingle();
  const catName = category?.name || titleCase(catSlug);
  const cityLabel = city ? titleCase(city) : "";
  const roleLabel = titleCase(role);
  const canonical = `${BASE}/${role}/${catSlug}${city ? "/" + city : ""}`;
  const title = `${catName} ${roleLabel}${cityLabel ? " in " + cityLabel : " in India"} — ${SITE}`;
  const description = `Verified ${catName.toLowerCase()} ${role}${cityLabel ? " in " + cityLabel : " across India"}. Compare prices, request quotes, connect instantly.`;

  let sellersQ = sb.from("seller_profiles").select("business_name,company_name,slug,id,city").eq("status", "approved").limit(30);
  if (city) sellersQ = sellersQ.ilike("city", city.replace(/-/g, " "));
  const { data: sellers } = await sellersQ;

  const productsQ = category?.id ? await sb.from("products").select("name,slug,id, seller_profiles:seller_id(city)").eq("category_id", category.id).eq("is_active", true).limit(30) : { data: [] as any[] };
  const products = (productsQ.data || []).filter((p: any) => !city || slugify(p.seller_profiles?.city || "") === city);

  const jsonLd = [
    breadcrumbs([{ name: "Home", url: BASE }, { name: catName, url: `${BASE}/category/${catSlug}` }, { name: `${roleLabel}${cityLabel ? " in " + cityLabel : ""}`, url: canonical }]),
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: canonical, description },
  ];

  const body = `
<h1>${esc(catName)} ${esc(roleLabel)}${cityLabel ? " in " + esc(cityLabel) : " in India"}</h1>
<p>${esc(description)}</p>
<h2>Verified ${esc(roleLabel.toLowerCase())}${cityLabel ? " in " + esc(cityLabel) : ""}</h2>
<ul>${(sellers || []).map((s: any) => `<li><a href="${BASE}/seller-profile/${esc(s.slug || s.id)}">${esc(s.business_name || s.company_name)}</a>${s.city ? ` — ${esc(s.city)}` : ""}</li>`).join("")}</ul>
${products.length ? `<h2>Products</h2><ul>${products.slice(0, 20).map((p: any) => `<li><a href="${BASE}/product/${esc(p.slug || p.id)}">${esc(p.name)}</a></li>`).join("")}</ul>` : ""}
<h2>Also browse</h2>
<ul>
<li><a href="${BASE}/category/${esc(catSlug)}">All ${esc(catName)}</a></li>
${["manufacturers","suppliers","exporters","wholesalers"].filter(r => r !== role).map(r => `<li><a href="${BASE}/${r}/${esc(catSlug)}${city ? "/" + esc(city) : ""}">${esc(catName)} ${r}${cityLabel ? " in " + esc(cityLabel) : ""}</a></li>`).join("")}
<li><a href="${BASE}/guides/${esc(catSlug)}">${esc(catName)} buying guide</a></li>
</ul>`;
  return new Response(shell({ title, description, canonical, jsonLd, body }), { headers: HEADERS });
}

async function renderCityHub(sb: any, city: string, cat?: string): Promise<Response> {
  const cityLabel = titleCase(city);
  if (cat) return renderRole(sb, "suppliers", cat, city);
  const canonical = `${BASE}/city/${city}`;
  const title = `Suppliers & Manufacturers in ${cityLabel} — ${SITE}`;
  const description = `Discover verified suppliers, manufacturers and wholesalers in ${cityLabel} across all categories on ${SITE}.`;
  const { data: sellers } = await sb.from("seller_profiles").select("business_name,company_name,slug,id,city").eq("status", "approved").ilike("city", city.replace(/-/g, " ")).limit(50);
  const { data: cats } = await sb.from("categories").select("name,slug").limit(50);
  const jsonLd = [
    breadcrumbs([{ name: "Home", url: BASE }, { name: cityLabel, url: canonical }]),
    { "@context": "https://schema.org", "@type": "CollectionPage", name: title, url: canonical, description },
  ];
  const body = `
<h1>Suppliers & Manufacturers in ${esc(cityLabel)}</h1>
<p>${esc(description)}</p>
<h2>Suppliers in ${esc(cityLabel)}</h2>
<ul>${(sellers || []).map((s: any) => `<li><a href="${BASE}/seller-profile/${esc(s.slug || s.id)}">${esc(s.business_name || s.company_name)}</a></li>`).join("")}</ul>
<h2>Popular categories in ${esc(cityLabel)}</h2>
<ul>${(cats || []).map((c: any) => `<li><a href="${BASE}/city/${esc(city)}/${esc(c.slug)}">${esc(c.name)} in ${esc(cityLabel)}</a></li>`).join("")}</ul>`;
  return new Response(shell({ title, description, canonical, jsonLd, body }), { headers: HEADERS });
}

async function renderBrand(sb: any, brandSlug: string, cat?: string): Promise<Response> {
  const { data: brand } = await sb.from("brands").select("*").eq("slug", brandSlug).maybeSingle();
  const name = brand?.name || titleCase(brandSlug);
  const canonical = `${BASE}/brand/${brandSlug}${cat ? "/" + cat : ""}`;
  const title = `${name}${cat ? " " + titleCase(cat) : ""} — Authorized Dealers & Suppliers — ${SITE}`;
  const description = `Buy ${name}${cat ? " " + titleCase(cat).toLowerCase() : ""} from authorized dealers and verified suppliers on ${SITE}.`;
  const jsonLd = [
    breadcrumbs([{ name: "Home", url: BASE }, { name: name, url: `${BASE}/brand/${brandSlug}` }, ...(cat ? [{ name: titleCase(cat), url: canonical }] : [])]),
    { "@context": "https://schema.org", "@type": "Brand", name, url: canonical, logo: brand?.logo_url || undefined },
  ];
  const body = `<h1>${esc(name)}${cat ? " " + esc(titleCase(cat)) : ""}</h1><p>${esc(description)}</p>`;
  return new Response(shell({ title, description, canonical, jsonLd, body }), { headers: HEADERS });
}

async function renderGuide(sb: any, slug: string): Promise<Response> {
  const { data: guide } = await sb.from("buying_guides").select("*").eq("slug", slug).maybeSingle();
  const { data: category } = guide ? { data: null } : await sb.from("categories").select("*").eq("slug", slug).maybeSingle();
  const title = guide?.title || (category ? `${category.name} Buying Guide — ${SITE}` : `${titleCase(slug)} Buying Guide — ${SITE}`);
  const description = guide?.meta_description || `Complete buying guide for ${category?.name || titleCase(slug)}: prices, specs, top suppliers, and how to choose.`;
  const canonical = `${BASE}/guides/${slug}`;
  const jsonLd = [breadcrumbs([{ name: "Home", url: BASE }, { name: "Guides", url: `${BASE}/guides` }, { name: title, url: canonical }])];
  const body = `<h1>${esc(title)}</h1>${guide?.content_html ? guide.content_html : `<p>${esc(description)}</p>${category ? `<p><a href="${BASE}/category/${esc(category.slug)}">Browse ${esc(category.name)} suppliers →</a></p>` : ""}`}`;
  return new Response(shell({ title, description, canonical, jsonLd, body }), { headers: HEADERS });
}

async function renderLocal(sb: any, slug: string): Promise<Response> {
  const { data: page } = await sb.from("local_landing_pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) return new Response(shell({ title: "Not found", description: "", canonical: BASE, body: "<h1>Not found</h1>", noindex: true }), { headers: HEADERS, status: 404 });
  const canonical = `${BASE}/local/${slug}`;
  const title = page.meta_title || page.title;
  const description = page.meta_description || page.intro || page.title;
  const { data: links } = await sb.from("local_landing_page_sellers").select("seller_profiles:seller_id(business_name,company_name,slug,id,city)").eq("page_id", page.id);
  const jsonLd = [breadcrumbs([{ name: "Home", url: BASE }, { name: page.title, url: canonical }])];
  const body = `
<h1>${esc(page.h1 || page.title)}</h1>
${page.intro ? `<p>${esc(page.intro)}</p>` : ""}
<h2>Verified suppliers</h2>
<ul>${(links || []).map((r: any) => r.seller_profiles).filter(Boolean).map((s: any) => `<li><a href="${BASE}/seller-profile/${esc(s.slug || s.id)}">${esc(s.business_name || s.company_name)}</a>${s.city ? ` — ${esc(s.city)}` : ""}</li>`).join("")}</ul>`;
  return new Response(shell({ title, description, canonical, jsonLd, body }), { headers: HEADERS });
}

// Static / templated routes — each needs its own title + description, otherwise
// Google shows one boilerplate snippet for every sitelink.
const STATIC_PAGES: Record<string, { title: string; description: string; h1: string; body?: string }> = {
  "/about": {
    title: `About ${SITE} — Who We Are & How Our B2B Marketplace Works`,
    description: `${SITE} connects Indian buyers with verified manufacturers, wholesalers and exporters. Learn about our verification process, lead routing and how we help businesses source better.`,
    h1: `About ${SITE}`,
  },
  "/contact": {
    title: `Contact ${SITE} — Support for Buyers & Sellers`,
    description: `Reach the ${SITE} team for supplier verification, lead issues, subscription help or partnership enquiries. Response within one working day.`,
    h1: "Contact us",
  },
  "/pricing": {
    title: `Seller Membership Plans & Pricing — ${SITE}`,
    description: `Compare ${SITE} seller membership plans: lead quotas, verified badges, catalog limits and priority listing. Transparent pricing with no hidden commission on orders.`,
    h1: "Seller membership plans",
  },
  "/refund-policy": {
    title: `Refund & Cancellation Policy — ${SITE}`,
    description: `Read the ${SITE} refund and cancellation policy covering seller subscription plans, paid promotions and billing disputes, including timelines for processing refunds.`,
    h1: "Refund & cancellation policy",
  },
  "/privacy-policy": {
    title: `Privacy Policy — How ${SITE} Handles Your Data`,
    description: `How ${SITE} collects, stores and shares buyer and seller data, including enquiry details, cookies, analytics and your rights to access or delete your information.`,
    h1: "Privacy policy",
  },
  "/terms-of-service": {
    title: `Terms of Service — ${SITE} Marketplace Rules`,
    description: `The rules for using ${SITE}: listing standards for sellers, buyer conduct, enquiry usage, prohibited products, liability limits and account termination.`,
    h1: "Terms of service",
  },
  "/post-requirement": {
    title: `Post Your Requirement — Get Quotes from 3 Verified Suppliers | ${SITE}`,
    description: `Tell us what you need to buy and get competitive quotes from up to 3 verified suppliers within 24 hours. Free for buyers on ${SITE}, no signup required.`,
    h1: "Post your requirement",
  },
  "/requirements": {
    title: `Submit a Detailed Purchase Requirement & RFQ — ${SITE}`,
    description: `Create a detailed B2B purchase request with category, quantity, budget and delivery location so matching verified suppliers can prepare accurate quotes.`,
    h1: "Submit a detailed purchase requirement",
  },
  "/categories": {
    title: `All B2B Categories — Product & Service Directory | ${SITE}`,
    description: `Browse every product and service category on ${SITE} — industrial machinery, raw materials, packaging, electricals and business services, each with verified suppliers.`,
    h1: "All categories",
  },
  "/search": {
    title: `Search Products, Services & Verified Suppliers — ${SITE}`,
    description: `Search B2B products, service providers and supplier categories across India. Compare relevant listings, locations, prices and contact verified businesses directly.`,
    h1: "Search products, services and suppliers",
  },
  "/cities": {
    title: `Suppliers by City — Indian Manufacturing Hubs | ${SITE}`,
    description: `Find verified manufacturers, wholesalers and service providers city by city across India. Explore supplier counts and top categories for each business hub.`,
    h1: "Suppliers by city",
  },
  "/find-businesses": {
    title: `Find Verified Businesses & Suppliers in India — ${SITE}`,
    description: `Search verified Indian businesses by category, city and capability. Compare response time, trust score and product range before requesting a quote.`,
    h1: "Find verified businesses",
  },
  "/business-needs": {
    title: `Sourcing Engine — What Does My Business Need to Buy? | ${SITE}`,
    description: `Describe your business and our sourcing engine lists the raw materials, machinery, packing materials and services you need, with verified suppliers for each.`,
    h1: "Tell us your business — we'll show what you need to buy",
  },
  "/trade-shows": {
    title: `B2B Trade Shows & Exhibitions in India — ${SITE}`,
    description: `Upcoming Indian trade shows and industrial exhibitions by sector and city, with dates, venues and who should attend to meet suppliers face to face.`,
    h1: "Trade shows & exhibitions",
  },
  "/trade-leads": {
    title: `Buy Trade Leads — Verified Buyer Enquiries | ${SITE}`,
    description: `Purchase verified buyer trade leads by category and city. Every lead includes requirement details, quantity and contact, routed only to relevant sellers.`,
    h1: "Buy trade leads",
  },
  "/distributors": {
    title: `Find Distributors & Channel Partners in India — ${SITE}`,
    description: `Appoint distributors, dealers and channel partners across Indian states. Post your distribution requirement and connect with interested partners.`,
    h1: "Find distributors",
  },
  "/guides": {
    title: `B2B Buying Guides — Prices, Specs & Supplier Tips | ${SITE}`,
    description: `Practical buying guides for Indian B2B procurement: price ranges, specifications to check, quality standards and how to shortlist reliable suppliers.`,
    h1: "Buying guides",
  },
};

/**
 * Resolve a bare root-level slug to the entity it belongs to, so URLs like
 * /jai-furnitures-f14c63db serve real seller/product meta instead of the
 * generic homepage title.
 */
async function renderRootSlug(sb: any, slug: string): Promise<Response | null> {
  const { data: seller } = await sb.from("seller_profiles").select("id").eq("slug", slug).maybeSingle();
  if (seller) return await renderSeller(sb, slug);
  const { data: product } = await sb.from("products").select("id").eq("slug", slug).maybeSingle();
  if (product) return await renderProduct(sb, slug);
  const { data: service } = await sb.from("services").select("id").eq("slug", slug).maybeSingle();
  if (service) return await renderService(sb, slug);
  const { data: category } = await sb.from("categories").select("id").eq("slug", slug).maybeSingle();
  if (category) return await renderCategory(sb, slug);
  const { data: local } = await sb.from("local_landing_pages").select("id").eq("slug", slug).maybeSingle();
  if (local) return await renderLocal(sb, slug);
  return null;
}

function renderStatic(path: string): Response | null {

  const page = STATIC_PAGES[path.replace(/\/$/, "") || "/"];
  if (!page) return null;
  const canonical = BASE + path.replace(/\/$/, "");
  return new Response(shell({
    title: page.title,
    description: page.description,
    canonical,
    jsonLd: [breadcrumbs([{ name: "Home", url: BASE }, { name: page.h1, url: canonical }])],
    body: page.body || `<h1>${esc(page.h1)}</h1><p>${esc(page.description)}</p>`,
  }), { headers: HEADERS });
}

Deno.serve(async (req) => {

  const url = new URL(req.url);
  const rawPath = url.searchParams.get("path") || url.pathname.replace(/^\/functions\/v1\/crawler-render/, "") || "/";
  const path = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
  const ua = req.headers.get("user-agent") || "";
  const force = url.searchParams.get("_bot") === "1";
  const isBot = force || BOT_RE.test(ua);

  // Non-bot fallback: 302 to the SPA so a misrouted human never sees the stripped page
  if (!isBot) {
    return Response.redirect(BASE + path, 302);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const cleanPath = path.split("?")[0];
  const parts = cleanPath.split("/").filter(Boolean);

  // /search?q=... — one indexable page per query is pure ranking noise.
  // Send bots to the bare /search page instead.
  const qsIndex = path.indexOf("?");
  const qParam = qsIndex >= 0 ? new URLSearchParams(path.slice(qsIndex + 1)).get("q") : null;
  if (cleanPath.replace(/\/$/, "") === "/search" && qParam && qParam.trim()) {
    return Response.redirect(BASE + "/search", 302);
  }

  try {
    if (parts.length === 2 && (parts[0] === "product" || parts[0] === "products")) return await renderProduct(sb, parts[1]);
    if (parts.length === 2 && parts[0] === "service") return await renderService(sb, parts[1]);
    if (parts.length === 2 && parts[0] === "category") return await renderCategory(sb, parts[1]);
    if (parts.length === 2 && (parts[0] === "seller-profile" || parts[0] === "supplier")) return await renderSeller(sb, parts[1]);
    if (parts.length === 2 && parts[0] === "local") return await renderLocal(sb, parts[1]);
    if (parts.length === 2 && parts[0] === "guides") return await renderGuide(sb, parts[1]);
    if (parts.length >= 2 && ["manufacturers","suppliers","exporters","wholesalers"].includes(parts[0])) {
      return await renderRole(sb, parts[0], parts[1], parts[2]);
    }
    if (parts.length >= 2 && parts[0] === "city") return await renderCityHub(sb, parts[1], parts[2]);
    if (parts.length >= 2 && parts[0] === "brand") return await renderBrand(sb, parts[1], parts[2]);
    const staticPage = renderStatic(path.split("?")[0]);
    if (staticPage) return staticPage;

    // Bare slug at the root (e.g. /jai-furnitures-f14c63db): resolve the entity
    // so the page never falls back to the generic homepage title/description.
    if (parts.length === 1) {
      const resolved = await renderRootSlug(sb, parts[0]);
      if (resolved) return resolved;
    }

    if (path.split("?")[0].replace(/\/$/, "") !== "") {
      // Unknown path — never serve homepage meta on a deep URL.
      return new Response(shell({
        title: `Page not found | ${SITE}`,
        description: "",
        canonical: BASE + path.split("?")[0],
        body: `<h1>Page not found</h1><p><a href="${BASE}/">Go to ${SITE} home</a></p>`,
        noindex: true,
      }), { headers: HEADERS, status: 404 });
    }

    const canonical = BASE + "/";
    return new Response(shell({
      title: `${SITE} — Shop Retail & Source Wholesale from Verified Indian Sellers`,
      description: `Shop products at retail prices or source in bulk from verified Indian sellers, manufacturers and service providers on ${SITE}. Compare prices and request quotes.`,
      canonical,
      body: `<h1>${SITE}</h1><p>India's marketplace to shop products at retail prices and source in bulk from verified sellers, manufacturers and service providers.</p><ul><li><a href="${BASE}/categories">Browse categories</a></li><li><a href="${BASE}/find-businesses">Find businesses</a></li><li><a href="${BASE}/post-requirement">Post a requirement</a></li></ul>`,
    }), { headers: HEADERS });

  } catch (e) {
    console.error("crawler-render error", e);
    return new Response(shell({ title: "Error", description: "", canonical: BASE + path, body: `<h1>Temporary error</h1><p>${esc(String(e))}</p>`, noindex: true }), { headers: HEADERS, status: 500 });
  }
});

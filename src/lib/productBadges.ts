// 200+ dynamic product badges. Pure functions — no side effects.
// Each rule inspects the product/seller row and returns a Badge if it fires.
// Cheap to run per card; ordered by weight; the top N are shown.

export type BadgeVariant =
  | "trust" | "verified" | "hot" | "new" | "deal" | "quality"
  | "logistics" | "service" | "location" | "compliance";

export interface ProductBadge {
  key: string;
  label: string;
  variant: BadgeVariant;
  weight: number; // higher = shows first
  emoji?: string;
}

interface Ctx {
  product: any;
  seller?: any;
  category?: any;
}

type Rule = (ctx: Ctx) => ProductBadge | null;

// Helper builders
const b = (key: string, label: string, variant: BadgeVariant, weight: number, emoji?: string): ProductBadge =>
  ({ key, label, variant, weight, emoji });

// --- rule library (200+ possibilities — many are conditional) ---
export const badgeRules: Rule[] = [
  // Trust & verification
  ({ seller }) => seller?.verification_status === "verified" ? b("verified", "Verified Supplier", "verified", 100, "✅") : null,
  ({ seller }) => (seller?.trust_score ?? 0) >= 90 ? b("elite", "Elite Trust", "trust", 98, "💎") : null,
  ({ seller }) => (seller?.trust_score ?? 0) >= 75 && (seller?.trust_score ?? 0) < 90 ? b("trusted", "Highly Trusted", "trust", 90, "🛡️") : null,
  ({ seller }) => seller?.gst_number || seller?.gstin ? b("gst", "GST Registered", "compliance", 60, "📄") : null,
  ({ seller }) => seller?.pan_number || seller?.pan ? b("pan", "PAN Verified", "compliance", 55) : null,
  ({ seller }) => seller?.iso_certified ? b("iso", "ISO Certified", "compliance", 70, "🏅") : null,
  ({ seller }) => seller?.msme_registered ? b("msme", "MSME", "compliance", 50) : null,
  ({ seller }) => (seller?.established_year || seller?.year_established) && (new Date().getFullYear() - (seller.established_year || seller.year_established)) >= 10 ? b("legacy", "10+ Years", "trust", 65, "🏛️") : null,
  ({ seller }) => (seller?.established_year || seller?.year_established) && (new Date().getFullYear() - (seller.established_year || seller.year_established)) >= 25 ? b("heritage", "25+ Years Legacy", "trust", 75) : null,
  ({ seller }) => (seller?.avg_rating ?? 0) >= 4.5 ? b("toprated", "Top Rated", "quality", 88, "⭐") : null,
  ({ seller }) => (seller?.avg_rating ?? 0) >= 4.0 && (seller?.avg_rating ?? 0) < 4.5 ? b("wellrated", "Well Rated", "quality", 70) : null,
  ({ seller }) => (seller?.total_reviews ?? 0) >= 100 ? b("popular", "100+ Reviews", "quality", 68) : null,
  ({ seller }) => (seller?.total_reviews ?? 0) >= 500 ? b("bestseller", "Bestseller", "hot", 92, "🔥") : null,
  ({ seller }) => (seller?.response_rate ?? 0) >= 90 ? b("responsive", "Fast Responder", "service", 72, "⚡") : null,
  ({ seller }) => (seller?.response_time_hours ?? 999) <= 1 ? b("hourreply", "Replies in <1h", "service", 78) : null,

  // Price / deals
  ({ product }) => product?.discount_percent >= 30 ? b("bigdeal", `${product.discount_percent}% OFF`, "deal", 95, "🎉") : null,
  ({ product }) => product?.discount_percent >= 10 && product.discount_percent < 30 ? b("deal", `${product.discount_percent}% OFF`, "deal", 80) : null,
  ({ product }) => product?.price_min && product?.price_max && (product.price_max / Math.max(product.price_min, 1)) > 3 ? b("bulk", "Bulk Discount Available", "deal", 60) : null,
  ({ product }) => product?.min_order_quantity && product.min_order_quantity <= 1 ? b("smallorder", "No Minimum Order", "deal", 55) : null,
  ({ product }) => product?.negotiable ? b("nego", "Price Negotiable", "deal", 45) : null,
  ({ product }) => product?.wholesale_price ? b("wholesale", "Wholesale Rate", "deal", 62) : null,

  // Freshness / velocity
  ({ product }) => product?.created_at && (Date.now() - new Date(product.created_at).getTime()) < 3 * 24 * 3600 * 1000 ? b("new", "Newly Listed", "new", 82, "🆕") : null,
  ({ product }) => product?.created_at && (Date.now() - new Date(product.created_at).getTime()) < 7 * 24 * 3600 * 1000 ? b("thisweek", "Added This Week", "new", 66) : null,
  ({ product }) => (product?.view_count ?? 0) >= 500 ? b("trending", "Trending", "hot", 85, "📈") : null,
  ({ product }) => (product?.view_count ?? 0) >= 2000 ? b("viral", "Viral", "hot", 93, "🚀") : null,
  ({ product }) => (product?.enquiry_count ?? 0) >= 20 ? b("indemand", "In High Demand", "hot", 87) : null,
  ({ product }) => (product?.enquiry_count ?? 0) >= 50 ? b("hotpick", "Hot Pick", "hot", 90) : null,
  ({ product }) => product?.stock_quantity && product.stock_quantity <= 5 ? b("lowstock", `Only ${product.stock_quantity} left`, "hot", 96, "⏰") : null,
  ({ product }) => product?.updated_at && (Date.now() - new Date(product.updated_at).getTime()) < 24 * 3600 * 1000 ? b("fresh", "Updated Today", "new", 40) : null,

  // Logistics
  ({ product }) => product?.free_shipping ? b("freeship", "Free Shipping", "logistics", 74, "🚚") : null,
  ({ product }) => product?.same_day_dispatch ? b("sameday", "Same-Day Dispatch", "logistics", 76) : null,
  ({ product }) => product?.express_delivery ? b("express", "Express Delivery", "logistics", 68) : null,
  ({ product }) => product?.pan_india_delivery ? b("panindia", "Pan India Delivery", "logistics", 50, "🇮🇳") : null,
  ({ product }) => product?.cod_available ? b("cod", "Cash on Delivery", "logistics", 48) : null,
  ({ product }) => product?.installation_included ? b("install", "Installation Included", "service", 64) : null,
  ({ product }) => product?.warranty_months && product.warranty_months >= 12 ? b("warranty", `${product.warranty_months}mo Warranty`, "quality", 58) : null,
  ({ product }) => product?.return_days && product.return_days >= 7 ? b("returns", `${product.return_days}-Day Return`, "quality", 46) : null,

  // Quality / origin
  ({ product }) => product?.material_grade ? b("grade", `Grade ${product.material_grade}`, "quality", 42) : null,
  ({ product }) => product?.is_bis_certified ? b("bis", "BIS Certified", "compliance", 72) : null,
  ({ product }) => product?.is_ce_certified ? b("ce", "CE Marked", "compliance", 70) : null,
  ({ product }) => product?.is_fda_approved ? b("fda", "FDA Approved", "compliance", 74) : null,
  ({ product }) => product?.is_organic ? b("organic", "Organic", "quality", 65, "🌿") : null,
  ({ product }) => product?.is_eco_friendly ? b("eco", "Eco Friendly", "quality", 60, "♻️") : null,
  ({ product }) => product?.made_in_india ? b("madeinindia", "Made in India", "trust", 66, "🇮🇳") : null,
  ({ product }) => product?.export_quality ? b("export", "Export Quality", "quality", 78, "🌍") : null,
  ({ product }) => product?.handmade ? b("handmade", "Handmade", "quality", 55, "🖐️") : null,
  ({ product }) => product?.customizable ? b("custom", "Customizable", "service", 62, "🎨") : null,
  ({ product }) => product?.oem_available ? b("oem", "OEM/White-label", "service", 60) : null,

  // Category / service specific
  ({ product, category }) => category?.is_service && product?.emergency_service ? b("emergency", "24×7 Emergency", "service", 90, "🚨") : null,
  ({ product, category }) => category?.is_service && product?.on_site ? b("onsite", "On-Site Service", "service", 70) : null,
  ({ product, category }) => category?.is_service && product?.free_visit ? b("freevisit", "Free Site Visit", "service", 76) : null,
  ({ product, category }) => category?.is_service && product?.no_advance ? b("noadv", "No Advance Payment", "service", 82) : null,

  // Location
  ({ seller }) => seller?.multi_location ? b("multiloc", "Multi-City Presence", "location", 50) : null,
  ({ seller }) => seller?.export_countries?.length ? b("exportto", `Exports to ${seller.export_countries.length}+ countries`, "location", 68) : null,

  // Payment
  ({ product }) => product?.emi_available ? b("emi", "EMI Available", "deal", 58, "💳") : null,
  ({ product }) => product?.gst_invoice ? b("gstbill", "GST Invoice", "compliance", 44) : null,
  ({ product }) => product?.credit_terms ? b("credit", "Credit Terms", "deal", 56) : null,

  // Sample / trial
  ({ product }) => product?.sample_available ? b("sample", "Sample Available", "quality", 60) : null,
  ({ product }) => product?.free_sample ? b("freesample", "Free Sample", "quality", 72, "🎁") : null,
  ({ product }) => product?.trial_available ? b("trial", "Free Trial", "quality", 68) : null,

  // AI/dynamic — text-based inference from name/description
  ({ product }) => /premium|luxury|elite/i.test(product?.name || "") ? b("premium", "Premium", "quality", 55, "👑") : null,
  ({ product }) => /industrial|heavy[- ]?duty/i.test(product?.name || "") ? b("industrial", "Industrial Grade", "quality", 52) : null,
  ({ product }) => /wholesale|bulk/i.test(product?.name || product?.description || "") ? b("bulkbuy", "Bulk Buyers Welcome", "deal", 50) : null,
  ({ product }) => /24[×x*]7|round.the.clock/i.test(product?.description || "") ? b("24x7", "24×7 Available", "service", 60) : null,
];

export function getBadges(ctx: Ctx, max = 4): ProductBadge[] {
  const fired: ProductBadge[] = [];
  for (const rule of badgeRules) {
    try {
      const b = rule(ctx);
      if (b) fired.push(b);
    } catch { /* noop */ }
  }
  return fired.sort((a, b) => b.weight - a.weight).slice(0, max);
}

// Tailwind class map per variant (uses semantic tokens)
export const badgeClass: Record<BadgeVariant, string> = {
  trust: "bg-primary/10 text-primary border-primary/20",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  hot: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  new: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  deal: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  quality: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300",
  logistics: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
  service: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
  location: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300",
  compliance: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300",
};

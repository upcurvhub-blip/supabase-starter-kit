import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ChevronRight, IndianRupee } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { brandTitle, canonical } from "@/lib/seo/meta";
import { slugify } from "@/lib/seo/slugs";
import { ProductGridSkeleton } from "@/components/ui/loading-states";

export default function BrandPage() {
  const { brandSlug, categorySlug } = useParams<{ brandSlug: string; categorySlug?: string }>();
  const [brandName, setBrandName] = useState<string>("");
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Prefer registered brand
      const { data: brand } = await supabase
        .from("brands")
        .select("*")
        .eq("slug", brandSlug || "")
        .maybeSingle();

      let displayName = brand?.name || "";
      let cat: any = null;
      if (categorySlug) {
        const { data } = await supabase.from("categories").select("*").eq("slug", categorySlug).maybeSingle();
        cat = data;
        setCategory(cat);
      }

      // Query products where brand text matches slugified
      const q = supabase
        .from("products")
        .select("*, seller_profiles!inner(id, business_name, city, slug, status)")
        .eq("is_active", true)
        .eq("seller_profiles.status", "approved")
        .not("brand", "is", null);
      if (cat) q.eq("category_id", cat.id);
      const { data: allBrandProducts } = await q.limit(200);

      const filtered = (allBrandProducts || []).filter((p: any) => slugify(p.brand || "") === brandSlug);
      if (!displayName && filtered[0]) displayName = filtered[0].brand;
      if (!active) return;
      setBrandName(displayName || (brandSlug || "").replace(/-/g, " "));
      setProducts(filtered);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [brandSlug, categorySlug]);

  const title = brandTitle(brandName, category?.name);
  const path = categorySlug ? `/brand/${brandSlug}/${categorySlug}` : `/brand/${brandSlug}`;
  const url = canonical(path);
  const desc = `Explore ${brandName}${category ? ` ${category.name.toLowerCase()}` : ""} products from verified Indian suppliers on ${SITE_NAME}. Compare prices, specifications and connect instantly.`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Brand",
      name: brandName,
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description: desc,
      url,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Brands", item: `${SITE_URL}/brands` },
          { "@type": "ListItem", position: 3, name: brandName, item: `${SITE_URL}/brand/${brandSlug}` },
          ...(category ? [{ "@type": "ListItem", position: 4, name: category.name, item: url }] : []),
        ],
      },
    },
  ];

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="bg-gradient-to-r from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-6 md:py-10">
          <nav className="text-xs md:text-sm mb-3 text-muted-foreground flex items-center gap-1 flex-wrap">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span>Brands</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{brandName}</span>
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold capitalize">{brandName}{category ? ` — ${category.name}` : ""}</h1>
          <p className="text-sm text-muted-foreground mt-2">{products.length} products from verified suppliers</p>
          {/* Unique brand context — prevents near-duplicate flags on templated brand pages */}
          {products.length > 0 && (() => {
            const prices = products.map((p: any) => p.price_min).filter((n: any) => typeof n === "number");
            const cities = Array.from(new Set(products.map((p: any) => p.seller_profiles?.city).filter(Boolean))) as string[];
            const min = prices.length ? Math.min(...prices) : null;
            const max = prices.length ? Math.max(...prices) : null;
            return (
              <div className="mt-4 max-w-3xl text-sm text-muted-foreground space-y-2">
                <p>
                  {products.length} {brandName}{category ? ` ${category.name.toLowerCase()}` : ""} product{products.length === 1 ? "" : "s"} currently listed on {SITE_NAME}
                  {cities.length > 0 && ` from suppliers in ${cities.slice(0, 4).join(", ")}${cities.length > 4 ? ` and ${cities.length - 4} more cities` : ""}`}.
                  {min !== null && max !== null && min !== max && ` Prices range from ₹${min.toLocaleString()} to ₹${max.toLocaleString()} per unit depending on specification and order quantity.`}
                  {min !== null && max !== null && min === max && ` Typical listed price is around ₹${min.toLocaleString()} per unit.`}
                </p>
                <p>
                  Every {brandName} seller listed here has passed our supplier vetting. Send a single enquiry to reach multiple dealers and compare quotes before you commit.
                </p>
              </div>
            );
          })()}
        </div>
      </div>


      <div className="container mx-auto px-4 py-6 md:py-8">
        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : products.length === 0 ? (
          <p className="text-muted-foreground">No products found for this brand yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {products.map((p) => (
              <Card key={p.id} className="overflow-hidden card-hover">
                <Link to={`/product/${p.slug || p.id}`} className="block">
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {p.primary_image_url || (p.images as any)?.[0] ? (
                      <img src={p.primary_image_url || (p.images as any)[0]} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </Link>
                <CardContent className="p-3 space-y-1">
                  <Link to={`/product/${p.slug || p.id}`} className="font-semibold text-sm hover:text-primary line-clamp-2 block min-h-[2.25rem]">
                    {p.name}
                  </Link>
                  {p.price_min && (
                    <div className="text-primary font-bold text-sm flex items-center">
                      <IndianRupee className="h-3 w-3" />
                      {p.price_min.toLocaleString()}
                    </div>
                  )}
                  {p.seller_profiles?.business_name && (
                    <div className="text-[11px] text-muted-foreground truncate">{p.seller_profiles.business_name} · {p.seller_profiles.city}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}

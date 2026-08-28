import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, ShieldCheck, Package, Phone, MessageSquare } from "lucide-react";

/**
 * Programmatic SEO landing: /suppliers/:categorySlug/:citySlug
 * Renders a keyword-rich page like "Cotton T-Shirt Suppliers in Tiruppur"
 * with JSON-LD, canonical, and matching sellers ranked by trust score.
 */
export default function SuppliersByCityCategory() {
  const { categorySlug = "", citySlug = "" } = useParams();
  const [category, setCategory] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const cityDisplay = useMemo(
    () => citySlug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
    [citySlug],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase.from("categories").select("*").eq("slug", categorySlug).maybeSingle();
      setCategory(cat);
      if (cat) {
        // Sellers with active products in this category + city
        const { data: prods } = await supabase
          .from("products")
          .select("id, name, slug, primary_image_url, price_min, price_max, currency, unit, seller_id, seller_profiles(id, business_name, city, slug, trust_score, verification_status, phone, whatsapp, logo_url)")
          .eq("category_id", cat.id)
          .eq("is_active", true)
          .limit(48);
        const filtered = (prods || []).filter(
          (p: any) => (p.seller_profiles?.city || "").toLowerCase() === cityDisplay.toLowerCase()
        );
        setProducts(filtered);
        const map = new Map<string, any>();
        filtered.forEach((p: any) => {
          if (p.seller_profiles?.id && !map.has(p.seller_profiles.id)) map.set(p.seller_profiles.id, p.seller_profiles);
        });
        setSellers(Array.from(map.values()).sort((a, b) => (b.trust_score || 0) - (a.trust_score || 0)));
      }
      setLoading(false);
    })();
  }, [categorySlug, citySlug, cityDisplay]);

  const title = category
    ? `${category.name} Suppliers in ${cityDisplay} — Verified Manufacturers & Wholesalers | Upcurv Trade`
    : `Suppliers in ${cityDisplay} | Upcurv Trade`;
  const description = category
    ? `Find verified ${category.name.toLowerCase()} suppliers, manufacturers and wholesalers in ${cityDisplay}. Compare prices, get quotes and connect on WhatsApp — all on Upcurv Trade.`
    : `Verified B2B suppliers in ${cityDisplay} on Upcurv Trade.`;
  const url = `https://upcurvtrade.upcurv.in/suppliers/${categorySlug}/${citySlug}`;

  const jsonLd = category
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: title,
        description,
        url,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: sellers.slice(0, 10).map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Organization",
              name: s.business_name,
              address: { "@type": "PostalAddress", addressLocality: s.city },
              url: `https://upcurvtrade.upcurv.in/seller-profile/${s.slug || s.id}`,
            },
          })),
        },
      }
    : null;

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
      </Helmet>

      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <nav className="text-xs text-muted-foreground mb-3">
            <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
            <Link to="/categories" className="hover:text-primary">Categories</Link>
            {category && <> › <Link to={`/category/${category.slug}`} className="hover:text-primary">{category.name}</Link></>}
            {" › "}{cityDisplay}
          </nav>
          <h1 className="text-2xl md:text-4xl font-bold">
            {category?.name || "Suppliers"} in {cityDisplay}
          </h1>
          <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
            Explore {sellers.length} verified {category?.name?.toLowerCase() || "supplier"}
            {sellers.length === 1 ? "" : "s"} in {cityDisplay}. Compare, chat on WhatsApp, and request quotes instantly.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-10 space-y-10">
        {loading ? (
          <p className="text-muted-foreground">Loading suppliers…</p>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-semibold mb-4">Top suppliers</h2>
              {sellers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No {category?.name?.toLowerCase() || "suppliers"} listed in {cityDisplay} yet.{" "}
                  <Link to="/post-requirement" className="text-primary underline">Post a requirement</Link> and get matched.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sellers.map((s) => (
                    <Card key={s.id} className="hover:shadow-md transition">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                            {s.logo_url ? <img src={s.logo_url} alt={s.business_name} className="w-full h-full object-cover" /> : <Building2 className="h-6 w-6 text-muted-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link to={`/seller-profile/${s.slug || s.id}`} className="font-semibold hover:text-primary line-clamp-1">{s.business_name}</Link>
                            <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</div>
                            {s.verification_status === "verified" && (
                              <Badge variant="outline" className="mt-1 text-[10px] gap-1 border-trust/40 text-trust"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {(s.whatsapp || s.phone) && (
                            <a href={`https://wa.me/${(s.whatsapp || s.phone).replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center justify-center gap-1 rounded-md border border-[#25D366] text-[#128C7E] py-1.5 font-medium">
                              <MessageSquare className="h-3 w-3" /> WhatsApp
                            </a>
                          )}
                          {s.phone && (
                            <a href={`tel:${s.phone}`} className="text-xs inline-flex items-center justify-center gap-1 rounded-md border border-primary text-primary py-1.5 font-medium">
                              <Phone className="h-3 w-3" /> Call
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {products.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Products from {cityDisplay}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products.slice(0, 12).map((p: any) => (
                    <Link key={p.id} to={`/product/${p.slug || p.id}`} className="group">
                      <Card className="overflow-hidden hover:shadow-md transition h-full">
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          {p.primary_image_url ? <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium line-clamp-2 group-hover:text-primary">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{p.seller_profiles?.business_name}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <section className="prose prose-sm max-w-none">
              <h2 className="text-xl font-semibold">Buying {category?.name?.toLowerCase() || "products"} in {cityDisplay}</h2>
              <p className="text-muted-foreground">
                Upcurv Trade helps you discover trusted {category?.name?.toLowerCase() || "B2B"} suppliers in {cityDisplay} with
                verified GST, response-rate scores and real trade references. Every quote is free — start with WhatsApp or
                post a detailed requirement to invite multiple sellers.
              </p>
            </section>
          </>
        )}
      </div>
    </MarketplaceLayout>
  );
}

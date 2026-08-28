import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronRight, MapPin, CheckCircle2, Phone, MessageCircle } from "lucide-react";

import { SITE_NAME, SITE_URL } from "@/lib/site";
import { cityHubTitle, canonical } from "@/lib/seo/meta";
import { ListSkeleton } from "@/components/ui/loading-states";

function humanCity(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CityHubPage() {
  const { citySlug, categorySlug } = useParams<{ citySlug: string; categorySlug?: string }>();
  const cityName = humanCity(citySlug || "");
  const [category, setCategory] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      let cat: any = null;
      if (categorySlug) {
        const { data } = await supabase.from("categories").select("*").eq("slug", categorySlug).maybeSingle();
        cat = data;
        setCategory(cat);
      }

      const { data: sellersRaw } = await supabase
        .from("seller_profiles")
        .select("id, business_name, company_name, slug, city, state, address, pincode, verification_status, logo_url, primary_category_id, trust_score, phone, whatsapp")
        .eq("status", "approved")
        .limit(200);
      const filtered = (sellersRaw || []).filter(
        (s: any) => s.city && s.city.toLowerCase().replace(/[^a-z0-9]+/g, "-") === citySlug
      );
      if (!active) return;
      setSellers(filtered);

      // Categories present in the city (also used to label each seller card)
      const catIds = Array.from(new Set(filtered.map((s: any) => s.primary_category_id).filter(Boolean)));
      if (catIds.length) {
        const { data: cats } = await supabase.from("categories").select("id, name, slug").in("id", catIds);
        setCategories(cats || []);
      }

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [citySlug, categorySlug]);

  const title = category
    ? `${category.name} Manufacturers & Suppliers in ${cityName}`
    : cityHubTitle(cityName);
  const path = categorySlug ? `/city/${citySlug}/${categorySlug}` : `/city/${citySlug}`;
  const url = canonical(path);
  const desc = category
    ? `Discover verified ${category.name.toLowerCase()} manufacturers and suppliers in ${cityName} on ${SITE_NAME}. Get instant quotes, compare prices and connect via WhatsApp.`
    : `Browse verified manufacturers, wholesalers and suppliers based in ${cityName} on ${SITE_NAME}. Filter by category, check trust scores and contact suppliers directly.`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: title,
      description: desc,
      url,
      about: { "@type": "City", name: cityName, address: { "@type": "PostalAddress", addressLocality: cityName, addressCountry: "IN" } },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Cities", item: `${SITE_URL}/cities` },
          { "@type": "ListItem", position: 3, name: cityName, item: `${SITE_URL}/city/${citySlug}` },
          ...(category ? [{ "@type": "ListItem", position: 4, name: category.name, item: url }] : []),
        ],
      },
    },
  ];

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{title} | {SITE_NAME}</title>
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
            <Link to={`/city/${citySlug}`} className="hover:text-foreground">{cityName}</Link>
            {category && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{category.name}</span>
              </>
            )}
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            {title}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">{sellers.length} verified businesses</p>
          {/* Unique local context to avoid near-duplicate content vs sibling city/category pages */}
          <div className="mt-4 max-w-3xl text-sm text-muted-foreground space-y-2">
            <p>
              {sellers.length > 0 ? `${sellers.length} verified ` : "Verified "}
              {category ? category.name.toLowerCase() : "businesses"} operating out of {cityName}
              {category ? "" : " across categories like machinery, textiles, packaging and industrial supplies"}.
              {sellers.filter((s: any) => s.verification_status === "verified").length > 0 &&
                ` ${sellers.filter((s: any) => s.verification_status === "verified").length} of these carry a verified badge after document and GST checks.`}
            </p>
            <p>
              Most {cityName} suppliers on {SITE_NAME} respond to enquiries within a few hours on WhatsApp or phone.
              Compare prices, MOQs and delivery terms below before shortlisting — enquiries are free and go straight to the seller.
            </p>
          </div>
        </div>
      </div>


      <div className="container mx-auto px-4 py-6 md:py-8 space-y-10">
        {!category && categories.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Categories in {cityName}</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/city/${citySlug}/${c.slug}`}
                  className="text-sm px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors"
                >
                  {c.name} in {cityName}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Top Businesses</h2>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : sellers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No businesses listed in {cityName} yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sellers.map((s) => {
                const cat = categories.find((c: any) => c.id === s.primary_category_id);
                const address = [s.address, s.city, s.state, s.pincode].filter(Boolean).join(", ");
                return (
                  <Card key={s.id} className="h-full">
                    <CardContent className="p-4 flex h-full flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden">
                          {s.logo_url ? (
                            <img src={s.logo_url} alt={s.business_name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/seller-profile/${s.slug || s.id}`} className="font-semibold hover:text-primary block leading-tight line-clamp-2">
                            {s.business_name || s.company_name}
                          </Link>
                          {s.verification_status === "verified" && (
                            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-trust/10 px-2 py-0.5 text-[11px] font-medium text-trust">
                              <CheckCircle2 className="h-3 w-3" /> Verified
                            </span>
                          )}
                        </div>
                      </div>

                      {cat && (
                        <Link
                          to={`/city/${citySlug}/${cat.slug}`}
                          className="w-fit rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:border-primary hover:text-primary"
                        >
                          {cat.name}
                        </Link>
                      )}

                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground line-clamp-3">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                        {address || s.city}
                      </p>

                      <div className="mt-auto flex gap-2 pt-1">
                        <Button size="sm" className="flex-1" asChild>
                          <Link to={`/seller-profile/${s.slug || s.id}`}>View Products</Link>
                        </Button>
                        {s.phone && (
                          <Button size="sm" variant="outline" asChild>
                            <a href={`tel:${s.phone}`} aria-label={`Call ${s.business_name}`}>
                              <Phone className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {s.whatsapp && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={`https://wa.me/${String(s.whatsapp).replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`WhatsApp ${s.business_name}`}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

        </section>
      </div>
    </MarketplaceLayout>
  );
}

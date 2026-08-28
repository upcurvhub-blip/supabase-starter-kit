import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Phone, MessageCircle, ShieldCheck, ChevronRight, MapPin } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { directoryTitle, directoryDescription, canonical } from "@/lib/seo/meta";
import { ListSkeleton } from "@/components/ui/loading-states";

type Role = "manufacturers" | "suppliers" | "exporters" | "dealers" | "wholesalers";

interface Props {
  role: Role;
}

function humanCity(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function DirectoryPage({ role }: Props) {
  const { categorySlug, citySlug } = useParams<{ categorySlug: string; citySlug?: string }>();
  const [category, setCategory] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [siblingCities, setSiblingCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const cityName = citySlug ? humanCity(citySlug) : undefined;
  const rolLabel = role.charAt(0).toUpperCase() + role.slice(1);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      if (!categorySlug) return;
      const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", categorySlug)
        .maybeSingle();
      if (!active) return;
      setCategory(cat);
      if (!cat) {
        setLoading(false);
        return;
      }

      // Products in this category
      let q = supabase
        .from("products")
        .select("*, seller_profiles!inner(id, business_name, company_name, city, verification_status, logo_url, slug, phone, whatsapp, trust_score, status)")
        .eq("category_id", cat.id)
        .eq("is_active", true)
        .eq("seller_profiles.status", "approved");
      const { data: prods } = await q.limit(60);
      const list = prods || [];

      // Filter by city if given
      const cityFiltered = citySlug
        ? list.filter((p: any) => {
            const c = p.seller_profiles?.city || "";
            return c.toLowerCase().replace(/[^a-z0-9]+/g, "-") === citySlug;
          })
        : list;

      setProducts(cityFiltered);

      // Deduplicate sellers
      const sellerMap = new Map<string, any>();
      for (const p of cityFiltered) {
        const s = p.seller_profiles;
        if (s && !sellerMap.has(s.id)) sellerMap.set(s.id, s);
      }
      setSellers(Array.from(sellerMap.values()));

      // Sibling cities for internal linking
      const cities = new Set<string>();
      for (const p of list) {
        const c = p.seller_profiles?.city;
        if (c) cities.add(c);
      }
      setSiblingCities(Array.from(cities).slice(0, 12));

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [categorySlug, citySlug]);

  const title = category
    ? directoryTitle(role, category.name, cityName)
    : `${rolLabel} — ${SITE_NAME}`;
  const desc = category
    ? directoryDescription(role, category.name, cityName, sellers.length)
    : "";
  const path = citySlug ? `/${role}/${categorySlug}/${citySlug}` : `/${role}/${categorySlug}`;
  const url = canonical(path);

  const jsonLd = category
    ? [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description: desc,
          url,
          about: { "@type": "Thing", name: category.name },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: rolLabel, item: `${SITE_URL}/${role}` },
              { "@type": "ListItem", position: 3, name: category.name, item: `${SITE_URL}/${role}/${categorySlug}` },
              ...(cityName ? [{ "@type": "ListItem", position: 4, name: cityName, item: url }] : []),
            ],
          },
          mainEntity: {
            "@type": "ItemList",
            numberOfItems: sellers.length,
            itemListElement: sellers.slice(0, 20).map((s: any, i: number) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${SITE_URL}/seller-profile/${s.slug || s.id}`,
              name: s.business_name || s.company_name,
            })),
          },
        },
      ]
    : [];

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        {jsonLd.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        )}
      </Helmet>

      <div className="bg-gradient-to-r from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-6 md:py-10">
          <nav className="text-xs md:text-sm mb-3 text-muted-foreground flex items-center gap-1 flex-wrap">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="capitalize">{role}</span>
            {category && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link to={`/${role}/${category.slug}`} className="hover:text-foreground">{category.name}</Link>
              </>
            )}
            {cityName && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{cityName}</span>
              </>
            )}
          </nav>
          <h1 className="text-2xl md:text-3xl font-bold">
            {category?.name || "Directory"} {rolLabel}
            {cityName ? ` in ${cityName}` : " in India"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {sellers.length} verified {role} · {products.length} products listed
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-10">
        {/* Sellers */}
        <section>
          <h2 className="text-lg md:text-xl font-semibold mb-4">Top {rolLabel}</h2>
          {loading ? (
            <ListSkeleton rows={4} />
          ) : sellers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No {role} listed yet for this combination.</p>
          ) : (
            <div className="grid gap-3">
              {sellers.map((s) => (
                <Card key={s.id} className="overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                    <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={s.business_name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/seller-profile/${s.slug || s.id}`}
                        className="font-semibold hover:text-primary flex items-center gap-1.5"
                      >
                        {s.business_name || s.company_name}
                        {s.verification_status === "verified" && (
                          <ShieldCheck className="h-4 w-4 text-trust shrink-0" />
                        )}
                      </Link>
                      {s.city && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {s.city}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {s.whatsapp && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                          </a>
                        </Button>
                      )}
                      {s.phone && (
                        <Button size="sm" asChild>
                          <a href={`tel:${s.phone}`}>
                            <Phone className="h-4 w-4 mr-1" /> Call
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Sibling city internal linking */}
        {siblingCities.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">{category?.name} {rolLabel} in Other Cities</h2>
            <div className="flex flex-wrap gap-2">
              {siblingCities.map((c) => {
                const s = c.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                if (s === citySlug) return null;
                return (
                  <Link
                    key={c}
                    to={`/${role}/${categorySlug}/${s}`}
                    className="text-sm px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors"
                  >
                    {category?.name} in {c}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Cross-role linking */}
        {category && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Related Directories</h2>
            <div className="flex flex-wrap gap-2">
              {(["manufacturers", "suppliers", "exporters", "wholesalers"] as Role[])
                .filter((r) => r !== role)
                .map((r) => (
                  <Link
                    key={r}
                    to={`/${r}/${categorySlug}${citySlug ? `/${citySlug}` : ""}`}
                    className="text-sm px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors capitalize"
                  >
                    {category.name} {r}
                  </Link>
                ))}
              <Link
                to={`/category/${categorySlug}`}
                className="text-sm px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors"
              >
                Browse all {category.name} products
              </Link>
              <Link
                to={`/guides/${categorySlug}`}
                className="text-sm px-3 py-1.5 rounded-full border hover:border-primary hover:text-primary transition-colors"
              >
                {category.name} Buying Guide
              </Link>
            </div>
          </section>
        )}
      </div>
    </MarketplaceLayout>
  );
}

import { AdSlot } from "@/components/AdSlot";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, MapPin, ShieldCheck, Phone, MessageSquare, Package, ArrowRight } from "lucide-react";
import { getDeviceId } from "@/hooks/useDeviceId";

const BASE = "https://upcurvtrade.upcurv.in";

function slugifyCity(s: string) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function LocalLandingPage() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [relatedPages, setRelatedPages] = useState<any[]>([]);
  const [relatedCategories, setRelatedCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: p } = await supabase.from("local_landing_pages").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
      setPage(p);
      if (p) {
        // Fire-and-forget view tracking
        try {
          await supabase.rpc("record_local_page_view", {
            p_page_id: p.id,
            p_device_id: getDeviceId(),
            p_session_id: sessionStorage.getItem("bt_ephemeral_session_id") || null,
            p_referrer: document.referrer || null,
            p_path: window.location.pathname,
            p_user_agent: navigator.userAgent,
          });
        } catch {}

        if (p.category_id) {
          const { data: c } = await supabase.from("categories").select("id, name, slug").eq("id", p.category_id).maybeSingle();
          setCategory(c);
        }
        const { data: sRows } = await supabase.from("local_landing_page_sellers").select("seller_id, position, is_featured, seller_profiles:seller_id(id, business_name, company_name, city, slug, trust_score, verification_status, phone, whatsapp, logo_url, about, description)").eq("page_id", p.id).order("position");
        const list = (sRows || []).map((r: any) => ({ ...r.seller_profiles, is_featured: r.is_featured })).filter(Boolean);
        setSellers(list);
        if (list.length) {
          const ids = list.map((s: any) => s.id);
          let pq = supabase.from("products").select("id, name, slug, primary_image_url, price, currency, seller_id, category_id").in("seller_id", ids).eq("is_active", true).limit(24);
          if (p.category_id) pq = pq.eq("category_id", p.category_id);
          const { data: prods } = await pq;
          setProducts(prods || []);
        }

        // Internal linking: other local pages in same city or same category
        const [{ data: same }, { data: cats }] = await Promise.all([
          supabase.from("local_landing_pages").select("slug, title, city, category_id").eq("is_published", true).neq("id", p.id).or(`city.ilike.${p.city},category_id.eq.${p.category_id || "00000000-0000-0000-0000-000000000000"}`).limit(12),
          supabase.from("categories").select("id, name, slug").eq("is_active", true).limit(20),
        ]);
        setRelatedPages(same || []);
        setRelatedCategories(cats || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <MarketplaceLayout><div className="container mx-auto p-8 text-center text-muted-foreground">Loading…</div></MarketplaceLayout>;
  if (!page) return <MarketplaceLayout><div className="container mx-auto p-8 text-center">Page not found</div></MarketplaceLayout>;

  const url = `${BASE}/local/${page.slug}`;
  const faqItems: Array<{ q: string; a: string }> = Array.isArray(page.faq) ? page.faq : [];
  const citySlug = slugifyCity(page.city);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: page.title,
      description: page.meta_description,
      url,
      mainEntity: {
        "@type": "ItemList",
        itemListElement: sellers.slice(0, 20).map((s, i) => ({
          "@type": "ListItem", position: i + 1,
          item: {
            "@type": "LocalBusiness",
            name: s.business_name || s.company_name,
            address: { "@type": "PostalAddress", addressLocality: s.city, addressRegion: page.state, addressCountry: "IN" },
            telephone: s.phone,
            url: `${BASE}/seller-profile/${s.slug || s.id}`,
          },
        })),
      },
    },
    { "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: page.city, item: url },
      ] },
    ...(faqItems.length ? [{ "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }] : []),
  ];

  return (
    <MarketplaceLayout>
      <div className="container mx-auto px-4 pt-4"><AdSlot placement="local_page" /></div>

      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.meta_description || ""} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.meta_description || ""} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="container mx-auto px-4 py-8 md:py-14 relative">
          <nav className="text-xs text-muted-foreground mb-3">
            <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
            {category && <><Link to={`/category/${category.slug}`} className="hover:text-primary">{category.name}</Link> › </>}
            <Link to={`/city/${citySlug}`} className="hover:text-primary">{page.city}</Link>
          </nav>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-trust/10 text-trust text-xs font-semibold mb-3">
            <ShieldCheck className="h-3 w-3" /> Verified local suppliers
          </div>
          <h1 className="text-2xl md:text-4xl font-bold max-w-3xl">{page.h1}</h1>
          {page.hero_content && <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">{page.hero_content}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs"><Building2 className="h-3 w-3 text-primary" /> {sellers.length} {sellers.length === 1 ? "supplier" : "suppliers"}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs"><Package className="h-3 w-3 text-accent" /> {products.length} products</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-card border px-3 py-1 text-xs"><MapPin className="h-3 w-3 text-trust" /> {page.city}{page.state ? `, ${page.state}` : ""}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-10 space-y-10">
        {page.intro_html && <section className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: page.intro_html }} />}

        <section>
          <h2 className="text-xl font-semibold mb-4">Top Suppliers</h2>
          {sellers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sellers.map((s) => {
                const name = s.business_name || s.company_name;
                const initials = (name || "S").split(" ").slice(0, 2).map((x: string) => x[0]).join("").toUpperCase();
                const wa = (s.whatsapp || s.phone || "").replace(/[^0-9]/g, "");
                return (
                  <Card key={s.id} className={`group overflow-hidden hover:shadow-lg hover:border-primary/40 transition ${s.is_featured ? "ring-2 ring-primary" : ""}`}>
                    <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border overflow-hidden flex items-center justify-center shrink-0 font-bold text-primary">
                          {s.logo_url ? <img src={s.logo_url} alt={name} className="w-full h-full object-cover" /> : initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/seller-profile/${s.slug || s.id}`} className="font-semibold hover:text-primary line-clamp-1">{name}</Link>
                          <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city}</div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {s.verification_status === "verified" && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-trust/40 text-trust"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                            )}
                            {typeof s.trust_score === "number" && s.trust_score > 0 && (
                              <Badge variant="outline" className="text-[10px]">Trust {s.trust_score}%</Badge>
                            )}
                            {s.is_featured && <Badge className="text-[10px] bg-primary">Featured</Badge>}
                          </div>
                        </div>
                      </div>
                      {(s.about || s.description) && <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{s.about || s.description}</p>}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {wa && (
                          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center justify-center gap-1 rounded-md border border-[#25D366] text-[#128C7E] py-2 font-medium hover:bg-[#25D366]/10">
                            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                          </a>
                        )}
                        {s.phone && (
                          <a href={`tel:${s.phone}`} className="text-xs inline-flex items-center justify-center gap-1 rounded-md border border-primary text-primary py-2 font-medium hover:bg-primary/10">
                            <Phone className="h-3.5 w-3.5" /> Call
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {products.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Products from {page.city}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {products.map((p: any) => (
                <Link key={p.id} to={`/product/${p.slug || p.id}`} className="group">
                  <Card className="overflow-hidden hover:shadow-md transition h-full">
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {p.primary_image_url ? <img src={p.primary_image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : <Package className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium line-clamp-2 group-hover:text-primary">{p.name}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Internal linking hub */}
        <section className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4">Explore more</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {relatedPages.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Related local pages</h3>
                <ul className="space-y-1">
                  {relatedPages.map((rp) => (
                    <li key={rp.slug}>
                      <Link to={`/local/${rp.slug}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" /> {rp.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Browse categories in {page.city}</h3>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.slice(0, 12).map((c) => (
                  <Link key={c.id} to={`/suppliers/${c.slug}/${citySlug}`} className="text-xs px-2 py-1 rounded-full border hover:bg-primary/10 hover:border-primary/40">
                    {c.name} in {page.city}
                  </Link>
                ))}
              </div>
              {category && (
                <div className="mt-3">
                  <Link to={`/category/${category.slug}`} className="text-sm text-primary hover:underline">
                    See all {category.name} suppliers →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {faqItems.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible>
              {faqItems.map((f, i) => (
                <AccordionItem key={i} value={`f${i}`}>
                  <AccordionTrigger>{f.q}</AccordionTrigger>
                  <AccordionContent>{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}
      </div>
    </MarketplaceLayout>
  );
}

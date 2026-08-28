import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, MapPin, Building2, ShieldCheck, Phone, MessageSquare, ArrowRight, Package } from "lucide-react";

const BASE = "https://upcurvtrade.upcurv.in";

function slugifyCity(s: string) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function FindBusinesses() {
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: pgs }] = await Promise.all([
        supabase.from("categories").select("id, name, slug").eq("is_active", true).order("name").limit(60),
        supabase.from("local_landing_pages").select("id, title, slug, city, category_id").eq("is_published", true).order("updated_at", { ascending: false }).limit(60),
      ]);
      setCategories(cats || []);
      setPages(pgs || []);
    })();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setSellers([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("id, slug, business_name, company_name, city, state, logo_url, verification_status, trust_score, phone, whatsapp, about, description")
        .eq("status", "approved")
        .or(`business_name.ilike.%${q}%,company_name.ilike.%${q}%,city.ilike.%${q}%,about.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(24);
      setSellers(data || []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const matchedPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages.slice(0, 12);
    return pages.filter((p) =>
      (p.title || "").toLowerCase().includes(q) || (p.city || "").toLowerCase().includes(q)
    ).slice(0, 24);
  }, [query, pages]);

  const matchedCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories.slice(0, 12);
    return categories.filter((c) => (c.name || "").toLowerCase().includes(q)).slice(0, 12);
  }, [query, categories]);

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Find Businesses — Suppliers, Manufacturers & Dealers Near You | Upcurv Trade</title>
        <meta name="description" content="Find verified Indian businesses, suppliers, manufacturers and dealers by name, city or category. Instant search across Upcurv Trade's supplier directory." />
        <link rel="canonical" href={`${BASE}/find-businesses`} />
        <meta property="og:title" content="Find Businesses on Upcurv Trade" />
        <meta property="og:description" content="Search verified Indian suppliers, manufacturers and dealers by name, city or category." />
        <meta property="og:url" content={`${BASE}/find-businesses`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <h1 className="text-2xl md:text-4xl font-bold text-center">Find Verified Businesses</h1>
          <p className="text-sm md:text-base text-muted-foreground text-center mt-2">
            Search suppliers, manufacturers, dealers & service providers across India.
          </p>
          <div className="max-w-2xl mx-auto mt-6 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="e.g. followrr suppliers in coimbatore"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-12 h-14 text-base rounded-xl shadow-sm"
            />
          </div>
          {!query && (
            <div className="max-w-3xl mx-auto flex flex-wrap gap-2 justify-center mt-4 text-xs text-muted-foreground">
              {["cement in coimbatore", "textile suppliers", "steel manufacturers", "chemicals mumbai"].map((s) => (
                <button key={s} onClick={() => setQuery(s)} className="px-3 py-1.5 rounded-full border hover:bg-primary/10 hover:border-primary/40">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-10">
        {/* Local landing pages */}
        {matchedPages.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Matching supplier hubs</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {matchedPages.map((p) => (
                <Link key={p.id} to={`/local/${p.slug}`} className="group">
                  <Card className="hover:shadow-md hover:border-primary/40 transition">
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1"><MapPin className="h-3 w-3" />{p.city}</div>
                        <p className="font-medium line-clamp-2 group-hover:text-primary">{p.title}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Sellers */}
        {query && (
          <section>
            <div className="flex items-center justify-between mb-3 gap-2">
              <h2 className="text-lg font-semibold">
                {loading ? "Searching…" : sellers.length ? `${sellers.length} verified sellers` : "No sellers matched"}
              </h2>
              {sellers.length > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 border-trust/40 text-trust">
                  <ShieldCheck className="h-3 w-3" /> {sellers.filter((s) => s.verification_status === "verified").length} verified
                </Badge>
              )}
            </div>
            {sellers.length > 0 && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sellers.map((s) => <SupplierCard key={s.id} s={s} />)}
              </div>
            )}
          </section>
        )}

        {/* Categories */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Browse by category</h2>
          <div className="flex flex-wrap gap-2">
            {matchedCategories.map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`} className="text-sm px-3 py-1.5 rounded-full border hover:bg-primary/10 hover:border-primary/40">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

function SupplierCard({ s }: { s: any }) {
  const name = s.business_name || s.company_name;
  const wa = (s.whatsapp || s.phone || "").replace(/[^0-9]/g, "");
  const initials = (name || "S").split(" ").slice(0, 2).map((x: string) => x[0]).join("").toUpperCase();
  return (
    <Card className="group overflow-hidden hover:shadow-lg hover:border-primary/40 transition">
      <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 border overflow-hidden flex items-center justify-center shrink-0 font-bold text-primary">
            {s.logo_url ? <img src={s.logo_url} alt={name} className="w-full h-full object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/seller-profile/${s.slug || s.id}`} className="font-semibold hover:text-primary line-clamp-1">{name}</Link>
            <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{[s.city, s.state].filter(Boolean).join(", ") || "India"}</div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {s.verification_status === "verified" && (
                <Badge variant="outline" className="text-[10px] gap-1 border-trust/40 text-trust"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
              )}
              {typeof s.trust_score === "number" && s.trust_score > 0 && (
                <Badge variant="outline" className="text-[10px]">Trust {s.trust_score}%</Badge>
              )}
            </div>
          </div>
        </div>
        {(s.about || s.description) && (
          <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{s.about || s.description}</p>
        )}
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
}

// Cross-entity "marketplace intelligence" results: companies, categories, brands,
// services, cities, RFQs, guides — rendered above product results.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseQuery, searchTerms, type ParsedQuery } from "@/lib/searchIntelligence";
import { Building2, Tag, Wrench, MapPin, BookOpen, ClipboardList, Sparkles, ArrowRight, Shield } from "lucide-react";

interface Bucket {
  companies: any[];
  categories: any[];
  industries: any[];
  brands: any[];
  services: any[];
  cities: string[];
  guides: any[];
  rfqs: any[];
  exact: any[];
}

const empty: Bucket = { companies: [], categories: [], industries: [], brands: [], services: [], cities: [], guides: [], rfqs: [], exact: [] };

export function UniversalSearchResults({ query }: { query: string }) {
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [b, setB] = useState<Bucket>(empty);

  useEffect(() => {
    if (!query?.trim()) { setB(empty); setParsed(null); return; }
    const p = parseQuery(query);
    setParsed(p);
    const terms = searchTerms(p);
    const like = `%${p.core || p.corrected}%`;
    const orLike = (col: string) => terms.map((t) => `${col}.ilike.%${t}%`).join(",");

    (async () => {
      const [companies, cats, brands, services, guides, rfqs, exact] = await Promise.all([
        supabase.from("seller_profiles")
          .select("id, business_name, company_name, city, state, slug, logo_url, verification_status, trust_score, business_type")
          .eq("status", "approved")
          .or(`business_name.ilike.${like},company_name.ilike.${like},business_category.ilike.${like},city.ilike.${like}`)
          .limit(6),
        supabase.from("categories").select("id, name, slug, is_service, image_url, level").eq("is_active", true).or(orLike("name")).limit(14),
        supabase.from("brands").select("id, name, slug").or(orLike("name")).limit(8),
        supabase.from("services").select("id, title, slug, city, price, unit").eq("is_active", true).or(orLike("title")).limit(6),
        supabase.from("buying_guides").select("id, title, slug").or(orLike("title")).limit(4),
        supabase.from("requirements").select("id, title, city, quantity, created_at").or(orLike("title")).order("created_at", { ascending: false }).limit(4),
        // Part number / HSN / SKU / model / brand exact-ish matches
        supabase.from("products")
          .select("id, name, slug, sku, model, hsn_code, brand, primary_image_url")
          .eq("is_active", true)
          .or(`sku.ilike.${like},model.ilike.${like},hsn_code.ilike.${like},brand.ilike.${like}`)
          .limit(6),
      ]);

      const cityRows = await supabase.from("seller_profiles")
        .select("city").eq("status", "approved").or(orLike("business_category")).limit(60);

      const allCats = cats.data || [];
      setB({
        companies: companies.data || [],
        categories: allCats.filter((c: any) => c.level !== 1),
        industries: allCats.filter((c: any) => c.level === 1),
        brands: brands.data || [],
        services: services.data || [],
        cities: [...new Set(((cityRows.data || []).map((r: any) => r.city).filter(Boolean)))].slice(0, 8) as string[],
        guides: guides.data || [],
        rfqs: rfqs.data || [],
        exact: exact.data || [],
      });
    })();
  }, [query]);


  if (!parsed || !query.trim()) return null;
  const hasAny = b.companies.length || b.categories.length || b.industries.length || b.exact.length || b.brands.length || b.services.length || b.cities.length || b.guides.length || b.rfqs.length || parsed.expansions.length;
  if (!hasAny) return null;

  return (
    <div className="space-y-4 mb-6">
      {(parsed.didYouMean || parsed.hsn || parsed.partNumber) && (
        <div className="text-sm text-muted-foreground">
          {parsed.didYouMean && (
            <>Showing results for <Link className="font-semibold text-primary hover:underline" to={`/search?q=${encodeURIComponent(parsed.didYouMean)}`}>{parsed.didYouMean}</Link>. </>
          )}
          {parsed.hsn && <Badge variant="outline" className="ml-1">HSN {parsed.hsn}</Badge>}
          {parsed.partNumber && <Badge variant="outline" className="ml-1">Part no. {parsed.partNumber}</Badge>}
        </div>
      )}

      {b.exact.length > 0 && (
        <Card className="border-accent/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-accent" /> Matched by part no. / SKU / HSN / brand
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {b.exact.map((p) => (
                <Link key={p.id} to={`/product/${p.slug || p.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 transition-all">
                  <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
                    {p.primary_image_url && <img src={p.primary_image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{[p.brand, p.model || p.sku, p.hsn_code && `HSN ${p.hsn_code}`].filter(Boolean).join(" · ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {b.industries.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Tag className="h-4 w-4 text-primary" /> Industries</div>
            <div className="flex flex-wrap gap-2">
              {b.industries.map((c) => (
                <Link key={c.id} to={`/category/${c.slug}`} className="text-xs rounded-full border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors">{c.name}</Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}


      {parsed.expansions.length > 0 && (
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Related searches
            </div>
            <div className="flex flex-wrap gap-2">
              {parsed.expansions.map((e) => (
                <Link key={e} to={`/search?q=${encodeURIComponent(e)}`}
                  className="text-xs rounded-full border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors capitalize">
                  {e}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {b.companies.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Building2 className="h-4 w-4 text-primary" /> Companies</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {b.companies.map((c) => (
                <Link key={c.id} to={`/seller/${c.slug || c.id}`} className="flex items-center gap-3 rounded-lg border p-3 hover:border-primary/40 hover:shadow-sm transition-all">
                  <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {c.logo_url ? <img src={c.logo_url} alt={c.business_name} className="h-full w-full object-cover" loading="lazy" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1">
                      {c.business_name || c.company_name}
                      {c.verification_status === "verified" && <Shield className="h-3 w-3 text-trust shrink-0" />}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{[c.city, c.business_type].filter(Boolean).join(" · ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {b.categories.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Tag className="h-4 w-4 text-primary" /> Categories</div>
              <div className="flex flex-wrap gap-2">
                {b.categories.map((c) => (
                  <Link key={c.id} to={`/category/${c.slug}`} className="text-xs rounded-full bg-muted px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors">
                    {c.name}{c.is_service ? " (Service)" : ""}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {b.services.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Wrench className="h-4 w-4 text-primary" /> Services</div>
              <ul className="space-y-2">
                {b.services.map((s) => (
                  <li key={s.id} className="text-sm flex items-center justify-between gap-2">
                    <span className="truncate">{s.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{s.city || "Pan India"}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {b.brands.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Brands</div>
              <div className="flex flex-wrap gap-2">
                {b.brands.map((br) => (
                  <Link key={br.id} to={`/brand/${br.slug}`} className="text-xs rounded-full border px-3 py-1.5 hover:border-primary hover:text-primary transition-colors">{br.name}</Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {b.cities.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Nearby &amp; city-wise</div>
              <div className="flex flex-wrap gap-2">
                {b.cities.map((city) => (
                  <Link key={city} to={`/suppliers/${encodeURIComponent(city.toLowerCase())}/${encodeURIComponent((parsed.core || "products").replace(/\s+/g, "-"))}`}
                    className="text-xs rounded-full bg-muted px-3 py-1.5 hover:bg-primary hover:text-primary-foreground transition-colors">
                    {parsed.core || "Suppliers"} in {city}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {b.rfqs.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><ClipboardList className="h-4 w-4 text-primary" /> Live buyer requirements</div>
              <ul className="space-y-2">
                {b.rfqs.map((r) => (
                  <li key={r.id} className="text-sm flex items-center justify-between gap-2">
                    <span className="truncate">{r.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{r.city || "India"}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {b.guides.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm font-semibold"><BookOpen className="h-4 w-4 text-primary" /> Buying guides</div>
              <ul className="space-y-2">
                {b.guides.map((g) => (
                  <li key={g.id}>
                    <Link to={`/guides/${g.slug}`} className="text-sm hover:text-primary inline-flex items-center gap-1">
                      {g.title} <ArrowRight className="h-3 w-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default UniversalSearchResults;

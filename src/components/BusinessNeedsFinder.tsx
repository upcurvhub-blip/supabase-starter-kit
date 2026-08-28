import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, Boxes, Wand2, Package, IndianRupee } from "lucide-react";
import { buildNeedGroups, matchCategories, MatchableCategory } from "@/lib/businessNeedsEngine";

const EXAMPLES = [
  "Fertilizer manufacturer",
  "Packaged drinking water plant",
  "Garment factory",
  "Construction contractor",
  "IT services company",
];

function useCategories() {
  const [cats, setCats] = useState<MatchableCategory[]>([]);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("categories")
      .select("id,name,slug,parent_id,related_keywords")
      .eq("is_active", true)
      .limit(1000)
      .then(({ data }) => { if (!cancelled) setCats((data as any) || []); });
    return () => { cancelled = true; };
  }, []);
  return cats;
}

interface RecProduct {
  id: string;
  name: string;
  slug: string | null;
  price: number | null;
  price_unit: string | null;
  primary_image_url: string | null;
  category_id: string | null;
}

/** Input + engine results. Used on the dedicated sourcing-engine page. */
export function BusinessNeedsFinder({ compact = false }: { compact?: boolean }) {
  const categories = useCategories();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<RecProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const result = useMemo(() => {
    if (!query.trim()) return null;
    const { industry, groups } = buildNeedGroups(query);
    return { industry, groups: matchCategories(groups, categories, compact ? 5 : 8) };
  }, [query, categories, compact]);

  const matchedCategoryIds = useMemo(
    () => (result?.groups || []).flatMap((g) => g.categories.map((c) => c.id)).slice(0, 40),
    [result],
  );

  useEffect(() => {
    let cancelled = false;
    if (!matchedCategoryIds.length) { setProducts([]); return; }
    setLoadingProducts(true);
    supabase
      .from("products")
      .select("id,name,slug,price,price_unit,primary_image_url,category_id")
      .in("category_id", matchedCategoryIds)
      .eq("is_active", true)
      .order("view_count", { ascending: false })
      .limit(12)
      .then(({ data }) => {
        if (cancelled) return;
        setProducts((data as any) || []);
        setLoadingProducts(false);
      });
    return () => { cancelled = true; };
  }, [matchedCategoryIds.join(",")]);

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => { e.preventDefault(); setQuery(input); }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Fertilizer manufacturer in Coimbatore"
          className="h-12 text-base"
          aria-label="Describe your business"
        />
        <Button type="submit" size="lg" className="h-12 gap-2 shrink-0">
          <Wand2 className="h-4 w-4" /> Show what I need
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => { setInput(ex); setQuery(ex); }}
            className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>

      {result && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Matched profile
            </Badge>
            <span className="font-semibold">{result.industry}</span>
            <span className="text-sm text-muted-foreground">
              · {result.groups.length} sourcing groups
            </span>
          </div>

          {result.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No direct matches yet — try describing your industry in one or two words, or{" "}
              <Link to="/post-requirement" className="text-primary underline">post your requirement</Link>.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {result.groups.map((g, i) => (
                <Card key={g.label} className="border-primary/15 hover:border-primary/40 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Boxes className="h-4 w-4 text-primary" /> {g.label}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {g.categories.map((c) => (
                        <Link
                          key={c.id}
                          to={`/category/${c.slug}`}
                          className="rounded-md bg-muted px-2 py-1 text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {(loadingProducts || products.length > 0) && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Recommended products for your business
              </h3>
              {loadingProducts ? (
                <p className="text-sm text-muted-foreground">Finding live listings…</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {products.map((p) => (
                    <Link key={p.id} to={`/product/${p.slug || p.id}`}>
                      <Card className="h-full overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                          {p.primary_image_url ? (
                            <img src={p.primary_image_url} alt={p.name} loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : <Package className="h-6 w-6 text-muted-foreground/40" />}
                        </div>
                        <CardContent className="p-2">
                          <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                          {p.price != null && (
                            <p className="text-xs font-semibold text-primary flex items-center mt-1">
                              <IndianRupee className="h-3 w-3" />{Number(p.price).toLocaleString()}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button asChild variant="outline" className="gap-2">
            <Link to="/post-requirement">Get quotes for these <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      )}
    </div>
  );
}

/** Rectangular promo card — links to the dedicated sourcing engine page. */
export function BusinessNeedsPromoCard() {
  const { pathname } = useLocation();
  const hidden =
    pathname.startsWith("/product/") ||
    pathname.startsWith("/service/") ||
    pathname.startsWith("/business-needs") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin");
  if (hidden) return null;

  return (
    <Link
      to="/business-needs"
      className="fixed bottom-44 right-4 md:bottom-24 md:right-6 z-40 w-52 rounded-2xl border bg-card/95 backdrop-blur p-3 text-left shadow-2xl hover:shadow-primary/20 hover:-translate-y-0.5 transition-all"
    >
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
        <Sparkles className="h-3.5 w-3.5" /> Sourcing engine
      </span>
      <span className="mt-1 block text-sm font-semibold leading-snug">
        Tell us your business — we'll list what you need to buy
      </span>
      <span className="mt-1 block text-[11px] text-muted-foreground">Raw materials, machines, packing →</span>
    </Link>
  );
}

export default BusinessNeedsFinder;

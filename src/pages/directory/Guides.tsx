import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BookOpen, Search, ArrowRight } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export default function Guides() {
  const [guides, setGuides] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [g, c] = await Promise.all([
        supabase.from("buying_guides").select("id,slug,title,meta_description,category_id").eq("is_published", true).limit(200),
        supabase.from("categories").select("id,name,slug").eq("is_active", true).order("name").limit(60),
      ]);
      setGuides(g.data || []);
      setCats(c.data || []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return guides;
    return guides.filter((g) => (g.title || "").toLowerCase().includes(term));
  }, [guides, q]);

  const catsFiltered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return cats;
    return cats.filter((c) => c.name.toLowerCase().includes(term));
  }, [cats, q]);

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>B2B Buying Guides — Compare Specs, Prices & Suppliers | {SITE_NAME}</title>
        <meta name="description" content={`Free buying guides for Indian B2B buyers: specifications, price ranges, quality checks and how to shortlist verified suppliers on ${SITE_NAME}.`} />
        <link rel="canonical" href={`${SITE_URL}/guides`} />
      </Helmet>

      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-10 md:py-14 text-center">
          <h1 className="text-2xl md:text-4xl font-bold">Buying Guides</h1>
          <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-2xl mx-auto">
            Know the specs, fair price bands and quality checks before you send an enquiry.
          </p>
          <div className="max-w-xl mx-auto mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search a product or category" value={q} onChange={(e) => setQ(e.target.value)} className="pl-12 h-12 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-10">
        {filtered.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Published guides</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((g) => (
                <Link key={g.id} to={`/guides/${g.slug}`} className="group">
                  <Card className="h-full hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <BookOpen className="h-5 w-5 text-primary mb-2" />
                      <p className="font-semibold text-sm leading-snug">{g.title}</p>
                      {g.meta_description && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{g.meta_description}</p>
                      )}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs text-accent font-medium">
                        Read guide <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-1">Guides by category</h2>
          <p className="text-sm text-muted-foreground mb-4">Open any category to see its buying guide, price bands and verified suppliers.</p>
          <div className="flex flex-wrap gap-2">
            {catsFiltered.map((c) => (
              <Link
                key={c.id}
                to={`/guides/${c.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-sm hover:border-primary hover:text-primary transition-colors"
              >
                <BookOpen className="h-3 w-3" /> {c.name}
              </Link>
            ))}
            {catsFiltered.length === 0 && (
              <p className="text-sm text-muted-foreground">No categories matched your search.</p>
            )}
          </div>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

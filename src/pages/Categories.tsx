import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ChevronRight, ShieldCheck, TrendingUp, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PageMeta } from "@/components/seo/PageMeta";

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "products" | "services">("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("display_order");
      setCategories(data || []);
    })();
  }, []);

  const parentCategories = categories
    .filter((c) => c.level === 1)
    .filter((c) => (tab === "all" ? true : tab === "services" ? c.is_service : !c.is_service))
    .filter((c) => (q ? c.name.toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => {
      const ac = categories.filter((c) => c.parent_id === a.id).length;
      const bc = categories.filter((c) => c.parent_id === b.id).length;
      if ((bc > 0 ? 1 : 0) !== (ac > 0 ? 1 : 0)) return (bc > 0 ? 1 : 0) - (ac > 0 ? 1 : 0);
      return (a.display_order ?? 999) - (b.display_order ?? 999) || a.name.localeCompare(b.name);
    });

  // gradient palette for cards without images
  const gradients = [
    "from-orange-500/20 to-red-500/10",
    "from-blue-500/20 to-cyan-500/10",
    "from-emerald-500/20 to-teal-500/10",
    "from-violet-500/20 to-fuchsia-500/10",
    "from-amber-500/20 to-yellow-500/10",
    "from-indigo-500/20 to-blue-500/10",
    "from-pink-500/20 to-rose-500/10",
    "from-lime-500/20 to-green-500/10",
  ];

  return (
    <MarketplaceLayout>
      <PageMeta title="All B2B Categories — Products & Services Directory" description="Browse every product and service category on Upcurv Trade — from industrial machinery and raw materials to packaging, electricals and business services, each with verified Indian suppliers." path="/categories" />
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-10 md:py-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm text-accent mb-4">
              <TrendingUp className="h-4 w-4" /> 419+ verified categories across India
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-3 leading-tight">Products & Services Directory</h1>
            <p className="text-muted-foreground text-lg mb-6">Explore verified manufacturers, wholesalers, exporters and service providers — organised across industrial, construction, textile, food, healthcare and more.</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl">
              <Input placeholder="Search categories..." value={q} onChange={(e) => setQ(e.target.value)} className="h-11" />
              <Button asChild className="gradient-accent shrink-0 h-11"><Link to="/post-requirement">Post Requirement</Link></Button>
            </div>
            <div className="flex gap-2 mt-5">
              {(["all", "products", "services"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize",
                    tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {parentCategories.map((cat, i) => {
            const subCats = categories.filter((c) => c.parent_id === cat.id);
            const grad = gradients[i % gradients.length];
            const img = cat.image_url;
            const Icon = cat.is_service ? Wrench : Package;
            return (
              <Card key={cat.id} className="group overflow-hidden hover:shadow-2xl transition-all border hover:border-primary/40 hover:-translate-y-1 duration-300">
                <Link to={`/category/${cat.slug}`} className="block">
                  <div className={cn("relative aspect-[16/10] overflow-hidden bg-gradient-to-br", grad)}>
                    {img ? (
                      <img src={img} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="h-16 w-16 text-foreground/30 group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h2 className="font-bold text-lg text-white leading-tight line-clamp-2 drop-shadow-lg">{cat.name}</h2>
                      <p className="text-xs text-white/80 mt-0.5">{subCats.length} subcategories</p>
                    </div>
                    {cat.is_service && (
                      <span className="absolute top-3 right-3 bg-accent text-accent-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">SERVICE</span>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  {subCats.length > 0 ? (
                    <ul className="space-y-1">
                      {subCats.slice(0, 5).map((sub) => (
                        <li key={sub.id}>
                          <Link to={`/category/${sub.slug}`} className="text-sm text-muted-foreground hover:text-primary flex items-center py-0.5 group/sub">
                            <ChevronRight className="h-3.5 w-3.5 mr-1 shrink-0 group-hover/sub:translate-x-0.5 transition-transform" />
                            <span className="truncate">{sub.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">Explore verified suppliers in this category.</p>
                  )}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Verified sellers</span>
                    <Link to={`/category/${cat.slug}`} className="text-primary font-semibold inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                      Browse <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        {parentCategories.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No categories match your search.</div>
        )}
      </div>
    </MarketplaceLayout>
  );
}

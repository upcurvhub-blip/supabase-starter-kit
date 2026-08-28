import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Building2 } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const GRADIENTS = [
  "from-primary/80 to-primary",
  "from-accent/80 to-accent",
  "from-trust/80 to-trust",
  "from-primary/70 to-accent",
  "from-accent/70 to-primary",
  "from-trust/70 to-primary",
];

function CityTile({ city, count }: { city: string; count: number }) {
  return (
    <Link
      to={`/city/${slugify(city)}`}
      className="group flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary hover:shadow-sm transition-all"
    >
      <span className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Building2 className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate group-hover:text-primary">{city}</span>
        <span className="block text-[11px] text-muted-foreground">{count} verified seller{count > 1 ? "s" : ""}</span>
      </span>
    </Link>
  );
}

export default function Cities() {

  const [rows, setRows] = useState<{ city: string; count: number }[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("city")
        .eq("status", "approved")
        .not("city", "is", null)
        .limit(2000);
      const m = new Map<string, number>();
      (data || []).forEach((s: any) => {
        const k = String(s.city).trim();
        if (!k) return;
        const label = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
        m.set(label, (m.get(label) || 0) + 1);
      });
      setRows(Array.from(m.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count));

      const { data: img } = await supabase.from("platform_settings").select("value").eq("key", "city_images").maybeSingle();
      setImages(((img?.value as any) || {}) as Record<string, string>);
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((r) => r.city.toLowerCase().includes(query));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const g: Record<string, { city: string; count: number }[]> = {};
    filtered.forEach((r) => {
      const l = r.city[0].toUpperCase();
      (g[l] ||= []).push(r);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Letter headers only help once the directory is long.
  const showLetters = filtered.length > 20;


  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Suppliers by City — Browse Verified Businesses Across India | {SITE_NAME}</title>
        <meta name="description" content={`Browse verified suppliers, manufacturers and dealers by city across India on ${SITE_NAME}. ${rows.length} cities covered with direct WhatsApp & call.`} />
        <link rel="canonical" href={`${SITE_URL}/cities`} />
        <meta property="og:title" content={`Suppliers by City | ${SITE_NAME}`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <h1 className="text-2xl md:text-4xl font-bold text-center">Suppliers by City</h1>
          <p className="text-sm md:text-base text-muted-foreground text-center mt-2">
            Browse verified manufacturers, wholesalers and service providers city by city.
          </p>
          <div className="max-w-xl mx-auto mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search cities e.g. Coimbatore, Mumbai"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-12 h-12 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 space-y-10">
        {/* Featured (top 12) */}
        {!q && filtered.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4">Top cities</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
              {filtered.slice(0, 12).map((c, i) => (
                <Link
                  key={c.city}
                  to={`/city/${slugify(c.city)}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border"
                >
                  {images[c.city] ? (
                    <img src={images[c.city]} alt={`Suppliers in ${c.city}`} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} group-hover:scale-105 transition-transform duration-300`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
                    </>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 to-transparent text-primary-foreground">
                    <div className="font-semibold text-sm md:text-base">{c.city}</div>
                    <div className="text-[11px] opacity-90 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.count} seller{c.count > 1 ? "s" : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Full city directory */}
        <section>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-semibold">All cities {filtered.length ? `(${filtered.length})` : ""}</h2>
            {showLetters && (
              <span className="text-xs text-muted-foreground hidden md:inline">Grouped alphabetically</span>
            )}
          </div>

          {filtered.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">No cities matched.</CardContent></Card>
          ) : showLetters ? (
            <div className="space-y-6">
              {grouped.map(([letter, cities]) => (
                <div key={letter}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{letter}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {cities.map((c) => <CityTile key={c.city} city={c.city} count={c.count} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filtered.map((c) => <CityTile key={c.city} city={c.city} count={c.count} />)}
            </div>
          )}
        </section>

      </div>
    </MarketplaceLayout>
  );
}

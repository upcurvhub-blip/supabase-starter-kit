import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, ArrowRight } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Trade shows & exhibitions hub. Event listings are curated editorially for now;
 * the city/category links below are generated from live marketplace data.
 */
const SHOWS = [
  { name: "India Manufacturing Expo", month: "March", city: "Chennai", focus: "Industrial Machinery" },
  { name: "PackPlus South", month: "April", city: "Hyderabad", focus: "Packaging & Printing" },
  { name: "AgriTech India", month: "June", city: "Bengaluru", focus: "Agriculture & Farming" },
  { name: "Chemicals & Solvents Summit", month: "August", city: "Mumbai", focus: "Chemicals" },
  { name: "Textile Sourcing Week", month: "September", city: "Coimbatore", focus: "Apparel & Textiles" },
  { name: "BuildTech India", month: "November", city: "Delhi", focus: "Construction & Building Materials" },
];

const TradeShows = () => {
  const { data: cities } = useQuery({
    queryKey: ["tradeshow-cities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("city")
        .eq("status", "approved")
        .not("city", "is", null)
        .limit(1000);
      const counts = new Map<string, number>();
      (data || []).forEach((r: any) => {
        const c = (r.city || "").trim();
        if (c) counts.set(c, (counts.get(c) || 0) + 1);
      });
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    },
  });

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>B2B Trade Shows & Exhibitions in India | {SITE_NAME}</title>
        <meta name="description" content="Upcoming B2B trade shows and exhibitions across India by industry and city — plus verified suppliers you can meet before the event." />
        <link rel="canonical" href={`${SITE_URL}/trade-shows`} />
      </Helmet>

      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Trade Shows & Exhibitions</h1>
          <p className="text-muted-foreground max-w-2xl">
            Meet manufacturers and distributors face to face. Browse the industry calendar, then
            shortlist verified suppliers in that city before you travel.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SHOWS.map((s) => (
            <Card key={s.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <CalendarDays className="h-3.5 w-3.5" /> {s.month}
                  <span>·</span>
                  <MapPin className="h-3.5 w-3.5" /> {s.city}
                </div>
                <h2 className="font-semibold mb-1">{s.name}</h2>
                <p className="text-sm text-muted-foreground mb-3">Focus: {s.focus}</p>
                <Button asChild size="sm" variant="outline" className="gap-1.5">
                  <Link to={`/city/${s.city.toLowerCase()}`}>
                    Suppliers in {s.city} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!!cities?.length && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold mb-3">Sourcing hubs to visit</h2>
            <div className="flex flex-wrap gap-2">
              {cities.map(([city, count]) => (
                <Link
                  key={city}
                  to={`/city/${city.toLowerCase()}`}
                  className="rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  {city} <span className="text-muted-foreground">({count})</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </MarketplaceLayout>
  );
};

export default TradeShows;

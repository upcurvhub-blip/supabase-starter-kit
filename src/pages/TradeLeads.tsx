import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, ArrowRight, Users2 } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Public feed of open buyer requirements ("trade leads") sellers can respond to. */
const TradeLeads = () => {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["public-trade-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("requirements")
        .select("id,title,description,city,location,quantity,quantity_unit,urgency,created_at,categories(name,slug)")
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(60);
      return data || [];
    },
  });

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Buy Trade Leads — Live Buyer Requirements | {SITE_NAME}</title>
        <meta name="description" content="Browse live B2B buyer requirements by category and city. Respond with a quote and win business directly from verified buyers." />
        <link rel="canonical" href={`${SITE_URL}/trade-leads`} />
      </Helmet>

      <section className="border-b bg-gradient-to-br from-accent/10 via-background to-primary/10">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Buy Trade Leads</h1>
          <p className="text-muted-foreground max-w-2xl">
            Live buying requirements posted by businesses across India. Pick the ones that match
            what you sell and send a quote — the buyer gets it instantly.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild><Link to="/auth?mode=seller">Start selling</Link></Button>
            <Button asChild variant="outline"><Link to="/post-requirement">I'm a buyer — post my requirement</Link></Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        {isLoading ? (
          <p className="text-muted-foreground">Loading live requirements…</p>
        ) : !leads?.length ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            No open requirements right now. Check back shortly.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.categories?.name && <Badge variant="secondary">{r.categories.name}</Badge>}
                    {r.urgency && r.urgency !== "normal" && <Badge variant="destructive">{r.urgency}</Badge>}
                  </div>
                  <h2 className="font-semibold leading-snug line-clamp-2">{r.title}</h2>
                  {r.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                    {(r.city || r.location) && (
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.city || r.location}</span>
                    )}
                    {r.quantity && (
                      <span className="inline-flex items-center gap-1"><Users2 className="h-3 w-3" /> {r.quantity} {r.quantity_unit || ""}</span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Button asChild size="sm" className="w-full mt-2 gap-1.5">
                    <Link to="/auth?mode=seller">Respond with a quote <ArrowRight className="h-3.5 w-3.5" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </MarketplaceLayout>
  );
};

export default TradeLeads;

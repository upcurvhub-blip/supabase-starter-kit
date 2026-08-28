import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building2, ArrowRight, Handshake } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Find distributors / wholesalers for your business. */
const Distributors = () => {
  const { data: sellers } = useQuery({
    queryKey: ["distributor-sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("id,business_name,company_name,slug,city,state,business_type,trust_score")
        .eq("status", "approved")
        .order("trust_score", { ascending: false })
        .limit(24);
      return (data || []).filter((s: any) =>
        !s.business_type || /distributor|wholesal|trading|supplier/i.test(s.business_type),
      );
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["distributor-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("name")
        .limit(30);
      return data || [];
    },
  });

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Find Distributors & Wholesalers for Your Business | {SITE_NAME}</title>
        <meta name="description" content="Appoint distributors, wholesalers and channel partners for your products across Indian cities. Browse verified trading partners by category and location." />
        <link rel="canonical" href={`${SITE_URL}/distributors`} />
      </Helmet>

      <section className="border-b bg-gradient-to-br from-trust/10 via-background to-primary/10">
        <div className="container mx-auto px-4 py-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Find Distributors for Your Business</h1>
          <p className="text-muted-foreground max-w-2xl">
            Expand into new cities without building a sales team. Post your distributorship
            requirement or browse verified wholesalers and trading partners by category.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link to="/post-requirement"><Handshake className="h-4 w-4" /> Post distributorship requirement</Link>
            </Button>
            <Button asChild variant="outline"><Link to="/cities">Browse by city</Link></Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h2 className="text-lg font-semibold mb-3">Distributors by category</h2>
          <div className="flex flex-wrap gap-2">
            {categories?.map((c: any) => (
              <Link
                key={c.id}
                to={`/wholesalers/${c.slug}`}
                className="rounded-full border px-3 py-1.5 text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Verified trading partners</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sellers?.map((s: any) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{s.business_name || s.company_name}</h3>
                      {(s.city || s.state) && (
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {[s.city, s.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {s.business_type && <Badge variant="secondary" className="mt-2">{s.business_type}</Badge>}
                    </div>
                  </div>
                  {s.slug && (
                    <Button asChild size="sm" variant="outline" className="w-full mt-3 gap-1.5">
                      <Link to={`/seller-profile/${s.slug}`}>View profile <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </MarketplaceLayout>
  );
};

export default Distributors;

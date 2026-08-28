import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Public membership/pricing page — no seller dashboard access required. */
const Pricing = () => {
  const { data: plans } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly");
      return data || [];
    },
  });

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Seller Membership Plans & Pricing | {SITE_NAME}</title>
        <meta name="description" content="Compare Upcurv Trade seller membership plans — lead quotas, featured listings, verified badge and analytics. Start free and upgrade any time." />
        <link rel="canonical" href={`${SITE_URL}/pricing`} />
      </Helmet>

      <section className="border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto px-4 py-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Membership Plans</h1>
          <p className="text-muted-foreground">Pick the plan that matches how many leads you can handle each month.</p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {plans?.map((plan: any) => (
            <Card key={plan.id} className={plan.tier === "pro" ? "border-primary shadow-lg relative" : "relative"}>
              {plan.tier === "pro" && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 gap-1">
                  <Star className="h-3 w-3" /> Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-bold">₹{Number(plan.price_monthly).toLocaleString("en-IN")}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <ul className="space-y-1.5 text-sm">
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{plan.leads_per_month} leads / month</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{plan.max_products ?? "Unlimited"} product listings</li>
                  <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{plan.featured_products} featured products</li>
                  {plan.verified_badge && <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Verified badge</li>}
                  {plan.analytics_access && <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Advanced analytics</li>}
                  {plan.priority_support && <li className="flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />Priority support</li>}
                </ul>
                <Button asChild className="w-full mt-3">
                  <Link to="/auth?mode=seller">Get started</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          Already selling? <Link to="/seller/subscription" className="text-primary underline">Manage your subscription</Link>
        </p>
      </section>
    </MarketplaceLayout>
  );
};

export default Pricing;

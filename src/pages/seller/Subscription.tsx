import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Subscription = () => {
  const { toast } = useToast();

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("seller_profiles")
        .select("*, subscription_plans(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly");
      return data || [];
    },
  });

  const currentPlanId = sellerProfile?.subscription_plan_id;

  const handleSelectPlan = (planId: string) => {
    toast({
      title: "Coming Soon",
      description: "Payment integration will be available soon. Contact support to upgrade.",
    });
  };

  const tierColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-800",
    basic: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    premium: "bg-yellow-100 text-yellow-800",
  };

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
          <p className="text-muted-foreground">Choose the right plan for your business</p>
        </div>

        {sellerProfile?.subscription_plans && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                Current Plan: {sellerProfile.subscription_plans.name}
              </CardTitle>
              <CardDescription>
                {sellerProfile.subscription_ends_at && (
                  <span>Valid until: {new Date(sellerProfile.subscription_ends_at).toLocaleDateString()}</span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-6 text-sm">
                <span>Leads used: {sellerProfile.leads_used_this_month || 0} / {sellerProfile.subscription_plans.leads_per_month}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan) => {
            const isCurrentPlan = plan.id === currentPlanId;
            const features = (plan.features as string[]) || [];
            
            return (
              <Card key={plan.id} className={isCurrentPlan ? "border-primary ring-2 ring-primary" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge className={tierColors[plan.tier]}>{plan.tier}</Badge>
                    {isCurrentPlan && <Badge variant="outline">Current</Badge>}
                  </div>
                  <CardTitle className="text-xl mt-4">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="text-3xl font-bold">
                      ₹{plan.price_monthly}
                      <span className="text-sm font-normal text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      or ₹{plan.price_yearly}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{plan.leads_per_month} leads/month</span>
                    </div>
                    {plan.featured_products > 0 && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{plan.featured_products} featured products</span>
                      </div>
                    )}
                    {plan.verified_badge && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Verified badge</span>
                      </div>
                    )}
                    {plan.show_contact_details && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Show contact details</span>
                      </div>
                    )}
                    {plan.analytics_access && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>Advanced analytics</span>
                      </div>
                    )}
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan}
                    onClick={() => handleSelectPlan(plan.id)}
                  >
                    {isCurrentPlan ? "Current Plan" : "Select Plan"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Subscription;

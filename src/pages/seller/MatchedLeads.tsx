import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MapPin, Package, Calendar, IndianRupee, TrendingUp, Inbox } from "lucide-react";

export default function MatchedLeads() {
  const { data: matches, isLoading } = useQuery({
    queryKey: ["matched-requirements"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_matched_requirements_for_seller");
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <DashboardLayout role="seller" title="Matched Leads">
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/5 border-primary/20">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg">Smart Lead Matching</h2>
              <p className="text-sm text-muted-foreground">
                Requirements ranked by category fit, city match and urgency. Respond fast to win the deal.
              </p>
            </div>
            <Badge variant="secondary" className="text-base px-3 py-1">
              {matches?.length || 0} matches
            </Badge>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => (
            <Card key={i} className="animate-pulse"><CardContent className="h-32" /></Card>
          ))}</div>
        ) : !matches?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold mb-1">No matched leads yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add more products in your catalog categories to attract more buyer requirements.
              </p>
              <Button asChild><Link to="/seller/products">Manage Products</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((m: any) => (
              <Card key={m.requirement_id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg truncate">{m.title}</h3>
                        {m.urgency === "urgent" && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">Urgent</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <TrendingUp className="h-4 w-4" />
                        {Math.round(Number(m.match_score))}%
                      </div>
                      <p className="text-xs text-muted-foreground">match</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mb-3">
                    {m.category_name && <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" />{m.category_name}</span>}
                    {m.quantity && <span>Qty: <b className="text-foreground">{m.quantity} {m.quantity_unit}</b></span>}
                    {m.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.city}</span>}
                    {(m.budget_min || m.budget_max) && (
                      <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5" />
                        {m.budget_min?.toLocaleString()}{m.budget_max ? ` - ${m.budget_max.toLocaleString()}` : ""}
                      </span>
                    )}
                    {m.preferred_delivery_date && (
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />
                        By {new Date(m.preferred_delivery_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm">Send Quote</Button>
                    <Button size="sm" variant="outline">View Details</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

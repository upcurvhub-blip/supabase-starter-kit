import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Sparkles } from "lucide-react";
import { SellerMetricsCards } from "@/components/dashboard/SellerMetricsCards";
import AiConsultantPanel from "@/components/dashboard/AiConsultantPanel";

import { LeadsFunnel } from "@/components/dashboard/LeadsFunnel";
import { RecentLeadsList } from "@/components/dashboard/RecentLeadsList";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { TopProductsTable } from "@/components/dashboard/TopProductsTable";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { SellerSpotlight } from "@/components/dashboard/SellerSpotlight";
import { format, subDays } from "date-fns";

const SellerDashboard = () => {
  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("seller_profiles")
        .select("*, subscription_plans(name, leads_per_month)")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["seller-products-dashboard"],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("products")
        .select("*, product_views(id)")
        .eq("seller_id", sellerProfile.id)
        .order("view_count", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: leads } = useQuery({
    queryKey: ["seller-leads-dashboard"],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("leads")
        .select(`*, products(name)`)
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: productViews } = useQuery({
    queryKey: ["seller-product-views"],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("product_views")
        .select("created_at, product_id")
        .in("product_id", products?.map(p => p.id) || [])
        .gte("created_at", subDays(new Date(), 60).toISOString());
      return data || [];
    },
    enabled: !!sellerProfile && !!products?.length,
  });

  const isPending = sellerProfile?.status === "pending";
  const isRejected = sellerProfile?.status === "rejected";

  // Calculate metrics
  const totalProducts = products?.length || 0;
  const totalLeads = leads?.length || sellerProfile?.total_leads || 0;
  const leadsThisMonth = sellerProfile?.leads_used_this_month || 0;
  const leadsLimit = (sellerProfile as any)?.subscription_plans?.leads_per_month || 10;
  const totalViews = products?.reduce((sum, p) => sum + (p.view_count || 0), 0) || 0;
  const convertedLeads = leads?.filter(l => l.status === "converted").length || 0;
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
  const responseRate = sellerProfile?.response_rate || 0;
  const avgResponseTime = sellerProfile?.avg_response_time || 0;
  const trustScore = sellerProfile?.trust_score || 50;

  // Real month-over-month deltas
  const now = new Date();
  const viewsLast30 = productViews?.filter(v => new Date(v.created_at) >= subDays(now, 30)).length || 0;
  const viewsPrev30 = productViews?.filter(v => {
    const d = new Date(v.created_at);
    return d >= subDays(now, 60) && d < subDays(now, 30);
  }).length || 0;
  const viewsChange = viewsPrev30 > 0
    ? Math.round(((viewsLast30 - viewsPrev30) / viewsPrev30) * 100)
    : (viewsLast30 > 0 ? 100 : 0);

  const leadsLast30 = leads?.filter(l => new Date(l.created_at || "") >= subDays(now, 30)) || [];
  const leadsPrev30 = leads?.filter(l => {
    const d = new Date(l.created_at || "");
    return d >= subDays(now, 60) && d < subDays(now, 30);
  }) || [];
  const convRateLast30 = leadsLast30.length > 0
    ? (leadsLast30.filter(l => l.status === "converted").length / leadsLast30.length) * 100 : 0;
  const convRatePrev30 = leadsPrev30.length > 0
    ? (leadsPrev30.filter(l => l.status === "converted").length / leadsPrev30.length) * 100 : 0;
  const conversionChange = convRatePrev30 > 0
    ? Math.round(((convRateLast30 - convRatePrev30) / convRatePrev30) * 100)
    : (convRateLast30 > 0 ? 100 : 0);

  // Lead funnel data
  const funnelStages = [
    { name: "New", count: leads?.filter(l => l.status === "new").length || 0, color: "#3b82f6" },
    { name: "Contacted", count: leads?.filter(l => l.status === "contacted").length || 0, color: "#f59e0b" },
    { name: "Interested", count: leads?.filter(l => l.status === "interested").length || 0, color: "#10b981" },
    { name: "Converted", count: leads?.filter(l => l.status === "converted").length || 0, color: "#8b5cf6" },
  ];

  // Performance chart data
  const performanceData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const views = productViews?.filter(v => format(new Date(v.created_at), "yyyy-MM-dd") === dateStr).length || 0;
    const dayLeads = leads?.filter(l => format(new Date(l.created_at || ""), "yyyy-MM-dd") === dateStr).length || 0;
    return {
      date: format(date, "MMM d"),
      views,
      leads: dayLeads,
      enquiries: dayLeads,
    };
  });

  // Top products data
  const topProducts = products?.slice(0, 5).map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    image: (p.images as string[])?.[0],
    views: p.view_count || 0,
    enquiries: p.enquiry_count || 0,
    conversion_rate: p.view_count ? ((p.enquiry_count || 0) / p.view_count) * 100 : 0,
    is_active: p.is_active ?? true,
  })) || [];

  // Recent leads
  const recentLeads = leads?.slice(0, 5).map(l => ({
    id: l.id,
    buyer_name: l.guest_name || "Public Buyer",
    buyer_email: l.guest_email,
    buyer_phone: l.guest_phone,
    product_name: l.products?.name,
    message: l.message,
    status: l.status || "new",
    created_at: l.created_at || new Date().toISOString(),
    lead_score: l.lead_score,
  })) || [];

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Seller Dashboard
            </h1>
            <p className="text-muted-foreground">Welcome back, {sellerProfile?.business_name}</p>
          </div>
        </div>

        {/* Status Alerts */}
        {isPending && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your seller account is pending approval. You'll be notified once approved.
            </AlertDescription>
          </Alert>
        )}

        {isRejected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your seller account was rejected. Reason: {sellerProfile?.rejection_reason || "Not specified"}
            </AlertDescription>
          </Alert>
        )}

        {/* Metrics Cards */}
        <div data-tour="metrics">
        <SellerMetricsCards
          totalProducts={totalProducts}
          totalLeads={totalLeads}
          leadsThisMonth={leadsThisMonth}
          leadsLimit={leadsLimit}
          totalViews={totalViews}
          conversionRate={conversionRate}
          responseRate={responseRate}
          avgResponseTime={avgResponseTime}
          trustScore={trustScore}
          viewsChange={viewsChange}
          conversionChange={conversionChange}
        />
        </div>

        {/* Proactive AI consultant */}
        <AiConsultantPanel seller={sellerProfile} products={products || []} leads={leads || []} />


        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" data-tour="performance">
          <div className="lg:col-span-2">
            <PerformanceChart data={performanceData} />
          </div>
          <LeadsFunnel stages={funnelStages} totalLeads={leads?.length || 0} />
        </div>

        {/* Products and Leads Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopProductsTable products={topProducts} />
          <div data-tour="leads"><RecentLeadsList leads={recentLeads} /></div>
        </div>

        {/* Quick Actions */}
        <div data-tour="quick-actions"><QuickActions role="seller" /></div>
        <SellerSpotlight />
      </div>
    </DashboardLayout>
  );
};

export default SellerDashboard;

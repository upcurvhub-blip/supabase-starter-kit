import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MetricCard, 
  ProgressBar, 
  DonutChart, 
  FunnelChart,
  DataTable 
} from "@/components/analytics/ZohoStyleChart";
import { ProductVisitorsExport } from "@/components/ProductVisitorsExport";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Users, 
  MessageSquare, 
  Shield,
  Star,
  Calendar,
  Activity,
  Clock,
  PackageCheck,
  Timer,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const SellerAnalytics = () => {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: sellerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["seller-profile-analytics"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("seller_profiles")
        .select("*, subscription_plans(name, leads_per_month, tier)")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["seller-products-analytics", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("products")
        .select("*, categories(id, name)")
        .eq("seller_id", sellerProfile.id)
        .order("view_count", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: services = [] } = useQuery({
    queryKey: ["seller-services-analytics", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("services")
        .select("id, title, city, price, unit, is_active, view_count, categories:category_id(name)")
        .eq("seller_id", sellerProfile.id)
        .order("view_count", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["seller-leads-analytics", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("leads")
        .select("*, products(name)")
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ["seller-reviews-analytics", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: allVisitors, isLoading: visitorsLoading } = useQuery({
    queryKey: ["seller-all-visitors", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile || !products) return [];
      const productIds = products.map((p: any) => p.id);
      if (productIds.length === 0) return [];
      
      const { data } = await supabase
        .from("product_views")
        .select(`
          *,
          profiles(full_name, email, phone)
        `)
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .limit(500);
      
      // Get product info separately
      const visitorsWithProducts = data?.map(v => {
        const prod = products.find((p: any) => p.id === v.product_id);
        return {
          ...v,
          product: prod ? { name: prod.name, category: prod.categories } : null
        };
      }) || [];
      
      return visitorsWithProducts;
    },
    enabled: !!sellerProfile && !!products && products.length > 0,
  });

  const { data: pageViews = [], isLoading: pageViewsLoading } = useQuery({
    queryKey: ["seller-page-views", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("visitor_page_views" as any)
        .select("*")
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: ctaEvents = [] } = useQuery({
    queryKey: ["seller-cta-events", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("product_cta_events")
        .select("id, product_id, cta, created_at")
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false })
        .limit(2000);
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Calculate stats
  const totalViews = products?.reduce((acc: number, p: any) => acc + (p.view_count || 0), 0) || 0;
  const totalEnquiries = products?.reduce((acc: number, p: any) => acc + (p.enquiry_count || 0), 0) || 0;
  const avgRating = reviews && reviews.length > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : "N/A";

  // Additional performance metrics
  const totalLeadsAll = leads?.length || 0;
  const convertedLeads = leads?.filter((l: any) => l.status === "converted").length || 0;
  const conversionRate = totalLeadsAll > 0 ? ((convertedLeads / totalLeadsAll) * 100).toFixed(1) : "0";
  const enquiryRate = totalViews > 0 ? ((totalEnquiries / totalViews) * 100).toFixed(1) : "0";
  const activeProducts = products?.filter((p: any) => p.is_active).length || 0;
  const responseRate = (sellerProfile as any)?.response_rate ?? 0;

  // Real month-over-month deltas from visitor + lead timestamps
  const _now = new Date();
  const _daysAgo = (n: number) => new Date(_now.getTime() - n * 864e5);
  const viewsLast30 = allVisitors?.filter((v: any) => new Date(v.created_at) >= _daysAgo(30)).length || 0;
  const viewsPrev30 = allVisitors?.filter((v: any) => {
    const d = new Date(v.created_at);
    return d >= _daysAgo(60) && d < _daysAgo(30);
  }).length || 0;
  const viewsChange = viewsPrev30 > 0 ? Math.round(((viewsLast30 - viewsPrev30) / viewsPrev30) * 100) : (viewsLast30 > 0 ? 100 : 0);
  const enqLast30 = leads?.filter((l: any) => new Date(l.created_at) >= _daysAgo(30)).length || 0;
  const enqPrev30 = leads?.filter((l: any) => {
    const d = new Date(l.created_at);
    return d >= _daysAgo(60) && d < _daysAgo(30);
  }).length || 0;
  const enquiriesChange = enqPrev30 > 0 ? Math.round(((enqLast30 - enqPrev30) / enqPrev30) * 100) : (enqLast30 > 0 ? 100 : 0);

  // Lead income engine: source breakdown + estimated lead value
  const sourceLabels: Record<string, string> = {
    public_product_enquiry: "Product Enquiry",
    intent_capture: "High Intent",
    admin_requirement_assignment: "RFQ Match",
  };
  const sourcePalette = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--info))", "hsl(var(--accent))", "hsl(var(--warning))"];
  const leadsBySourceMap = (leads || []).reduce((acc: Record<string, number>, l: any) => {
    const key = l.source || "other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const leadSourceDist = Object.entries(leadsBySourceMap).map(([k, v], i) => ({
    label: sourceLabels[k] || k.replace(/_/g, " "),
    value: v as number,
    color: sourcePalette[i % sourcePalette.length],
  }));
  // CTA click analytics (per product + mix)
  const CTA_KINDS = [
    { key: "whatsapp", label: "WhatsApp", color: "success" },
    { key: "call", label: "Calls", color: "primary" },
    { key: "quote", label: "Quote Clicks", color: "accent" },
    { key: "best_price", label: "Best Price", color: "info" },
    { key: "share", label: "Shares", color: "warning" },
  ];
  const ctaCounts = (ctaEvents as any[]).reduce((acc: Record<string, number>, e: any) => {
    acc[e.cta] = (acc[e.cta] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const ctaPalette = ["hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--info))", "hsl(var(--warning))"];
  const ctaDistribution = Object.entries(ctaCounts).map(([k, v], i) => ({
    label: (CTA_KINDS.find((c) => c.key === k)?.label) || k.replace(/_/g, " "),
    value: v as number,
    color: ctaPalette[i % ctaPalette.length],
  }));
  const ctaLast30 = (ctaEvents as any[]).filter((e: any) => new Date(e.created_at) >= _daysAgo(30)).length;
  const ctaByProductRows = (products || []).map((p: any) => {
    const evs = (ctaEvents as any[]).filter((e: any) => e.product_id === p.id);
    const count = (k: string) => evs.filter((e: any) => e.cta === k).length;
    const views = p.view_count || 0;
    return {
      product: p.name,
      views,
      whatsapp: count("whatsapp"),
      call: count("call"),
      quote: count("quote") + count("enquiry"),
      share: count("share"),
      rate: views > 0 ? `${((evs.length / views) * 100).toFixed(1)}%` : "—",
    };
  }).filter((r: any) => r.views > 0 || r.whatsapp || r.call || r.quote || r.share)
    .sort((a: any, b: any) => (b.whatsapp + b.call + b.quote) - (a.whatsapp + a.call + a.quote))
    .slice(0, 30);

  const AVG_LEAD_VALUE = 250; // estimated value per qualified lead (INR)
  const estimatedIncome = totalLeadsAll * AVG_LEAD_VALUE;
  const convertedIncome = convertedLeads * AVG_LEAD_VALUE * 4;

  // Lead funnel data
  const leadsByStatus = leads?.reduce((acc: Record<string, number>, lead: any) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalLeadsCount = leads?.length || 1;
  const funnelSteps = [
    { label: "New Leads", value: leadsByStatus.new || 0, percentage: 100 },
    { label: "Contacted", value: leadsByStatus.contacted || 0, percentage: Math.round(((leadsByStatus.contacted || 0) / totalLeadsCount) * 100) },
    { label: "Interested", value: leadsByStatus.interested || 0, percentage: Math.round(((leadsByStatus.interested || 0) / totalLeadsCount) * 100) },
    { label: "Converted", value: leadsByStatus.converted || 0, percentage: Math.round(((leadsByStatus.converted || 0) / totalLeadsCount) * 100) },
  ];

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map(rating => ({
    label: `${rating} Star`,
    value: reviews?.filter((r: any) => r.rating === rating).length || 0,
    color: rating >= 4 ? "hsl(var(--success))" : rating >= 3 ? "hsl(var(--warning))" : "hsl(var(--destructive))"
  }));

  // Trust score components (cast to any for new columns not yet in types)
  const profile = sellerProfile as any;
  const trustComponents = profile ? [
    { label: "KYC Score", value: profile.kyc_score || 0, max: 35, color: "primary" as const },
    { label: "Response Score", value: profile.response_time_score || 0, max: 25, color: "success" as const },
    { label: "Deal Success", value: profile.deal_success_score || 0, max: 20, color: "info" as const },
    { label: "Feedback Score", value: profile.feedback_score || 0, max: 20, color: "accent" as const },
  ] : [];

  // Top products table
  const topProductRows = products?.slice(0, 10).map((p: any) => ({
    name: <span className="font-medium">{p.name}</span>,
    category: <Badge variant="outline">{p.categories?.name || "N/A"}</Badge>,
    views: <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.view_count || 0}</span>,
    enquiries: <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{p.enquiry_count || 0}</span>,
    conversion: <span className="font-medium text-primary">
      {p.view_count > 0 ? ((p.enquiry_count || 0) / p.view_count * 100).toFixed(1) : 0}%
    </span>,
  })) || [];

  const productVelocityRows = (products || []).slice(0, 12).map((p: any) => {
    const productVisits = (allVisitors || []).filter((v: any) => v.product_id === p.id);
    const productLeads = (leads || []).filter((l: any) => l.product_id === p.id);
    const qualifiedVisits = productVisits.filter((v: any) => (v.view_duration || 0) >= 10).length;
    const lastLead = productLeads[0]?.created_at ? format(new Date(productLeads[0].created_at), "MMM d") : "—";
    return {
      product: <span className="font-medium">{p.name}</span>,
      qualified: <span>{qualifiedVisits}</span>,
      interest: <span>{productVisits.length ? Math.round((qualifiedVisits / productVisits.length) * 100) : 0}%</span>,
      gap: <span>{Math.max(0, productVisits.length - productLeads.length)} visits</span>,
      lastLead: <span>{lastLead}</span>,
    };
  });

  const productsWithImages = (products || []).filter((p: any) => Array.isArray(p.images) && p.images.length > 0).length;
  const productsWithPrice = (products || []).filter((p: any) => p.price_min || p.price_max).length;
  const productsWithSpecs = (products || []).filter((p: any) => p.specifications && Object.keys(p.specifications || {}).length > 0).length;
  const catalogueCompleteness = (products?.length || 0) > 0
    ? Math.round(((productsWithImages + productsWithPrice + productsWithSpecs) / ((products?.length || 1) * 3)) * 100)
    : 0;

  const avgVisitDuration = (allVisitors || []).length > 0
    ? Math.round((allVisitors || []).reduce((sum: number, v: any) => sum + (v.view_duration || 0), 0) / (allVisitors || []).length)
    : 0;
  const qualifiedVisitorCount = (allVisitors || []).filter((v: any) => (v.view_duration || 0) >= 10).length;
  const uniqueSessions = new Set((allVisitors || []).map((v: any) => v.session_id).filter(Boolean));
  const repeatSessionCount = Array.from(uniqueSessions).filter((sessionId) => (allVisitors || []).filter((v: any) => v.session_id === sessionId).length > 1).length;
  const peakHourMap = (allVisitors || []).reduce((acc: Record<string, number>, v: any) => {
    const hour = format(new Date(v.created_at), "ha");
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});
  const peakHourRows = Object.entries(peakHourMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hour, visits]) => ({ hour, visits, share: `${allVisitors?.length ? Math.round((visits / allVisitors.length) * 100) : 0}%` }));

  const categoryInterestMap = (allVisitors || []).reduce((acc: Record<string, number>, v: any) => {
    const key = v.product?.category?.name || "Uncategorised";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categoryInterestDist = Object.entries(categoryInterestMap).slice(0, 6).map(([label, value], i) => ({
    label,
    value: value as number,
    color: sourcePalette[i % sourcePalette.length],
  }));

  const profileViews = (pageViews as any[]).filter((v: any) => v.page_type === "seller_profile");
  const productPageViews = (pageViews as any[]).filter((v: any) => v.page_type === "product");
  const profileToProductSessions = new Set(
    profileViews
      .map((v: any) => v.session_id)
      .filter((sid: string) => sid && productPageViews.some((p: any) => p.session_id === sid))
  );
  const productViewRows = (products || []).slice(0, 12).map((p: any) => {
    const pageHits = productPageViews.filter((v: any) => v.product_id === p.id);
    const dbHits = (allVisitors || []).filter((v: any) => v.product_id === p.id);
    const unique = new Set([...pageHits, ...dbHits].map((v: any) => v.session_id).filter(Boolean)).size;
    const avgDepth = pageHits.length
      ? Math.round(pageHits.reduce((sum: number, v: any) => sum + (v.duration_seconds || 0), 0) / pageHits.length)
      : 0;
    return {
      product: <span className="font-medium">{p.name}</span>,
      pageViews: pageHits.length || dbHits.length || 0,
      uniqueSessions: unique || "—",
      avgDepth: avgDepth ? `${avgDepth}s` : "—",
      enquiries: (leads || []).filter((l: any) => l.product_id === p.id).length,
    };
  });
  const profileVisitRows = profileViews.slice(0, 20).map((v: any) => ({
    when: format(new Date(v.created_at), "MMM d, HH:mm"),
    session: v.session_id ? `${String(v.session_id).slice(0, 10)}…` : "—",
    duration: `${v.duration_seconds || 0}s`,
    path: v.page_path || "/seller-profile",
    next: productPageViews.some((p: any) => p.session_id && p.session_id === v.session_id)
      ? <Badge className="bg-success/20 text-success">Viewed products</Badge>
      : <Badge variant="secondary">Profile only</Badge>,
  }));
  const visitorJourneyRows = Array.from(new Set((pageViews as any[]).map((v: any) => v.session_id).filter(Boolean)))
    .slice(0, 20)
    .map((sid: any) => {
      const journey = (pageViews as any[]).filter((v: any) => v.session_id === sid).sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at));
      const productSteps = journey.filter((v: any) => v.page_type === "product").length;
      return {
        session: `${String(sid).slice(0, 10)}…`,
        firstTouch: journey[0]?.page_type === "seller_profile" ? "Company profile" : "Product page",
        productPages: productSteps,
        totalTime: `${journey.reduce((sum: number, v: any) => sum + (v.duration_seconds || 0), 0)}s`,
        lastSeen: journey[0]?.created_at ? format(new Date(journey[journey.length - 1].created_at), "MMM d, HH:mm") : "—",
      };
    });

  const isAnalyticsLoading = profileLoading || productsLoading || leadsLoading || reviewsLoading || visitorsLoading || pageViewsLoading;

  const AnalyticsSkeleton = () => (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-[80vw]" />
        </div>
        <Skeleton className="h-10 w-96 max-w-full" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-lg" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    </DashboardLayout>
  );

  if (isAnalyticsLoading) return <AnalyticsSkeleton />;

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics & Reports</h1>
            <p className="text-muted-foreground">Track your performance and visitor insights</p>
          </div>
          <Badge variant="outline" className="text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            Last 30 days
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="visitors">Visitors</TabsTrigger>
            <TabsTrigger value="cta">CTA Clicks</TabsTrigger>
          </TabsList>

          <TabsContent value="cta" className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {CTA_KINDS.map((k) => (
                <MetricCard
                  key={k.key}
                  title={k.label}
                  value={String(ctaCounts[k.key] || 0)}
                  changeLabel="all time"
                  icon={<Activity className="h-6 w-6" />}
                  color={k.color as any}
                />
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Action mix</CardTitle></CardHeader>
                <CardContent>
                  {ctaDistribution.length ? (
                    <DonutChart data={ctaDistribution} />
                  ) : (
                    <p className="text-sm text-muted-foreground">No button clicks tracked yet. They appear as buyers use WhatsApp, Call, Quote or Share on your listings.</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Last 30 days</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <ProgressBar label="Clicks in last 30 days" value={ctaLast30} max={Math.max(ctaEvents.length, 1)} color="primary" />
                  <ProgressBar label="Contact intent (WhatsApp + Call)" value={(ctaCounts.whatsapp || 0) + (ctaCounts.call || 0)} max={Math.max(ctaEvents.length, 1)} color="success" />
                  <ProgressBar label="Quote requests" value={(ctaCounts.quote || 0) + (ctaCounts.enquiry || 0)} max={Math.max(ctaEvents.length, 1)} color="accent" />
                </CardContent>
              </Card>
            </div>
            <DataTable
              title="Per-product CTA performance"
              columns={[
                { key: "product", label: "Product", width: "30%" },
                { key: "views", label: "Views" },
                { key: "whatsapp", label: "WhatsApp" },
                { key: "call", label: "Call" },
                { key: "quote", label: "Quote" },
                { key: "share", label: "Share" },
                { key: "rate", label: "Click Rate" },
              ]}
              rows={ctaByProductRows}
              emptyMessage="No CTA clicks tracked for your products yet."
            />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Views"
                value={totalViews.toLocaleString()}
                change={viewsChange}
                changeLabel="vs last month"
                icon={<Eye className="h-6 w-6" />}
                color="primary"
              />
              <MetricCard
                title="Total Enquiries"
                value={totalEnquiries.toLocaleString()}
                change={enquiriesChange}
                changeLabel="vs last month"
                icon={<MessageSquare className="h-6 w-6" />}
                color="success"
              />
              <MetricCard
                title="Leads This Month"
                value={sellerProfile?.leads_used_this_month || 0}
                icon={<Users className="h-6 w-6" />}
                color="info"
              />
              <MetricCard
                title="Avg Rating"
                value={avgRating}
                icon={<Star className="h-6 w-6" />}
                color="accent"
              />
            </div>

            {/* Secondary performance metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Conversion Rate"
                value={`${conversionRate}%`}
                changeLabel={`${convertedLeads}/${totalLeadsAll} leads`}
                icon={<Users className="h-6 w-6" />}
                color="success"
              />
              <MetricCard
                title="Enquiry Rate"
                value={`${enquiryRate}%`}
                changeLabel="views → enquiries"
                icon={<MessageSquare className="h-6 w-6" />}
                color="info"
              />
              <MetricCard
                title="Active Products"
                value={activeProducts}
                changeLabel={`of ${products?.length || 0} total`}
                icon={<Eye className="h-6 w-6" />}
                color="primary"
              />
              <MetricCard
                title="Response Rate"
                value={`${responseRate}%`}
                icon={<Shield className="h-6 w-6" />}
                color="accent"
              />
            </div>

            {/* Trust Score & Lead Funnel */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-trust" />
                    Trust Score Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-primary">{sellerProfile?.trust_score || 0}</div>
                    <p className="text-muted-foreground">out of 100</p>
                  </div>
                  {trustComponents.map((comp, i) => (
                    <ProgressBar 
                      key={i}
                      label={comp.label}
                      value={comp.value}
                      max={comp.max}
                      color={comp.color}
                    />
                  ))}
                  {(profile?.dispute_penalty ?? 0) > 0 && (
                    <div className="text-sm text-destructive flex items-center justify-between">
                      <span>Dispute Penalty</span>
                      <span>-{profile?.dispute_penalty} points</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <FunnelChart steps={funnelSteps} title="Lead Conversion Funnel" />
            </div>

            {/* Ratings & Top Products */}
            <div className="grid md:grid-cols-2 gap-6">
              <DonutChart 
                data={ratingDist}
                title="Rating Distribution"
                centerValue={avgRating}
                centerLabel="Average"
              />
              
              <DataTable
                title="Top Performing Products"
                columns={[
                  { key: "name", label: "Product", width: "35%" },
                  { key: "category", label: "Category" },
                  { key: "views", label: "Views" },
                  { key: "enquiries", label: "Enquiries" },
                  { key: "conversion", label: "Rate" },
                ]}
                rows={topProductRows}
              />
            </div>

            {/* Lead Income Engine */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                title="Total Leads Captured"
                value={totalLeadsAll.toLocaleString()}
                changeLabel="all sources"
                icon={<Users className="h-6 w-6" />}
                color="primary"
              />
              <MetricCard
                title="Est. Lead Value"
                value={`₹${estimatedIncome.toLocaleString()}`}
                changeLabel={`≈ ₹${AVG_LEAD_VALUE}/lead`}
                icon={<MessageSquare className="h-6 w-6" />}
                color="info"
              />
              <MetricCard
                title="Won Deal Value"
                value={`₹${convertedIncome.toLocaleString()}`}
                changeLabel={`${convertedLeads} converted`}
                icon={<Star className="h-6 w-6" />}
                color="success"
              />
              <MetricCard
                title="Pipeline Health"
                value={`${conversionRate}%`}
                changeLabel="lead → deal"
                icon={<Shield className="h-6 w-6" />}
                color="accent"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <DonutChart
                data={leadSourceDist.length ? leadSourceDist : [{ label: "No leads yet", value: 1, color: "hsl(var(--muted))" }]}
                title="Lead Sources"
                centerValue={totalLeadsAll}
                centerLabel="Leads"
              />
              <FunnelChart
                steps={funnelSteps}
                title="Income Conversion Path"
              />
            </div>
          </TabsContent>


          <TabsContent value="products" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard title="Catalogue Health" value={`${catalogueCompleteness}%`} changeLabel="content readiness" icon={<PackageCheck className="h-6 w-6" />} color="primary" />
                <MetricCard title="With Images" value={`${productsWithImages}/${products?.length || 0}`} icon={<Eye className="h-6 w-6" />} color="info" />
                <MetricCard title="With Price" value={`${productsWithPrice}/${products?.length || 0}`} icon={<Activity className="h-6 w-6" />} color="success" />
                <MetricCard title="With Specs" value={`${productsWithSpecs}/${products?.length || 0}`} icon={<Shield className="h-6 w-6" />} color="accent" />
              </div>
              <DataTable
                title="Product Demand Momentum"
                columns={[
                  { key: "product", label: "Product", width: "34%" },
                  { key: "qualified", label: "Qualified Visits" },
                  { key: "interest", label: "Interest Depth" },
                  { key: "gap", label: "Lead Gap" },
                  { key: "lastLead", label: "Last Lead" },
                ]}
                rows={productVelocityRows}
                emptyMessage="No product demand data yet."
              />
            </div>
          </TabsContent>

          <TabsContent value="services" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Service Performance</CardTitle>
                <CardDescription>
                  {services.length} services ·{" "}
                  {services.reduce((sum: number, s: any) => sum + (s.view_count || 0), 0).toLocaleString()} total views
                </CardDescription>
              </CardHeader>
              <CardContent>
                {services.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No services published yet. Add services to start tracking their views.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {services.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.categories?.name || "Uncategorised"}
                            {s.city ? ` · ${s.city}` : ""}
                            {s.is_active ? "" : " · inactive"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold">{(s.view_count || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">views</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visitors" className="mt-6 space-y-6">
              <>
                <ProductVisitorsExport 
                  visitors={allVisitors || []}
                  categories={categories || []}
                  products={products?.map((p: any) => ({ id: p.id, name: p.name, category_id: p.category_id })) || []}
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard title="Avg Visit Time" value={`${avgVisitDuration}s`} icon={<Timer className="h-6 w-6" />} color="primary" />
                  <MetricCard title="Qualified Visits" value={qualifiedVisitorCount} changeLabel=">= 10s" icon={<Clock className="h-6 w-6" />} color="success" />
                  <MetricCard title="Unique Sessions" value={uniqueSessions.size} icon={<Users className="h-6 w-6" />} color="info" />
                  <MetricCard title="Repeat Sessions" value={repeatSessionCount} icon={<Activity className="h-6 w-6" />} color="accent" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <DonutChart
                    data={categoryInterestDist.length ? categoryInterestDist : [{ label: "No visits yet", value: 1, color: "hsl(var(--muted))" }]}
                    title="Category Interest Mix"
                    centerValue={allVisitors?.length || 0}
                    centerLabel="Visits"
                  />
                  <DataTable
                    title="Peak Visit Hours"
                    columns={[
                      { key: "hour", label: "Hour" },
                      { key: "visits", label: "Visits" },
                      { key: "share", label: "Share" },
                    ]}
                    rows={peakHourRows}
                    emptyMessage="No hourly visitor pattern yet."
                  />
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard title="Company Profile Views" value={profileViews.length} icon={<Building2 className="h-6 w-6" />} color="primary" />
                  <MetricCard title="Product Page Visits" value={productPageViews.length} icon={<PackageCheck className="h-6 w-6" />} color="info" />
                  <MetricCard title="Profile → Product" value={profileToProductSessions.size} changeLabel="sessions" icon={<Activity className="h-6 w-6" />} color="success" />
                  <MetricCard title="Known Visitor Sessions" value={new Set((pageViews as any[]).map((v: any) => v.device_id).filter(Boolean)).size} icon={<Users className="h-6 w-6" />} color="accent" />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                  <DataTable
                    title="Company Profile Visit Pattern"
                    columns={[
                      { key: "when", label: "When" },
                      { key: "session", label: "Session" },
                      { key: "duration", label: "Duration" },
                      { key: "next", label: "Next action" },
                    ]}
                    rows={profileVisitRows}
                    emptyMessage="No company profile visits tracked yet."
                  />
                  <DataTable
                    title="Product Page Visit Analysis"
                    columns={[
                      { key: "product", label: "Product", width: "34%" },
                      { key: "pageViews", label: "Page views" },
                      { key: "uniqueSessions", label: "Sessions" },
                      { key: "avgDepth", label: "Avg time" },
                      { key: "enquiries", label: "Leads" },
                    ]}
                    rows={productViewRows}
                    emptyMessage="No product page visits yet."
                  />
                </div>

                <DataTable
                  title="Visitor Journey Paths"
                  columns={[
                    { key: "session", label: "Session" },
                    { key: "firstTouch", label: "First touch" },
                    { key: "productPages", label: "Product pages" },
                    { key: "totalTime", label: "Total time" },
                    { key: "lastSeen", label: "Last seen" },
                  ]}
                  rows={visitorJourneyRows}
                  emptyMessage="No journey paths yet."
                />

                <DataTable
                  title="Recent Visitors"
                  columns={[
                    { key: "date", label: "Date & Time" },
                    { key: "product", label: "Product" },
                    { key: "visitor", label: "Visitor" },
                    { key: "email", label: "Email" },
                    { key: "duration", label: "Duration" },
                    { key: "type", label: "Type" },
                  ]}
                  rows={allVisitors?.slice(0, 50).map((v: any) => ({
                    date: format(new Date(v.created_at), "MMM d, HH:mm"),
                    product: v.product?.name || "N/A",
                    visitor: v.profiles?.full_name || "Anonymous",
                    email: v.profiles?.email || "-",
                    duration: v.view_duration ? `${v.view_duration}s` : "< 1s",
                    type: v.user_id 
                      ? <Badge className="bg-success/20 text-success">Registered</Badge>
                      : <Badge variant="secondary">Anonymous</Badge>,
                  })) || []}
                />
              </>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SellerAnalytics;

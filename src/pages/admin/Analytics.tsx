import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { MetricCard, DonutChart, DataTable, FunnelChart, ProgressBar } from "@/components/analytics/ZohoStyleChart";
import {
  Users,
  Package,
  TrendingUp,
  DollarSign,
  Eye,
  MessageSquare,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Calendar,
  Clock,
  Activity,
} from "lucide-react";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  const startDate = subDays(new Date(), parseInt(dateRange));

  // Platform Overview Stats
  const { data: platformStats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [users, sellers, products, leads, requirements, views] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("seller_profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("requirements").select("*", { count: "exact", head: true }),
        supabase.from("product_views").select("*", { count: "exact", head: true }),
      ]);
      return {
        users: users.count || 0,
        sellers: sellers.count || 0,
        products: products.count || 0,
        leads: leads.count || 0,
        requirements: requirements.count || 0,
        views: views.count || 0,
      };
    },
  });

  // Lead status distribution
  const { data: leadsByStatus } = useQuery({
    queryKey: ["admin-leads-by-status"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("status");
      const statusCounts: Record<string, number> = {};
      data?.forEach((lead) => {
        const status = lead.status || "new";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      return Object.entries(statusCounts).map(([status, count], i) => ({
        label: status.charAt(0).toUpperCase() + status.slice(1),
        value: count,
        color: COLORS[i % COLORS.length],
      }));
    },
  });

  // Top categories by leads
  const { data: topCategories } = useQuery({
    queryKey: ["admin-top-categories"],
    queryFn: async () => {
      const { data: leads } = await supabase
        .from("leads")
        .select("products(category_id, categories(name))")
        .not("products", "is", null);
      
      const categoryCounts: Record<string, number> = {};
      leads?.forEach((lead: any) => {
        const catName = lead.products?.categories?.name || "Uncategorized";
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
      });

      return Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count], i) => ({
          name,
          leads: count,
          color: COLORS[i % COLORS.length],
        }));
    },
  });

  // Recent trends (last 7 days)
  const { data: dailyTrends } = useQuery({
    queryKey: ["admin-daily-trends"],
    queryFn: async () => {
      const days = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        return format(date, "yyyy-MM-dd");
      });

      const [leads, views, users] = await Promise.all([
        supabase.from("leads").select("created_at").gte("created_at", days[0]),
        supabase.from("product_views").select("created_at").gte("created_at", days[0]),
        supabase.from("profiles").select("created_at").gte("created_at", days[0]),
      ]);

      return days.map((day) => ({
        date: format(new Date(day), "MMM dd"),
        leads: leads.data?.filter((l) => l.created_at?.startsWith(day)).length || 0,
        views: views.data?.filter((v) => v.created_at?.startsWith(day)).length || 0,
        signups: users.data?.filter((u) => u.created_at?.startsWith(day)).length || 0,
      }));
    },
  });

  const { data: visitorAnalytics } = useQuery({
    queryKey: ["admin-visitor-analytics", dateRange],
    queryFn: async () => {
      const startIso = startDate.toISOString();
      const [{ data: pageViews }, { data: productViews }, { data: products }] = await Promise.all([
        supabase
          .from("visitor_page_views" as any)
          .select("*, products(name), seller_profiles(business_name), categories(name)")
          .gte("created_at", startIso)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("product_views")
          .select("*, products(name, seller_id, seller_profiles(business_name), categories(name))")
          .gte("created_at", startIso)
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase
          .from("products")
          .select("id, name, view_count, enquiry_count, seller_profiles(business_name), categories(name)")
          .eq("is_active", true)
          .order("view_count", { ascending: false })
          .limit(20),
      ]);

      const pageRows = (pageViews || []) as any[];
      const productRows = (productViews || []) as any[];
      const sessions = new Set([...pageRows, ...productRows].map((v: any) => v.session_id).filter(Boolean));
      const devices = new Set(pageRows.map((v: any) => v.device_id).filter(Boolean));
      const productPageRows = pageRows.filter((v: any) => v.page_type === "product");
      const profileRows = pageRows.filter((v: any) => v.page_type === "seller_profile");
      const leadIntentSessions = Array.from(sessions).filter((sid: any) => {
        const pCount = productPageRows.filter((v: any) => v.session_id === sid).length;
        const totalTime = pageRows.filter((v: any) => v.session_id === sid).reduce((sum: number, v: any) => sum + (v.duration_seconds || 0), 0);
        return pCount >= 3 || totalTime >= 30;
      }).length;

      const categoryMap = [...pageRows, ...productRows].reduce((acc: Record<string, number>, v: any) => {
        const name = v.categories?.name || v.products?.categories?.name || "Uncategorised";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      const sellerMap = pageRows.reduce((acc: Record<string, number>, v: any) => {
        const name = v.seller_profiles?.business_name || "Unknown seller";
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});
      const hourMap = [...pageRows, ...productRows].reduce((acc: Record<string, number>, v: any) => {
        const h = format(new Date(v.created_at), "ha");
        acc[h] = (acc[h] || 0) + 1;
        return acc;
      }, {});

      return {
        totalPageViews: pageRows.length,
        productViews: productRows.length + productPageRows.length,
        profileViews: profileRows.length,
        uniqueSessions: sessions.size,
        knownDevices: devices.size,
        leadIntentSessions,
        categoryRows: Object.entries(categoryMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10),
        sellerRows: Object.entries(sellerMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10),
        hourRows: Object.entries(hourMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 8),
        topProducts: products || [],
        recentRows: pageRows.slice(0, 25),
      };
    },
  });

  // Top sellers by leads
  const { data: topSellers } = useQuery({
    queryKey: ["admin-top-sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("id, business_name, total_leads, converted_leads, trust_score")
        .eq("status", "approved")
        .order("total_leads", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Lead conversion funnel
  const leadFunnelData = leadsByStatus
    ? [
        { label: "All Leads", value: platformStats?.leads || 0, percentage: 100 },
        { label: "Contacted", value: leadsByStatus.find((l) => l.label === "Contacted")?.value || 0, percentage: 65 },
        { label: "Interested", value: leadsByStatus.find((l) => l.label === "Interested")?.value || 0, percentage: 40 },
        { label: "Converted", value: leadsByStatus.find((l) => l.label === "Converted")?.value || 0, percentage: 15 },
      ]
    : [];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Analytics</h1>
            <p className="text-muted-foreground">Comprehensive insights into platform performance</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Users"
            value={platformStats?.users || 0}
            icon={<Users className="h-5 w-5" />}
            change={12}
            changeLabel="vs last month"
            color="primary"
          />
          <MetricCard
            title="Active Sellers"
            value={platformStats?.sellers || 0}
            icon={<Building2 className="h-5 w-5" />}
            change={8}
            color="success"
          />
          <MetricCard
            title="Products"
            value={platformStats?.products || 0}
            icon={<Package className="h-5 w-5" />}
            change={15}
            color="info"
          />
          <MetricCard
            title="Total Leads"
            value={platformStats?.leads || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            change={22}
            color="accent"
          />
          <MetricCard
            title="Requirements"
            value={platformStats?.requirements || 0}
            icon={<Target className="h-5 w-5" />}
            change={5}
            color="warning"
          />
          <MetricCard
            title="Product Views"
            value={platformStats?.views || 0}
            icon={<Eye className="h-5 w-5" />}
            change={18}
            color="success"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
            <TabsTrigger value="sellers">Seller Performance</TabsTrigger>
            <TabsTrigger value="visitors">Visitor Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Trends (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        name="Views"
                      />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        stackId="2"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.2}
                        name="Leads"
                      />
                      <Area
                        type="monotone"
                        dataKey="signups"
                        stackId="3"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.2}
                        name="Signups"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Status Distribution */}
              {leadsByStatus && (
                <DonutChart
                  title="Lead Status Distribution"
                  data={leadsByStatus}
                  centerValue={platformStats?.leads || 0}
                  centerLabel="Total Leads"
                />
              )}

              {/* Top Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Categories by Leads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {topCategories?.map((cat, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{cat.name}</span>
                        <span className="text-muted-foreground">{cat.leads} leads</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(cat.leads / (topCategories[0]?.leads || 1)) * 100}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            {/* Lead Conversion Funnel */}
            <FunnelChart title="Lead Conversion Funnel" steps={leadFunnelData} />

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Quality Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">65%</p>
                    <p className="text-sm text-muted-foreground">Contact Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-success">15%</p>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-info">₹85</p>
                    <p className="text-sm text-muted-foreground">Avg Lead Price</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sellers" className="space-y-6">
            {/* Top Sellers Table */}
            <DataTable
              title="Top Performing Sellers"
              columns={[
                { key: "rank", label: "#", width: "40px" },
                { key: "name", label: "Business Name" },
                { key: "leads", label: "Total Leads" },
                { key: "converted", label: "Converted" },
                { key: "rate", label: "Conv. Rate" },
                { key: "trust", label: "Trust Score" },
              ]}
              rows={
                topSellers?.map((seller, i) => ({
                  rank: <Badge variant="outline">{i + 1}</Badge>,
                  name: <span className="font-medium">{seller.business_name}</span>,
                  leads: seller.total_leads || 0,
                  converted: seller.converted_leads || 0,
                  rate: (
                    <Badge variant={
                      ((seller.converted_leads || 0) / (seller.total_leads || 1)) * 100 > 20 
                        ? "default" 
                        : "secondary"
                    }>
                      {(((seller.converted_leads || 0) / (seller.total_leads || 1)) * 100).toFixed(1)}%
                    </Badge>
                  ),
                  trust: (
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full"
                          style={{ width: `${seller.trust_score || 0}%` }}
                        />
                      </div>
                      <span className="text-xs">{seller.trust_score || 0}</span>
                    </div>
                  ),
                })) || []
              }
            />

            {/* Seller Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Seller Response Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProgressBar label="Avg Response Rate" value={72} max={100} color="success" />
                  <ProgressBar label="Same-Day Response" value={45} max={100} color="info" />
                  <ProgressBar label="Lead Acceptance" value={88} max={100} color="primary" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Subscription Distribution</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ProgressBar label="Free Tier" value={60} max={100} color="warning" />
                  <ProgressBar label="Basic Plan" value={25} max={100} color="info" />
                  <ProgressBar label="Pro Plan" value={12} max={100} color="primary" />
                  <ProgressBar label="Premium Plan" value={3} max={100} color="accent" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="visitors" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <MetricCard title="Tracked Page Views" value={visitorAnalytics?.totalPageViews || 0} icon={<Eye className="h-5 w-5" />} color="primary" />
              <MetricCard title="Product Visits" value={visitorAnalytics?.productViews || 0} icon={<Package className="h-5 w-5" />} color="info" />
              <MetricCard title="Company Views" value={visitorAnalytics?.profileViews || 0} icon={<Building2 className="h-5 w-5" />} color="accent" />
              <MetricCard title="Unique Sessions" value={visitorAnalytics?.uniqueSessions || 0} icon={<Users className="h-5 w-5" />} color="success" />
              <MetricCard title="Known Devices" value={visitorAnalytics?.knownDevices || 0} icon={<Activity className="h-5 w-5" />} color="warning" />
              <MetricCard title="High Intent" value={visitorAnalytics?.leadIntentSessions || 0} icon={<Target className="h-5 w-5" />} color="success" />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <DataTable
                title="Top Visitor Categories"
                columns={[{ key: "category", label: "Category" }, { key: "views", label: "Views" }, { key: "share", label: "Share" }]}
                rows={(visitorAnalytics?.categoryRows || []).map(([category, views]: any) => ({
                  category,
                  views,
                  share: `${visitorAnalytics?.totalPageViews ? Math.round((views / visitorAnalytics.totalPageViews) * 100) : 0}%`,
                }))}
                emptyMessage="No category visitor data yet."
              />
              <DataTable
                title="Company Profile Attention"
                columns={[{ key: "seller", label: "Seller" }, { key: "views", label: "Profile/Page views" }]}
                rows={(visitorAnalytics?.sellerRows || []).map(([seller, views]: any) => ({ seller, views }))}
                emptyMessage="No seller profile visits yet."
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <DataTable
                title="Peak Visitor Hours"
                columns={[{ key: "hour", label: "Hour" }, { key: "views", label: "Views" }]}
                rows={(visitorAnalytics?.hourRows || []).map(([hour, views]: any) => ({ hour, views }))}
                emptyMessage="No hourly visitor data yet."
              />
              <DataTable
                title="Top Products by Stored Views"
                columns={[{ key: "product", label: "Product" }, { key: "seller", label: "Seller" }, { key: "views", label: "Views" }, { key: "enquiries", label: "Enquiries" }]}
                rows={(visitorAnalytics?.topProducts || []).map((p: any) => ({
                  product: p.name,
                  seller: p.seller_profiles?.business_name || "—",
                  views: p.view_count || 0,
                  enquiries: p.enquiry_count || 0,
                }))}
                emptyMessage="No products tracked yet."
              />
            </div>

            <DataTable
              title="Recent Platform Visitor Events"
              columns={[
                { key: "when", label: "When" },
                { key: "type", label: "Page" },
                { key: "seller", label: "Seller" },
                { key: "product", label: "Product" },
                { key: "duration", label: "Duration" },
              ]}
              rows={(visitorAnalytics?.recentRows || []).map((v: any) => ({
                when: format(new Date(v.created_at), "MMM d, HH:mm"),
                type: <Badge variant="outline">{String(v.page_type).replace("_", " ")}</Badge>,
                seller: v.seller_profiles?.business_name || "—",
                product: v.products?.name || "—",
                duration: `${v.duration_seconds || 0}s`,
              }))}
              emptyMessage="No visitor events yet."
            />
          </TabsContent>

        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;

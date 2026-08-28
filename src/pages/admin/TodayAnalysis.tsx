import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Eye, MessageSquare, Briefcase, TrendingUp, Package, Sparkles, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export default function TodayAnalysis() {
  const since = startOfToday();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-today-analysis"],
    queryFn: async () => {
      const [
        pageViews,
        productViews,
        leadsRes,
        sellersRes,
        requirementsRes,
        topProducts,
        topSellers,
        recentLeads,
      ] = await Promise.all([
        supabase.from("visitor_page_views").select("id,device_id,page_type", { count: "exact" }).gte("created_at", since),
        supabase.from("product_views").select("id,product_id", { count: "exact" }).gte("created_at", since),
        supabase.from("leads").select("id,status,source,created_at,guest_name,guest_phone,products(name),seller_profiles(business_name)").gte("created_at", since).order("created_at", { ascending: false }).limit(20),
        supabase.from("seller_profiles").select("id,business_name,status,city,created_at,trust_score").gte("created_at", since).order("created_at", { ascending: false }),
        supabase.from("requirements").select("id,title,created_at", { count: "exact" }).gte("created_at", since).order("created_at", { ascending: false }).limit(10),
        supabase.from("product_views").select("product_id,products(name,slug)").gte("created_at", since).limit(500),
        supabase.from("visitor_page_views").select("seller_id,seller_profiles(business_name)").eq("page_type", "seller_profile").gte("created_at", since).limit(500),
        supabase.from("leads").select("id,created_at,guest_name,products(name)").gte("created_at", since).order("created_at", { ascending: false }).limit(5),
      ]);

      // Aggregate top viewed products
      const pcount: Record<string, { name: string; slug?: string; count: number }> = {};
      (topProducts.data || []).forEach((r: any) => {
        if (!r.product_id) return;
        const key = r.product_id;
        pcount[key] = pcount[key] || { name: r.products?.name || "Unknown", slug: r.products?.slug, count: 0 };
        pcount[key].count += 1;
      });
      const topProductsList = Object.values(pcount).sort((a, b) => b.count - a.count).slice(0, 8);

      const scount: Record<string, { name: string; count: number }> = {};
      (topSellers.data || []).forEach((r: any) => {
        if (!r.seller_id) return;
        scount[r.seller_id] = scount[r.seller_id] || { name: r.seller_profiles?.business_name || "Unknown", count: 0 };
        scount[r.seller_id].count += 1;
      });
      const topSellersList = Object.values(scount).sort((a, b) => b.count - a.count).slice(0, 8);

      const uniqueDevices = new Set((pageViews.data || []).map((v: any) => v.device_id).filter(Boolean));

      return {
        pageViewsCount: pageViews.count || 0,
        productViewsCount: productViews.count || 0,
        uniqueVisitors: uniqueDevices.size,
        leads: leadsRes.data || [],
        leadsCount: leadsRes.data?.length || 0,
        newSellers: sellersRes.data || [],
        requirementsCount: requirementsRes.count || 0,
        requirements: requirementsRes.data || [],
        topProductsList,
        topSellersList,
        recentLeads: recentLeads.data || [],
      };
    },
    refetchInterval: 60_000,
  });

  const kpis = [
    { label: "Unique Visitors", value: data?.uniqueVisitors ?? 0, icon: Users, color: "text-primary" },
    { label: "Page Views", value: data?.pageViewsCount ?? 0, icon: Eye, color: "text-accent" },
    { label: "Product Views", value: data?.productViewsCount ?? 0, icon: Package, color: "text-blue-600" },
    { label: "Leads Today", value: data?.leadsCount ?? 0, icon: MessageSquare, color: "text-green-600" },
    { label: "New Vendors", value: data?.newSellers?.length ?? 0, icon: Briefcase, color: "text-orange-600" },
    { label: "New Requirements", value: data?.requirementsCount ?? 0, icon: Sparkles, color: "text-purple-600" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Clock className="h-6 w-6 text-accent" /> Today's Analysis</h1>
            <p className="text-sm text-muted-foreground">Live platform activity since 12:00 AM · auto-refreshes every minute</p>
          </div>
          <Badge variant="outline" className="gap-1"><TrendingUp className="h-3 w-3" /> {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <k.icon className={`h-5 w-5 mb-2 ${k.color}`} />
                <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-12" /> : k.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Top Viewed Products Today</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : data?.topProductsList.length ? (
                <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Views</TableHead></TableRow></TableHeader>
                  <TableBody>{data.topProductsList.map((p, i) => (
                    <TableRow key={i}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-right"><Badge>{p.count}</Badge></TableCell></TableRow>
                  ))}</TableBody></Table>
              ) : <p className="text-sm text-muted-foreground py-6 text-center">No product views yet today.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> Most Visited Vendors Today</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : data?.topSellersList.length ? (
                <Table><TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead className="text-right">Profile visits</TableHead></TableRow></TableHeader>
                  <TableBody>{data.topSellersList.map((s, i) => (
                    <TableRow key={i}><TableCell className="font-medium">{s.name}</TableCell><TableCell className="text-right"><Badge variant="secondary">{s.count}</Badge></TableCell></TableRow>
                  ))}</TableBody></Table>
              ) : <p className="text-sm text-muted-foreground py-6 text-center">No vendor page visits yet today.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Leads Captured Today</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : data?.leads.length ? (
                <div className="space-y-2 max-h-[320px] overflow-y-auto">
                  {data.leads.map((l: any) => (
                    <div key={l.id} className="flex items-start justify-between gap-2 rounded border p-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{l.guest_name || "Anonymous"} · <span className="text-muted-foreground">{l.guest_phone || "—"}</span></div>
                        <div className="text-xs text-muted-foreground truncate">{l.products?.name || "—"} · {l.seller_profiles?.business_name || "—"}</div>
                      </div>
                      <Badge variant={l.source === "public_product_enquiry" ? "default" : "secondary"} className="shrink-0 text-[10px]">{l.source || l.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground py-6 text-center">No leads captured yet today.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" /> New Vendors Registered Today</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-40 w-full" /> : data?.newSellers?.length ? (
                <div className="space-y-2">
                  {data.newSellers.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.business_name}</div>
                        <div className="text-xs text-muted-foreground">{s.city || "—"} · {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}</div>
                      </div>
                      <Badge variant={s.status === "approved" ? "default" : "secondary"}>{s.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground py-6 text-center">No new vendors today.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

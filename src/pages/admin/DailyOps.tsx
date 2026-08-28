import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Users, Eye, MessageSquare, Package, Briefcase, BellRing } from "lucide-react";

const dayRange = (day: string) => {
  const start = new Date(`${day}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
};

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function DailyOps() {
  const [day, setDay] = useState(todayStr());
  const { start, end } = dayRange(day);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-daily-ops", day],
    queryFn: async () => {
      const [views, productViews, leadsRes, sellersRes] = await Promise.all([
        supabase.from("visitor_page_views").select("id,device_id", { count: "exact" }).gte("created_at", start).lt("created_at", end),
        supabase.from("product_views").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
        supabase
          .from("leads")
          .select("id,created_at,status,source,message,guest_name,guest_phone,guest_email,quantity,unit,informed,informed_at,products(name,slug),seller_profiles(business_name,phone,whatsapp,city)")
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false }),
        supabase.from("seller_profiles").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
      ]);

      const leads = (leadsRes.data as any[]) || [];
      return {
        pageViews: views.count || 0,
        uniqueVisitors: new Set((views.data || []).map((v: any) => v.device_id).filter(Boolean)).size,
        productViews: productViews.count || 0,
        newSellers: sellersRes.count || 0,
        leads,
        informed: leads.filter((l) => l.informed).length,
      };
    },
    refetchInterval: 60_000,
  });

  const toggleInformed = useMutation({
    mutationFn: async ({ id, informed }: { id: string; informed: boolean }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("leads")
        .update({
          informed,
          informed_at: informed ? new Date().toISOString() : null,
          informed_by: informed ? auth.user?.id ?? null : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["admin-daily-ops", day] });
      toast({ title: v.informed ? "Marked as informed" : "Marked as pending" });
    },
    onError: (e: any) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });

  const kpis = [
    { label: "Unique Visitors", value: data?.uniqueVisitors ?? 0, icon: Users },
    { label: "Page Views", value: data?.pageViews ?? 0, icon: Eye },
    { label: "Product Views", value: data?.productViews ?? 0, icon: Package },
    { label: "Leads / Enquiries", value: data?.leads?.length ?? 0, icon: MessageSquare },
    { label: "Dealers Informed", value: data?.informed ?? 0, icon: BellRing },
    { label: "New Vendors", value: data?.newSellers ?? 0, icon: Briefcase },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Daily Operations</h1>
            <p className="text-sm text-muted-foreground">Marketplace views, leads and dealer follow-up for a single day.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={day} max={todayStr()} onChange={(e) => setDay(e.target.value || todayStr())} className="w-44" />
            {day === todayStr() && <Badge variant="outline">Today</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <k.icon className="h-5 w-5 mb-2 text-primary" />
                <div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-7 w-12" /> : k.value.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">{k.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads &amp; enquiries captured</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : data?.leads?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Seller / Dealer</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Informed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.leads.map((l: any) => (
                    <TableRow key={l.id} className={l.informed ? "opacity-70" : ""}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{l.guest_name || "Anonymous"}</div>
                        <div className="text-xs text-muted-foreground">{l.guest_phone || l.guest_email || "—"}</div>
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate font-medium">{l.products?.name || "—"}</div>
                        {l.quantity ? <div className="text-xs text-muted-foreground">Qty {l.quantity} {l.unit || ""}</div> : null}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate font-medium">{l.seller_profiles?.business_name || "Unassigned"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {l.seller_profiles?.whatsapp || l.seller_profiles?.phone || "—"} · {l.seller_profiles?.city || "—"}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{l.source || l.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={!!l.informed}
                            onCheckedChange={(v) => toggleInformed.mutate({ id: l.id, informed: v })}
                          />
                          <span className="text-[11px] text-muted-foreground w-16 text-left">
                            {l.informed ? (l.informed_at ? new Date(l.informed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Done") : "Pending"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">No leads captured on this day.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, LogOut, Phone, Mail, MapPin, Eye, Smartphone, Search, TrendingUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type LeadSort = "created_at" | "source" | "guest_name";
type DevSort = "last_seen_at" | "first_seen_at" | "enquiry_count";
const PAGE_SIZE = 20;

export default function AutoLeads() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "auto_capture" | "exit_intent">("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const [leadSort, setLeadSort] = useState<LeadSort>("created_at");
  const [leadDir, setLeadDir] = useState<"asc" | "desc">("desc");
  const [leadPage, setLeadPage] = useState(0);

  const [devSort, setDevSort] = useState<DevSort>("last_seen_at");
  const [devDir, setDevDir] = useState<"asc" | "desc">("desc");
  const [devPage, setDevPage] = useState(0);

  const { data: leadsRes, isLoading } = useQuery({
    queryKey: ["admin-auto-leads", search, sourceFilter, leadSort, leadDir, leadPage],
    queryFn: async () => {
      let q = supabase
        .from("leads")
        .select("*, categories(name), seller_profiles(business_name, slug)", { count: "exact" })
        .in("source", ["auto_capture", "exit_intent"])
        .order(leadSort, { ascending: leadDir === "asc" });
      if (sourceFilter !== "all") q = q.eq("source", sourceFilter);
      if (search) q = q.or(`guest_name.ilike.%${search}%,guest_phone.ilike.%${search}%,guest_email.ilike.%${search}%`);
      const from = leadPage * PAGE_SIZE;
      const { data, count, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: data || [], total: count || 0 };
    },
  });

  const { data: devicesRes } = useQuery({
    queryKey: ["admin-visitor-devices", devSort, devDir, devPage],
    queryFn: async () => {
      const from = devPage * PAGE_SIZE;
      const { data, count } = await supabase
        .from("visitor_devices")
        .select("*", { count: "exact" })
        .order(devSort, { ascending: devDir === "asc" })
        .range(from, from + PAGE_SIZE - 1);
      return { rows: data || [], total: count || 0 };
    },
  });

  const { data: aggregates } = useQuery({
    queryKey: ["admin-auto-leads-aggregates"],
    queryFn: async () => {
      const [autoRes, exitRes, devRes] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("source", "auto_capture"),
        supabase.from("leads").select("*", { count: "exact", head: true }).eq("source", "exit_intent"),
        supabase.from("visitor_devices").select("*", { count: "exact", head: true }),
      ]);
      // Top categories among recent auto leads
      const { data: recent } = await supabase.from("leads").select("categories(name)").in("source", ["auto_capture", "exit_intent"]).order("created_at", { ascending: false }).limit(300);
      const cat: Record<string, number> = {};
      (recent || []).forEach((r: any) => { const n = r.categories?.name || "Unknown"; cat[n] = (cat[n] || 0) + 1; });
      const topCats = Object.entries(cat).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return {
        autoCount: autoRes.count || 0,
        exitCount: exitRes.count || 0,
        devicesCount: devRes.count || 0,
        topCats,
      };
    },
  });

  const leadPageCount = Math.max(1, Math.ceil((leadsRes?.total || 0) / PAGE_SIZE));
  const devPageCount = Math.max(1, Math.ceil((devicesRes?.total || 0) / PAGE_SIZE));
  const convRate = aggregates?.devicesCount ? (((aggregates.autoCount + aggregates.exitCount) / aggregates.devicesCount) * 100).toFixed(1) : "0";

  const LeadSortHead = ({ k, label }: { k: LeadSort; label: string }) => (
    <TableHead>
      <button className="inline-flex items-center gap-1" onClick={() => { if (leadSort === k) setLeadDir((d) => d === "asc" ? "desc" : "asc"); else { setLeadSort(k); setLeadDir("asc"); } setLeadPage(0); }}>
        {label} <ArrowUpDown className={`h-3 w-3 ${leadSort === k ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    </TableHead>
  );

  const DevSortHead = ({ k, label }: { k: DevSort; label: string }) => (
    <TableHead>
      <button className="inline-flex items-center gap-1" onClick={() => { if (devSort === k) setDevDir((d) => d === "asc" ? "desc" : "asc"); else { setDevSort(k); setDevDir("asc"); } setDevPage(0); }}>
        {label} <ArrowUpDown className={`h-3 w-3 ${devSort === k ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    </TableHead>
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" /> Auto-Captured Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Leads generated by visitor-pattern matching and exit-intent captures.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pattern-Match</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{aggregates?.autoCount ?? 0}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><LogOut className="h-3 w-3" />Exit-Intent</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{aggregates?.exitCount ?? 0}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Smartphone className="h-3 w-3" />Known Devices</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{aggregates?.devicesCount ?? 0}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Device→Lead</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{convRate}%</div></CardContent></Card>
        </div>

        {aggregates?.topCats && aggregates.topCats.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Top categories driving auto leads</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {aggregates.topCats.map(([name, n]) => <Badge key={name} variant="secondary">{name} · {n}</Badge>)}
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="leads">
          <TabsList>
            <TabsTrigger value="leads">Auto Leads ({leadsRes?.total ?? 0})</TabsTrigger>
            <TabsTrigger value="devices">Devices ({devicesRes?.total ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search name, phone, email…" value={search} onChange={(e) => { setSearch(e.target.value); setLeadPage(0); }} className="pl-10" />
                  </div>
                  <div className="flex gap-2">
                    {(["all", "auto_capture", "exit_intent"] as const).map((s) => (
                      <Button key={s} size="sm" variant={sourceFilter === s ? "default" : "outline"} onClick={() => { setSourceFilter(s); setLeadPage(0); }}>
                        {s === "all" ? "All" : s === "auto_capture" ? "Pattern" : "Exit-Intent"}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
                  : (leadsRes?.rows.length ?? 0) === 0 ? <p className="text-sm text-muted-foreground">No matching leads.</p>
                  : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader><TableRow>
                          <LeadSortHead k="created_at" label="When" />
                          <LeadSortHead k="source" label="Source" />
                          <LeadSortHead k="guest_name" label="Visitor" />
                          <TableHead>Category / Activity</TableHead>
                          <TableHead>Seller</TableHead>
                          <TableHead></TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {leadsRes!.rows.map((l: any) => {
                            const meta = l.metadata || {};
                            const visited = meta.visited_products || [];
                            return (
                              <TableRow key={l.id}>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</TableCell>
                                <TableCell><Badge variant={l.source === "exit_intent" ? "secondary" : "default"}>{l.source === "exit_intent" ? "Exit-Intent" : "Pattern"}</Badge></TableCell>
                                <TableCell>
                                  <div className="text-sm font-medium">{l.guest_name || "—"}</div>
                                  <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
                                    {l.guest_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{l.guest_phone}</span>}
                                    {l.guest_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{l.guest_email}</span>}
                                    {meta.visitor_city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{meta.visitor_city}</span>}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">{l.categories?.name || "—"}</div>
                                  {visited.length > 0 && <div className="text-xs text-muted-foreground">{visited.length} products viewed</div>}
                                  {meta.captured_path && <div className="text-xs text-muted-foreground truncate max-w-[240px]">on {meta.captured_path}</div>}
                                </TableCell>
                                <TableCell className="text-sm">{l.seller_profiles?.business_name || "—"}</TableCell>
                                <TableCell><Button size="sm" variant="ghost" onClick={() => setSelectedLead(l)}><Eye className="h-4 w-4" /></Button></TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">Page {leadPage + 1} of {leadPageCount} · {leadsRes?.total} total</div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setLeadPage((p) => Math.max(0, p - 1))} disabled={leadPage === 0}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                        <Button size="sm" variant="outline" onClick={() => setLeadPage((p) => Math.min(leadPageCount - 1, p + 1))} disabled={leadPage + 1 >= leadPageCount}>Next <ChevronRight className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="devices">
            <Card>
              <CardHeader><CardTitle>Known Devices</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Device ID</TableHead>
                      <TableHead>Contact</TableHead>
                      <DevSortHead k="first_seen_at" label="First seen" />
                      <DevSortHead k="last_seen_at" label="Last seen" />
                      <DevSortHead k="enquiry_count" label="Enquiries" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {(devicesRes?.rows || []).map((d: any) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{String(d.device_id || "").slice(0, 14)}…</TableCell>
                          <TableCell><div className="text-sm">{d.name || "—"}</div><div className="text-xs text-muted-foreground">{d.phone || d.email || "—"}</div></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.first_seen_at ? formatDistanceToNow(new Date(d.first_seen_at), { addSuffix: true }) : "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{d.last_seen_at ? formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true }) : "—"}</TableCell>
                          <TableCell>{d.enquiry_count || 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Page {devPage + 1} of {devPageCount} · {devicesRes?.total} total</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDevPage((p) => Math.max(0, p - 1))} disabled={devPage === 0}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                    <Button size="sm" variant="outline" onClick={() => setDevPage((p) => Math.min(devPageCount - 1, p + 1))} disabled={devPage + 1 >= devPageCount}>Next <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedLead} onOpenChange={(o) => !o && setSelectedLead(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Auto Lead Detail</DialogTitle></DialogHeader>
            {selectedLead && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>Name:</strong> {selectedLead.guest_name || "—"}</div>
                  <div><strong>Phone:</strong> {selectedLead.guest_phone || "—"}</div>
                  <div><strong>Email:</strong> {selectedLead.guest_email || "—"}</div>
                  <div><strong>Source:</strong> {selectedLead.source}</div>
                  <div><strong>Category:</strong> {selectedLead.categories?.name || "—"}</div>
                  <div><strong>Status:</strong> {selectedLead.status}</div>
                </div>
                {selectedLead.message && <div><strong>Message:</strong><p className="text-muted-foreground">{selectedLead.message}</p></div>}
                {selectedLead.metadata?.visited_products?.length > 0 && (
                  <div>
                    <strong>Visited products:</strong>
                    <ul className="mt-1 text-muted-foreground list-disc pl-5">
                      {selectedLead.metadata.visited_products.slice(0, 20).map((p: any, i: number) => (
                        <li key={i}>{p.name || p.slug || p.product_id} {p.duration_seconds ? `· ${p.duration_seconds}s` : ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedLead.device_id && <div className="font-mono text-xs text-muted-foreground">device: {selectedLead.device_id}</div>}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

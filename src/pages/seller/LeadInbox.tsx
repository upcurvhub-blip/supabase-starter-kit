import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, MessageSquare, Package, Filter, Search, Calendar, LayoutList, LayoutGrid, PanelsTopLeft, Eye, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";

const LeadInbox = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [followForm, setFollowForm] = useState<{ at: string; notes: string; completionNote: string }>({ at: "", notes: "", completionNote: "" });

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("seller_profiles").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: leads, isLoading } = useQuery({
    queryKey: ["seller-leads"],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("leads")
        .select(`*, buyer:profiles!leads_buyer_id_fkey(full_name, email, phone), products(id, name, images)`)
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const uniqueProducts = useMemo(() => {
    const acc: any[] = [];
    (leads || []).forEach((lead: any) => {
      if (lead.products && !acc.find((p) => p.id === lead.products.id)) acc.push(lead.products);
    });
    return acc;
  }, [leads]);

  const filteredLeads = useMemo(() => (leads || []).filter((lead: any) => {
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchesProduct = productFilter === "all" || lead.product_id === productFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      lead.buyer?.full_name?.toLowerCase().includes(q) ||
      lead.buyer?.email?.toLowerCase().includes(q) ||
      lead.guest_name?.toLowerCase().includes(q) ||
      lead.guest_phone?.toLowerCase().includes(q) ||
      lead.products?.name?.toLowerCase().includes(q);
    return matchesStatus && matchesProduct && matchesSearch;
  }), [leads, statusFilter, productFilter, searchQuery]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("leads").update({ status: status as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seller-leads"] }); toast({ title: "Lead status updated" }); },
  });

  const saveFollowUp = useMutation({
    mutationFn: async ({ id, at, notes }: { id: string; at: string; notes: string }) => {
      const iso = at ? new Date(at).toISOString() : null;
      const { error } = await supabase.from("leads").update({
        follow_up_at: iso,
        follow_up_notes: notes || null,
        follow_up_done: false,
        follow_up_completed_at: null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["seller-leads"] });
      setSelected((s: any) => s ? { ...s, follow_up_at: v.at ? new Date(v.at).toISOString() : null, follow_up_notes: v.notes, follow_up_done: false, follow_up_completed_at: null } : s);
      toast({ title: "Follow-up scheduled" });
    },
  });

  const markDone = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase.from("leads").update({
        follow_up_done: true,
        follow_up_completed_at: new Date().toISOString(),
        follow_up_notes: note || null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ["seller-leads"] });
      setSelected((s: any) => s ? { ...s, follow_up_done: true, follow_up_completed_at: new Date().toISOString(), follow_up_notes: v.note } : s);
      toast({ title: "Follow-up marked as done" });
    },
  });

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    interested: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    converted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    lost: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    expired: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  const statuses = ["new", "contacted", "interested", "converted", "lost"];

  const isOverdue = (l: any) => l?.follow_up_at && !l.follow_up_done && isPast(new Date(l.follow_up_at));

  const openDetail = (lead: any) => {
    setSelected(lead);
    setFollowForm({
      at: lead.follow_up_at ? new Date(lead.follow_up_at).toISOString().slice(0, 16) : "",
      notes: lead.follow_up_notes || "",
      completionNote: lead.follow_up_notes || "",
    });
  };

  const rowBorder = (l: any) => isOverdue(l) ? "border-l-4 border-l-destructive" : "";

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Inbox</h1>
          <p className="text-muted-foreground">Manage and respond to buyer enquiries</p>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or product..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="w-full md:w-[200px]"><Package className="h-4 w-4 mr-2" /><SelectValue placeholder="Filter by product" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {uniqueProducts.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {statuses.map((s) => {
            const count = leads?.filter((l: any) => l.status === s).length || 0;
            return (
              <Card key={s} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(s)}>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground capitalize">{s}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Overdue banner */}
        {(() => {
          const overdue = (leads || []).filter((l: any) => isOverdue(l)).length;
          if (!overdue) return null;
          return (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{overdue} follow-up{overdue > 1 ? "s" : ""} overdue</span> — highlighted in red below.
            </div>
          );
        })()}

        <Tabs defaultValue="list" className="w-full">
          <TabsList>
            <TabsTrigger value="list"><LayoutList className="h-4 w-4 mr-2" />List View</TabsTrigger>
            <TabsTrigger value="grid"><PanelsTopLeft className="h-4 w-4 mr-2" />Grid View</TabsTrigger>
            <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-2" />Kanban Board</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-4">
            {isLoading ? <div className="text-center py-8">Loading...</div>
              : filteredLeads.length === 0 ? (
                <Card><CardContent className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{leads?.length === 0 ? "No leads yet." : "No leads match your filters."}</p>
                </CardContent></Card>
              ) : (
                <div className="grid gap-4">
                  {filteredLeads.map((lead: any) => (
                    <Card key={lead.id} className={cn("hover:shadow-md transition-shadow cursor-pointer", rowBorder(lead))} onClick={() => openDetail(lead)}>
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row gap-4">
                          {lead.products && (
                            <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden shrink-0">
                              {lead.products.images?.[0] ? <img src={lead.products.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold">{lead.buyer?.full_name || lead.guest_name || "Public Buyer"}</h3>
                                  <Badge className={statusColors[lead.status || "new"]}>{lead.status}</Badge>
                                  {isOverdue(lead) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>}
                                  {lead.follow_up_done && <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" /> Followed up</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{lead.buyer?.email || lead.guest_phone}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {new Date(lead.created_at || "").toLocaleDateString()}
                              </div>
                            </div>
                            {lead.products && <div className="flex items-center gap-2 mb-2"><Package className="h-4 w-4 text-primary" /><span className="text-sm font-medium text-primary">{lead.products.name}</span></div>}
                            {lead.follow_up_at && (
                              <div className={cn("text-xs mb-2 flex items-center gap-1", isOverdue(lead) ? "text-destructive font-medium" : "text-muted-foreground")}>
                                <Clock className="h-3 w-3" /> Follow up: {format(new Date(lead.follow_up_at), "PPp")}
                              </div>
                            )}
                            {lead.message && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{lead.message}</p>}
                            <div className="flex flex-wrap gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                              {(lead.buyer?.phone || lead.guest_phone) && (
                                <Button size="sm" variant="outline" asChild>
                                  <a href={`tel:${lead.buyer?.phone || lead.guest_phone}`}><Phone className="h-4 w-4 mr-2" /> {lead.buyer?.phone || lead.guest_phone}</a>
                                </Button>
                              )}
                              <Button size="sm" variant="secondary" onClick={() => openDetail(lead)}><Eye className="h-4 w-4 mr-2" /> View</Button>
                              <Select value={lead.status || "new"} onValueChange={(v) => updateStatus.mutate({ id: lead.id, status: v })}>
                                <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </TabsContent>

          <TabsContent value="grid" className="mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredLeads.map((lead: any) => (
                <Card key={lead.id} className={cn("hover:shadow-md transition-shadow overflow-hidden cursor-pointer", rowBorder(lead))} onClick={() => openDetail(lead)}>
                  {lead.products && (
                    <div className="aspect-square bg-muted overflow-hidden">
                      {lead.products.images?.[0] ? <img src={lead.products.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>}
                    </div>
                  )}
                  <CardContent className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm truncate">{lead.buyer?.full_name || lead.guest_name || "Public Buyer"}</h3>
                      <Badge className={cn(statusColors[lead.status || "new"], "text-[10px]")}>{lead.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{lead.guest_phone || lead.buyer?.phone || "—"}</p>
                    {lead.products?.name && <div className="text-xs text-primary truncate">{lead.products.name}</div>}
                    {isOverdue(lead) && <Badge variant="destructive" className="text-[10px] gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="kanban" className="mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 overflow-x-auto">
              {statuses.map((s) => {
                const col = (leads || []).filter((l: any) => l.status === s);
                return (
                  <div key={s} className="bg-muted/40 rounded-lg p-3 min-h-[300px]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm capitalize">{s}</h3>
                      <Badge variant="secondary" className="text-xs">{col.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {col.map((lead: any) => (
                        <Card key={lead.id} className={cn("p-3 hover:shadow-md cursor-pointer", rowBorder(lead))} onClick={() => openDetail(lead)}>
                          <p className="font-medium text-sm line-clamp-1">{lead.buyer?.full_name || lead.guest_name || "Public Buyer"}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{lead.guest_phone || "No phone"}</p>
                          {lead.products?.name && <div className="text-xs text-primary line-clamp-1 mt-1">{lead.products.name}</div>}
                          {isOverdue(lead) && <div className="mt-2 text-[11px] text-destructive font-medium">Overdue follow-up</div>}
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Detail dialog with follow-up scheduling */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-2xl w-[calc(100%-1.5rem)] mx-auto rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                Lead Details
                {selected && isOverdue(selected) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</Badge>}
                {selected?.follow_up_done && <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" /> Done</Badge>}
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                  <div><div className="text-xs text-muted-foreground">Name</div><div className="font-medium">{selected.buyer?.full_name || selected.guest_name || "Public Buyer"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Phone</div><div className="font-medium">{selected.guest_phone || selected.buyer?.phone || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Email</div><div className="font-medium truncate">{selected.buyer?.email || selected.guest_email || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Status</div><Badge className={statusColors[selected.status || "new"]}>{selected.status}</Badge></div>
                  <div><div className="text-xs text-muted-foreground">Product</div><div className="font-medium">{selected.products?.name || "—"}</div></div>
                  <div><div className="text-xs text-muted-foreground">Received</div><div className="font-medium">{format(new Date(selected.created_at), "PPp")}</div></div>
                </div>

                {selected.message && (
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground mb-1">Message</div>
                    <p className="whitespace-pre-wrap">{selected.message}</p>
                  </div>
                )}

                <div className={cn("rounded-lg border p-3 space-y-3", isOverdue(selected) ? "border-destructive/50 bg-destructive/5" : "")}>
                  <div className="flex items-center gap-2 font-semibold">
                    <Clock className="h-4 w-4" /> Schedule Follow-up
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Date & time</label>
                      <Input type="datetime-local" value={followForm.at} onChange={(e) => setFollowForm({ ...followForm, at: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Change status</label>
                      <Select value={selected.status || "new"} onValueChange={(v) => updateStatus.mutate({ id: selected.id, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Notes</label>
                    <Textarea rows={3} placeholder="What to discuss, quote details, prep notes…" value={followForm.notes} onChange={(e) => setFollowForm({ ...followForm, notes: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => saveFollowUp.mutate({ id: selected.id, at: followForm.at, notes: followForm.notes })} disabled={!followForm.at || saveFollowUp.isPending}>
                      {selected.follow_up_at ? "Update follow-up" : "Schedule follow-up"}
                    </Button>
                    {selected.follow_up_at && !selected.follow_up_done && (
                      <Button size="sm" variant="secondary" onClick={() => markDone.mutate({ id: selected.id, note: followForm.completionNote || followForm.notes })}>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as done
                      </Button>
                    )}
                    {(selected.buyer?.phone || selected.guest_phone) && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${selected.buyer?.phone || selected.guest_phone}`}><Phone className="h-4 w-4 mr-2" /> Call now</a>
                      </Button>
                    )}
                  </div>
                  {selected.follow_up_done && selected.follow_up_completed_at && (
                    <div className="rounded border bg-green-50 dark:bg-green-950/30 p-2 text-xs text-green-800 dark:text-green-300">
                      Completed on {format(new Date(selected.follow_up_completed_at), "PPp")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LeadInbox;

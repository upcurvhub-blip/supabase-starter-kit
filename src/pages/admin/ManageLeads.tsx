import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Search, Eye, Phone, MessageSquare, RefreshCw, Download, Filter, CheckCircle2, Package, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { LeadsFunnel } from "@/components/dashboard/LeadsFunnel";

const ManageLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<any>(null);
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("leads")
        .select(`
          *,
          buyer:profiles!leads_buyer_id_fkey(full_name, email, phone),
          seller_profiles(business_name, phone, email),
          products(name, images)
        `)
        .order("created_at", { ascending: false });
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as any);
      }
      
      const { data } = await query.limit(100);
      return data || [];
    },
  });

  const filteredLeads = leads?.filter((lead: any) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      lead.buyer?.full_name?.toLowerCase().includes(search) ||
      lead.buyer?.email?.toLowerCase().includes(search) ||
      lead.guest_name?.toLowerCase().includes(search) ||
      lead.guest_phone?.toLowerCase().includes(search) ||
      lead.seller_profiles?.business_name?.toLowerCase().includes(search) ||
      lead.products?.name?.toLowerCase().includes(search)
    );
  }) || [];

  const { data: requirements, isLoading: requirementsLoading } = useQuery({
    queryKey: ["admin-requirements-for-assignment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requirements")
        .select("*, categories(id, name, slug)")
        .in("status", ["pending_admin", "assigned"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: sellers } = useQuery({
    queryKey: ["eligible-sellers", selectedRequirement?.category_id],
    queryFn: async () => {
      if (!selectedRequirement?.category_id) return [];
      const { data: categoryRows } = await supabase
        .from("categories")
        .select("id,parent_id")
        .or(`id.eq.${selectedRequirement.category_id},parent_id.eq.${selectedRequirement.category_id}`);
      const categoryIds = (categoryRows || []).map((c: any) => c.id);

      const [{ data: sellerRows }, { data: productRows }] = await Promise.all([
        supabase
          .from("seller_profiles")
          .select("id, business_name, city, state, trust_score, phone, email, status, verification_status")
          .eq("status", "approved")
          .order("trust_score", { ascending: false }),
        supabase
          .from("products")
          .select("seller_id, name, category_id")
          .in("category_id", categoryIds.length ? categoryIds : [selectedRequirement.category_id])
          .eq("is_active", true),
      ]);

      const productMap = new Map<string, any[]>();
      (productRows || []).forEach((product: any) => {
        productMap.set(product.seller_id, [...(productMap.get(product.seller_id) || []), product]);
      });

      return (sellerRows || [])
        .map((seller: any) => ({ ...seller, matchingProducts: productMap.get(seller.id) || [] }))
        .sort((a: any, b: any) => (b.matchingProducts.length - a.matchingProducts.length) || ((b.trust_score || 0) - (a.trust_score || 0)));
    },
    enabled: !!selectedRequirement?.category_id,
  });

  // Buyer session pattern: viewed products / category interests for the selected lead's buyer
  const { data: buyerPattern } = useQuery({
    queryKey: ["buyer-pattern", selectedLead?.id],
    queryFn: async () => {
      if (!selectedLead?.buyer_id) return null;
      const { data: signals } = await supabase
        .from("buyer_intent_signals")
        .select("signal_type, signal_data, weight, created_at")
        .eq("user_id", selectedLead.buyer_id)
        .order("created_at", { ascending: false })
        .limit(100);

      const rows = signals || [];
      const productIds = [...new Set(rows
        .map((s: any) => s.signal_data?.product_id)
        .filter(Boolean))] as string[];
      const categoryIds = [...new Set(rows
        .map((s: any) => s.signal_data?.category_id)
        .filter(Boolean))] as string[];
      const searches = rows
        .filter((s: any) => s.signal_type === "search" && s.signal_data?.search_query)
        .map((s: any) => s.signal_data.search_query);

      const [{ data: products }, { data: categories }] = await Promise.all([
        productIds.length
          ? supabase.from("products").select("id, name").in("id", productIds)
          : Promise.resolve({ data: [] as any[] }),
        categoryIds.length
          ? supabase.from("categories").select("id, name").in("id", categoryIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const totalIntent = rows.reduce((sum: number, s: any) => sum + (s.weight || 1), 0);
      return {
        viewedProducts: products || [],
        categoryInterests: categories || [],
        searches: [...new Set(searches)].slice(0, 8),
        signalCount: rows.length,
        totalIntent,
      };
    },
    enabled: !!selectedLead?.buyer_id,
  });


  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast({ title: "Lead status updated" });
    },
  });

  const reroute = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase.rpc("route_lead_to_seller", { p_lead_id: leadId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      if (data.success) {
        toast({ title: "Lead Rerouted", description: `Assigned to ${data.business_name}` });
      } else {
        toast({ title: "Reroute Failed", description: data.error, variant: "destructive" });
      }
    },
  });

  const assignRequirement = useMutation({
    mutationFn: async () => {
      if (!selectedRequirement?.id) throw new Error("Select a requirement first");
      if (selectedSellerIds.length === 0) throw new Error("Select at least one seller");
      const { data, error } = await supabase.rpc("assign_requirement_to_sellers", {
        p_requirement_id: selectedRequirement.id,
        p_seller_ids: selectedSellerIds,
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["admin-requirements-for-assignment"] });
      queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
      toast({ title: "Requirement assigned", description: `${data?.assigned_count || selectedSellerIds.length} seller lead(s) created` });
      setSelectedSellerIds([]);
    },
    onError: (error: any) => {
      toast({ title: "Assignment failed", description: error.message, variant: "destructive" });
    },
  });

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-800",
    contacted: "bg-yellow-100 text-yellow-800",
    interested: "bg-green-100 text-green-800",
    converted: "bg-purple-100 text-purple-800",
    lost: "bg-gray-100 text-gray-800",
    expired: "bg-red-100 text-red-800",
  };

  const { data: stats } = useQuery({
    queryKey: ["lead-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("status");
      const counts: Record<string, number> = {};
      data?.forEach(lead => {
        const status = lead.status || "new";
        counts[status] = (counts[status] || 0) + 1;
      });
      return counts;
    },
  });

  const funnelStages = [
    { name: "New", count: stats?.new || 0, color: "#3b82f6" },
    { name: "Contacted", count: stats?.contacted || 0, color: "#f59e0b" },
    { name: "Interested", count: stats?.interested || 0, color: "#10b981" },
    { name: "Converted", count: stats?.converted || 0, color: "#8b5cf6" },
    { name: "Lost", count: stats?.lost || 0, color: "#6b7280" },
  ];

  const exportLeads = () => {
    const csv = [
      ["Date", "Buyer", "Email", "Phone", "Seller", "Product", "Status", "Message"].join(","),
      ...filteredLeads.map((lead: any) => [
        format(new Date(lead.created_at || ""), "yyyy-MM-dd"),
        lead.buyer?.full_name || lead.guest_name || "Public Buyer",
        lead.buyer?.email || lead.guest_email || "",
        lead.buyer?.phone || lead.guest_phone || "",
        lead.seller_profiles?.business_name || "",
        lead.products?.name || "",
        lead.status || "",
        `"${(lead.message || "").replace(/"/g, '""')}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Leads</h1>
            <p className="text-muted-foreground">Monitor and manage all platform leads</p>
          </div>
          <Button variant="outline" onClick={exportLeads}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
              {["new", "contacted", "interested", "converted", "lost", "expired"].map((status) => (
                <Card 
                  key={status} 
                  className={`cursor-pointer transition-all ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setStatusFilter(status)}
                >
                  <CardContent className="p-3 text-center">
                    <div className="text-xl font-bold">{stats?.[status] || 0}</div>
                    <p className="text-xs text-muted-foreground capitalize">{status}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <LeadsFunnel stages={funnelStages} totalLeads={leads?.length || 0} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Requirement Assignment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Public buyer requirements come here first. Select a requirement, choose multiple category-matched sellers, then assign.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Pending / Assigned Requirements</h3>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {requirementsLoading ? (
                    <div className="text-sm text-muted-foreground py-6 text-center">Loading requirements...</div>
                  ) : requirements?.length ? requirements.map((req: any) => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => { setSelectedRequirement(req); setSelectedSellerIds([]); }}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedRequirement?.id === req.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium line-clamp-1">{req.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{req.description}</p>
                        </div>
                        <Badge variant={req.status === "pending_admin" ? "default" : "secondary"} className="shrink-0">
                          {req.status === "pending_admin" ? "Pending" : "Assigned"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{req.categories?.name || "No category"}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.city || req.location || "No city"}</span>
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{req.guest_phone || "No mobile"}</span>
                      </div>
                    </button>
                  )) : (
                    <div className="text-sm text-muted-foreground py-6 text-center">No requirements waiting for assignment.</div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-sm">Eligible Sellers</h3>
                  <Button
                    size="sm"
                    onClick={() => assignRequirement.mutate()}
                    disabled={!selectedRequirement || selectedSellerIds.length === 0 || assignRequirement.isPending}
                    className="gradient-accent"
                  >
                    {assignRequirement.isPending ? "Assigning..." : `Assign ${selectedSellerIds.length || ""}`}
                  </Button>
                </div>
                {selectedRequirement ? (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {sellers?.length ? sellers.map((seller: any) => {
                      const selected = selectedSellerIds.includes(seller.id);
                      return (
                        <label key={seller.id} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer ${selected ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) => {
                              setSelectedSellerIds((prev) => checked
                                ? [...prev, seller.id]
                                : prev.filter((id) => id !== seller.id)
                              );
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{seller.business_name}</p>
                              {seller.verification_status === "verified" && <CheckCircle2 className="h-4 w-4 text-trust shrink-0" />}
                            </div>
                            <p className="text-xs text-muted-foreground">{seller.city || "City not set"} • Trust {seller.trust_score || 0}%</p>
                            <p className="text-xs text-muted-foreground mt-1">{seller.matchingProducts.length} matching product(s)</p>
                          </div>
                        </label>
                      );
                    }) : (
                      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                        No approved sellers found for this category.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    Select a buyer requirement to see matched sellers.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.keys(statusColors).map((status) => (
                    <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Routing</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead: any) => (
                    <TableRow key={lead.id}>
                      <TableCell className="text-sm">
                        {format(new Date(lead.created_at || ""), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.buyer?.full_name || lead.guest_name || "Public Buyer"}</div>
                          <div className="text-xs text-muted-foreground">{lead.buyer?.email || lead.guest_phone || "No contact"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.seller_profiles?.business_name}</div>
                          <div className="text-xs text-muted-foreground">{lead.seller_profiles?.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lead.products?.images?.[0] && (
                            <img src={lead.products.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                          )}
                          <span className="text-sm">{lead.products?.name || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status || "new"}
                          onValueChange={(value) => updateStatus.mutate({ id: lead.id, status: value })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <Badge className={statusColors[lead.status || "new"]}>{lead.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.keys(statusColors).map((status) => (
                              <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-muted-foreground">Attempts:</span> {lead.routing_attempts || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => setSelectedLead(lead)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Lead Details</DialogTitle>
                              </DialogHeader>
                              {selectedLead && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Buyer</p>
                                      <p className="font-medium">{selectedLead.buyer?.full_name || selectedLead.guest_name || "Public Buyer"}</p>
                                      <p>{selectedLead.buyer?.email || selectedLead.guest_email}</p>
                                      <p>{selectedLead.buyer?.phone || selectedLead.guest_phone}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Seller</p>
                                      <p className="font-medium">{selectedLead.seller_profiles?.business_name}</p>
                                      <p>{selectedLead.seller_profiles?.email}</p>
                                      <p>{selectedLead.seller_profiles?.phone}</p>
                                    </div>
                                  </div>
                                  {selectedLead.message && (
                                    <div>
                                      <p className="text-muted-foreground text-sm">Message</p>
                                      <p className="text-sm bg-muted p-2 rounded">{selectedLead.message}</p>
                                    </div>
                                  )}
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">Quantity</p>
                                      <p>{selectedLead.quantity} {selectedLead.quantity_unit}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Lead Score</p>
                                      <p>{selectedLead.lead_score || 50}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Routing</p>
                                      <p>{selectedLead.routing_attempts || 0} attempts</p>
                                    </div>
                                  </div>

                                  {/* Buyer Session Pattern */}
                                  <div className="border-t pt-3">
                                    <p className="text-sm font-semibold mb-2">Buyer Session Pattern</p>
                                    {!selectedLead.buyer_id ? (
                                      <p className="text-xs text-muted-foreground">
                                        Guest enquiry — no linked browsing history available.
                                      </p>
                                    ) : !buyerPattern ? (
                                      <p className="text-xs text-muted-foreground">Loading activity...</p>
                                    ) : buyerPattern.signalCount === 0 ? (
                                      <p className="text-xs text-muted-foreground">No tracked activity for this buyer yet.</p>
                                    ) : (
                                      <div className="space-y-3 text-sm">
                                        <div className="flex gap-4 text-xs text-muted-foreground">
                                          <span>{buyerPattern.signalCount} signals</span>
                                          <span>Intent score: <span className="font-medium text-foreground">{buyerPattern.totalIntent}</span></span>
                                        </div>
                                        {buyerPattern.categoryInterests.length > 0 && (
                                          <div>
                                            <p className="text-muted-foreground text-xs mb-1">Category interests</p>
                                            <div className="flex flex-wrap gap-1">
                                              {buyerPattern.categoryInterests.map((c: any) => (
                                                <Badge key={c.id} variant="secondary">{c.name}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        {buyerPattern.viewedProducts.length > 0 && (
                                          <div>
                                            <p className="text-muted-foreground text-xs mb-1">Viewed products</p>
                                            <ul className="list-disc list-inside text-xs space-y-0.5">
                                              {buyerPattern.viewedProducts.map((p: any) => (
                                                <li key={p.id}>{p.name}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {buyerPattern.searches.length > 0 && (
                                          <div>
                                            <p className="text-muted-foreground text-xs mb-1">Searched for</p>
                                            <div className="flex flex-wrap gap-1">
                                              {buyerPattern.searches.map((s: string, i: number) => (
                                                <Badge key={i} variant="outline">{s}</Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}


                            </DialogContent>
                          </Dialog>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => reroute.mutate(lead.id)}
                            disabled={reroute.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 ${reroute.isPending ? "animate-spin" : ""}`} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageLeads;

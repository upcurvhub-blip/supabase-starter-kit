import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Search, Check, X, Eye, ExternalLink, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

type SortKey = "business_name" | "city" | "status" | "trust_score" | "created_at";
type SortDir = "asc" | "desc";
const PAGE_SIZE = 25;

const ManageSellers = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sellers", search, statusFilter, sortBy, sortDir, page],
    queryFn: async () => {
      let query = supabase
        .from("seller_profiles")
        .select("*, subscription_plans(name)", { count: "exact" })
        .order(sortBy, { ascending: sortDir === "asc" });

      if (search) query = query.or(`business_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
      if (statusFilter !== "all") query = query.eq("status", statusFilter as any);

      const from = page * PAGE_SIZE;
      const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
      const userIds = (data || []).map((s: any) => s.user_id).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      if (userIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email,phone").in("id", userIds);
        profilesMap = Object.fromEntries((profs || []).map((p: any) => [p.id, p]));
      }
      return {
        rows: (data || []).map((s: any) => ({ ...s, profiles: profilesMap[s.user_id] || null })),
        total: count || 0,
      };
    },
  });

  const total = data?.total || 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: any = { status: status as any };
      if (status === "approved") { updates.approved_by = user?.id; updates.approved_at = new Date().toISOString(); }
      if (status === "rejected" && rejection_reason) updates.rejection_reason = rejection_reason;
      const { error } = await supabase.from("seller_profiles").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sellers"] });
      setSelectedSeller(null); setRejectionReason("");
      toast({ title: "Seller status updated" });
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-800",
  };

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(k); setSortDir("asc"); }
    setPage(0);
  };

  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <TableHead>
      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
        {label} <ArrowUpDown className={`h-3 w-3 ${sortBy === k ? "text-primary" : "text-muted-foreground"}`} />
      </button>
    </TableHead>
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manage Sellers</h1>
          <p className="text-muted-foreground">Approve and manage seller accounts · {total} total</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by business name, email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8">Loading...</div> : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHead k="business_name" label="Business Name" />
                      <TableHead>Owner</TableHead>
                      <SortHead k="city" label="Location" />
                      <TableHead>Plan</TableHead>
                      <SortHead k="trust_score" label="Trust" />
                      <SortHead k="status" label="Status" />
                      <SortHead k="created_at" label="Joined" />
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(data?.rows || []).map((seller: any) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium">{seller.business_name}</TableCell>
                        <TableCell>
                          <div>{seller.profiles?.full_name}</div>
                          <div className="text-sm text-muted-foreground">{seller.profiles?.email}</div>
                        </TableCell>
                        <TableCell>{[seller.city, seller.state].filter(Boolean).join(", ") || "—"}</TableCell>
                        <TableCell>{seller.subscription_plans?.name || "Free"}</TableCell>
                        <TableCell>{seller.trust_score || 0}</TableCell>
                        <TableCell><Badge className={statusColors[seller.status || "pending"]}>{seller.status}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{seller.created_at ? new Date(seller.created_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/admin/sellers/${seller.id}`}><ExternalLink className="h-4 w-4 mr-1" /> Open</Link>
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedSeller(seller)}><Eye className="h-4 w-4" /></Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader><DialogTitle>{seller.business_name}</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div><strong>Type:</strong> {seller.business_type}</div>
                                    <div><strong>GST:</strong> {seller.gst_number || "N/A"}</div>
                                    <div><strong>PAN:</strong> {seller.pan_number || "N/A"}</div>
                                    <div><strong>Employees:</strong> {seller.employee_count || "N/A"}</div>
                                    <div><strong>Turnover:</strong> {seller.annual_turnover || "N/A"}</div>
                                    <div><strong>Established:</strong> {seller.established_year || "N/A"}</div>
                                  </div>
                                  <div><strong>Address:</strong><p className="text-sm text-muted-foreground">{seller.address}, {seller.city}, {seller.state} - {seller.pincode}</p></div>
                                  {seller.description && <div><strong>Description:</strong><p className="text-sm text-muted-foreground">{seller.description}</p></div>}
                                  {seller.status === "pending" && (
                                    <div className="flex gap-2">
                                      <Button className="flex-1" onClick={() => updateStatus.mutate({ id: seller.id, status: "approved" })}><Check className="h-4 w-4 mr-2" /> Approve</Button>
                                      <Dialog>
                                        <DialogTrigger asChild><Button variant="destructive" className="flex-1"><X className="h-4 w-4 mr-2" /> Reject</Button></DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader><DialogTitle>Reject Seller</DialogTitle></DialogHeader>
                                          <Textarea placeholder="Reason for rejection..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                                          <Button variant="destructive" onClick={() => updateStatus.mutate({ id: seller.id, status: "rejected", rejection_reason: rejectionReason })}>Confirm Rejection</Button>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                            {seller.status === "approved" && <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: seller.id, status: "suspended" })}>Suspend</Button>}
                            {seller.status === "suspended" && <Button size="sm" onClick={() => updateStatus.mutate({ id: seller.id, status: "approved" })}>Reactivate</Button>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">
                    Page {page + 1} of {pageCount} · showing {data?.rows?.length || 0} of {total}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                    <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page + 1 >= pageCount}>Next <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default ManageSellers;

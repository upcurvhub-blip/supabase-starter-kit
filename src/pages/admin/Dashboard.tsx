import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  Package, 
  TrendingUp, 
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  ArrowRight,
  MessageSquare,
  Target,
  DollarSign,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { MetricCard, DonutChart, FunnelChart, DataTable, ProgressBar } from "@/components/analytics/ZohoStyleChart";
import { Link } from "react-router-dom";

const AdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSeller, setSelectedSeller] = useState<any>(null);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [users, sellers, products, leads, requirements, pendingSellers] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("seller_profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("requirements").select("*", { count: "exact", head: true }),
        supabase.from("seller_profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        users: users.count || 0,
        sellers: sellers.count || 0,
        products: products.count || 0,
        leads: leads.count || 0,
        requirements: requirements.count || 0,
        pendingSellers: pendingSellers.count || 0,
      };
    },
  });

  const { data: pendingSellers } = useQuery({
    queryKey: ["pending-sellers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("status", "pending" as const)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: recentLeads } = useQuery({
    queryKey: ["recent-leads-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*, seller_profiles(business_name), products(name)")
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: leadsByStatus } = useQuery({
    queryKey: ["leads-by-status"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("status");
      const counts: Record<string, number> = { new: 0, contacted: 0, interested: 0, converted: 0, lost: 0 };
      data?.forEach((l) => {
        const status = l.status || "new";
        counts[status] = (counts[status] || 0) + 1;
      });
      return counts;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products-admin"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, view_count, enquiry_count, seller_profiles(business_name)")
        .order("view_count", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const updateSellerStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: "approved" | "rejected" | "pending" | "suspended"; reason?: string }) => {
      const { error } = await supabase
        .from("seller_profiles")
        .update({ 
          status, 
          rejection_reason: reason || null,
          approved_at: status === "approved" ? new Date().toISOString() : null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast({ title: `Seller ${status}!` });
      queryClient.invalidateQueries({ queryKey: ["pending-sellers"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setSelectedSeller(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const leadFunnelData = [
    { label: "All Leads", value: stats?.leads || 0, percentage: 100 },
    { label: "Contacted", value: leadsByStatus?.contacted || 0, percentage: Math.round(((leadsByStatus?.contacted || 0) / (stats?.leads || 1)) * 100) },
    { label: "Interested", value: leadsByStatus?.interested || 0, percentage: Math.round(((leadsByStatus?.interested || 0) / (stats?.leads || 1)) * 100) },
    { label: "Converted", value: leadsByStatus?.converted || 0, percentage: Math.round(((leadsByStatus?.converted || 0) / (stats?.leads || 1)) * 100) },
  ];

  const leadStatusData = [
    { label: "New", value: leadsByStatus?.new || 0, color: "#3b82f6" },
    { label: "Contacted", value: leadsByStatus?.contacted || 0, color: "#8b5cf6" },
    { label: "Interested", value: leadsByStatus?.interested || 0, color: "#f59e0b" },
    { label: "Converted", value: leadsByStatus?.converted || 0, color: "#22c55e" },
    { label: "Lost", value: leadsByStatus?.lost || 0, color: "#ef4444" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Platform overview and management</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/analytics">
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Full Analytics
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Total Users"
            value={stats?.users || 0}
            icon={<Users className="h-5 w-5" />}
            change={12}
            color="primary"
          />
          <MetricCard
            title="Active Sellers"
            value={stats?.sellers || 0}
            icon={<Building2 className="h-5 w-5" />}
            change={8}
            color="success"
          />
          <MetricCard
            title="Products"
            value={stats?.products || 0}
            icon={<Package className="h-5 w-5" />}
            change={15}
            color="info"
          />
          <MetricCard
            title="Total Leads"
            value={stats?.leads || 0}
            icon={<MessageSquare className="h-5 w-5" />}
            change={22}
            color="accent"
          />
          <MetricCard
            title="Requirements"
            value={stats?.requirements || 0}
            icon={<FileText className="h-5 w-5" />}
            change={5}
            color="warning"
          />
          <MetricCard
            title="Pending Approvals"
            value={stats?.pendingSellers || 0}
            icon={<Clock className="h-5 w-5" />}
            color="danger"
          />
        </div>

        {/* Quick Actions */}
        {stats?.pendingSellers && stats.pendingSellers > 0 && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/20">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">{stats.pendingSellers} seller(s) awaiting approval</p>
                    <p className="text-sm text-muted-foreground">Review and approve new seller applications</p>
                  </div>
                </div>
                <Button onClick={() => setActiveTab("approvals")}>
                  Review Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
            <TabsTrigger value="approvals">
              Seller Approvals
              {stats?.pendingSellers && stats.pendingSellers > 0 && (
                <Badge variant="destructive" className="ml-2">{stats.pendingSellers}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Lead Status Distribution */}
              <DonutChart
                title="Lead Status Distribution"
                data={leadStatusData}
                centerValue={stats?.leads || 0}
                centerLabel="Total"
              />

              {/* Top Products */}
              <DataTable
                title="Top Performing Products"
                columns={[
                  { key: "name", label: "Product" },
                  { key: "seller", label: "Seller" },
                  { key: "views", label: "Views" },
                  { key: "enquiries", label: "Enquiries" },
                ]}
                rows={topProducts?.map((p: any) => ({
                  name: <span className="font-medium">{p.name}</span>,
                  seller: <span className="text-muted-foreground">{p.seller_profiles?.business_name || "N/A"}</span>,
                  views: (
                    <div className="flex items-center gap-1">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      {p.view_count || 0}
                    </div>
                  ),
                  enquiries: <Badge variant="secondary">{p.enquiry_count || 0}</Badge>,
                })) || []}
              />
            </div>

            {/* Recent Leads */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Leads
                </CardTitle>
                <Link to="/admin/leads">
                  <Button variant="ghost" size="sm">View All</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentLeads?.slice(0, 5).map((lead: any) => (
                    <div key={lead.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{lead.guest_name || "Buyer"}</p>
                          <p className="text-xs text-muted-foreground">{lead.guest_phone || ""}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {lead.products?.name || "General Inquiry"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          lead.status === "converted" ? "default" :
                          lead.status === "new" ? "secondary" : "outline"
                        }>
                          {lead.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(lead.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="space-y-6">
            <FunnelChart title="Lead Conversion Funnel" steps={leadFunnelData} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-primary">
                      {stats?.leads ? Math.round((leadsByStatus?.contacted || 0) / stats.leads * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Contact Rate</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-success">
                      {stats?.leads ? Math.round((leadsByStatus?.converted || 0) / stats.leads * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Conversion Rate</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-warning">
                      {stats?.leads ? Math.round((leadsByStatus?.lost || 0) / stats.leads * 100) : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">Lost Rate</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="approvals" className="space-y-4">
            {pendingSellers?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-muted-foreground">No pending seller approvals</p>
                </CardContent>
              </Card>
            ) : (
              pendingSellers?.map((seller: any) => (
                <Card key={seller.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {seller.logo_url ? (
                              <img src={seller.logo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{seller.business_name}</h3>
                            <Badge variant="outline">{seller.business_type || "Not specified"}</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{seller.company_name || seller.business_name || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{seller.email || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{seller.phone || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{seller.city}, {seller.state}</span>
                          </div>
                        </div>

                        {seller.gst_number && (
                          <div className="mt-3 p-2 bg-muted rounded text-sm">
                            <span className="text-muted-foreground">GST: </span>
                            <span className="font-mono">{seller.gst_number}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-row md:flex-col gap-2">
                        <Button 
                          className="flex-1 gradient-accent"
                          onClick={() => updateSellerStatus.mutate({ id: seller.id, status: "approved" })}
                          disabled={updateSellerStatus.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedSeller(seller)}
                        >
                          View Details
                        </Button>
                        <Button 
                          variant="destructive"
                          className="flex-1"
                          onClick={() => updateSellerStatus.mutate({ id: seller.id, status: "rejected", reason: "Does not meet requirements" })}
                          disabled={updateSellerStatus.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Seller Detail Dialog */}
      <Dialog open={!!selectedSeller} onOpenChange={(open) => !open && setSelectedSeller(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Seller Application Details</DialogTitle>
          </DialogHeader>
          
          {selectedSeller && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                  {selectedSeller.logo_url ? (
                    <img src={selectedSeller.logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedSeller.business_name}</h3>
                  <p className="text-muted-foreground">{selectedSeller.business_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{selectedSeller.profiles?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedSeller.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedSeller.profiles?.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{selectedSeller.city}, {selectedSeller.state}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST Number</p>
                  <p className="font-medium font-mono">{selectedSeller.gst_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Established Year</p>
                  <p className="font-medium">{selectedSeller.established_year || "N/A"}</p>
                </div>
              </div>

              {selectedSeller.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">About Business</p>
                  <p className="text-sm">{selectedSeller.description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  className="flex-1 gradient-accent"
                  onClick={() => updateSellerStatus.mutate({ id: selectedSeller.id, status: "approved" })}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve Seller
                </Button>
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateSellerStatus.mutate({ id: selectedSeller.id, status: "rejected", reason: "Does not meet requirements" })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Info, MessageSquare, Package, BarChart3, Phone, Mail, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type Tab = "overview" | "leads" | "products" | "performance";

const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Company Overview", icon: Info },
  { key: "leads", label: "Leads Captured", icon: MessageSquare },
  { key: "products", label: "Products", icon: Package },
  { key: "performance", label: "Performance", icon: BarChart3 },
];

export default function SellerDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: seller, isLoading } = useQuery<any>({
    queryKey: ["admin-seller-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("seller_profiles").select("*, subscription_plans(name)").eq("id", id!).maybeSingle();
      if (data?.user_id) {
        const { data: p } = await supabase.from("profiles").select("full_name,email,phone").eq("id", data.user_id).maybeSingle();
        return { ...data, profile: p };
      }
      return data;
    },
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["admin-seller-leads", id],
    enabled: !!id && tab === "leads",
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*, products(name)").eq("seller_id", id!).order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["admin-seller-products", id],
    enabled: !!id && (tab === "products" || tab === "performance" || tab === "overview"),
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,slug,price,view_count,enquiry_count,is_active,created_at").eq("seller_id", id!).order("view_count", { ascending: false }).limit(200);
      return data || [];
    },
  });

  const { data: allLeadsStats = [] } = useQuery({
    queryKey: ["admin-seller-lead-stats", id],
    enabled: !!id && (tab === "overview" || tab === "performance"),
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("id,status,created_at").eq("seller_id", id!);
      return data || [];
    },
  });

  const totalViews = products.reduce((s: number, p: any) => s + (p.view_count || 0), 0);
  const totalEnquiries = products.reduce((s: number, p: any) => s + (p.enquiry_count || 0), 0);
  const convRate = totalViews ? ((totalEnquiries / totalViews) * 100).toFixed(1) : "0";
  const wonLeads = allLeadsStats.filter((l: any) => l.status === "converted" || l.status === "won").length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/sellers"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
          {seller?.slug && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/seller-profile/${seller.slug}`} target="_blank"><ExternalLink className="h-4 w-4 mr-1" /> Public profile</Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Constant left sidebar for this seller */}
          <aside className="md:sticky md:top-20 self-start rounded-xl border bg-card p-3 space-y-1">
            <div className="px-2 pb-3 mb-2 border-b">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{seller?.business_name || seller?.company_name || "Seller"}</div>
                  <div className="text-xs text-muted-foreground truncate">{seller?.city || "—"}</div>
                </div>
              </div>
              <Badge className="mt-2 capitalize" variant={seller?.status === "approved" ? "default" : "secondary"}>{seller?.status || "—"}</Badge>
            </div>
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition",
                  tab === key ? "bg-accent/10 text-accent font-medium" : "hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </aside>

          <div className="space-y-4">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}

            {tab === "overview" && seller && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Trust Score</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{seller.trust_score ?? 0}<span className="text-sm font-normal text-muted-foreground">/100</span></div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Products</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{products.length}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Leads</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{allLeadsStats.length}</div></CardContent></Card>

                <Card className="md:col-span-3">
                  <CardHeader><CardTitle>Company Overview</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><strong>Business:</strong> {seller.business_name || seller.company_name || "—"}</div>
                    <div><strong>Type:</strong> {seller.business_type || "—"}</div>
                    <div><strong>GST:</strong> {seller.gst_number || seller.gstin || "—"}</div>
                    <div><strong>PAN:</strong> {seller.pan_number || seller.pan || "—"}</div>
                    <div><strong>Established:</strong> {seller.established_year || seller.year_established || "—"}</div>
                    <div><strong>Employees:</strong> {seller.employee_count || "—"}</div>
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{seller.phone || seller.profile?.phone || "—"}</div>
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{seller.email || seller.profile?.email || "—"}</div>
                    <div className="md:col-span-2 flex items-start gap-2"><MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />{[seller.address, seller.city, seller.state, seller.pincode].filter(Boolean).join(", ") || "—"}</div>
                    {(seller.about || seller.description) && (
                      <div className="md:col-span-2"><strong>About:</strong> <p className="text-muted-foreground">{seller.about || seller.description}</p></div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {tab === "leads" && (
              <Card>
                <CardHeader><CardTitle>Leads captured for this seller ({leads.length})</CardTitle></CardHeader>
                <CardContent>
                  {leads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Buyer</TableHead><TableHead>Product</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {leads.map((l: any) => (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}</TableCell>
                            <TableCell><div className="text-sm">{l.guest_name || "—"}</div><div className="text-xs text-muted-foreground">{l.guest_phone || l.guest_email}</div></TableCell>
                            <TableCell className="text-sm">{l.products?.name || "—"}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize">{l.source || "direct"}</Badge></TableCell>
                            <TableCell><Badge className="capitalize">{l.status}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "products" && (
              <Card>
                <CardHeader><CardTitle>Products ({products.length})</CardTitle></CardHeader>
                <CardContent>
                  {products.length === 0 ? <p className="text-sm text-muted-foreground">No products listed.</p> : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Views</TableHead><TableHead>Enquiries</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {products.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">
                              {p.slug ? <Link to={`/product/${p.slug}`} target="_blank" className="hover:underline">{p.name}</Link> : p.name}
                            </TableCell>
                            <TableCell>{p.price ? `₹${p.price}` : "—"}</TableCell>
                            <TableCell>{p.view_count || 0}</TableCell>
                            <TableCell>{p.enquiry_count || 0}</TableCell>
                            <TableCell><Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            )}

            {tab === "performance" && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Views</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalViews}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Enquiries</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{totalEnquiries}</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Conversion Rate</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{convRate}%</div></CardContent></Card>
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Won Deals</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{wonLeads}</div></CardContent></Card>

                <Card className="md:col-span-4">
                  <CardHeader><CardTitle>Top performing products</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Views</TableHead><TableHead>Enquiries</TableHead><TableHead>Conv %</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {products.slice(0, 15).map((p: any) => {
                          const conv = p.view_count ? ((p.enquiry_count || 0) / p.view_count * 100).toFixed(1) : "0";
                          return (
                            <TableRow key={p.id}>
                              <TableCell>{p.name}</TableCell>
                              <TableCell>{p.view_count || 0}</TableCell>
                              <TableCell>{p.enquiry_count || 0}</TableCell>
                              <TableCell>{conv}%</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

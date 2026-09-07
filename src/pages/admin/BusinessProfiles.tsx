import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SellerImageUpload } from "@/components/SellerImageUpload";
import { useToast } from "@/hooks/use-toast";
import { notifyIndex } from "@/lib/notifyIndex";
import { Link } from "react-router-dom";
import {
  Building2, Plus, Upload, Search, ExternalLink, Loader2, UserCheck, Phone, FileDown,
} from "lucide-react";

const EMPTY = {
  id: "",
  business_name: "",
  company_name: "",
  slug: "",
  tagline: "",
  about: "",
  business_type: "Manufacturer",
  primary_category_id: "",
  phone: "",
  whatsapp: "",
  email: "",
  website: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  gst_number: "",
  pan_number: "",
  established_year: "",
  employee_count: "",
  annual_turnover: "",
  logo_url: "",
  banner_url: "",
  status: "approved",
  verification_status: "unverified",
  is_featured: false,
  niches: "",
};

type FormState = typeof EMPTY;

const slugify = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** Columns supported by the CSV importer (first row must be a header row). */
const IMPORT_COLUMNS = [
  "business_name", "company_name", "tagline", "about", "business_type", "phone", "whatsapp",
  "email", "website", "address", "city", "state", "pincode", "gst_number", "pan_number",
  "established_year", "employee_count", "annual_turnover", "logo_url", "banner_url",
];

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ""));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] || "").trim()])));
}

export default function BusinessProfiles() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [claimFilter, setClaimFilter] = useState("all");
  const [form, setForm] = useState<FormState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [assignFor, setAssignFor] = useState<any>(null);
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [planId, setPlanId] = useState("");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-business-profiles", search, claimFilter],
    queryFn: async () => {
      let q = supabase
        .from("seller_profiles")
        .select("*, subscription_plans(name)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (search.trim()) q = q.or(`business_name.ilike.%${search}%,city.ilike.%${search}%,phone.ilike.%${search}%`);
      if (claimFilter !== "all") q = q.eq("claim_status", claimFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-bp-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").is("parent_id", null).order("name");
      return data || [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-bp-plans"],
    queryFn: async () => {
      const { data } = await supabase.from("subscription_plans").select("id, name").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ["admin-bp-accounts", ownerQuery],
    queryFn: async () => {
      let q = supabase.from("profiles").select("id, full_name, email, phone").limit(20);
      if (ownerQuery.trim()) q = q.or(`full_name.ilike.%${ownerQuery}%,email.ilike.%${ownerQuery}%,phone.ilike.%${ownerQuery}%`);
      const { data } = await q;
      return data || [];
    },
    enabled: !!assignFor,
  });

  const { data: claims } = useQuery({
    queryKey: ["admin-seller-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_claims")
        .select("*, seller_profiles(business_name, slug, id)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async (f: FormState) => {
      const payload: any = {
        business_name: f.business_name.trim(),
        company_name: f.company_name.trim() || f.business_name.trim(),
        slug: (f.slug.trim() || slugify(`${f.business_name} ${f.city}`)) || slugify(f.business_name),
        tagline: f.tagline.trim() || null,
        about: f.about.trim() || null,
        description: f.about.trim() || null,
        business_type: f.business_type || null,
        primary_category_id: f.primary_category_id || null,
        phone: f.phone.trim() || null,
        whatsapp: f.whatsapp.trim() || null,
        email: f.email.trim() || null,
        website: f.website.trim() || null,
        address: f.address.trim() || null,
        city: f.city.trim() || null,
        state: f.state.trim() || null,
        pincode: f.pincode.trim() || null,
        country: f.country.trim() || "India",
        gst_number: f.gst_number.trim() || null,
        pan_number: f.pan_number.trim() || null,
        established_year: f.established_year ? Number(f.established_year) : null,
        employee_count: f.employee_count.trim() || null,
        annual_turnover: f.annual_turnover.trim() || null,
        logo_url: f.logo_url || null,
        banner_url: f.banner_url || null,
        status: f.status,
        is_approved: f.status === "approved",
        verification_status: f.verification_status,
        is_featured: f.is_featured,
        niches: f.niches ? f.niches.split(",").map((n) => n.trim()).filter(Boolean) : [],
      };
      if (!payload.business_name) throw new Error("Business name is required");

      if (f.id) {
        const { error } = await supabase.from("seller_profiles").update(payload).eq("id", f.id);
        if (error) throw error;
        return f.id;
      }
      const { data, error } = await supabase
        .from("seller_profiles")
        .insert({ ...payload, created_by_admin: true, claim_status: "unclaimed" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      notifyIndex({ seller_id: id });
      qc.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      setForm(null);
      toast({ title: "Business listing saved", description: "It is live and will appear in the sitemap." });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!assignFor || !ownerId) throw new Error("Pick a seller account");
      const updates: any = {
        user_id: ownerId,
        claim_status: "claimed",
        claimed_at: new Date().toISOString(),
        status: "approved",
        is_approved: true,
      };
      if (planId) {
        updates.subscription_plan_id = planId;
        updates.subscription_ends_at = new Date(Date.now() + 365 * 864e5).toISOString();
      }
      const { error } = await supabase.from("seller_profiles").update(updates).eq("id", assignFor.id);
      if (error) throw error;
      await supabase.from("user_roles").upsert({ user_id: ownerId, role: "seller" }, { onConflict: "user_id,role" });
      if (planId) {
        await supabase.from("seller_subscriptions").insert({
          seller_id: assignFor.id,
          plan_id: planId,
          status: "active",
          expires_at: new Date(Date.now() + 365 * 864e5).toISOString(),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      setAssignFor(null); setOwnerId(""); setPlanId(""); setOwnerQuery("");
      toast({ title: "Membership assigned", description: "The listing is now claimed by that seller account." });
    },
    onError: (e: any) => toast({ title: "Assignment failed", description: e.message, variant: "destructive" }),
  });

  const setClaimStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("seller_claims").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-seller-claims"] }),
  });

  const runImport = async () => {
    const rows = parseCsv(csvText);
    if (!rows.length) {
      toast({ title: "Nothing to import", description: "Paste CSV with a header row.", variant: "destructive" });
      return;
    }
    setImporting(true);
    const payload = rows
      .filter((r) => (r.business_name || "").trim())
      .map((r) => ({
        business_name: r.business_name.trim(),
        company_name: (r.company_name || r.business_name).trim(),
        slug: slugify(`${r.business_name} ${r.city || ""}`) || slugify(r.business_name),
        tagline: r.tagline || null,
        about: r.about || null,
        description: r.about || null,
        business_type: r.business_type || null,
        phone: r.phone || null,
        whatsapp: r.whatsapp || r.phone || null,
        email: r.email || null,
        website: r.website || null,
        address: r.address || null,
        city: r.city || null,
        state: r.state || null,
        pincode: r.pincode || null,
        country: "India",
        gst_number: r.gst_number || null,
        pan_number: r.pan_number || null,
        established_year: r.established_year ? Number(r.established_year) || null : null,
        employee_count: r.employee_count || null,
        annual_turnover: r.annual_turnover || null,
        logo_url: r.logo_url || null,
        banner_url: r.banner_url || null,
        status: "approved",
        is_approved: true,
        verification_status: "unverified",
        created_by_admin: true,
        claim_status: "unclaimed",
      }));
    const { data, error } = await supabase.from("seller_profiles").insert(payload).select("id");
    setImporting(false);
    if (error) {
      toast({ title: "Import failed", description: error.message, variant: "destructive" });
      return;
    }
    (data || []).forEach((r: any) => notifyIndex({ seller_id: r.id }));
    setImportOpen(false);
    setCsvText("");
    qc.invalidateQueries({ queryKey: ["admin-business-profiles"] });
    toast({ title: `Imported ${data?.length || 0} businesses`, description: "All are live and added to the sitemap." });
  };

  const newClaims = useMemo(() => (claims || []).filter((c: any) => c.status === "new").length, [claims]);

  const editForm = (row: any) =>
    setForm({
      ...EMPTY,
      ...Object.fromEntries(
        Object.keys(EMPTY).map((k) => [k, (row as any)[k] ?? (EMPTY as any)[k]]),
      ),
      id: row.id,
      niches: Array.isArray(row.niches) ? row.niches.join(", ") : "",
      established_year: row.established_year ? String(row.established_year) : "",
      about: row.about || row.description || "",
    } as FormState);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Business Listings</h1>
            <p className="text-sm text-muted-foreground">
              Create or import unclaimed business profiles, then hand them over to a seller account.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
            <Button onClick={() => setForm({ ...EMPTY, id: "" })}>
              <Plus className="h-4 w-4 mr-2" /> New business
            </Button>
          </div>
        </div>

        <Tabs defaultValue="listings">
          <TabsList>
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="claims">
              Claim requests{newClaims ? ` (${newClaims})` : ""}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col md:flex-row gap-3 md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Search business, city or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <Select value={claimFilter} onValueChange={setClaimFilter}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All listings</SelectItem>
                    <SelectItem value="unclaimed">Unclaimed</SelectItem>
                    <SelectItem value="claim_requested">Claim requested</SelectItem>
                    <SelectItem value="claimed">Claimed</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-10 text-center text-muted-foreground">Loading…</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Claim</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(profiles || []).map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-2 font-medium">
                              {s.logo_url ? (
                                <img src={s.logo_url} alt={s.business_name} className="h-8 w-8 rounded object-cover" />
                              ) : (
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              )}
                              {s.business_name || s.company_name || "—"}
                            </div>
                            {s.created_by_admin && <span className="text-xs text-muted-foreground">admin-created</span>}
                          </TableCell>
                          <TableCell>{[s.city, s.state].filter(Boolean).join(", ") || "—"}</TableCell>
                          <TableCell>{s.phone || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={s.claim_status === "claimed" ? "default" : "secondary"}>
                              {s.claim_status || "claimed"}
                            </Badge>
                          </TableCell>
                          <TableCell>{s.subscription_plans?.name || "Free"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" asChild>
                                <Link to={`/seller-profile/${s.slug || s.id}`} target="_blank">
                                  <ExternalLink className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => editForm(s)}>Edit</Button>
                              <Button size="sm" onClick={() => { setAssignFor(s); setPlanId(s.subscription_plan_id || ""); }}>
                                <UserCheck className="h-4 w-4 mr-1" /> Assign
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
          </TabsContent>

          <TabsContent value="claims" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Claim requests from business owners</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(claims || []).map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.business_name}
                          {c.seller_profiles?.slug && (
                            <Link to={`/seller-profile/${c.seller_profiles.slug}`} target="_blank" className="ml-2 text-xs text-primary underline">
                              view
                            </Link>
                          )}
                        </TableCell>
                        <TableCell>
                          <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1 hover:underline">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </a>
                        </TableCell>
                        <TableCell>
                          <div>{c.contact_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{c.email || ""}</div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Select value={c.status} onValueChange={(v) => setClaimStatus.mutate({ id: c.id, status: v })}>
                            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {["new", "contacted", "verified", "approved", "rejected"].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!claims?.length && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No claim requests yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / edit */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Edit business listing" : "New business listing"}</DialogTitle>
            <DialogDescription>
              Fill in as much as possible — richer profiles rank better on Google.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Business name *</Label>
                  <Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Legal / company name</Label>
                  <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>URL slug</Label>
                  <Input placeholder="auto from name + city" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Business type</Label>
                  <Select value={form.business_type} onValueChange={(v) => setForm({ ...form, business_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Manufacturer", "Wholesaler", "Distributor", "Trader", "Exporter", "Retailer", "Service Provider"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Tagline</Label>
                  <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>About (used as the page description for Google)</Label>
                  <Textarea rows={4} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Primary category</Label>
                  <Select value={form.primary_category_id} onValueChange={(v) => setForm({ ...form, primary_category_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {(categories || []).map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Keywords / niches (comma separated)</Label>
                  <Input value={form.niches} onChange={(e) => setForm({ ...form, niches: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>WhatsApp</Label>
                  <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Pincode</Label>
                  <Input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>GST number</Label>
                  <Input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>PAN</Label>
                  <Input value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Established year</Label>
                  <Input inputMode="numeric" value={form.established_year} onChange={(e) => setForm({ ...form, established_year: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Employee count</Label>
                  <Input value={form.employee_count} onChange={(e) => setForm({ ...form, employee_count: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Annual turnover</Label>
                  <Input value={form.annual_turnover} onChange={(e) => setForm({ ...form, annual_turnover: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Listing status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["approved", "pending", "suspended"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Verification</Label>
                  <Select value={form.verification_status} onValueChange={(v) => setForm({ ...form, verification_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["unverified", "verified"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
                  <Label>Featured listing</Label>
                </div>
              </div>

              {form.id ? (
                <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <SellerImageUpload
                      type="logo"
                      sellerId={form.id}
                      seoName={form.business_name}
                      currentUrl={form.logo_url}
                      onUpload={(url) => setForm({ ...form, logo_url: url })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cover image</Label>
                    <SellerImageUpload
                      type="banner"
                      sellerId={form.id}
                      seoName={form.business_name}
                      currentUrl={form.banner_url}
                      onUpload={(url) => setForm({ ...form, banner_url: url })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label>Logo URL (or save first, then upload files)</Label>
                    <Input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cover image URL</Label>
                    <Input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={() => form && save.mutate(form)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import businesses from CSV</DialogTitle>
            <DialogDescription>
              First row must be a header row. Supported columns: {IMPORT_COLUMNS.join(", ")}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Input
                type="file"
                accept=".csv,text/csv"
                className="max-w-xs"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setCsvText(await f.text());
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  const sample = `${IMPORT_COLUMNS.join(",")}\nSri Balaji Steels,Sri Balaji Steels Pvt Ltd,TMT bars & structural steel,Supplier of TMT bars since 1998,Manufacturer,9876543210,9876543210,info@example.com,https://example.com,12 GST Road,Coimbatore,Tamil Nadu,641001,33ABCDE1234F1Z5,ABCDE1234F,1998,11-50,1-5 Cr,,\n`;
                  const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }));
                  const a = document.createElement("a");
                  a.href = url; a.download = "business-import-template.csv"; a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <FileDown className="h-4 w-4 mr-2" /> Template
              </Button>
            </div>
            <Textarea rows={10} placeholder="…or paste CSV here" value={csvText} onChange={(e) => setCsvText(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              {parseCsv(csvText).length} row(s) detected. Imported businesses are created as unclaimed and go live immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={runImport} disabled={importing}>
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign membership */}
      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign {assignFor?.business_name}</DialogTitle>
            <DialogDescription>
              Link this listing to a seller account and give it a membership plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Find seller account</Label>
              <Input placeholder="Search by name, email or phone" value={ownerQuery} onChange={(e) => setOwnerQuery(e.target.value)} />
              <div className="max-h-48 overflow-y-auto border rounded-md divide-y">
                {(accounts || []).map((a: any) => (
                  <button
                    key={a.id}
                    onClick={() => setOwnerId(a.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${ownerId === a.id ? "bg-muted font-medium" : ""}`}
                  >
                    {a.full_name || "Unnamed"} · {a.email || a.phone || a.id.slice(0, 8)}
                  </button>
                ))}
                {!accounts?.length && <div className="px-3 py-2 text-sm text-muted-foreground">No accounts found.</div>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Membership plan</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Keep free plan" /></SelectTrigger>
                <SelectContent>
                  {(plans || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignFor(null)}>Cancel</Button>
            <Button onClick={() => assign.mutate()} disabled={assign.isPending || !ownerId}>
              {assign.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Assign membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

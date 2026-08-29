import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePublicServiceQueries } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Edit, Trash2, Wrench, Clock, MapPin, Shield, ArrowLeft, ArrowRight, Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit (30 days)"];

const emptyForm = {
  // step 1 — category
  parent_category_id: "",
  category_id: "",
  // step 2 — basics
  title: "", description: "", highlights: "",
  // step 3 — pricing
  price: "", unit: "per_visit", min_charges: "", visit_charges: "", amc_available: false,
  payment_modes: [] as string[], gst_invoice: false, advance_percent: "",
  // step 4 — coverage & availability
  city: "", state: "", service_radius_km: "", response_time: "",
  hours_open: "09:00", hours_close: "18:00", days: "Mon-Sat", emergency_service: false,
  // step 5 — trust
  experience_years: "", team_size: "", warranty: "", certifications: "",
  insurance_covered: false, background_verified: false, free_site_visit: false,
  images: [] as string[],
};

const STEPS = ["Category", "Details", "Pricing", "Coverage", "Trust & Photos"];

export default function SellerServices() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...emptyForm });

  const { data: sellerProfile } = useQuery({
    queryKey: ["my-seller-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("seller_profiles").select("id, city, state").eq("user_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: serviceCategories } = useQuery({
    queryKey: ["service-categories-all"],
    queryFn: async () => {
      const { data } = await supabase.from("categories")
        .select("id, name, parent_id, is_service, service_ai_flagged")
        .or("is_service.eq.true,service_ai_flagged.eq.true")
        .eq("is_active", true).order("name");
      return data || [];
    },
  });

  const parents = useMemo(() => {
    const all = serviceCategories || [];
    const byId = new Map(all.map((c: any) => [c.id, c]));
    // A parent is any service category that is referenced as a parent, or has no parent itself
    const parentIds = new Set(all.map((c: any) => c.parent_id).filter(Boolean));
    const list = all.filter((c: any) => !c.parent_id || parentIds.has(c.id));
    // include referenced parents that may themselves be non-service rows
    return list.filter((c: any) => byId.has(c.id));
  }, [serviceCategories]);

  const subs = useMemo(
    () => (serviceCategories || []).filter((c: any) => c.parent_id === form.parent_category_id),
    [serviceCategories, form.parent_category_id],
  );

  const { data: services, isLoading } = useQuery({
    queryKey: ["my-services", sellerProfile?.id],
    enabled: !!sellerProfile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("services")
        .select("*, category:category_id(name)")
        .eq("seller_id", sellerProfile!.id).order("created_at", { ascending: false });
      return data || [];
    },
  });

  const reset = () => { setForm({ ...emptyForm }); setEditing(null); setStep(0); };

  const openEdit = (svc: any) => {
    const cf = svc.custom_fields || {};
    const own = (serviceCategories || []).find((c: any) => c.id === svc.category_id) as any;
    setEditing(svc);
    setStep(0);
    setForm({
      parent_category_id: own?.parent_id || (own?.id ?? ""),
      category_id: svc.category_id || "",
      title: svc.title || "", description: svc.description || "",
      highlights: (cf.highlights || []).join(", "),
      price: svc.price?.toString() || "", unit: svc.unit || "per_visit",
      min_charges: svc.min_charges?.toString() || "",
      visit_charges: cf.visit_charges?.toString() || "",
      amc_available: !!cf.amc_available,
      payment_modes: cf.payment_modes || [],
      gst_invoice: !!cf.gst_invoice,
      advance_percent: cf.advance_percent?.toString() || "",
      city: svc.city || "", state: svc.state || "",
      service_radius_km: svc.service_radius_km?.toString() || "",
      response_time: svc.response_time || "",
      hours_open: svc.working_hours?.open || "09:00",
      hours_close: svc.working_hours?.close || "18:00",
      days: svc.working_hours?.days || "Mon-Sat",
      emergency_service: !!svc.emergency_service,
      experience_years: cf.experience_years?.toString() || "",
      team_size: svc.team_size || "", warranty: svc.warranty || "",
      certifications: (svc.certifications || []).join(", "),
      insurance_covered: !!cf.insurance_covered,
      background_verified: !!cf.background_verified,
      free_site_visit: !!cf.free_site_visit,
      images: svc.images || [],
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!sellerProfile?.id) throw new Error("Complete your seller profile first");
      const payload: any = {
        seller_id: sellerProfile.id,
        title: form.title,
        slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100),
        description: form.description || null,
        category_id: form.category_id || form.parent_category_id || null,
        price: form.price ? Number(form.price) : null,
        unit: form.unit,
        city: form.city || sellerProfile.city || null,
        state: form.state || sellerProfile.state || null,
        images: form.images,
        service_radius_km: form.service_radius_km ? Number(form.service_radius_km) : null,
        response_time: form.response_time || null,
        min_charges: form.min_charges ? Number(form.min_charges) : null,
        certifications: form.certifications.split(",").map((s) => s.trim()).filter(Boolean),
        team_size: form.team_size || null,
        warranty: form.warranty || null,
        emergency_service: form.emergency_service,
        working_hours: { open: form.hours_open, close: form.hours_close, days: form.days },
        custom_fields: {
          highlights: form.highlights.split(",").map((s) => s.trim()).filter(Boolean),
          visit_charges: form.visit_charges ? Number(form.visit_charges) : null,
          amc_available: form.amc_available,
          payment_modes: form.payment_modes,
          gst_invoice: form.gst_invoice,
          advance_percent: form.advance_percent ? Number(form.advance_percent) : null,
          experience_years: form.experience_years ? Number(form.experience_years) : null,
          insurance_covered: form.insurance_covered,
          background_verified: form.background_verified,
          free_site_visit: form.free_site_visit,
        },
      };
      if (editing) {
        const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      invalidatePublicServiceQueries(qc);
      setOpen(false); reset();
      toast({ title: editing ? "Service updated" : "Service published" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("services").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      invalidatePublicServiceQueries(qc);
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      invalidatePublicServiceQueries(qc);
      toast({ title: "Service deleted" });
    },
  });

  const togglePayment = (mode: string) =>
    setForm((f) => ({
      ...f,
      payment_modes: f.payment_modes.includes(mode)
        ? f.payment_modes.filter((m) => m !== mode)
        : [...f.payment_modes, mode],
    }));

  const canContinue = step === 0 ? !!form.parent_category_id : step === 1 ? form.title.trim().length > 2 : true;
  const isLast = step === STEPS.length - 1;

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6" /> My Services</h1>
            <p className="text-muted-foreground">Publish service offerings — installation, repair, consulting, rental, etc.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Service" : "Add New Service"}</DialogTitle>
              </DialogHeader>

              {/* Stepper header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  {STEPS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => i <= step && setStep(i)}
                      className={`flex items-center gap-1 ${i === step ? "font-semibold text-primary" : i < step ? "text-muted-foreground" : "text-muted-foreground/50"}`}
                    >
                      <span className={`h-5 w-5 rounded-full inline-flex items-center justify-center text-[10px] ${i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary" : "border"}`}>
                        {i < step ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      <span className="hidden sm:inline">{s}</span>
                    </button>
                  ))}
                </div>
                <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
              </div>

              <div className="space-y-4 pt-2">
                {step === 0 && (
                  <>
                    <div>
                      <Label>Service Parent Category *</Label>
                      <Select
                        value={form.parent_category_id || undefined}
                        onValueChange={(v) => setForm({ ...form, parent_category_id: v, category_id: "" })}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose a service category" /></SelectTrigger>
                        <SelectContent>
                          {parents.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">Only service-type categories are listed (admin-flagged or AI-classified).</p>
                    </div>
                    <div>
                      <Label>Subcategory</Label>
                      <Select
                        value={form.category_id || undefined}
                        onValueChange={(v) => setForm({ ...form, category_id: v })}
                        disabled={!form.parent_category_id || subs.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={subs.length ? "Choose subcategory" : "No subcategories — parent will be used"} />
                        </SelectTrigger>
                        <SelectContent>
                          {subs.map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <div>
                      <Label>Service Title *</Label>
                      <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. AC Installation & Fitting" />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is included, process, materials, exclusions…" />
                    </div>
                    <div>
                      <Label>Key Highlights (comma-separated)</Label>
                      <Input value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} placeholder="Same-day service, Genuine spares, Trained technicians" />
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Starting Price (₹)</Label>
                        <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                      </div>
                      <div>
                        <Label>Unit / Billing</Label>
                        <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_visit">One-time · per visit</SelectItem>
                            <SelectItem value="per_hour">One-time · per hour</SelectItem>
                            <SelectItem value="per_job">One-time · per job</SelectItem>
                            <SelectItem value="per_day">One-time · per day</SelectItem>
                            <SelectItem value="per_unit">One-time · per unit</SelectItem>
                            <SelectItem value="per_sqft">One-time · per sq.ft</SelectItem>
                            <SelectItem value="per_project">One-time · per project</SelectItem>
                            <SelectItem value="per_month">Recurring · per month</SelectItem>
                            <SelectItem value="per_quarter">Recurring · per quarter</SelectItem>
                            <SelectItem value="per_year">Recurring · per year</SelectItem>
                            <SelectItem value="per_user_month">Recurring · per user / month</SelectItem>
                            <SelectItem value="per_license_year">Recurring · per license / year</SelectItem>
                            <SelectItem value="amc_yearly">Recurring · AMC yearly</SelectItem>
                            <SelectItem value="custom">Custom quote</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Minimum Charges (₹)</Label>
                        <Input type="number" value={form.min_charges} onChange={(e) => setForm({ ...form, min_charges: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Visit / Inspection Charges (₹)</Label>
                        <Input type="number" value={form.visit_charges} onChange={(e) => setForm({ ...form, visit_charges: e.target.value })} />
                      </div>
                      <div>
                        <Label>Advance Payment (%)</Label>
                        <Input type="number" value={form.advance_percent} onChange={(e) => setForm({ ...form, advance_percent: e.target.value })} placeholder="0 for no advance" />
                      </div>
                    </div>
                    <div>
                      <Label>Payment Modes Accepted</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {PAYMENT_MODES.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => togglePayment(m)}
                            className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${form.payment_modes.includes(m) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded border p-3">
                        <div className="text-sm font-medium">AMC / Contract available</div>
                        <Switch checked={form.amc_available} onCheckedChange={(v) => setForm({ ...form, amc_available: v })} />
                      </div>
                      <div className="flex items-center justify-between rounded border p-3">
                        <div className="text-sm font-medium">GST invoice provided</div>
                        <Switch checked={form.gst_invoice} onCheckedChange={(v) => setForm({ ...form, gst_invoice: v })} />
                      </div>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>City</Label>
                        <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={sellerProfile?.city || "Coimbatore"} />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder={sellerProfile?.state || "Tamil Nadu"} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Service Radius (km)</Label>
                        <Input type="number" value={form.service_radius_km} onChange={(e) => setForm({ ...form, service_radius_km: e.target.value })} />
                      </div>
                      <div>
                        <Label>Response Time</Label>
                        <Input value={form.response_time} onChange={(e) => setForm({ ...form, response_time: e.target.value })} placeholder="Within 2 hours" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Open</Label>
                        <Input type="time" value={form.hours_open} onChange={(e) => setForm({ ...form, hours_open: e.target.value })} />
                      </div>
                      <div>
                        <Label>Close</Label>
                        <Input type="time" value={form.hours_close} onChange={(e) => setForm({ ...form, hours_close: e.target.value })} />
                      </div>
                      <div>
                        <Label>Days</Label>
                        <Input value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} placeholder="Mon-Sat" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded border p-3">
                      <div>
                        <div className="font-medium">24×7 Emergency Service</div>
                        <p className="text-xs text-muted-foreground">Turn on if you accept emergency calls outside working hours.</p>
                      </div>
                      <Switch checked={form.emergency_service} onCheckedChange={(v) => setForm({ ...form, emergency_service: v })} />
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Experience (years)</Label>
                        <Input type="number" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: e.target.value })} />
                      </div>
                      <div>
                        <Label>Team Size</Label>
                        <Input value={form.team_size} onChange={(e) => setForm({ ...form, team_size: e.target.value })} placeholder="2-4 technicians" />
                      </div>
                      <div>
                        <Label>Warranty / Guarantee</Label>
                        <Input value={form.warranty} onChange={(e) => setForm({ ...form, warranty: e.target.value })} placeholder="6 months" />
                      </div>
                    </div>
                    <div>
                      <Label>Certifications (comma-separated)</Label>
                      <Input value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} placeholder="ISO 9001, BEE certified" />
                    </div>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="flex items-center justify-between rounded border p-3">
                        <div className="text-sm font-medium">Insured work</div>
                        <Switch checked={form.insurance_covered} onCheckedChange={(v) => setForm({ ...form, insurance_covered: v })} />
                      </div>
                      <div className="flex items-center justify-between rounded border p-3">
                        <div className="text-sm font-medium">Verified staff</div>
                        <Switch checked={form.background_verified} onCheckedChange={(v) => setForm({ ...form, background_verified: v })} />
                      </div>
                      <div className="flex items-center justify-between rounded border p-3">
                        <div className="text-sm font-medium">Free site visit</div>
                        <Switch checked={form.free_site_visit} onCheckedChange={(v) => setForm({ ...form, free_site_visit: v })} />
                      </div>
                    </div>
                    <div>
                      <Label>Service Images</Label>
                      <ImageUpload
                        images={form.images}
                        onImagesChange={(imgs) => setForm({ ...form, images: imgs })}
                        maxImages={5}
                        folder="services"
                        seoName={form.title}
                      />
                    </div>
                  </>
                )}

                {/* Wizard nav */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t">
                  <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  {isLast ? (
                    <Button onClick={() => save.mutate()} disabled={!form.title || save.isPending}>
                      {editing ? "Update Service" : "Publish Service"}
                    </Button>
                  ) : (
                    <Button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}>
                      Continue <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Your Services</CardTitle>
              <CardDescription>
                {services?.length || 0} total · {totalServiceViews.toLocaleString()} views
              </CardDescription>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant={view === "grid" ? "default" : "outline"} aria-label="Grid view" onClick={() => setView("grid")}>
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button size="icon" variant={view === "list" ? "default" : "outline"} aria-label="List view" onClick={() => setView("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="py-8 text-center text-muted-foreground">Loading…</div> :
              !services?.length ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No services yet. Add your first service to start receiving enquiries.</p>
                </div>
              ) : view === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {services.map((s: any) => (
                    <Card key={s.id} className="overflow-hidden">
                      <div className="aspect-video bg-muted overflow-hidden">
                        {s.images?.length ? (
                          <img src={s.images[0]} alt={s.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Wrench className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium leading-tight line-clamp-2">{s.title}</p>
                          <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })} />
                        </div>
                        <p className="text-xs text-muted-foreground">{s.category?.name || "—"}</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold text-primary">
                            {s.price ? `₹${s.price} ${s.unit?.replace(/_/g, " ")}` : "Quote"}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Eye className="h-3 w-3" /> {s.view_count || 0} views
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {s.city && <Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{s.city}</Badge>}
                          {s.emergency_service && <Badge variant="destructive" className="text-xs"><Shield className="h-3 w-3 mr-1" />24×7</Badge>}
                          {s.response_time && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{s.response_time}</Badge>}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}>
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => del.mutate(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.title}</div>
                            <div className="flex gap-1 flex-wrap mt-1">
                              {s.emergency_service && <Badge variant="destructive" className="text-xs"><Shield className="h-3 w-3 mr-1" />24×7</Badge>}
                              {s.response_time && <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />{s.response_time}</Badge>}
                              {s.custom_fields?.free_site_visit && <Badge variant="outline" className="text-xs">Free visit</Badge>}
                              {s.custom_fields?.amc_available && <Badge variant="outline" className="text-xs">AMC</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{s.category?.name || "—"}</TableCell>
                          <TableCell>{s.price ? `₹${s.price} ${s.unit?.replace("_", " ")}` : "Quote"}</TableCell>
                          <TableCell><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.city || "—"}</span></TableCell>
                          <TableCell>
                            <Switch checked={s.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: s.id, is_active: v })} />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                              <Button size="sm" variant="destructive" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

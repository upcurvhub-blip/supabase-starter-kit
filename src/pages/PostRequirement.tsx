import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Upload, X, Package, MapPin, Calendar, IndianRupee,
  Building2, CheckCircle2, Sparkles, Users, Clock, Shield,
} from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { StateCitySelect } from "@/components/StateCitySelect";

const schema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().trim().min(20, "Describe your requirement (min 20 chars)").max(2000),
  category_id: z.string().uuid("Please select a category"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  quantity_unit: z.string().trim().min(1).max(30),
  size_spec: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(100),
  budget_min: z.coerce.number().nonnegative().optional().or(z.nan()),
  budget_max: z.coerce.number().nonnegative().optional().or(z.nan()),
  preferred_delivery_date: z.string().optional().or(z.literal("")),
  urgency: z.enum(["normal", "urgent", "flexible"]),
  guest_name: z.string().trim().min(2).max(100),
  guest_phone: z.string().trim().min(7, "Mobile number is required").max(20),
});

export default function PostRequirement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false); // progressive disclosure: reveal remaining fields after title
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [success, setSuccess] = useState<{ title: string; city: string } | null>(null);
  const [categoryActivity, setCategoryActivity] = useState<number | null>(null);
  const [categorySupplierCount, setCategorySupplierCount] = useState<number | null>(null);

  const [form, setForm] = useState({
    title: "", description: "", category_id: "",
    quantity: "", quantity_unit: "pieces", size_spec: "",
    city: "", state: "",
    budget_min: "", budget_max: "",
    preferred_delivery_date: "", urgency: "normal" as const,
    guest_name: "", guest_email: "", guest_phone: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        supabase.from("profiles").select("full_name,email,phone").eq("id", data.user.id).maybeSingle()
          .then(({ data: p }) => {
            if (p) setForm((f) => ({
              ...f,
              guest_name: p.full_name || "",
              guest_email: p.email || "",
              guest_phone: p.phone || "",
            }));
          });
      }
    });
    supabase.from("categories").select("id,name,parent_id,level,display_order").eq("is_active", true).order("level").order("display_order").order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  // Real category-level activity — replaces fabricated counters.
  useEffect(() => {
    if (!form.category_id) { setCategoryActivity(null); setCategorySupplierCount(null); return; }
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    (async () => {
      const [{ count: reqCount }, { count: sellerCount }] = await Promise.all([
        supabase.from("requirements").select("id", { count: "exact", head: true })
          .eq("category_id", form.category_id).gte("created_at", monthStart.toISOString()),
        supabase.from("seller_profiles").select("id", { count: "exact", head: true })
          .eq("primary_category_id", form.category_id).eq("status", "approved"),
      ]);
      setCategoryActivity(reqCount ?? 0);
      setCategorySupplierCount(sellerCount ?? 0);
    })();
  }, [form.category_id]);

  const parentCategories = categories.filter((c) => !c.parent_id);
  const subCategories = (pid: string) => (pid ? categories.filter((c) => c.parent_id === pid) : []);

  const selectedCategoryName = categories.find((c) => c.id === form.category_id)?.name;

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    const valid = list.filter((f) => f.size <= 10 * 1024 * 1024);
    if (valid.length < list.length) {
      toast({ title: "Some files skipped", description: "Max 10MB per file", variant: "destructive" });
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
  };

  const uploadAttachments = async (): Promise<{ name: string; url: string; size: number }[]> => {
    if (!files.length) return [];
    setUploading(true);
    const folder = user?.id || `anon-${crypto.randomUUID()}`;
    const out: { name: string; url: string; size: number }[] = [];
    for (const file of files) {
      const path = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const { error } = await supabase.storage.from("requirement-attachments").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
        continue;
      }
      const { data: signed } = await supabase.storage
        .from("requirement-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      const { data: pub } = supabase.storage.from("requirement-attachments").getPublicUrl(path);
      out.push({ name: file.name, url: signed?.signedUrl || pub.publicUrl, size: file.size });
    }
    setUploading(false);
    return out;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Please fix the errors",
        description: Object.values(parsed.error.flatten().fieldErrors).flat()[0] as string,
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const attachments = await uploadAttachments();
      const payload: any = {
        title: parsed.data.title,
        description: parsed.data.description,
        category_id: parsed.data.category_id,
        quantity: parsed.data.quantity,
        quantity_unit: parsed.data.quantity_unit,
        size_spec: parsed.data.size_spec || null,
        city: parsed.data.city,
        state: parsed.data.state || null,
        location: parsed.data.city,
        budget_min: isNaN(parsed.data.budget_min as number) ? null : parsed.data.budget_min,
        budget_max: isNaN(parsed.data.budget_max as number) ? null : parsed.data.budget_max,
        preferred_delivery_date: parsed.data.preferred_delivery_date || null,
        urgency: parsed.data.urgency,
        attachments,
        status: "pending_admin",
        is_public: false,
        buyer_id: user?.id || null,
        guest_name: parsed.data.guest_name,
        guest_email: null,
        guest_phone: parsed.data.guest_phone,
      };
      const { error } = await supabase.from("requirements").insert(payload);
      if (error) throw error;
      setSuccess({ title: parsed.data.title, city: parsed.data.city });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-14">
          <Card className="max-w-2xl mx-auto text-center border-2 border-primary/20">
            <CardContent className="p-8 md:p-12">
              <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-3">Requirement posted successfully!</h1>
              <p className="text-muted-foreground mb-6">
                Thanks for sharing your requirement for <b className="text-foreground">{success.title}</b>
                {success.city ? <> in <b className="text-foreground">{success.city}</b></> : null}.
                Our sourcing team will <b className="text-foreground">call you within an hour</b> to confirm
                the details, and you'll start receiving quotes from matched verified suppliers shortly after.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 text-left mb-8">
                {[
                  [Clock, "Within 1 hour", "Our team calls you to verify details"],
                  [Users, "Within 24 hours", "Up to 3 matched suppliers send quotes"],
                  [Shield, "Always free", "No charges, no spam, no obligation"],
                ].map(([Icon, t, d]: any) => (
                  <div key={t} className="rounded-lg border p-3">
                    <Icon className="h-4 w-4 text-primary mb-1.5" />
                    <p className="text-sm font-semibold">{t}</p>
                    <p className="text-xs text-muted-foreground">{d}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/")} className="gradient-accent">Back to home</Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSuccess(null);
                    setExpanded(false);
                    setFiles([]);
                    setParentCategoryId("");
                    setForm((f) => ({
                      ...f, title: "", description: "", category_id: "", quantity: "",
                      size_spec: "", budget_min: "", budget_max: "", preferred_delivery_date: "",
                    }));
                  }}
                >
                  Post another requirement
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MarketplaceLayout>
    );
  }

  return (

    <MarketplaceLayout>
      <PageMeta title="Post Your Requirement — Get Quotes from 3 Verified Suppliers" description="Tell us what you need to buy and get competitive quotes from up to 3 verified suppliers within 24 hours. Free for buyers, no signup required." path="/post-requirement" />
      <div className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="max-w-3xl">
            <Badge className="mb-3 bg-accent/10 text-accent border-accent/20">
              <Sparkles className="h-3 w-3 mr-1" /> Free & Instant
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Post Your Buying Requirement</h1>
            <p className="text-muted-foreground text-lg">
              Get quotes from up to 3 verified suppliers within 24 hours. Free for buyers, no obligation.
            </p>
            <div className="flex flex-wrap gap-6 mt-6 text-sm">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Quotes within 24 hours</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Up to 3 matched suppliers</div>
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> 100% free for buyers</div>
            </div>
          </div>
        </div>
      </div>


      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <form onSubmit={submit} className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> What do you need?</CardTitle>
                <CardDescription>Describe the product and quantity required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Product / Service Title *</Label>
                  <Input value={form.title} onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Cotton T-shirts in bulk" required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Category *</Label>
                    <Select
                      value={parentCategoryId}
                      onValueChange={(v) => { setParentCategoryId(v); set("category_id", subCategories(v).length ? "" : v); }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {parentCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Sub Category {subCategories(parentCategoryId).length ? "*" : ""}</Label>
                    <Select
                      value={form.category_id}
                      onValueChange={(v) => set("category_id", v)}
                      disabled={!parentCategoryId || subCategories(parentCategoryId).length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !parentCategoryId ? "Choose a category first"
                            : subCategories(parentCategoryId).length ? "Select a sub category"
                            : "No sub categories"
                        } />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {subCategories(parentCategoryId).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  {/* Real category-level activity from DB — no fabricated stats */}
                  {form.category_id && (categoryActivity !== null || categorySupplierCount !== null) && (
                    <div className="mt-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary/90">
                      {categoryActivity! > 0 && (
                        <div>{categoryActivity} requirement{categoryActivity === 1 ? "" : "s"} posted in <b>{selectedCategoryName}</b> this month.</div>
                      )}
                      {categorySupplierCount! > 0 && (
                        <div>{categorySupplierCount} verified supplier{categorySupplierCount === 1 ? "" : "s"} currently active in this category.</div>
                      )}
                      {(categoryActivity ?? 0) === 0 && (categorySupplierCount ?? 0) === 0 && (
                        <div>You'll be among the first buyers in {selectedCategoryName} — we'll route your enquiry to onboarded suppliers manually.</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progressive disclosure — hide the rest of the form until buyer decides to continue */}
                {!expanded ? (
                  <Button
                    type="button"
                    className="w-full gradient-accent"
                    disabled={!form.title.trim() || !form.category_id}
                    onClick={() => setExpanded(true)}
                  >
                    Continue — add quantity & delivery details
                  </Button>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Quantity *</Label>
                        <Input type="number" min="1" value={form.quantity}
                          onChange={(e) => set("quantity", e.target.value)} placeholder="100" required />
                      </div>
                      <div>
                        <Label>Unit *</Label>
                        <Select value={form.quantity_unit} onValueChange={(v) => set("quantity_unit", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["pieces", "kg", "tons", "meters", "litres", "boxes", "sets", "dozen", "containers"].map(u =>
                              <SelectItem key={u} value={u}>{u}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Size / Specifications</Label>
                      <Input value={form.size_spec} onChange={(e) => set("size_spec", e.target.value)}
                        placeholder="e.g. M, L, XL — 50/30/20 split, GSM 180" />
                    </div>
                    <div>
                      <Label>Detailed Description *</Label>
                      <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)}
                        placeholder="Include material, colour, packaging, certifications, etc." required />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {expanded && (
              <>


            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Delivery & Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StateCitySelect
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  state={form.state}
                  city={form.city}
                  onStateChange={(v) => set("state", v)}
                  onCityChange={(v) => set("city", v)}
                  stateLabel="Delivery State"
                  cityLabel="Delivery City"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Preferred Delivery Date</Label>
                    <Input type="date" value={form.preferred_delivery_date}
                      onChange={(e) => set("preferred_delivery_date", e.target.value)} />
                  </div>
                  <div>
                    <Label>Urgency</Label>
                    <Select value={form.urgency} onValueChange={(v) => set("urgency", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flexible">Flexible</SelectItem>
                        <SelectItem value="normal">Normal (within 2 weeks)</SelectItem>
                        <SelectItem value="urgent">Urgent (within 3 days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Budget Min (₹)</Label>
                    <Input type="number" min="0" value={form.budget_min}
                      onChange={(e) => set("budget_min", e.target.value)} placeholder="Optional" />
                  </div>
                  <div>
                    <Label>Budget Max (₹)</Label>
                    <Input type="number" min="0" value={form.budget_max}
                      onChange={(e) => set("budget_max", e.target.value)} placeholder="Optional" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Attachments</CardTitle>
                <CardDescription>Reference images, sample specs, BOQ (max 5 files, 10MB each)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input type="file" multiple accept="image/*,application/pdf" onChange={handleFiles} />
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{f.name} <span className="text-muted-foreground">({(f.size / 1024).toFixed(0)} KB)</span></span>
                        <Button type="button" size="sm" variant="ghost"
                          onClick={() => setFiles(files.filter((_, x) => x !== i))}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Your Contact Details</CardTitle>
                <CardDescription>Suppliers will reach you on these details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input value={form.guest_name} onChange={(e) => set("guest_name", e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Mobile Number *</Label>
                    <Input inputMode="tel" value={form.guest_phone} onChange={(e) => set("guest_phone", e.target.value)} required />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full gradient-accent" disabled={submitting || uploading}>
              {submitting ? "Submitting..." : uploading ? "Uploading files..." : "Submit Requirement & Get Quotes"}
            </Button>
              </>
            )}
          </form>


          <aside className="space-y-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> How it works</h3>
                {[
                  ["1. Post your need", "Tell us what you want to buy"],
                  ["2. Get matched", "We rank the best suppliers for you"],
                  ["3. Compare quotes", "Receive competitive prices in hours"],
                  ["4. Close the deal", "Negotiate directly with verified sellers"],
                ].map(([t, d]) => (
                  <div key={t} className="flex gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t}</p>
                      <p className="text-xs text-muted-foreground">{d}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 text-sm space-y-2">
                <p className="font-semibold">Why post here?</p>
                <p className="text-muted-foreground">100% free, no spam. Your contact is shared only with sellers you choose to engage.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

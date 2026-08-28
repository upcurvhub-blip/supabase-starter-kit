import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ExternalLink, Sparkles, Search, BarChart3, Send } from "lucide-react";
import { Link } from "react-router-dom";

interface LandingPage {
  id: string;
  slug: string;
  title: string;
  h1: string;
  meta_description: string | null;
  city: string;
  state: string | null;
  category_id: string | null;
  page_type: string;
  hero_content: string | null;
  intro_html: string | null;
  faq: any;
  is_published: boolean;
  updated_at: string;
}

const emptyPage: Partial<LandingPage> = {
  slug: "", title: "", h1: "", meta_description: "", city: "", state: "",
  category_id: null, page_type: "suppliers_in_city", hero_content: "", intro_html: "",
  faq: [], is_published: false,
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function LocalLandingPages() {
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<LandingPage> | null>(null);
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [sellerCandidates, setSellerCandidates] = useState<any[]>([]);
  const [sellerSearch, setSellerSearch] = useState("");
  const [showAllSellers, setShowAllSellers] = useState(false);
  const [analyticsFor, setAnalyticsFor] = useState<LandingPage | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("local_landing_pages").select("*").order("updated_at", { ascending: false }),
      supabase.from("categories").select("id, name, slug").order("name"),
    ]);
    setPages(p || []); setCats(c || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => pages.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())),
    [pages, search],
  );

  const openNew = () => { setEditing({ ...emptyPage }); setSelectedSellers([]); setSellerCandidates([]); setShowAllSellers(false); };

  const openEdit = async (p: LandingPage) => {
    setEditing({ ...p });
    setShowAllSellers(false);
    const { data } = await supabase.from("local_landing_page_sellers").select("seller_id").eq("page_id", p.id).order("position");
    setSelectedSellers((data || []).map((r: any) => r.seller_id));
    await loadSellerCandidates(p.city, p.category_id, false);
  };

  const loadSellerCandidates = async (city?: string | null, categoryId?: string | null, all = showAllSellers) => {
    let q = supabase.from("seller_profiles").select("id, business_name, company_name, city, trust_score, slug").eq("status", "approved").limit(500);
    if (!all && city) q = q.ilike("city", city);
    const { data } = await q;
    let list = data || [];
    if (!all && categoryId) {
      const { data: prods } = await supabase.from("products").select("seller_id").eq("category_id", categoryId).eq("is_active", true);
      const set = new Set((prods || []).map((r: any) => r.seller_id));
      list = list.filter((s: any) => set.has(s.id));
    }
    list.sort((a: any, b: any) => (b.trust_score || 0) - (a.trust_score || 0));
    setSellerCandidates(list);
  };

  useEffect(() => {
    if (editing) loadSellerCandidates(editing.city, editing.category_id, showAllSellers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAllSellers]);

  const autoSuggest = async () => {
    if (!editing?.city) { toast({ title: "Set city first", variant: "destructive" }); return; }
    await loadSellerCandidates(editing.city, editing.category_id, false);
    setSelectedSellers(sellerCandidates.slice(0, 20).map((s) => s.id));
    toast({ title: "Suggested top matching sellers" });
  };

  const buildDefaults = () => {
    if (!editing) return;
    const cat = cats.find((c) => c.id === editing.category_id);
    const catName = cat?.name || "Suppliers";
    const type = editing.page_type || "suppliers_in_city";
    const typeLabel = type === "manufacturers_in_city" ? "Manufacturers" : type === "dealers_in_city" ? "Dealers" : "Suppliers";
    const city = editing.city || "";
    const h1 = `${catName} ${typeLabel} in ${city}`;
    const title = `${h1} — Verified & Trusted | Upcurv Trade`;
    const meta = `Discover verified ${catName.toLowerCase()} ${typeLabel.toLowerCase()} in ${city}. Compare prices, get instant quotes, chat on WhatsApp with trusted Upcurv Trade sellers.`;
    const slug = slugify(`${typeLabel}-${catName}-in-${city}`);
    setEditing({ ...editing, h1, title, meta_description: meta, slug: editing.slug || slug });
  };

  const submitIndexNow = async (pageId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("notify-indexnow", { body: { page_id: pageId } });
      if (error) throw error;
      toast({ title: "Submitted to Google & Bing", description: `${data?.submitted || 0} URL(s) pinged` });
    } catch (e: any) {
      toast({ title: "Index ping failed", description: e?.message || String(e), variant: "destructive" });
    }
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.slug || !editing.title || !editing.h1 || !editing.city) {
      toast({ title: "Slug, title, H1, city required", variant: "destructive" }); return;
    }
    const payload = {
      slug: editing.slug!, title: editing.title!, h1: editing.h1!,
      meta_description: editing.meta_description || null,
      city: editing.city!, state: editing.state || null,
      category_id: editing.category_id || null,
      page_type: editing.page_type || "suppliers_in_city",
      hero_content: editing.hero_content || null,
      intro_html: editing.intro_html || null,
      faq: editing.faq || [],
      is_published: !!editing.is_published,
      published_at: editing.is_published ? new Date().toISOString() : null,
    };
    let pageId = editing.id;
    if (pageId) {
      const { error } = await supabase.from("local_landing_pages").update(payload).eq("id", pageId);
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("local_landing_pages").insert(payload).select("id").single();
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
      pageId = data.id;
    }
    await supabase.from("local_landing_page_sellers").delete().eq("page_id", pageId!);
    if (selectedSellers.length) {
      const rows = selectedSellers.map((sid, i) => ({ page_id: pageId!, seller_id: sid, position: i }));
      await supabase.from("local_landing_page_sellers").insert(rows);
    }
    toast({ title: "Saved" });
    if (payload.is_published) submitIndexNow(pageId!);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this page?")) return;
    await supabase.from("local_landing_pages").delete().eq("id", id);
    load();
  };

  const openAnalytics = async (p: LandingPage) => {
    setAnalyticsFor(p);
    setAnalytics(null);
    const since = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: views } = await supabase.from("local_page_views").select("device_id, referrer, created_at").eq("page_id", p.id).gte("created_at", since).limit(5000);
    const list = views || [];
    const total = list.length;
    const unique = new Set(list.map((v: any) => v.device_id || v.id)).size;
    const byDay: Record<string, number> = {};
    const refs: Record<string, number> = {};
    for (const v of list) {
      const d = (v.created_at as string).slice(0, 10);
      byDay[d] = (byDay[d] || 0) + 1;
      const r = v.referrer ? new URL(v.referrer).hostname : "direct";
      refs[r] = (refs[r] || 0) + 1;
    }
    const topRefs = Object.entries(refs).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const dayEntries = Object.entries(byDay).sort();
    setAnalytics({ total, unique, dayEntries, topRefs });
  };

  const filteredSellerCandidates = sellerCandidates.filter((s) =>
    !sellerSearch || (s.business_name || s.company_name || "").toLowerCase().includes(sellerSearch.toLowerCase()) || (s.city || "").toLowerCase().includes(sellerSearch.toLowerCase()),
  );

  return (
    <DashboardLayout role="admin" title="Local Landing Pages">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title, city, slug…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => submitIndexNow("")} className="hidden" />
            <Button variant="outline" onClick={async () => {
              const { data } = await supabase.functions.invoke("notify-indexnow", { body: { all_local: true } });
              toast({ title: "Bulk index ping sent", description: `${(data as any)?.submitted || 0} URLs` });
            }}><Send className="h-4 w-4 mr-1" /> Ping all to Google/Bing</Button>
            <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Landing Page</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Pages ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
              <div className="divide-y">
                {filtered.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{p.title}</p>
                        {p.is_published ? <Badge className="bg-green-600">Live</Badge> : <Badge variant="secondary">Draft</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">/local/{p.slug} · {p.city} · {p.page_type}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openAnalytics(p)} title="Analytics"><BarChart3 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => submitIndexNow(p.id)} title="Ping Google/Bing"><Send className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" asChild><Link to={`/local/${p.slug}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link></Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                {filtered.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No pages yet.</p>}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} Local Landing Page</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Page Type</Label>
                  <Select value={editing.page_type} onValueChange={(v) => setEditing({ ...editing, page_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="suppliers_in_city">Suppliers in City</SelectItem>
                      <SelectItem value="manufacturers_in_city">Manufacturers in City</SelectItem>
                      <SelectItem value="dealers_in_city">Dealers in City</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category (optional)</Label>
                  <Select value={editing.category_id || "none"} onValueChange={(v) => setEditing({ ...editing, category_id: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Any category</SelectItem>
                      {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={editing.city || ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={editing.state || ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} />
                </div>
              </div>

              <Button type="button" variant="outline" size="sm" onClick={buildDefaults}><Sparkles className="h-4 w-4 mr-1" /> Auto-generate title/H1/slug/meta</Button>

              <div>
                <Label>Slug *</Label>
                <Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })} placeholder="suppliers-cotton-in-tiruppur" />
                <p className="text-xs text-muted-foreground mt-1">URL: /local/{editing.slug || "..."}</p>
              </div>
              <div>
                <Label>Meta Title *</Label>
                <Input value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>H1 Heading *</Label>
                <Input value={editing.h1 || ""} onChange={(e) => setEditing({ ...editing, h1: e.target.value })} />
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea rows={2} value={editing.meta_description || ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} />
              </div>
              <div>
                <Label>Hero content (sub-heading)</Label>
                <Textarea rows={2} value={editing.hero_content || ""} onChange={(e) => setEditing({ ...editing, hero_content: e.target.value })} />
              </div>
              <div>
                <Label>Intro (HTML allowed)</Label>
                <Textarea rows={4} value={editing.intro_html || ""} onChange={(e) => setEditing({ ...editing, intro_html: e.target.value })} />
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>Sellers to feature ({selectedSellers.length})</Label>
                  <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                      <Checkbox checked={showAllSellers} onCheckedChange={(v) => setShowAllSellers(!!v)} />
                      Show all sellers
                    </label>
                    <Button type="button" size="sm" variant="outline" onClick={() => loadSellerCandidates(editing.city, editing.category_id, showAllSellers)}>Reload</Button>
                    <Button type="button" size="sm" variant="outline" onClick={autoSuggest}><Sparkles className="h-3 w-3 mr-1" /> Auto-suggest</Button>
                  </div>
                </div>
                <Input placeholder="Search sellers by name or city…" value={sellerSearch} onChange={(e) => setSellerSearch(e.target.value)} />
                <div className="max-h-64 overflow-y-auto divide-y">
                  {filteredSellerCandidates.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 py-2 cursor-pointer">
                      <Checkbox checked={selectedSellers.includes(s.id)} onCheckedChange={(v) => setSelectedSellers(v ? [...selectedSellers, s.id] : selectedSellers.filter((x) => x !== s.id))} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.business_name || s.company_name}</p>
                        <p className="text-xs text-muted-foreground">{s.city} · Trust {s.trust_score || 0}</p>
                      </div>
                    </label>
                  ))}
                  {filteredSellerCandidates.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">No sellers found. Try "Show all sellers".</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={!!editing.is_published} onCheckedChange={(v) => setEditing({ ...editing, is_published: v })} />
                <Label>Published (auto-pings Google & Bing on save)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Analytics dialog */}
      <Dialog open={!!analyticsFor} onOpenChange={(o) => !o && setAnalyticsFor(null)}>
        <DialogContent className="max-w-2xl rounded-2xl">
          <DialogHeader><DialogTitle>Analytics · {analyticsFor?.title}</DialogTitle></DialogHeader>
          {!analytics ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Views (30d)</p><p className="text-2xl font-bold">{analytics.total}</p></CardContent></Card>
                <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unique devices</p><p className="text-2xl font-bold">{analytics.unique}</p></CardContent></Card>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Daily views</p>
                <div className="flex items-end gap-1 h-24 border-b">
                  {analytics.dayEntries.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
                  {analytics.dayEntries.map(([d, n]: any) => {
                    const max = Math.max(...analytics.dayEntries.map((e: any) => e[1]));
                    return <div key={d} className="flex-1 bg-primary/80 rounded-t" style={{ height: `${(n / max) * 100}%` }} title={`${d}: ${n}`} />;
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Top referrers</p>
                <div className="space-y-1 text-sm">
                  {analytics.topRefs.length === 0 && <p className="text-xs text-muted-foreground">No referrers logged.</p>}
                  {analytics.topRefs.map(([r, n]: any) => (
                    <div key={r} className="flex justify-between"><span className="truncate">{r}</span><span className="text-muted-foreground">{n}</span></div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

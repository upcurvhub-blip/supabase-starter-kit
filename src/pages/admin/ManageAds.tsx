import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Megaphone, Eye, MousePointerClick } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";

const PLACEMENTS = [
  { id: "home_top", label: "Home – Top" },
  { id: "home_middle", label: "Home – Middle" },
  { id: "category_top", label: "Category page – Top" },
  { id: "category_inline", label: "Category page – Inline" },
  { id: "product_bottom", label: "Product page – Bottom" },
  { id: "search_results", label: "Search results" },
  { id: "seller_profile", label: "Seller profile" },
  { id: "local_page", label: "Local landing page" },
];

const empty = {
  name: "", ad_type: "text", is_active: true, priority: 100,
  headline: "", subtext: "", cta: "", url: "", image_url: "",
  offer_code: "", offer_text: "",
  image_max_width: "", image_max_height: "", grid_columns: "",
  placements: [] as string[],
  target_category_ids: [] as string[],
  start_at: "", end_at: "",
};

export default function ManageAds() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...empty });
  const [catSearch, setCatSearch] = useState("");

  const { data: ads } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });
  const { data: cats } = useQuery({
    queryKey: ["admin-cats-for-ads"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name, level").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const reset = () => { setForm({ ...empty }); setEditing(null); };

  const openEdit = (ad: any) => {
    setEditing(ad);
    const c = ad.content || {};
    setForm({
      name: ad.name, ad_type: ad.ad_type, is_active: ad.is_active, priority: ad.priority,
      headline: c.headline || "", subtext: c.subtext || "", cta: c.cta || "",
      url: c.url || "", image_url: c.image_url || "",
      offer_code: c.offer_code || "", offer_text: c.offer_text || "",
      image_max_width: c.image_max_width ? String(c.image_max_width) : "",
      image_max_height: c.image_max_height ? String(c.image_max_height) : "",
      grid_columns: c.grid_columns ? String(c.grid_columns) : "",
      placements: ad.placements || [],
      target_category_ids: ad.target_category_ids || [],
      start_at: ad.start_at ? ad.start_at.slice(0, 16) : "",
      end_at: ad.end_at ? ad.end_at.slice(0, 16) : "",
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name, ad_type: form.ad_type, is_active: form.is_active, priority: Number(form.priority) || 100,
        placements: form.placements,
        target_category_ids: form.target_category_ids,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
        content: {
          headline: form.headline, subtext: form.subtext, cta: form.cta, url: form.url,
          image_url: form.image_url,
          offer_code: form.offer_code, offer_text: form.offer_text,
          image_max_width: form.image_max_width ? Number(form.image_max_width) : null,
          image_max_height: form.image_max_height ? Number(form.image_max_height) : null,
          grid_columns: form.grid_columns ? Number(form.grid_columns) : null,
        },
      };
      if (editing) {
        const { error } = await supabase.from("ads").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ads").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-ads"] }); setOpen(false); reset(); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("ads").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ads"] }),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, v }: { id: string; v: boolean }) => { await supabase.from("ads").update({ is_active: v }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-ads"] }),
  });

  const filteredCats = (cats || []).filter((c: any) => c.name.toLowerCase().includes(catSearch.toLowerCase())).slice(0, 40);

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6" /> Ads Manager</h1>
            <p className="text-muted-foreground">Text banners, image banners, popups & scratch offers with category & page targeting.</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Create Ad</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? "Edit Ad" : "Create Ad"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name (internal)</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div>
                    <Label>Ad Format</Label>
                    <Select value={form.ad_type} onValueChange={(v) => setForm({ ...form, ad_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text banner</SelectItem>
                        <SelectItem value="image">Image banner</SelectItem>
                        <SelectItem value="popup">Offer popup</SelectItem>
                        <SelectItem value="scratch">Scratch card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div><Label>Headline</Label><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
                {(form.ad_type === "text" || form.ad_type === "popup" || form.ad_type === "scratch") && (
                  <div><Label>Subtext / Message</Label><Textarea rows={2} value={form.subtext} onChange={(e) => setForm({ ...form, subtext: e.target.value })} /></div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Call-to-action text</Label><Input placeholder="Shop now / Claim / Learn more" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} /></div>
                  <div><Label>CTA Link URL</Label><Input placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
                </div>

                {(form.ad_type === "image" || form.ad_type === "popup") && (
                  <div className="space-y-3">
                    <div>
                      <Label>Banner Image</Label>
                      <ImageUpload
                        images={form.image_url ? [form.image_url] : []}
                        onImagesChange={(imgs) => setForm({ ...form, image_url: imgs[0] || "" })}
                        maxImages={1} folder="ads" seoName={form.name}
                      />
                    </div>
                    {form.ad_type === "image" && (
                      <div className="grid grid-cols-2 gap-3 rounded border p-3">
                        <div>
                          <Label>Max image width (px)</Label>
                          <Input type="number" placeholder="e.g. 600 (blank = fit slot)" value={form.image_max_width} onChange={(e) => setForm({ ...form, image_max_width: e.target.value })} />
                        </div>
                        <div>
                          <Label>Max image height (px)</Label>
                          <Input type="number" placeholder="e.g. 200 (blank = auto)" value={form.image_max_height} onChange={(e) => setForm({ ...form, image_max_height: e.target.value })} />
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">Caps how large this banner renders inside its slot so it doesn't dominate the page.</div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label>Layout when multiple ads share a slot</Label>
                  <Select value={form.grid_columns || "auto"} onValueChange={(v) => setForm({ ...form, grid_columns: v === "auto" ? "" : v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (based on ad count)</SelectItem>
                      <SelectItem value="1">1 column (stacked)</SelectItem>
                      <SelectItem value="2">2 columns</SelectItem>
                      <SelectItem value="3">3 columns</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground mt-1">When multiple ads target the same placement, they auto-arrange in a grid using this setting from the highest-priority ad.</div>
                </div>


                {form.ad_type === "scratch" && (
                  <div className="grid grid-cols-2 gap-3 rounded border p-3">
                    <div><Label>Offer code</Label><Input value={form.offer_code} onChange={(e) => setForm({ ...form, offer_code: e.target.value })} placeholder="SAVE20" /></div>
                    <div><Label>Offer description</Label><Input value={form.offer_text} onChange={(e) => setForm({ ...form, offer_text: e.target.value })} placeholder="20% off first order" /></div>
                  </div>
                )}

                <div>
                  <Label>Placements (where to show)</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {PLACEMENTS.map(p => {
                      const checked = form.placements.includes(p.id);
                      return (
                        <label key={p.id} className="flex items-center gap-2 text-sm border rounded p-2 cursor-pointer">
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            setForm({ ...form, placements: e.target.checked ? [...form.placements, p.id] : form.placements.filter(x => x !== p.id) });
                          }} />
                          {p.label}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label>Target Categories (leave empty for all)</Label>
                  <Input placeholder="Search categories…" value={catSearch} onChange={(e) => setCatSearch(e.target.value)} className="mt-2" />
                  <div className="max-h-40 overflow-y-auto border rounded mt-2 p-2 space-y-1">
                    {filteredCats.map((c: any) => {
                      const checked = form.target_category_ids.includes(c.id);
                      return (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={checked} onChange={(e) => {
                            setForm({ ...form, target_category_ids: e.target.checked ? [...form.target_category_ids, c.id] : form.target_category_ids.filter(x => x !== c.id) });
                          }} />
                          <span>{c.name}</span>
                          {c.level === 2 && <Badge variant="outline" className="text-xs">sub</Badge>}
                        </label>
                      );
                    })}
                  </div>
                  {form.target_category_ids.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">{form.target_category_ids.length} categories selected</div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Start</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
                  <div><Label>End</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
                  <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) as any })} /></div>
                </div>

                <div className="flex items-center justify-between rounded border p-3">
                  <div className="font-medium">Active</div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                </div>

                <Button className="w-full" disabled={!form.name || !form.placements.length} onClick={() => save.mutate()}>{editing ? "Update" : "Create"} Ad</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>All Ads</CardTitle><CardDescription>{ads?.length || 0} total</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Placements</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ads?.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell><Badge variant="outline">{a.ad_type}</Badge></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{a.placements?.map((p: string) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}</div></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />{a.view_count}</span>
                        <span className="inline-flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{a.click_count}</span>
                      </div>
                    </TableCell>
                    <TableCell><Switch checked={a.is_active} onCheckedChange={(v) => toggle.mutate({ id: a.id, v })} /></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => del.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

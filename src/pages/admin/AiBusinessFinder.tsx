import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_STATES, districtsForState } from "@/lib/india";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Building2, Phone, Globe, MapPin, CheckCircle2, ExternalLink } from "lucide-react";

type Candidate = {
  business_name: string;
  company_name?: string | null;
  tagline?: string | null;
  description?: string | null;
  about?: string | null;
  business_type?: string | null;
  business_category?: string | null;
  address?: string | null;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  established_year?: number | null;
  employee_count?: string | null;
  annual_turnover?: string | null;
  niches?: string[] | null;
  keywords?: string[] | null;
  confidence?: string | null;
  logo_url?: string | null;
  already_exists?: boolean;
};

export default function AiBusinessFinder() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [kind, setKind] = useState<"product" | "service">("product");
  const [categoryId, setCategoryId] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [count, setCount] = useState("8");
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({});

  const { data: categories } = useQuery({
    queryKey: ["ai-finder-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, is_service, parent_id")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const options = useMemo(
    () => (categories || []).filter((c: any) => (kind === "service" ? c.is_service : !c.is_service)),
    [categories, kind],
  );

  const category = options.find((c: any) => c.id === categoryId);
  const cities = districtsForState(state);

  const runSearch = async () => {
    if (!category || !city) {
      toast({ title: "Pick a category and a city first", variant: "destructive" });
      return;
    }
    setSearching(true);
    setResults(null);
    setSelected({});
    try {
      const { data, error } = await supabase.functions.invoke("ai-discover-businesses", {
        body: { action: "discover", category: category.name, city, state, count: Number(count) },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list: Candidate[] = (data as any).businesses || [];
      setResults(list);
      const preselect: Record<number, boolean> = {};
      list.forEach((b, i) => { if (!b.already_exists) preselect[i] = true; });
      setSelected(preselect);
      if (!list.length) toast({ title: "No businesses found", description: "Try a broader category or a bigger city." });
    } catch (e: any) {
      toast({ title: "Search failed", description: String(e.message || e), variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const createSelected = async () => {
    if (!results) return;
    const picked = results.filter((_, i) => selected[i]);
    if (!picked.length) {
      toast({ title: "Select at least one business", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-discover-businesses", {
        body: { action: "create", businesses: picked, primary_category_id: categoryId || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const created = (data as any).created || [];
      const failed = (data as any).failed || [];
      qc.invalidateQueries({ queryKey: ["admin-business-profiles"] });
      toast({
        title: `${created.length} listing${created.length === 1 ? "" : "s"} created`,
        description: failed.length
          ? `${failed.length} could not be saved. Approve the rest in Business Listings to publish them.`
          : "They're waiting for your approval in Business Listings.",
      });
      setResults(results.map((r, i) => (selected[i] ? { ...r, already_exists: true } : r)));
      setSelected({});
    } catch (e: any) {
      toast({ title: "Could not create listings", description: String(e.message || e), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const pickedCount = Object.values(selected).filter(Boolean).length;

  return (
    <DashboardLayout role="admin" title="AI Business Finder">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Find businesses with AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-5">
              <div className="space-y-2">
                <Label>Listing type</Label>
                <Select value={kind} onValueChange={(v: any) => { setKind(v); setCategoryId(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Products</SelectItem>
                    <SelectItem value="service">Services</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {options.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={state || undefined} onValueChange={(v) => { setState(v); setCity(""); }}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={city || undefined} onValueChange={setCity} disabled={!state}>
                  <SelectTrigger><SelectValue placeholder={state ? "Select city" : "Pick state first"} /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>How many</Label>
                <Input type="number" min={1} max={15} value={count} onChange={(e) => setCount(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runSearch} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {searching ? "Researching businesses…" : "Search businesses"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Details are researched automatically, then thin listings get a second, deeper pass. Review before publishing.
              </p>
            </div>
          </CardContent>
        </Card>

        {results && results.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                {results.length} businesses found in {city}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/admin/business-profiles">Business Listings <ExternalLink className="h-3.5 w-3.5 ml-1" /></Link>
                </Button>
                <Button size="sm" onClick={createSelected} disabled={creating || !pickedCount}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
                  Create {pickedCount || ""} profile{pickedCount === 1 ? "" : "s"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((b, i) => (
                <div
                  key={`${b.business_name}-${i}`}
                  className={`rounded-lg border p-4 flex gap-4 ${selected[i] ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="pt-1">
                    <Checkbox
                      checked={!!selected[i]}
                      disabled={b.already_exists}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [i]: !!v }))}
                    />
                  </div>
                  {b.logo_url && (
                    <img src={b.logo_url} alt={b.business_name} className="h-14 w-14 rounded-lg shrink-0 object-cover" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold truncate">{b.business_name}</h3>
                      {b.business_type && <Badge variant="secondary">{b.business_type}</Badge>}
                      {b.confidence && (
                        <Badge variant={b.confidence === "high" ? "default" : "outline"}>{b.confidence} confidence</Badge>
                      )}
                      {b.already_exists && (
                        <Badge variant="outline" className="text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> already listed
                        </Badge>
                      )}
                    </div>
                    {b.description && <p className="text-sm text-muted-foreground">{b.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {(b.address || b.city) && (
                        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{b.address || b.city}</span>
                      )}
                      {b.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{b.phone}</span>}
                      {b.website && (
                        <a href={b.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                          <Globe className="h-3 w-3" />{b.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                    </div>
                    {!!b.keywords?.length && (
                      <div className="flex flex-wrap gap-1">
                        {b.keywords.slice(0, 8).map((k) => (
                          <span key={k} className="text-[11px] rounded bg-muted px-2 py-0.5">{k}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

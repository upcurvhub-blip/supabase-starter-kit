import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Package, Wrench, ArrowRight, MapPin, Tag, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "product" | "service" | null;

export function LookingForStepper() {
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState<Kind>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [subId, setSubId] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug, parent_id, level, is_service, service_ai_flagged")
      .eq("is_active", true).order("display_order").order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  const isServiceCat = (c: any) => !!(c.is_service || c.service_ai_flagged);

  const parents = useMemo(() => {
    if (!kind) return [];
    return categories.filter(c => c.level === 1).filter(c => {
      // if kind = service: include parents that ARE services OR have service subcategories
      if (kind === "service") {
        return isServiceCat(c) || categories.some(sc => sc.parent_id === c.id && isServiceCat(sc));
      }
      // products: include parents that have non-service subs, or are not marked service
      return !isServiceCat(c) || categories.some(sc => sc.parent_id === c.id && !isServiceCat(sc));
    });
  }, [categories, kind]);

  const subs = useMemo(() => {
    if (!parentId) return [];
    return categories.filter(c => c.parent_id === parentId).filter(c => {
      if (kind === "service") return isServiceCat(c);
      return !isServiceCat(c);
    });
  }, [categories, parentId, kind]);

  const chosen = subs.find(s => s.id === subId) || categories.find(c => c.id === parentId);

  const goResults = () => {
    if (!chosen) return;
    if (city) {
      // route to city+category directory
      const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      nav(`/suppliers/${chosen.slug}/${citySlug}`);
    } else {
      nav(`/category/${chosen.slug}`);
    }
  };

  const goRequirement = () => {
    const params = new URLSearchParams();
    if (chosen) params.set("category", chosen.slug);
    if (city) params.set("city", city);
    if (kind) params.set("type", kind);
    nav(`/post-requirement?${params.toString()}`);
  };

  return (
    <Card className="max-w-4xl mx-auto p-5 md:p-7 bg-card/95 backdrop-blur border-2 border-accent/20 shadow-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-foreground">What are you looking for?</h3>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={cn("h-1.5 w-6 rounded-full", step >= n ? "bg-accent" : "bg-muted")} />
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setKind("product"); setStep(2); }}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 p-6 transition"
          >
            <Package className="h-8 w-8 text-primary" />
            <div className="font-semibold text-foreground">A Product</div>
            <div className="text-xs text-muted-foreground text-center">Cement, machinery, textiles, spare parts…</div>
          </button>
          <button
            type="button"
            onClick={() => { setKind("service"); setStep(2); }}
            className="flex flex-col items-center gap-2 rounded-lg border-2 border-border hover:border-accent hover:bg-accent/5 p-6 transition"
          >
            <Wrench className="h-8 w-8 text-accent" />
            <div className="font-semibold text-foreground">A Service</div>
            <div className="text-xs text-muted-foreground text-center">Installation, repair, consulting, rental…</div>
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <button onClick={() => setStep(1)} className="hover:text-foreground">Back</button>
            <ChevronRight className="h-3 w-3" />
            <span>Choose category</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
            {parents.map(p => (
              <button
                key={p.id}
                onClick={() => { setParentId(p.id); setStep(3); }}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-3 text-left hover:bg-muted text-sm",
                  parentId === p.id ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {!parents.length && <div className="col-span-full text-sm text-muted-foreground py-4">No categories found. Try the other type.</div>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <button onClick={() => setStep(2)} className="hover:text-foreground">Back</button>
            <ChevronRight className="h-3 w-3" />
            <span>Choose specific type (or skip)</span>
          </div>
          {subs.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto mb-3">
              {subs.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSubId(s.id); setStep(4); }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border p-3 text-left hover:bg-muted text-sm",
                    subId === s.id ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-3">No subcategories — proceed to city.</div>
          )}
          <Button variant="outline" onClick={() => setStep(4)} className="w-full">Skip <ArrowRight className="h-4 w-4 ml-2" /></Button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={() => setStep(3)} className="hover:text-foreground">Back</button>
            <ChevronRight className="h-3 w-3" />
            <span>Your city (optional but recommended)</span>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="e.g. Coimbatore, Chennai, Mumbai" value={city} onChange={(e) => setCity(e.target.value)} className="pl-10" />
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            Looking for <b>{kind}</b>{chosen && <> · <b>{chosen.name}</b></>}{city && <> · in <b>{city}</b></>}
          </div>
          <div className="flex gap-2">
            <Button onClick={goResults} className="flex-1 gradient-accent" disabled={!chosen}>
              Show verified suppliers <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button onClick={goRequirement} variant="outline" className="flex-1">Post requirement instead</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

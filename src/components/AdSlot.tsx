// Renders active ads matching a placement, optionally scoped by category.
// Handles text banners, image banners, popups, and scratch cards.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  placement: string; // e.g. "home_top", "category_inline", "product_bottom"
  categoryId?: string | null;
  className?: string;
}

const DISMISS_KEY = "upcurv_ad_dismissed";

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function AdSlot({ placement, categoryId, className }: AdSlotProps) {
  const [ads, setAds] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [scratched, setScratched] = useState<Set<string>>(new Set());
  const [popupReady, setPopupReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setPopupReady(true), 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("ads")
        .select("*")
        .eq("is_active", true)
        .contains("placements", [placement])
        .order("priority", { ascending: false });
      if (error) {
        console.warn("[AdSlot] load failed", placement, error.message);
        return;
      }
      const now = Date.now();
      const filtered = (data || []).filter((a: any) => {
        if (a.start_at && new Date(a.start_at).getTime() > now) return false;
        if (a.end_at && new Date(a.end_at).getTime() < now) return false;
        if (!a.target_category_ids?.length) return true;
        if (!categoryId) return false;
        return a.target_category_ids.includes(categoryId);
      });
      if (cancelled) return;
      setAds(filtered);
      filtered.forEach((a: any) => {
        supabase.from("ad_events").insert({ ad_id: a.id, event_type: "view", page_path: window.location.pathname }).then(() => {});
      });
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement, categoryId]);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
    supabase.from("ad_events").insert({ ad_id: id, event_type: "dismiss", page_path: window.location.pathname }).then(() => {});
  };

  const click = (a: any) => {
    supabase.from("ad_events").insert({ ad_id: a.id, event_type: "click", page_path: window.location.pathname }).then(() => {});
    if (a.content?.url) window.open(a.content.url, "_blank");
  };

  const visible = ads.filter(a => !dismissed.has(a.id) && (a.ad_type !== "popup" || popupReady));
  if (!visible.length) return null;

  // Separate popups (fixed overlay) from inline ads so grid only applies inline.
  const inlineAds = visible.filter(a => a.ad_type !== "popup");
  const popupAds = visible.filter(a => a.ad_type === "popup");

  // Grid columns come from first ad's `grid_columns` (admin-configurable), default auto based on count.
  const gridCols = inlineAds[0]?.content?.grid_columns
    ? Number(inlineAds[0].content.grid_columns)
    : inlineAds.length >= 3 ? 3 : inlineAds.length === 2 ? 2 : 1;
  const gridClass = gridCols >= 3 ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3" : gridCols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1";

  const renderAd = (a: any) => {
    const c = a.content || {};
    if (a.ad_type === "text") {
      return (
        <div key={a.id} className="group relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 p-[1px] h-full">
          <div className="relative flex items-center justify-between gap-3 rounded-[11px] bg-background/80 backdrop-blur px-4 py-3 h-full">
            <div className="pointer-events-none absolute -inset-y-4 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-[400%] transition-all duration-1000 ease-out" />
            <div className="flex items-center gap-3 min-w-0">
              <span className="hidden sm:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs font-bold shadow-sm">AD</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{c.headline || a.name}</div>
                {c.subtext && <div className="text-xs text-muted-foreground truncate">{c.subtext}</div>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {c.cta && <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground shadow hover:shadow-md" onClick={() => click(a)}>{c.cta}</Button>}
              <button onClick={() => dismiss(a.id)} className="text-muted-foreground/70 hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      );
    }
    if (a.ad_type === "image") {
      const maxW = c.image_max_width ? `${c.image_max_width}px` : undefined;
      const maxH = c.image_max_height ? `${c.image_max_height}px` : undefined;
      return (
        <div key={a.id} className="group relative overflow-hidden rounded-xl border bg-gradient-to-br from-muted/30 to-muted/60 shadow-sm hover:shadow-xl transition-shadow cursor-pointer h-full" onClick={() => click(a)}>
          <span className="absolute top-2 left-2 z-10 rounded-full bg-black/60 text-white text-[10px] font-semibold tracking-wider px-2 py-0.5 backdrop-blur">SPONSORED</span>
          <div className="flex items-center justify-center h-full">
            <img
              src={c.image_url}
              alt={a.name}
              loading="lazy"
              className="w-full h-auto object-contain mx-auto transition-transform duration-500 group-hover:scale-[1.03]"
              style={{ maxWidth: maxW, maxHeight: maxH }}
            />
          </div>
          {(c.headline || c.cta) && (
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/40 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {c.headline && <div className="text-sm font-semibold truncate">{c.headline}</div>}
              {c.cta && <div className="text-xs underline underline-offset-2">{c.cta} →</div>}
            </div>
          )}
          <button onClick={(e) => { e.stopPropagation(); dismiss(a.id); }} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 z-10"><X className="h-4 w-4" /></button>
        </div>
      );
    }
    if (a.ad_type === "scratch") {
      const revealed = scratched.has(a.id);
      return (
        <Card key={a.id} className="relative overflow-hidden p-5 bg-gradient-to-br from-accent/25 via-primary/10 to-accent/5 border-accent/30 h-full">
          <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
          <button onClick={() => dismiss(a.id)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground z-10"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 mb-3 relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-primary text-white flex items-center justify-center shadow"><Gift className="h-5 w-5" /></div>
            <b className="text-base">{c.headline || "Scratch for offer"}</b>
          </div>
          {revealed ? (
            <div className="rounded-lg bg-background/90 backdrop-blur border-2 border-dashed border-accent p-4 text-center animate-fade-in">
              <div className="text-2xl font-extrabold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent mb-1 tracking-wider">{c.offer_code || "SAVE10"}</div>
              <div className="text-sm text-muted-foreground mb-3">{c.offer_text || "Use this code at checkout"}</div>
              {c.cta && <Button size="sm" className="bg-gradient-to-r from-accent to-primary text-white" onClick={() => click(a)}>{c.cta}</Button>}
            </div>
          ) : (
            <button
              onClick={() => {
                setScratched(prev => new Set(prev).add(a.id));
                supabase.from("ad_events").insert({ ad_id: a.id, event_type: "reveal", page_path: window.location.pathname });
              }}
              className="group relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-muted-foreground/70 via-muted-foreground/50 to-muted-foreground/70 text-white py-6 font-semibold hover:opacity-95 transition"
            >
              <span className="relative z-10">✨ Tap to scratch & reveal</span>
              <span className="absolute inset-y-0 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:translate-x-[300%] transition-transform duration-700" />
            </button>
          )}
        </Card>
      );
    }
    return null;
  };

  return (
    <div className={cn("space-y-3", className)}>
      {inlineAds.length > 0 && (
        <div className={cn("grid gap-3", gridClass)}>
          {inlineAds.map(renderAd)}
        </div>
      )}
      {popupAds.map((a: any) => {
        const c = a.content || {};
        return (
          <div key={a.id} className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <Card className="max-w-md w-full p-0 relative overflow-hidden border-2 border-primary/30 shadow-2xl animate-scale-in">
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
              <button onClick={() => dismiss(a.id)} className="absolute top-3 right-3 z-10 rounded-full bg-background/80 backdrop-blur p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              {c.image_url && <img src={c.image_url} alt="" className="w-full max-h-64 object-cover" />}
              <div className="p-6 relative">
                <span className="inline-block text-[10px] font-semibold tracking-wider text-accent mb-2">✦ SPECIAL OFFER</span>
                <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{c.headline || a.name}</h3>
                {c.subtext && <p className="text-muted-foreground mb-4">{c.subtext}</p>}
                {c.cta && <Button className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg" onClick={() => click(a)}>{c.cta}</Button>}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}


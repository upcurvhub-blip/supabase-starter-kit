import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Sparkles, TrendingUp, Tag, Package, IndianRupee } from "lucide-react";
import { SYNONYMS, parseQuery } from "@/lib/searchIntelligence";
import { supabase } from "@/integrations/supabase/client";


interface Props {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  variant?: "light" | "dark";
  onSubmitOverride?: (q: string) => void;
  initial?: string;
}

const TRENDING = [
  "Red Bricks", "TMT Bar", "PVC Pipes", "Cotton T-Shirts", "Solar Panel", "AC Service",
];

function buildSuggestions(raw: string): { label: string; kind: "keyword" | "correction" | "recent" }[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  const parsed = parseQuery(q);
  const out: { label: string; kind: "keyword" | "correction" | "recent" }[] = [];

  if (parsed.didYouMean && parsed.didYouMean !== q) {
    out.push({ label: parsed.didYouMean, kind: "correction" });
  }

  // Direct synonyms for any token match
  for (const t of parsed.tokens) {
    const syn = SYNONYMS[t] || SYNONYMS[t.replace(/s$/, "")];
    if (syn) syn.forEach((s) => out.push({ label: s, kind: "keyword" }));
  }
  // Prefix-based: match any synonym key that starts with the query
  const stub = q.split(" ").pop() || "";
  for (const key of Object.keys(SYNONYMS)) {
    if (key.startsWith(stub) && key !== stub) {
      out.push({ label: key, kind: "keyword" });
      SYNONYMS[key].slice(0, 3).forEach((s) => out.push({ label: s, kind: "keyword" }));
    }
  }
  // Query expansions
  parsed.expansions.slice(0, 4).forEach((e) => out.push({ label: e, kind: "keyword" }));

  // Dedupe
  const seen = new Set<string>();
  return out.filter((o) => {
    const k = o.label.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 10);
}

export function SearchSuggest({
  placeholder = "Search products, e.g. red bricks, TMT bar, AC service",
  className = "",
  inputClassName = "",
  variant = "light",
  onSubmitOverride,
  initial = "",
}: Props) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const suggestions = useMemo(() => buildSuggestions(q), [q]);
  const [cats, setCats] = useState<any[]>([]);
  const [prods, setProds] = useState<any[]>([]);

  // Live category + product matches from the database (debounced).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setCats([]); setProds([]); return; }
    const t = setTimeout(async () => {
      const [c, p] = await Promise.all([
        supabase.from("categories").select("id,name,slug").eq("is_active", true)
          .ilike("name", `%${term}%`).limit(4),
        supabase.from("products").select("id,name,slug,price_min,primary_image_url").eq("is_active", true)
          .ilike("name", `%${term}%`).order("rank_score", { ascending: false }).limit(5),
      ]);
      setCats(c.data || []);
      setProds(p.data || []);
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    setOpen(false);
    if (onSubmitOverride) onSubmitOverride(t);
    else navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); go(suggestions[active].label); }
    else if (e.key === "Escape") setOpen(false);
  };

  const showTrending = !q.trim();
  const list = showTrending
    ? TRENDING.map((label) => ({ label, kind: "recent" as const }))
    : suggestions;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); go(q); }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Search"
            className={`w-full h-11 pl-9 pr-4 rounded-lg text-sm outline-none border focus:border-primary bg-background text-foreground ${inputClassName}`}
          />
        </div>
      </form>

      {open && list.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border bg-popover text-popover-foreground shadow-xl overflow-hidden">
          {showTrending && (
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Trending searches
            </div>
          )}
          <div className="max-h-[26rem] overflow-y-auto">
          {!showTrending && cats.length > 0 && (
            <div className="border-b">
              <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categories</div>
              {cats.map((c) => (
                <Link key={c.id} to={`/category/${c.slug}`} onMouseDown={() => setOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted">
                  <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="truncate">{c.name}</span>
                </Link>
              ))}
            </div>
          )}
          {!showTrending && prods.length > 0 && (
            <div className="border-b">
              <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Products</div>
              {prods.map((p) => (
                <Link key={p.id} to={`/product/${p.slug || p.id}`} onMouseDown={() => setOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted">
                  {p.primary_image_url ? (
                    <img src={p.primary_image_url} alt="" className="h-7 w-7 rounded object-cover shrink-0" />
                  ) : (
                    <span className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                    </span>
                  )}
                  <span className="truncate flex-1">{p.name}</span>
                  {p.price_min != null && (
                    <span className="text-xs font-semibold text-primary flex items-center shrink-0">
                      <IndianRupee className="h-3 w-3" />{Number(p.price_min).toLocaleString()}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <ul>
            {list.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); go(s.label); }}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-muted transition-colors ${active === i ? "bg-muted" : ""}`}
                >
                  {s.kind === "correction" ? (
                    <Sparkles className="h-3.5 w-3.5 text-accent shrink-0" />
                  ) : (
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">
                    {s.kind === "correction" ? (
                      <>Did you mean <b className="text-primary">{s.label}</b>?</>
                    ) : s.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          </div>
          {!showTrending && q.trim() && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); go(q); }}
              className="w-full text-left px-3 py-2 text-xs border-t bg-muted/40 text-primary font-medium hover:bg-muted"
            >
              Search all results for "{q.trim()}" →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchSuggest;

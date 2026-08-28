import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  categoryId?: string | null;
  city?: string | null;
  currentPrice?: number | null;
  currency?: string | null;
  unit?: string | null;
}

/** Market price benchmark for a product's category (optionally city-scoped). */
export function PriceBenchmark({ categoryId, city, currentPrice, currency, unit }: Props) {
  const { data } = useQuery({
    queryKey: ["price-benchmark", categoryId, city],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_category_price_benchmark", {
        p_category_id: categoryId!,
        p_city: city || null,
      });
      if (error) throw error;
      return data as {
        sample_size: number;
        avg_price: number | null;
        min_price: number | null;
        max_price: number | null;
        median_price: number | null;
      } | null;
    },
  });

  if (!data || !data.sample_size || data.sample_size < 3 || !data.avg_price) return null;

  const cur = currency || "₹";
  const fmt = (n: number | null | undefined) =>
    n == null ? "—" : `${cur}${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  let diffLabel: React.ReactNode = null;
  if (currentPrice && currentPrice > 0 && data.avg_price) {
    const pct = ((currentPrice - data.avg_price) / data.avg_price) * 100;
    const abs = Math.abs(pct);
    if (abs < 3) {
      diffLabel = (
        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs font-medium">
          <Minus className="h-3.5 w-3.5" /> in line with market
        </span>
      );
    } else if (pct > 0) {
      diffLabel = (
        <span className="inline-flex items-center gap-1 text-rose-600 text-xs font-semibold">
          <TrendingUp className="h-3.5 w-3.5" /> {abs.toFixed(0)}% above market avg
        </span>
      );
    } else {
      diffLabel = (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
          <TrendingDown className="h-3.5 w-3.5" /> {abs.toFixed(0)}% below market avg
        </span>
      );
    }
  }

  return (
    <div className="rounded-xl border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Market benchmark {city ? `· ${city}` : ""}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {data.sample_size} listings
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">Low</div>
          <div className="text-sm font-bold">{fmt(data.min_price)}</div>
        </div>
        <div className="border-x">
          <div className="text-[10px] text-muted-foreground uppercase">Avg</div>
          <div className="text-sm font-bold text-primary">{fmt(data.avg_price)}</div>
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase">High</div>
          <div className="text-sm font-bold">{fmt(data.max_price)}</div>
        </div>
      </div>
      {unit ? <div className="text-[10px] text-center text-muted-foreground">per {unit}</div> : null}
      {diffLabel ? <div className="text-center">{diffLabel}</div> : null}
    </div>
  );
}

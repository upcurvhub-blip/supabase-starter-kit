import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, MapPin, CheckCircle2, IndianRupee } from "lucide-react";

interface Props {
  productName: string;
  categoryName?: string;
  city?: string;
}

// Shows service-category products that match the product's keywords
// (e.g. "AC" -> "AC Fitting Services", "AC Installation").
export default function RelatedServices({ productName, categoryName, city }: Props) {
  const { data: services } = useQuery({
    queryKey: ["related-services", productName, categoryName, city],
    queryFn: async () => {
      const tokens = `${productName} ${categoryName || ""}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length > 2);
      if (!tokens.length) return [];

      // 1) find service categories — either explicitly flagged (is_service)
      // or AI-classified with confidence >= 0.6. Then rank by keyword overlap
      // (name + related_keywords) AND factor confidence into the score.
      const { data: cats } = await supabase
        .from("categories")
        .select("id, name, slug, related_keywords, is_service, service_ai_flagged, service_confidence, parent_id")
        .or("is_service.eq.true,service_ai_flagged.eq.true")
        .eq("is_active", true);

      const scored = (cats || [])
        .map((c: any) => {
          const conf = c.is_service ? 1 : Math.max(0, Math.min(1, c.service_confidence ?? 0));
          if (conf < 0.6 && !c.is_service) return null;
          const hay = `${c.name} ${(c.related_keywords || []).join(" ")}`.toLowerCase();
          const hits = tokens.filter((t) => hay.includes(t)).length;
          // Subcategory signal: prefer subcategories (parent_id set) — those
          // are usually the specific service like "AC Installation" vs generic "Services".
          const specificityBoost = c.parent_id ? 1.2 : 1.0;
          const score = hits * 2 * conf * specificityBoost;
          return score > 0 ? { c, score } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 8)
        .map((x: any) => x.c);

      if (!scored.length) return [];

      // 2) pull products in those service categories, prefer same-city sellers
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, slug, price, price_min, price_unit, images, primary_image_url, seller_profiles(business_name, city, verification_status, slug)")
        .in("category_id", scored.map((c: any) => c.id))
        .eq("is_active", true)
        .limit(12);

      const list = prods || [];
      list.sort((a: any, b: any) => {
        const ac = a.seller_profiles?.city?.toLowerCase() === city?.toLowerCase() ? 1 : 0;
        const bc = b.seller_profiles?.city?.toLowerCase() === city?.toLowerCase() ? 1 : 0;
        return bc - ac;
      });
      return list.slice(0, 8);
    },
    enabled: !!productName,
    staleTime: 10 * 60 * 1000,
  });

  if (!services || services.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center">
          <Wrench className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Related services</h2>
          <p className="text-xs text-muted-foreground">Installation, fitting & maintenance from verified providers</p>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory">
        {services.map((s: any) => {
          const img = s.primary_image_url || (Array.isArray(s.images) && s.images[0]);
          const price = s.price_min || s.price;
          return (
            <Link key={s.id} to={`/product/${s.slug || s.id}`} className="snap-start min-w-[180px] sm:min-w-[210px]">
              <Card className="h-full group overflow-hidden hover:shadow-lg transition-shadow border-sky-200/60">
                <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                  {img ? (
                    <img src={img} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Wrench className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-0 text-[10px]">
                    Service
                  </Badge>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary">{s.name}</h3>
                  {price && (
                    <div className="flex items-center text-sm font-semibold text-primary">
                      <IndianRupee className="h-3 w-3" />
                      {Number(price).toLocaleString()}
                      {s.price_unit && <span className="text-xs text-muted-foreground ml-1">/ {s.price_unit}</span>}
                    </div>
                  )}
                  {s.seller_profiles && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
                      {s.seller_profiles.verification_status === "verified" && <CheckCircle2 className="h-3 w-3 text-trust" />}
                      {s.seller_profiles.business_name}
                    </p>
                  )}
                  {s.seller_profiles?.city && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {s.seller_profiles.city}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

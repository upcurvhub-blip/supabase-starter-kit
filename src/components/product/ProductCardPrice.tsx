import { IndianRupee, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useShoppingIntent } from "@/hooks/useShoppingIntent";

const fmt = (n?: number | null) => (n || n === 0 ? Number(n).toLocaleString("en-IN") : "");

interface Props {
  product: any;
  /** show the intent-aware CTA button under the price */
  showCta?: boolean;
  size?: "sm" | "md";
}

/**
 * Intent-aware price block for product cards (homepage, search, listings).
 * Individual → retail price, MRP strike-through, stock.
 * Business   → wholesale "from" price, MOQ.
 */
export function ProductCardPrice({ product, showCta = true, size = "md" }: Props) {
  const { isBusiness } = useShoppingIntent();

  const mode: string = product.selling_mode || "wholesale";
  const unit = (product.price_unit || product.unit || "Piece").replace(/^Per\s+/i, "");

  const retail = product.selling_price ?? product.price ?? product.price_min ?? null;
  const mrp = product.mrp ?? null;
  const discount = mrp && retail && mrp > retail ? Math.round(((mrp - retail) / mrp) * 100) : 0;

  const wholesaleLow = product.price_min ?? product.price ?? null;
  const wholesaleHigh = product.price_max ?? null;

  const businessView = isBusiness && mode !== "retail";
  const priceClass = size === "sm" ? "text-base" : "text-lg";
  const to = `/product/${product.slug || product.id}`;

  if (businessView) {
    const hasPrice = wholesaleLow != null;
    return (
      <div className="space-y-1.5">
        {hasPrice ? (
          <div className={`flex flex-wrap items-center gap-0.5 font-bold text-primary ${priceClass}`}>
            <IndianRupee className="h-4 w-4" />
            {fmt(wholesaleLow)}
            {wholesaleHigh && wholesaleHigh !== wholesaleLow ? (
              <span className="flex items-center text-primary">
                <span className="mx-0.5 text-muted-foreground font-normal">–</span>
                <IndianRupee className="h-4 w-4" />
                {fmt(wholesaleHigh)}
              </span>
            ) : (
              <span className="ml-1 text-xs font-normal text-muted-foreground">onwards</span>
            )}
            <span className="ml-1 text-xs font-normal text-muted-foreground">/ {unit}</span>
          </div>

        ) : (
          <div className="text-sm font-medium text-muted-foreground">Price on request</div>
        )}
        {product.min_order_quantity ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Package className="h-3 w-3 shrink-0" />
            MOQ: {product.min_order_quantity} {product.moq_unit || "Pieces"}
          </div>
        ) : null}
        {showCta && (
          <Button size="sm" className="w-full mt-1" asChild>
            <Link to={`${to}?intent=bulk`}>Get Quote</Link>
          </Button>
        )}
      </div>
    );
  }

  const retailPrice = retail ?? wholesaleLow;
  return (
    <div className="space-y-1.5">
      {retailPrice != null ? (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span className={`flex items-center gap-0.5 font-bold text-primary ${priceClass}`}>
            <IndianRupee className="h-4 w-4" />
            {fmt(retailPrice)}
          </span>
          {mrp && discount > 0 && (
            <>
              <span className="text-xs text-muted-foreground line-through">₹{fmt(mrp)}</span>
              <span className="badge-offer inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
                {discount}% OFF
              </span>
            </>
          )}

          <span className="text-xs font-normal text-muted-foreground">/{unit}</span>
        </div>
      ) : (
        <div className="text-sm font-medium text-muted-foreground">Price on request</div>
      )}
      {mode === "wholesale" ? (
        <div className="text-xs text-muted-foreground">
          Bulk purchase{product.min_order_quantity ? ` · Min ${product.min_order_quantity} ${product.moq_unit || "pcs"}` : ""}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          ✓ {product.stock_availability === "out_of_stock" ? "Made to order" : "In stock"}
        </div>
      )}
      {showCta && (
        <Button size="sm" className="w-full mt-1" asChild>
          <Link to={to}>{mode === "wholesale" ? "Request Quote" : "Enquire now"}</Link>
        </Button>
      )}
    </div>
  );
}

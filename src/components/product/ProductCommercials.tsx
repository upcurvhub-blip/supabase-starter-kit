import { IndianRupee, Package, Truck, RotateCcw, Factory, Clock } from "lucide-react";
import { useShoppingIntent } from "@/hooks/useShoppingIntent";

interface Props {
  product: any;
  onBulkQuote?: () => void;
}

const fmt = (n?: number | null) => (n || n === 0 ? Number(n).toLocaleString("en-IN") : "");

/**
 * Intent-aware commercial block on the product page.
 * Individual → retail price, offers, delivery, returns.
 * Business  → wholesale range, MOQ, supply capacity, lead time.
 */
export function ProductCommercials({ product, onBulkQuote }: Props) {
  const { isBusiness, setIntent } = useShoppingIntent();

  const mode: string = product.selling_mode || "wholesale";
  const unit = (product.price_unit || product.unit || "Piece").replace(/^Per\s+/i, "");
  const retail = product.selling_price ?? product.price ?? product.price_min ?? null;
  const mrp = product.mrp ?? null;
  const discount = mrp && retail && mrp > retail ? Math.round(((mrp - retail) / mrp) * 100) : 0;

  const wholesaleLow = product.price_min ?? product.price ?? null;
  const wholesaleHigh = product.price_max ?? null;

  const showBusinessView = isBusiness && mode !== "retail";
  const showRetailView = !isBusiness && mode !== "wholesale";

  return (
    <div className="mb-4 space-y-3">
      {showBusinessView ? (
        <>
          <div className="flex items-baseline flex-wrap gap-2">
            <div className="flex items-center text-3xl font-bold text-primary">
              <IndianRupee className="h-7 w-7" />
              {fmt(wholesaleLow)}
              {wholesaleHigh && wholesaleHigh !== wholesaleLow && <span> – {fmt(wholesaleHigh)}</span>}
            </div>
            <span className="text-muted-foreground">/ {unit}</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
              Wholesale pricing
            </span>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            {product.min_order_quantity && (
              <span className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5">
                <Package className="mr-1 inline h-4 w-4" /> MOQ: {product.min_order_quantity}{" "}
                {product.moq_unit || "Pieces"}
              </span>
            )}
            {product.supply_capacity && (
              <span className="rounded-lg border bg-muted/40 px-3 py-1.5">
                <Factory className="mr-1 inline h-4 w-4" /> Supply capacity: {product.supply_capacity}
              </span>
            )}
            {product.lead_time && (
              <span className="rounded-lg border bg-muted/40 px-3 py-1.5">
                <Clock className="mr-1 inline h-4 w-4" /> Lead time: {product.lead_time}
              </span>
            )}
          </div>

          {Array.isArray(product.wholesale_tiers) && product.wholesale_tiers.length > 0 && (
            <div className="overflow-hidden rounded-lg border text-sm">
              <div className="grid grid-cols-2 bg-muted/50 px-3 py-1.5 font-medium">
                <span>Quantity</span>
                <span>Price</span>
              </div>
              {product.wholesale_tiers.map((t: any, i: number) => (
                <div key={i} className="grid grid-cols-2 border-t px-3 py-1.5">
                  <span>{t.qty || t.quantity}</span>
                  <span>₹{fmt(t.price)}</span>
                </div>
              ))}
            </div>
          )}

          {mode === "both" && (
            <button
              type="button"
              onClick={() => setIntent("individual")}
              className="text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              Buying only 1 piece? View retail price →
            </button>
          )}
        </>
      ) : showRetailView ? (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <div className="flex items-center text-3xl font-bold text-primary">
              <IndianRupee className="h-7 w-7" />
              {fmt(retail)}
            </div>
            {mrp && discount > 0 && (
              <>
                <span className="text-lg text-muted-foreground line-through">₹{fmt(mrp)}</span>
                <span className="badge-offer inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                  {discount}% OFF
                </span>
              </>
            )}

            <span className="text-muted-foreground">/ {unit}</span>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span>✓ {product.stock_availability === "out_of_stock" ? "Made to order" : "In stock"}</span>
            {product.delivery_available !== false && (
              <span>
                <Truck className="mr-1 inline h-4 w-4" />
                {product.delivery_time ? `Delivery in ${product.delivery_time}` : "Delivery available"}
              </span>
            )}
            {product.return_window_days ? (
              <span>
                <RotateCcw className="mr-1 inline h-4 w-4" />
                {product.return_window_days}-day {product.replacement_available ? "replacement" : "returns"}
              </span>
            ) : null}
            {product.cod_available && <span>COD available</span>}
          </div>

          <button
            type="button"
            onClick={onBulkQuote}
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Need multiple pieces? Get a bulk quote →
          </button>
        </>
      ) : (
        // Mode doesn't match the visitor's intent — show what's available with context.
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <div className="flex items-center text-3xl font-bold text-primary">
              <IndianRupee className="h-7 w-7" />
              {fmt(retail ?? wholesaleLow)}
              {!isBusiness && wholesaleHigh && wholesaleHigh !== wholesaleLow && <span> – {fmt(wholesaleHigh)}</span>}
            </div>
            <span className="text-muted-foreground">/ {unit}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "wholesale"
              ? `Bulk purchase product${product.min_order_quantity ? ` · Minimum order: ${product.min_order_quantity} ${product.moq_unit || "pieces"}` : ""}`
              : "This seller lists this item for retail purchase."}
          </p>
        </div>
      )}
    </div>
  );
}

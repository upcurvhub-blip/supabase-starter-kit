import { Sparkles, Flame } from "lucide-react";

interface Props {
  product: any;
  seller?: any;
}

/**
 * Compact AI insight. Deliberately does NOT repeat the seller's product
 * description — it derives a short buying judgement from product + seller
 * context (fit, commercials, supplier reliability, timing).
 */
export function AiInsightCard({ product, seller }: Props) {
  const productName = product?.name || "This product";
  const sellerName = seller?.business_name || "the supplier";
  const city = seller?.city ? ` (${seller.city})` : "";
  const verified = seller?.verification_status === "verified";
  const responseHours = seller?.avg_response_time || 24;
  const enquiries = product?.enquiry_count || 0;
  const category = product?.categories?.name;
  const moq = product?.moq || product?.min_order_quantity;
  const unit = product?.moq_unit || product?.price_unit || product?.unit || "units";
  const mode = product?.selling_mode || "wholesale";

  // Who it fits — inferred, not copied from the description.
  const fit =
    mode === "retail"
      ? "single-piece buyers who want it delivered, not quoted"
      : mode === "both"
      ? "both one-off buyers and bulk purchasers"
      : moq
      ? `buyers ordering ${moq}+ ${unit} at a time`
      : "bulk and repeat buyers";

  // Commercial read.
  const commercial = product?.price
    ? "Listed price is fixed, so there is little negotiation room — compare on delivery and warranty instead."
    : product?.price_min && product?.price_max
    ? "Price is quoted as a range, so the final rate moves with quantity — ask for a slab-wise quote."
    : "Price is on request, which usually means the rate is negotiable at volume.";

  // Supplier read.
  const supplier = verified
    ? `${sellerName}${city} is a verified supplier replying in about ${responseHours}h.`
    : `${sellerName}${city} is unverified — ask for GST and past-order proof before advancing.`;

  const timing =
    enquiries >= 5
      ? `${enquiries} recent enquiries — quotes are being issued now.`
      : product?.stock_quantity && product.stock_quantity < 20
      ? `Only ${product.stock_quantity} ${unit} left in stock.`
      : `Expect a quote back within ~${responseHours}h.`;

  const points = [
    { label: "Best for", text: fit },
    { label: "Pricing", text: commercial },
    { label: "Supplier", text: supplier },
  ];

  return (
    <div className="relative mb-5">
      <div className="ai-insight-glow relative rounded-2xl p-[2px] overflow-hidden">
        <div className="relative rounded-2xl bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-pink-950/40 dark:via-background dark:to-fuchsia-950/30 p-3.5 md:p-4 shadow-sm">
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="ai-insight-sweep absolute -inset-y-4 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/60 to-transparent blur-md" />
          </div>

          <div className="relative flex gap-3 min-w-0">
            <div className="shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-500 text-white flex items-center justify-center shadow-md shadow-pink-500/25">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  AI Insight
                </span>
                {category && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 font-medium truncate max-w-[60%]">
                    {category}
                  </span>
                )}
              </div>

              <ul className="mt-2 space-y-1.5">
                {points.map((p) => (
                  <li key={p.label} className="text-[13px] md:text-sm leading-snug text-foreground break-words">
                    <span className="font-semibold text-pink-700 dark:text-pink-300">{p.label}: </span>
                    <span className="text-muted-foreground">{p.text}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-2 text-xs text-pink-700/90 dark:text-pink-300/90 font-medium inline-flex items-start gap-1">
                <Flame className="h-3.5 w-3.5 mt-px shrink-0" />
                <span className="break-words">{timing}</span>
              </p>
              <span className="sr-only">{productName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiInsightCard;

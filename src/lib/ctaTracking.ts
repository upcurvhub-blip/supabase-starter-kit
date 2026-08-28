import { supabase } from "@/integrations/supabase/client";

export type CtaKind =
  | "whatsapp"
  | "call"
  | "enquiry"
  | "quote"
  | "share"
  | "best_price"
  | "requirement";

function sessionId(): string {
  try {
    let s = sessionStorage.getItem("upcurv_sid");
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("upcurv_sid", s);
    }
    return s;
  } catch {
    return "anon";
  }
}

/** Fire-and-forget CTA click tracking for seller analytics. */
export function trackCta(productId?: string | null, sellerId?: string | null, cta?: CtaKind) {
  if (!productId || !cta) return;
  void supabase
    .from("product_cta_events")
    .insert({
      product_id: productId,
      seller_id: sellerId ?? null,
      cta,
      session_id: sessionId(),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
    })
    .then(() => undefined, () => undefined);
}

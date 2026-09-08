import { supabase } from "@/integrations/supabase/client";

export type SellerCtaKind = "whatsapp" | "call" | "share" | "like" | "claim";

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

/**
 * Fire-and-forget tracking for profile-level buttons (WhatsApp / Call / Share / Like).
 * Stored as a visitor page view of type `seller_cta` so it lands in the seller's
 * own reporting without needing a product id.
 */
export function trackSellerCta(sellerId?: string | null, cta?: SellerCtaKind, sellerName?: string | null) {
  if (!sellerId || !cta) return;
  void supabase
    .rpc("record_visitor_page_view" as any, {
      p_page_type: "seller_cta",
      p_page_path: typeof window !== "undefined" ? window.location.pathname : null,
      p_product_id: null,
      p_seller_id: sellerId,
      p_category_id: null,
      p_user_id: null,
      p_device_id: null,
      p_session_id: sessionId(),
      p_referrer: typeof document !== "undefined" ? document.referrer || null : null,
      p_user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      p_metadata: { cta, seller_name: sellerName || null },
    })
    .then(() => undefined, () => undefined);
}

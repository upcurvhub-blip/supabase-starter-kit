import { supabase } from "@/integrations/supabase/client";

// Fire-and-forget IndexNow notification. Never throws.
export function notifyIndex(payload: {
  product_id?: string;
  seller_id?: string;
  category_id?: string;
  page_id?: string;
  urls?: string[];
}) {
  try {
    supabase.functions.invoke("notify-indexnow", { body: payload }).catch(() => {});
  } catch {
    /* noop */
  }
}

// Trigger the full auto-SEO pipeline for a product (AI description, FAQs,
// internal links, IndexNow fan-out). Fire-and-forget.
export function triggerProductSeo(product_id: string) {
  try {
    supabase.functions.invoke("on-product-publish", { body: { product_id } }).catch(() => {});
  } catch {
    /* noop */
  }
}


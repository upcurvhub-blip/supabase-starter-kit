import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEVICE_CONSENT_EVENT, getDeviceId, hasDeviceConsent } from "./useDeviceId";

/**
 * Auto lead-capture engine.
 * Tracks category-scoped product-view "qualified" visits (>=10s) per device.
 * When 3+ qualifying views in the SAME category accumulate AND we already have
 * this visitor's contact details (from a prior enquiry stored in visitor_devices),
 * a lead is auto-created and pushed to the admin auto-lead inbox.
 *
 * Uses localStorage as the working set so we don't spam the DB before the
 * threshold trips.
 */

const QUALIFY_MS = 10_000;
const THRESHOLD = 3;
const VIEWS_KEY = "bt_auto_views_v1";
const CAPTURED_KEY = "bt_auto_captured_v1";

type ViewLog = Record<string, { productId: string; at: number }[]>; // categoryId -> views
type CapturedSet = string[]; // categoryIds already converted

function readViews(): ViewLog {
  try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || "{}"); } catch { return {}; }
}
function writeViews(v: ViewLog) { try { localStorage.setItem(VIEWS_KEY, JSON.stringify(v)); } catch {} }
function readCaptured(): CapturedSet {
  try { return JSON.parse(localStorage.getItem(CAPTURED_KEY) || "[]"); } catch { return []; }
}
function writeCaptured(v: CapturedSet) { try { localStorage.setItem(CAPTURED_KEY, JSON.stringify(v)); } catch {} }

async function tryAutoCreateLead(categoryId: string, productIds: string[]) {
  const deviceId = getDeviceId();
  if (!deviceId) return;

  // Do we know this visitor?
  const { data: visitor } = await supabase
    .from("visitor_devices")
    .select("*")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (!visitor || !visitor.phone) return; // need at least a phone

  // Load top product to attach seller
  const { data: prod } = await supabase
    .from("products")
    .select("id, name, seller_id, category_id, seller_profiles:seller_id(id, business_name)")
    .eq("id", productIds[productIds.length - 1])
    .maybeSingle();

  // Insert auto-captured lead
  const { error } = await supabase.from("leads").insert({
    buyer_id: null,
    device_id: deviceId,
    guest_name: visitor.name || "Returning visitor",
    guest_phone: visitor.phone,
    guest_email: visitor.email || null,
    seller_id: prod?.seller_id || null,
    product_id: prod?.id || null,
    category_id: categoryId,
    message: `Auto-captured: visitor browsed ${productIds.length} products in this category (device pattern match).`,
    status: "new",
    source: "auto_capture",
    metadata: {
      visited_products: productIds,
      visitor_city: visitor.city || null,
      device_id: deviceId,
      captured_via: "pattern_match",
    },
  });

  if (error) {
    console.error("Auto-lead insert failed", error);
    return;
  }

  const captured = readCaptured();
  if (!captured.includes(categoryId)) {
    captured.push(categoryId);
    writeCaptured(captured);
  }
}

/**
 * Call from a product-detail page. Starts a 10s timer; if the user stays,
 * the visit is logged. When the threshold trips for the same category, a
 * lead is auto-created (if we know the visitor).
 */
export function useAutoLeadCapture(productId?: string, categoryId?: string) {
  const fired = useRef(false);
  const [consented, setConsented] = useState(hasDeviceConsent());

  useEffect(() => {
    const onConsent = () => setConsented(hasDeviceConsent());
    window.addEventListener(DEVICE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(DEVICE_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!productId || !categoryId) return;
    if (!consented) return;
    fired.current = false;
    const timer = window.setTimeout(() => {
      if (fired.current) return;
      fired.current = true;

      const captured = readCaptured();
      if (captured.includes(categoryId)) return; // already converted this category

      const views = readViews();
      const list = views[categoryId] || [];
      if (!list.some((v) => v.productId === productId)) {
        list.push({ productId, at: Date.now() });
        views[categoryId] = list;
        writeViews(views);
      }

      if (list.length >= THRESHOLD) {
        void tryAutoCreateLead(categoryId, list.map((v) => v.productId));
      }
    }, QUALIFY_MS);

    return () => window.clearTimeout(timer);
  }, [productId, categoryId, consented]);
}

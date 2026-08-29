import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEVICE_CONSENT_EVENT, ensureDeviceId, getDeviceId, hasDeviceConsent } from "./useDeviceId";
import { getVisitorIdentity } from "@/lib/visitorIdentity";

/**
 * Auto lead-capture engine.
 *
 * Rule: once a visitor has shared their name + phone (any enquiry / exit-intent
 * form on this device), every *other* product they dwell on for 30s+ creates an
 * auto-captured lead so admins get it in the auto-lead inbox.
 *
 * Contact details are read from the local identity cache — `visitor_devices` is
 * admin-read-only under RLS, so an anonymous visitor can never read their own
 * row back (this was the reason auto-capture silently never fired).
 */

const DWELL_MS = 30_000;
const CAPTURED_KEY = "bt_auto_captured_products_v1";

function readCaptured(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CAPTURED_KEY) || "[]");
  } catch {
    return [];
  }
}

function markCaptured(productId: string) {
  try {
    const list = readCaptured();
    if (!list.includes(productId)) {
      list.push(productId);
      localStorage.setItem(CAPTURED_KEY, JSON.stringify(list.slice(-200)));
    }
  } catch {
    /* storage unavailable */
  }
}

async function createAutoLead(productId: string, categoryId?: string) {
  const identity = getVisitorIdentity();
  if (!identity?.phone) return; // we don't know this visitor yet

  const deviceId = getDeviceId() || ensureDeviceId();

  const { data: prod } = await supabase
    .from("products")
    .select("id, name, seller_id, category_id")
    .eq("id", productId)
    .maybeSingle();

  const { error } = await supabase.from("leads").insert({
    buyer_id: null,
    device_id: deviceId || null,
    guest_name: identity.name || "Returning visitor",
    guest_phone: identity.phone,
    guest_email: identity.email || null,
    seller_id: prod?.seller_id || null,
    product_id: prod?.id || productId,
    category_id: prod?.category_id || categoryId || null,
    message: `Auto-captured: known visitor spent 30s+ on "${prod?.name || "a product"}" without enquiring.`,
    status: "new",
    source: "auto_capture",
    metadata: {
      product_id: productId,
      product_name: prod?.name || null,
      visitor_city: identity.city || null,
      device_id: deviceId || null,
      captured_via: "dwell_30s",
    },
  });

  if (error) {
    console.error("Auto-lead insert failed", error);
    return;
  }

  markCaptured(productId);

  // Keep the device record fresh so the admin inbox shows recent activity.
  if (deviceId) {
    await supabase
      .from("visitor_devices")
      .upsert(
        {
          device_id: deviceId,
          name: identity.name || null,
          phone: identity.phone,
          city: identity.city || null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "device_id" },
      )
      .then(
        () => undefined,
        () => undefined,
      );
  }
}

/**
 * Call from a product-detail page. After 30s of dwell, if we already know this
 * visitor's contact details, an auto lead is created for this product (once).
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
    if (!productId) return;
    if (!consented) return;
    if (!getVisitorIdentity()?.phone) return;
    if (readCaptured().includes(productId)) return;

    fired.current = false;
    const timer = window.setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      void createAutoLead(productId, categoryId);
    }, DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [productId, categoryId, consented]);
}

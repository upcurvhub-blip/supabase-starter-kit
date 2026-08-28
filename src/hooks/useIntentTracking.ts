import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasDeviceConsent } from "@/hooks/useDeviceId";

type SignalType = 
  | 'search' 
  | 'product_view' 
  | 'rfq_edit' 
  | 'call_click' 
  | 'whatsapp_click' 
  | 'enquiry' 
  | 'repeated_search';

interface SignalData {
  product_id?: string;
  category_id?: string;
  search_query?: string;
  duration?: number;
  [key: string]: any;
}

/**
 * Hook for tracking buyer intent signals
 * Engine 1: Buyer Intent Intelligence
 */
export function useIntentTracking() {
  const sessionId = useRef<string>("");
  const userId = useRef<string | null>(null);

  useEffect(() => {
    if (!hasDeviceConsent()) return;
    // Get or create session ID
    const stored = localStorage.getItem("session_id");
    if (stored) {
      sessionId.current = stored;
    } else {
      sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("session_id", sessionId.current);
    }

    // Get current user ID
    supabase.auth.getUser().then(({ data: { user } }) => {
      userId.current = user?.id || null;
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      userId.current = session?.user?.id || null;
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Track a buyer intent signal
   */
  const trackSignal = useCallback(async (
    signalType: SignalType,
    signalData: SignalData = {},
    weight: number = 1
  ) => {
    try {
      if (!hasDeviceConsent()) return;
      await supabase.from("buyer_intent_signals").insert({
        user_id: userId.current,
        session_id: sessionId.current,
        signal_type: signalType,
        signal_data: signalData,
        weight: Math.min(Math.max(weight, 1), 10), // Clamp between 1-10
      });
    } catch (error) {
      console.error("Error tracking intent signal:", error);
    }
  }, []);

  /**
   * Track search query
   */
  const trackSearch = useCallback((query: string, categoryId?: string) => {
    trackSignal('search', { search_query: query, category_id: categoryId });
  }, [trackSignal]);

  /**
   * Track product view with duration
   */
  const trackProductView = useCallback((productId: string, categoryId?: string, duration?: number) => {
    const weight = duration 
      ? (duration > 60 ? 3 : duration > 30 ? 2 : 1)
      : 1;
    trackSignal('product_view', { product_id: productId, category_id: categoryId, duration }, weight);
  }, [trackSignal]);

  /**
   * Track enquiry submission
   */
  const trackEnquiry = useCallback((productId: string, sellerId: string, categoryId?: string) => {
    trackSignal('enquiry', { product_id: productId, seller_id: sellerId, category_id: categoryId }, 5);
  }, [trackSignal]);

  /**
   * Track call click
   */
  const trackCallClick = useCallback((sellerId: string, productId?: string) => {
    trackSignal('call_click', { seller_id: sellerId, product_id: productId }, 4);
  }, [trackSignal]);

  /**
   * Track WhatsApp click
   */
  const trackWhatsAppClick = useCallback((sellerId: string, productId?: string) => {
    trackSignal('whatsapp_click', { seller_id: sellerId, product_id: productId }, 4);
  }, [trackSignal]);

  /**
   * Track RFQ/requirement edit
   */
  const trackRfqEdit = useCallback((requirementId: string, categoryId?: string) => {
    trackSignal('rfq_edit', { requirement_id: requirementId, category_id: categoryId }, 3);
  }, [trackSignal]);

  /**
   * Calculate and update intent score
   */
  const calculateIntent = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_buyer_intent', {
        p_user_id: userId.current,
        p_session_id: sessionId.current,
      });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error calculating intent:", error);
      return null;
    }
  }, []);

  return {
    trackSignal,
    trackSearch,
    trackProductView,
    trackEnquiry,
    trackCallClick,
    trackWhatsAppClick,
    trackRfqEdit,
    calculateIntent,
    sessionId: sessionId.current,
  };
}
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ShoppingIntent = "individual" | "business";

const KEY = "upcurv_trade_intent";
const EXP_KEY = "upcurv_trade_intent_expires";
export const INTENT_TTL_MS = 10 * 60 * 1000; // 10 minutes

function readIntent(): ShoppingIntent | null {
  try {
    const value = localStorage.getItem(KEY) as ShoppingIntent | null;
    const expires = Number(localStorage.getItem(EXP_KEY) || 0);
    if (!value || !expires) return null;
    if (Date.now() > expires) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(EXP_KEY);
      return null;
    }
    return value === "individual" || value === "business" ? value : null;
  } catch {
    return null;
  }
}

function persistIntent(intent: ShoppingIntent) {
  try {
    localStorage.setItem(KEY, intent);
    localStorage.setItem(EXP_KEY, String(Date.now() + INTENT_TTL_MS));
  } catch {
    /* storage unavailable */
  }
}

interface IntentContextValue {
  intent: ShoppingIntent | null;
  isBusiness: boolean;
  isIndividual: boolean;
  /** true once the initial read from storage has run */
  ready: boolean;
  setIntent: (intent: ShoppingIntent) => void;
  clearIntent: () => void;
}

const IntentContext = createContext<IntentContextValue>({
  intent: null,
  isBusiness: false,
  isIndividual: true,
  ready: false,
  setIntent: () => {},
  clearIntent: () => {},
});

export function ShoppingIntentProvider({ children }: { children: React.ReactNode }) {
  const [intent, setIntentState] = useState<ShoppingIntent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIntentState(readIntent());
    setReady(true);
  }, []);

  // Re-check expiry while the tab stays open
  useEffect(() => {
    const id = window.setInterval(() => {
      const current = readIntent();
      setIntentState((prev) => (prev === current ? prev : current));
    }, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const setIntent = useCallback((next: ShoppingIntent) => {
    persistIntent(next);
    setIntentState(next);
  }, []);

  const clearIntent = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(EXP_KEY);
    } catch {
      /* noop */
    }
    setIntentState(null);
  }, []);

  const value = useMemo<IntentContextValue>(
    () => ({
      intent,
      isBusiness: intent === "business",
      isIndividual: intent !== "business",
      ready,
      setIntent,
      clearIntent,
    }),
    [intent, ready, setIntent, clearIntent],
  );

  return <IntentContext.Provider value={value}>{children}</IntentContext.Provider>;
}

export function useShoppingIntent() {
  return useContext(IntentContext);
}

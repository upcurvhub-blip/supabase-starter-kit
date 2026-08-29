import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Visitor city preference. Captured either from the browser geolocation prompt
 * (reverse-geocoded) or picked manually. Used to boost same-city products in
 * search results, category pages and cross-sell/upsell blocks.
 */

const CITY_KEY = "upcurv_pref_city";
const ASKED_KEY = "upcurv_geo_asked";

function readCity(): string | null {
  try {
    return localStorage.getItem(CITY_KEY) || null;
  } catch {
    return null;
  }
}

interface CityContextValue {
  city: string | null;
  ready: boolean;
  setCity: (city: string | null) => void;
  /** true when we have never asked for location on this device */
  canAskLocation: boolean;
  markAsked: () => void;
}

const CityContext = createContext<CityContextValue>({
  city: null,
  ready: false,
  setCity: () => {},
  canAskLocation: false,
  markAsked: () => {},
});

export function CityPreferenceProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [asked, setAsked] = useState(true);

  useEffect(() => {
    setCityState(readCity());
    try {
      setAsked(localStorage.getItem(ASKED_KEY) === "1");
    } catch {
      setAsked(true);
    }
    setReady(true);
  }, []);

  const setCity = useCallback((next: string | null) => {
    try {
      if (next) localStorage.setItem(CITY_KEY, next);
      else localStorage.removeItem(CITY_KEY);
    } catch {
      /* storage unavailable */
    }
    setCityState(next);
  }, []);

  const markAsked = useCallback(() => {
    try {
      localStorage.setItem(ASKED_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setAsked(true);
  }, []);

  const value = useMemo<CityContextValue>(
    () => ({ city, ready, setCity, canAskLocation: !asked && !city, markAsked }),
    [city, ready, setCity, asked, markAsked],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCityPreference() {
  return useContext(CityContext);
}

/** Stable sort that floats rows whose seller city matches the preferred city. */
export function sortByCityPriority<T>(
  rows: T[],
  city: string | null | undefined,
  getCity: (row: T) => string | null | undefined,
): T[] {
  if (!city) return rows;
  const target = city.trim().toLowerCase();
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const am = (getCity(a.row) || "").trim().toLowerCase() === target ? 0 : 1;
      const bm = (getCity(b.row) || "").trim().toLowerCase() === target ? 0 : 1;
      return am - bm || a.index - b.index;
    })
    .map((x) => x.row);
}

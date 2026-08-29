import { useEffect, useState } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_INDIAN_CITIES } from "@/lib/india";
import { useCityPreference } from "@/hooks/useCityPreference";
import { useToast } from "@/hooks/use-toast";

/**
 * Shown 3 seconds after entering the platform. When the visitor allows
 * location we reverse-geocode to a city and store it as their preferred city
 * so nearby products rank first everywhere.
 */
export function LocationCapturePrompt() {
  const { city, ready, setCity, canAskLocation, markAsked } = useCityPreference();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!ready || city || !canAskLocation) return;
    const t = window.setTimeout(() => setOpen(true), 3000);
    return () => window.clearTimeout(t);
  }, [ready, city, canAskLocation]);

  const close = () => {
    markAsked();
    setOpen(false);
  };

  const detect = () => {
    if (!("geolocation" in navigator)) {
      setManual(true);
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`,
          );
          const json = await res.json();
          const detected: string | undefined = json.city || json.locality || json.principalSubdivision;
          if (detected) {
            setCity(detected);
            markAsked();
            toast({ title: `Showing ${detected} first`, description: "Nearby sellers and products now rank first." });
            setOpen(false);
          } else {
            setManual(true);
          }
        } catch {
          setManual(true);
        } finally {
          setBusy(false);
        }
      },
      () => {
        setBusy(false);
        setManual(true);
      },
      { timeout: 8000 },
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] p-4 animate-fade-in">
      <div className="mx-auto max-w-md rounded-2xl border bg-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="font-semibold">Show sellers near you?</p>
            <p className="text-xs text-muted-foreground">
              We'll put products and suppliers from your city first in search and category pages.
            </p>

            {manual ? (
              <div className="mt-3 space-y-2">
                <Select
                  onValueChange={(v) => {
                    setCity(v);
                    markAsked();
                    setOpen(false);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your city" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ALL_INDIAN_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={detect} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Allow location
                </Button>
                <Button size="sm" variant="outline" onClick={() => setManual(true)}>
                  Pick city
                </Button>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss location prompt"
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default LocationCapturePrompt;

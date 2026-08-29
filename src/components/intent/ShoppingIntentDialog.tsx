import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Building2, Loader2, X } from "lucide-react";
import { useShoppingIntent } from "@/hooks/useShoppingIntent";
import { supabase } from "@/integrations/supabase/client";
import { ensureDeviceId } from "@/hooks/useDeviceId";
import { useToast } from "@/hooks/use-toast";
import { requestPopup, releasePopup, onExitIntent, onIdle, exitIntentFired, markExitIntentFired } from "@/lib/popupGate";

const SNOOZE_KEY = "upcurv_intent_snooze_until";
const SNOOZE_MS = 10 * 60 * 1000; // 10 minutes

function isSnoozed() {
  try {
    return Date.now() < Number(sessionStorage.getItem(SNOOZE_KEY) || 0);
  } catch {
    return false;
  }
}

function snooze() {
  try {
    sessionStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    /* storage unavailable */
  }
}

export function ShoppingIntentDialog() {
  const { intent, ready, setIntent } = useShoppingIntent();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "business">("choose");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  const dismiss = () => {
    snooze();
    setOpen(false);
  };

  // Behaviour-driven: exit-intent first, idle nudge as a fallback. Never a
  // pure timer, and always through the sitewide one-popup-at-a-time gate.
  // Once shown and dismissed, it stays away for 10 minutes (per session).
  useEffect(() => {
    if (!ready || intent) return;
    if (isSnoozed()) return;

    const show = (fromExit: boolean) => {
      if (isSnoozed()) return;
      if (!fromExit && exitIntentFired()) return;
      if (!requestPopup("shopping-intent")) return;
      if (fromExit) markExitIntentFired();
      snooze();
      setOpen(true);
    };

    const offExit = onExitIntent(() => show(true), 4000);
    const offIdle = onIdle(() => show(false), 20000);
    return () => {
      offExit();
      offIdle();
    };
  }, [ready, intent]);

  useEffect(() => {
    if (!open) releasePopup("shopping-intent");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);


  const chooseIndividual = () => {
    setIntent("individual");
    setOpen(false);
  };

  const submitBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("business_visitor_leads").insert({
        business_name: businessName.trim(),
        phone: phone.trim(),
        device_id: ensureDeviceId() || null,
        page_path: location.pathname,
        metadata: { source: "intent_popup" },
      });
      if (error) throw error;
      setIntent("business");
      setOpen(false);
      toast({ title: "Thanks!", description: "We've switched you to business sourcing mode." });
    } catch (err: any) {
      toast({ title: "Could not save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm" onClick={dismiss} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intent-dialog-title"
        className="relative w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl animate-fade-in"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "choose" ? (
          <div className="space-y-4">
            <div>
              <h2 id="intent-dialog-title" className="text-lg font-semibold">How are you shopping today?</h2>
              <p className="text-sm text-muted-foreground">We'll tailor prices and options to you.</p>
            </div>

            <button
              type="button"
              onClick={chooseIndividual}
              className="w-full rounded-xl border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div className="flex items-start gap-3">
                <ShoppingBag className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">🛍️ I'm buying for myself</p>
                  <p className="text-xs text-muted-foreground">Shop products, compare sellers and buy for personal use.</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-primary">Continue as Individual →</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStep("business")}
              className="w-full rounded-xl border p-4 text-left transition-colors hover:border-accent hover:bg-accent/5"
            >
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">🏢 I'm buying for my business</p>
                  <p className="text-xs text-muted-foreground">Find suppliers, compare bulk prices and get quotes.</p>
                  <span className="mt-2 inline-block text-xs font-semibold text-accent">Continue as Business →</span>
                </div>
              </div>
            </button>

            <p className="text-center text-xs text-muted-foreground">You can change this anytime.</p>
          </div>
        ) : (
          <form onSubmit={submitBusiness} className="space-y-4">
            <div>
              <h2 id="intent-dialog-title" className="text-lg font-semibold">Just two details</h2>
              <p className="text-sm text-muted-foreground">So suppliers can send you the right bulk pricing.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="intent-biz-name">Business name</Label>
              <Input
                id="intent-biz-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Jai Furnitures"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="intent-biz-phone">Phone number</Label>
              <Input
                id="intent-biz-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                required
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("choose")}>
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue as Business
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">No account needed. You can change this anytime.</p>
          </form>
        )}
      </div>
    </div>
  );
}

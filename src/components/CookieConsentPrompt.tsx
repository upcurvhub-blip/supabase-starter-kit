import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { shouldShowConsentPrompt, setDeviceConsent } from "@/hooks/useDeviceId";
import { ShieldCheck } from "lucide-react";

export function CookieConsentPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(shouldShowConsentPrompt());
  }, []);


  if (!visible) return null;

  const choose = (accepted: boolean) => {
    setDeviceConsent(accepted);
    setVisible(false);
  };

  return (
    <div className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-out">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold">Allow device tracking?</p>
            <p className="text-xs leading-5 text-muted-foreground">
              We use a consented device ID to remember submitted enquiries and match returning product-interest patterns. See our{" "}
              <Link to="/privacy-policy" className="font-medium text-primary underline-offset-2 hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => choose(false)}>
            Decline
          </Button>
          <Button type="button" size="sm" className="gradient-accent" onClick={() => choose(true)}>
            Allow
          </Button>
        </div>
      </div>
    </div>
  );
}
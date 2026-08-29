import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { saveVisitorIdentity } from "@/lib/visitorIdentity";
import { ensureDeviceId } from "@/hooks/useDeviceId";
import { Sparkles } from "lucide-react";
import { requestPopup, releasePopup, onExitIntent, markExitIntentFired } from "@/lib/popupGate";


const SHOWN_KEY = "bt_exit_intent_shown_v1";

/**
 * Global exit-intent capture. Fires once per session on desktop when the
 * mouse leaves through the top of the viewport, and on mobile after 45s of
 * inactivity with scroll depth >30%. Skips authenticated app surfaces.
 */
export function ExitIntentDialog() {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const skipRoute =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/seller") ||
    pathname.startsWith("/auth");

  useEffect(() => {
    if (skipRoute) return;
    if (sessionStorage.getItem(SHOWN_KEY)) return;

    const trigger = () => {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
      if (!requestPopup("exit-intent")) return;
      sessionStorage.setItem(SHOWN_KEY, "1");
      markExitIntentFired();
      setOpen(true);
    };

    return onExitIntent(trigger, 6000);
  }, [skipRoute]);

  useEffect(() => {
    if (!open) releasePopup("exit-intent");
  }, [open]);


  const handleSubmit = async () => {
    if (form.name.trim().length < 2) return toast({ title: "Please enter your name", variant: "destructive" });
    if (form.phone.replace(/\D/g, "").length < 7) return toast({ title: "Enter a valid mobile", variant: "destructive" });

    setSubmitting(true);
    try {
      const deviceId = ensureDeviceId();

      saveVisitorIdentity({ name: form.name.trim(), phone: form.phone.trim() });

      // Upsert visitor identity
      if (deviceId) {
        await supabase.from("visitor_devices").upsert({
          device_id: deviceId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || null,
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "device_id" });
      }

      // Create a lead in the auto/exit pipeline
      await supabase.from("leads").insert({
        buyer_id: null,
        device_id: deviceId || null,
        guest_name: form.name.trim(),
        guest_phone: form.phone.trim(),
        guest_email: form.email.trim() || null,
        seller_id: null,
        message: `Exit-intent lead captured on ${pathname}`,
        status: "new",
        source: "exit_intent",
        metadata: { captured_path: pathname, ...(deviceId ? { device_id: deviceId } : {}) },
      });

      toast({ title: "Thanks! We'll be in touch shortly." });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Wait — get the best price!
          </DialogTitle>
          <DialogDescription>
            Leave your details and our verified suppliers will send you their best quotes within minutes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 mt-2">
          <div>
            <Label htmlFor="ei-name">Your Name *</Label>
            <Input id="ei-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" />
          </div>
          <div>
            <Label htmlFor="ei-phone">Mobile *</Label>
            <Input id="ei-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
          </div>
          <div>
            <Label htmlFor="ei-email">Email (optional)</Label>
            <Input id="ei-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
          </div>
          <Button className="w-full gradient-accent py-6" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Sending..." : "Get Best Quotes"}
          </Button>
          <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground underline">
            No thanks, continue browsing
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

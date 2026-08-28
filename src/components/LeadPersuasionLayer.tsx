import { useEffect, useMemo, useState } from "react";
import { Clock, Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PERSUASION_COPY, endOfDayCountdown, responseSlotsLeft } from "@/lib/persuasionCopy";
import { requestPopup, releasePopup, onIdle, exitIntentFired } from "@/lib/popupGate";

interface Props {
  productId: string;
  avgResponseHours?: number;
  submitted: boolean;
  onCta: () => void;
}

const SESSION_KEY_PREFIX = "bt_persuasion_shown_";

/**
 * Session-gated persuasion layer for the product detail page.
 * - Sticky "get instant quote" CTA after the visitor scrolls past 50%
 * - 20s inactivity nudge (once per product per session, only when exit-intent
 *   has not already fired, and only via the sitewide popup gate)
 * All disappear the moment the visitor submits an enquiry.
 */
export function LeadPersuasionLayer({ productId, avgResponseHours, submitted, onCta }: Props) {
  const slots = useMemo(() => responseSlotsLeft(productId), [productId]);
  const [showSticky, setShowSticky] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [countdown, setCountdown] = useState(endOfDayCountdown());
  const sessionKey = `${SESSION_KEY_PREFIX}${productId}`;


  // Refresh the countdown every minute
  useEffect(() => {
    const t = window.setInterval(() => setCountdown(endOfDayCountdown()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  // Sticky pulse bar on scroll depth (persistent CTA button, not a popup —
  // intentionally not gated).
  useEffect(() => {
    if (submitted) return;
    const onScroll = () => {
      const scrolled = window.scrollY / Math.max(window.innerHeight, 1);
      if (scrolled > 0.5) {
        setShowSticky(true);
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [submitted]);

  // Inactivity nudge (20s, once per product/session). Skipped entirely if
  // exit-intent already fired this session, and always via the sitewide gate.
  useEffect(() => {
    if (submitted) return;
    try {
      if (sessionStorage.getItem(`${sessionKey}_nudge`)) return;
    } catch {}
    return onIdle(() => {
      if (exitIntentFired()) return;
      if (!requestPopup("persuasion-nudge")) return;
      setShowNudge(true);
      try { sessionStorage.setItem(`${sessionKey}_nudge`, "1"); } catch {}
    }, 20_000);
  }, [productId, submitted, sessionKey]);

  useEffect(() => {
    if (!showNudge) releasePopup("persuasion-nudge");
  }, [showNudge]);


  if (submitted) return null;

  return (
    <>
      {/* Time-based social-proof toast removed — one behaviour-driven popup only */}






      {/* Sticky pulse CTA — desktop only (mobile already has its own sticky bar) */}
      {showSticky && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 animate-in slide-in-from-bottom-4 md:block">
          <button
            type="button"
            onClick={onCta}
            className="pointer-events-auto group relative flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-2xl transition hover:scale-[1.02]"
          >
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-accent/40" />
            <Zap className="h-4 w-4" />
            {PERSUASION_COPY.microNudge}
          </button>
        </div>
      )}

      {/* Inactivity nudge — centered card, easy to dismiss */}
      {showNudge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in zoom-in-95 fade-in duration-300">
          <div className="w-full max-w-md">
          <div className="rounded-2xl border bg-card p-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{PERSUASION_COPY.inactivity}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Compare quotes from verified suppliers in one place.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="gradient-accent" onClick={() => { setShowNudge(false); onCta(); }}>
                    Get Best Quote
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowNudge(false)}>Not now</Button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </>
  );
}

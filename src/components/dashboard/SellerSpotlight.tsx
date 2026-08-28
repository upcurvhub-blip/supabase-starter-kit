import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

interface Step {
  selector: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    selector: '[data-tour="metrics"]',
    title: "Your business at a glance",
    text: "Leads, product views and conversion for the last 30 days. Watch this daily — a rising view count with flat leads means your pricing or photos need work.",
  },
  {
    selector: '[data-tour="quick-actions"]',
    title: "Start here every day",
    text: "Add products, respond to leads and update your catalog. Sellers who add 10+ products get roughly 3x more enquiries.",
  },
  {
    selector: '[data-tour="leads"]',
    title: "Respond within an hour",
    text: "Buyers usually pick whoever replies first. Fast responses raise your response score, which pushes you higher in supplier listings.",
  },
  {
    selector: '[data-tour="performance"]',
    title: "Track what's working",
    text: "See which products pull views and enquiries, then double down on those categories.",
  },
];

const KEY = "seller_spotlight_v1";

/** First-login spotlight tour for new sellers. Shows once per account/browser. */
export function SellerSpotlight() {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (localStorage.getItem(KEY)) return;
    const t = setTimeout(() => setActive(true), 900);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!active) return;
    const target = document.querySelector(STEPS[step]?.selector || "");
    if (!target) { setRect(null); return; }
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const update = () => setRect(target.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, step]);

  if (!active) return null;

  const finish = () => {
    localStorage.setItem(KEY, "1");
    setActive(false);
  };

  const current = STEPS[step];
  const pad = 8;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {/* When a target is highlighted the dimming comes from the cutout ring below,
          so the focused area stays perfectly sharp. Only fall back to a full
          overlay when no target element was found. */}
      <div
        className={`absolute inset-0 ${rect ? "bg-transparent" : "bg-foreground/60"}`}
        onClick={finish}
      />

      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-primary shadow-[0_0_0_9999px_hsl(var(--foreground)/0.6)] transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
        />
      )}


      <div className="absolute left-1/2 top-1/2 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-card p-5 shadow-2xl animate-in zoom-in-95 fade-in">
        <button onClick={finish} aria-label="Skip tour" className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Step {step + 1} of {STEPS.length}
        </span>
        <h3 className="mt-2 text-lg font-semibold">{current.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{current.text}</p>
        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-xs text-muted-foreground hover:underline">Skip tour</button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>Back</Button>
            )}
            <Button size="sm" onClick={() => (step === STEPS.length - 1 ? finish() : setStep((s) => s + 1))}>
              {step === STEPS.length - 1 ? "Start selling" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default SellerSpotlight;

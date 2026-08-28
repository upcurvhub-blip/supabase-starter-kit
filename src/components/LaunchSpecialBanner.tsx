import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Rocket, X, Sparkles, Gift, ShieldCheck, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "bt_launch_special_dismissed";

/**
 * "Launch Special — Free Onboarding" promo banner.
 * Shows once per browser after 10s of the visitor being on any public
 * marketplace page. Dismissal is permanent (localStorage).
 */
export function LaunchSpecialBanner() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Only trigger on public/marketplace pages
    const p = location.pathname;
    if (p.startsWith("/admin") || p.startsWith("/seller") || p.startsWith("/auth")) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {}
    const t = window.setTimeout(() => setOpen(true), 10_000);
    return () => window.clearTimeout(t);
  }, [location.pathname]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/50 p-3 backdrop-blur-sm sm:p-6 animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-300 ease-out">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow hover:bg-background hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid md:grid-cols-[1.35fr_1fr]">
          <div className="p-6 sm:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
              <Rocket className="h-3.5 w-3.5" /> Launch Special
            </div>
            <h2 className="text-2xl font-extrabold leading-tight text-foreground sm:text-3xl">
              We're Onboarding Vendors for <span className="text-accent">FREE!</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Join hundreds of businesses growing with us. List your products, get quality inquiries, and grow your business.
            </p>

            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <li className="flex items-start gap-2"><Gift className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Free vendor registration</li>
              <li className="flex items-start gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Free company profile</li>
              <li className="flex items-start gap-2"><Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Unlimited enquiries</li>
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> Verified vendor badge</li>
            </ul>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="gradient-accent w-full sm:w-auto" onClick={dismiss}>
                <Link to="/auth?role=seller">
                  Join as Vendor – It's FREE <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" onClick={dismiss} className="w-full sm:w-auto">
                Explore Platform
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Limited time offer — free onboarding for a limited period only.
            </p>
          </div>

          <div className="relative hidden md:block bg-gradient-to-br from-accent/15 via-primary/10 to-accent/5">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-accent/20 blur-2xl" />
                <div className="rounded-2xl border-2 border-accent bg-card p-6 shadow-xl">
                  <div className="text-xs font-bold uppercase tracking-widest text-accent">Launch Special</div>
                  <div className="mt-1 text-5xl font-black text-foreground">100%</div>
                  <div className="text-lg font-bold text-foreground">FREE</div>
                  <div className="text-xs text-muted-foreground">Onboarding</div>
                </div>
                <div className="mt-3 inline-flex rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  For a Limited Time!
                </div>
              </div>
              <div className="mt-6 rounded-xl border bg-card/70 p-3 text-left text-xs shadow">
                <div className="font-semibold text-foreground">Build Trust. Get Discovered.</div>
                <div className="text-muted-foreground">Founding Vendor badge + priority visibility.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

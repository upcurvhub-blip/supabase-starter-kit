import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, MessageCircle, Phone, FileText } from "lucide-react";

interface Props {
  city?: string;
  category?: string;
  onEnquire: () => void;
  phone?: string;
  whatsapp?: string;
}

/**
 * Sticky lead-squeeze bar shown on directory/landing pages.
 * Appears after 6s, dismissible for the session, mobile-friendly.
 */
export function LeadSqueezeBar({ city, category, onEnquire, phone, whatsapp }: Props) {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("squeeze_dismissed") === "1") {
      setDismissed(true);
      return;
    }
    const t = setTimeout(() => setShow(true), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!show || dismissed) return null;

  const label = category
    ? `Get 3 free quotes for ${category}${city ? ` in ${city}` : ""}`
    : "Get instant quotes from verified suppliers";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/20 bg-background/95 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-primary sm:text-sm">⚡ Live enquiry</div>
          <div className="truncate text-sm font-medium sm:text-base">{label}</div>
          <div className="text-[10px] text-muted-foreground sm:text-xs">
            Response in ~15 min · Free · No spam
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                `Hi, I need quote for ${category || "products"}${city ? ` in ${city}` : ""}`,
              )}`}
              target="_blank"
              rel="noopener"
              className="hidden sm:inline-flex"
            >
              <Button size="sm" variant="outline" className="gap-1">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="hidden sm:inline-flex">
              <Button size="sm" variant="outline" className="gap-1">
                <Phone className="h-4 w-4" /> Call
              </Button>
            </a>
          )}
          <Button size="sm" onClick={onEnquire} className="gap-1">
            <FileText className="h-4 w-4" />
            <span className="hidden xs:inline">Get Quotes</span>
            <span className="xs:hidden">Quote</span>
          </Button>
          <button
            aria-label="Dismiss"
            onClick={() => {
              sessionStorage.setItem("squeeze_dismissed", "1");
              setDismissed(true);
            }}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

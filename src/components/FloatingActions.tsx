import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Search, ChevronUp } from "lucide-react";

const ACTIONS = [
  { to: "/post-requirement", icon: FileText, label: "Post Requirement" },
  { to: "/search", icon: Search, label: "Find Products" },
];

/** Small, calm floating entry point for buyers. */
export function FloatingActions() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const hidden =
    pathname.startsWith("/seller") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/product/");
  if (hidden) return null;

  return (
    <div className="fixed bottom-5 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-2">
      {ACTIONS.map((a, i) => (
        <Link
          key={a.to}
          to={a.to}
          className={`flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium shadow-md transition-all duration-200 ${
            open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
          style={{ transitionDelay: open ? `${i * 50}ms` : "0ms" }}
        >
          <a.icon className="h-4 w-4 text-primary" />
          {a.label}
        </Link>
      ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close buyer actions" : "Open buyer actions"}
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_4px_16px_hsl(var(--accent)/0.35)] transition-transform active:scale-95"
      >
        <ChevronUp className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

export default FloatingActions;

import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Search, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/categories", label: "Categories", icon: LayoutGrid },
  { to: "/search", label: "Search", icon: Search },
  { to: "/post-requirement", label: "Enquire", icon: FileText },
  { to: "/auth", label: "Account", icon: User },
];

/**
 * iOS-style floating tab bar for phones: frosted glass, rounded edges and a
 * little breathing room below (respecting the home-indicator safe area).
 */
export function MobileBottomBar() {
  const { pathname } = useLocation();

  const hidden =
    pathname.startsWith("/seller/") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auth");
  if (hidden) return null;

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-3 z-50"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-stretch justify-between gap-1 rounded-[1.75rem] border border-border/60 bg-card/70 px-2 py-1.5 shadow-[0_8px_30px_hsl(var(--foreground)/0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/60">
        {ITEMS.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-3xl px-1 py-1.5 text-[10px] font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "scale-105")} />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomBar;

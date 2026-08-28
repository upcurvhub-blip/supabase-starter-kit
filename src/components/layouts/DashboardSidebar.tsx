import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  FileText,
  BarChart3,
  CreditCard,
  Settings,
  Building2,
  Tag,
  MessageSquare,
  Shield,
  Briefcase,
  Clock,
  Target,
  TrendingUp,
  DollarSign,
  Sparkles,
  Wrench,
  Megaphone,
  Search as SearchIcon,
  MapPin,
} from "lucide-react";

interface SidebarLink {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface DashboardSidebarProps {
  role: "seller" | "admin" | "sales_agent";
}

const sellerLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
  { label: "My Products", href: "/seller/products", icon: Package },
  { label: "My Services", href: "/seller/services", icon: Wrench },
  { label: "Lead Inbox", href: "/seller/leads", icon: MessageSquare },
  { label: "Matched Leads", href: "/seller/matched-leads", icon: Target },
  { label: "Deal Pipeline", href: "/seller/deals", icon: Target },
  { label: "Analytics", href: "/seller/analytics", icon: BarChart3 },
  { label: "Availability", href: "/seller/availability", icon: Clock },
  { label: "Edit Profile", href: "/seller/profile", icon: Building2 },
  { label: "Subscription", href: "/seller/subscription", icon: CreditCard },
];

const adminLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Today's Analysis", href: "/admin/today", icon: Clock },
  { label: "Daily Operations", href: "/admin/daily-ops", icon: Clock },
  { label: "Manage Sellers", href: "/admin/sellers", icon: Briefcase },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Requirements", href: "/admin/requirements", icon: FileText },
  { label: "Lead Pricing", href: "/admin/pricing", icon: DollarSign },
  { label: "All Leads", href: "/admin/leads", icon: MessageSquare },
  { label: "Auto Leads", href: "/admin/auto-leads", icon: Sparkles },
  { label: "Business Leads", href: "/admin/business-leads", icon: Briefcase },
  { label: "Local Pages", href: "/admin/local-pages", icon: MapPin },
  { label: "SEO Console", href: "/admin/seo", icon: SearchIcon },
  { label: "SEO Playbook", href: "/admin/seo-guide", icon: SearchIcon },
  { label: "Ads Manager", href: "/admin/ads", icon: Megaphone },
  { label: "Analytics", href: "/admin/analytics", icon: TrendingUp },
  { label: "Subscription Plans", href: "/admin/plans", icon: CreditCard },
  { label: "Platform Settings", href: "/admin/settings", icon: Settings },
];


export function DashboardSidebar({ role }: DashboardSidebarProps) {
  const location = useLocation();
  const links = role === "admin" || role === "sales_agent" ? adminLinks : sellerLinks;

  const roleLabels = {
    seller: "Seller",
    admin: "Admin",
    sales_agent: "Sales Agent",
  } as const;

  // Dark navy palette for seller portal (matches the reference dashboard look)
  const isDark = role === "seller";

  return (
    <aside
      className={cn(
        "w-64 min-h-[calc(100vh-4rem)] hidden lg:block border-r",
        isDark
          ? "bg-[#0f1f3d] text-slate-100 border-[#0b1730]"
          : "bg-card"
      )}
    >
      <div className={cn("p-4 border-b", isDark ? "border-white/10" : "")}>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center",
              isDark ? "bg-accent text-accent-foreground" : "bg-accent text-accent-foreground"
            )}
          >
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className={cn("font-semibold", isDark ? "text-white" : "")}>{roleLabels[role]} Portal</p>
            <p className={cn("text-xs", isDark ? "text-slate-400" : "text-muted-foreground")}>Manage your account</p>
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? isDark
                    ? "bg-white text-[#0f1f3d] shadow"
                    : "bg-accent text-accent-foreground"
                  : isDark
                    ? "text-slate-300 hover:text-white hover:bg-white/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-sm transition-colors",
            isDark ? "text-slate-400 hover:text-white" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4" />
          Back to Marketplace
        </Link>
      </div>
    </aside>
  );
}

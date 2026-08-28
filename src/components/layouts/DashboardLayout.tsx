import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Building2, Menu, X, LogOut, User as UserIcon, LayoutDashboard, Package, FileText, Heart, BarChart3, CreditCard, Users, Settings, Tag, MessageSquare, Shield, Briefcase, UserCog, Sparkles, MapPin, CalendarDays, DollarSign, ClipboardList } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import TopbarTools from "@/components/dashboard/TopbarTools";

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: "seller" | "admin" | "sales_agent";
  title?: string;
}


interface SidebarLink {
  label: string;
  href: string;
  icon: React.ElementType;
}

const sellerLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/seller", icon: LayoutDashboard },
  { label: "My Products", href: "/seller/products", icon: Package },
  { label: "My Services", href: "/seller/services", icon: Settings },
  { label: "Lead Inbox", href: "/seller/leads", icon: MessageSquare },
  { label: "Matched Leads", href: "/seller/matched-leads", icon: Sparkles },
  { label: "Deal Pipeline", href: "/seller/deals", icon: Briefcase },
  { label: "Analytics", href: "/seller/analytics", icon: BarChart3 },
  { label: "Availability", href: "/seller/availability", icon: UserCog },
  { label: "Subscription", href: "/seller/subscription", icon: CreditCard },
  { label: "Edit Profile", href: "/seller/profile", icon: UserCog },
];


const adminLinks: SidebarLink[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Today Analysis", href: "/admin/today", icon: CalendarDays },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Manage Sellers", href: "/admin/sellers", icon: Briefcase },
  { label: "Categories", href: "/admin/categories", icon: Tag },
  { label: "Local Landing Pages", href: "/admin/local-pages", icon: MapPin },
  { label: "Ads Manager", href: "/admin/ads", icon: Sparkles },
  { label: "Subscription Plans", href: "/admin/plans", icon: CreditCard },
  { label: "Lead Pricing", href: "/admin/pricing", icon: DollarSign },
  { label: "All Leads", href: "/admin/leads", icon: MessageSquare },
  { label: "Auto Leads", href: "/admin/auto-leads", icon: Sparkles },
  { label: "Requirements", href: "/admin/requirements", icon: ClipboardList },
  { label: "SEO Console", href: "/admin/seo", icon: Sparkles },
  { label: "Platform Settings", href: "/admin/settings", icon: Settings },
];

let profileCache: any = null;

export function DashboardLayout({ children, role, title }: DashboardLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  // Cached so navigating between dashboard pages doesn't blank the header.
  const [profile, setProfile] = useState<any>(() => profileCache);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  // Memoize links to prevent re-renders
  const links = useMemo(() => {
    return role === "admin" || role === "sales_agent" ? adminLinks : sellerLinks;
  }, [role]);

  const roleLabels = {
    seller: "Seller",
    admin: "Admin",
    sales_agent: "Sales Agent",
  } as const;


  useEffect(() => {
    // Get initial session without navigation
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    profileCache = data;
    setProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
    toast({ title: "Signed out successfully" });
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      {/* Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b bg-card flex items-center px-4 shrink-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-accent" />
              <span className="font-bold hidden sm:block">Upcurv Trade</span>
            </Link>
          </div>

          <TopbarTools guideHref={role === "seller" ? "/seller/guide" : "/admin/seo-guide"} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{profile?.full_name || "Account"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile?.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar - Fixed position, stays in place on horizontal & vertical scroll */}
        <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-card fixed left-0 top-16 bottom-0 z-40 overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                <Shield className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-semibold">{roleLabels[role]} Portal</p>
                <p className="text-xs text-muted-foreground">Manage your account</p>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-1 flex-1">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t mt-auto">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Back to Marketplace
            </Link>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="absolute left-0 top-16 bottom-0 w-64 bg-card border-r overflow-y-auto">
              <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
                    <Shield className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{roleLabels[role]} Portal</p>
                    <p className="text-xs text-muted-foreground">Manage your account</p>
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
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t">
                <Link
                  to="/"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  Back to Marketplace
                </Link>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content - offset by fixed sidebar on desktop */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 lg:ml-64 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default DashboardLayout;

import { useState, useEffect } from "react";
import { APP_VERSION } from "@/lib/version";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  Search,
  Menu,
  X,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Package,
  FileText,
  LayoutDashboard,
  Settings,
  Building2,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { SearchSuggest } from "@/components/SearchSuggest";
import { IntentSwitcher } from "@/components/intent/IntentSwitcher";

interface MarketplaceLayoutProps {
  children: React.ReactNode;
  showSearch?: boolean;
  hideMobileCta?: boolean;
}

export function MarketplaceLayout({ children, showSearch = true, hideMobileCta = false }: MarketplaceLayoutProps) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile(data);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    toast({ title: "Signed out successfully" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const getDashboardLink = () => {
    if (!profile) return "/seller";
    switch (profile.role) {
      case "admin":
      case "super_admin":
      case "sales_agent":
        return "/admin";
      default:
        return "/seller";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <Building2 className="h-8 w-8 text-accent" />
              <span className="text-xl font-bold hidden sm:block">Upcurv Trade</span>
            </Link>

            {/* Search Bar */}
            {showSearch && (
              <div className="flex-1 max-w-xl hidden md:block">
                <SearchSuggest placeholder="Search products, suppliers, services…" />
              </div>
            )}

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              <Link to="/categories" className="text-sm font-medium hover:text-accent transition-colors">Categories</Link>
              <Link to="/search" className="text-sm font-medium hover:text-accent transition-colors">Products</Link>
              <Link to="/categories?type=service" className="text-sm font-medium hover:text-accent transition-colors">Services</Link>
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <IntentSwitcher className="hidden sm:flex" />
              <Button variant="ghost" size="sm" asChild className="hidden lg:flex">
                <Link to="/seller/onboarding">Sell on Upcurv</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link to="/post-requirement">Post Requirement</Link>
              </Button>
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <UserIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">{profile?.full_name || "Account"}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{profile?.role || "seller"}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={getDashboardLink()} className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {profile?.role === "seller" && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/seller/products" className="flex items-center gap-2">
                            <Package className="h-4 w-4" /> My Products
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/seller/leads" className="flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Lead Inbox
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {(profile?.role === "admin" || profile?.role === "super_admin") && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/settings" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" /> Platform Settings
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" /> Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Intent switcher (mobile: left of hamburger) */}
              <IntentSwitcher className="sm:hidden" />

              {/* Mobile menu button */}
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>

            </div>
          </div>

          {/* Mobile Search */}
          {showSearch && (
            <div className="md:hidden pb-3">
              <SearchSuggest placeholder="Search products…" />
            </div>
          )}
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t bg-card">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
              <Link to="/categories" className="px-4 py-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Categories</Link>
              <Link to="/search" className="px-4 py-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Products</Link>
              <Link to="/categories?type=service" className="px-4 py-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Services</Link>
              <Link to="/seller/onboarding" className="px-4 py-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Sell on Upcurv</Link>
              <Link to="/post-requirement" className="px-4 py-2 rounded-md bg-accent text-accent-foreground font-medium" onClick={() => setMobileMenuOpen(false)}>Post Requirement</Link>

              <div className="mt-2 pt-2 border-t">
                <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Business Hub</p>
                {[
                  { to: "/cities", label: "Suppliers by City" },
                  { to: "/trade-leads", label: "Trade Leads" },
                  { to: "/guides", label: "Buying Guides" },
                  { to: "/distributors", label: "Find Distributors" },
                  { to: "/pricing", label: "Membership Plans" },
                  { to: "/trade-shows", label: "Trade Shows & Exhibitions" },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="block px-4 py-2 rounded-md text-sm hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                    {l.label}
                  </Link>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t">
                <Link to="/about" className="block px-4 py-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>About</Link>
                <Link to="/contact" className="block px-4 py-2 rounded-md hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
              </div>

            </nav>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-card mt-12">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6 text-accent" />
                <span className="font-bold">Upcurv Trade</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">India's trusted B2B marketplace. A unit of Upcurv Innovations Pvt Ltd.</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 shrink-0" /><a href="tel:+916380715292" className="hover:text-foreground">+91 6380715292</a></li>
                <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 shrink-0" /><a href="mailto:upcurvinnovations@gmail.com" className="hover:text-foreground break-all">upcurvinnovations@gmail.com</a></li>
                <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /><span>Coimbatore, Tamil Nadu</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Buyers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/find-businesses" className="hover:text-foreground">Find Businesses</Link></li>
                <li><Link to="/search" className="hover:text-foreground">Find Products</Link></li>
                <li><Link to="/categories" className="hover:text-foreground">Browse Categories</Link></li>
                <li><Link to="/post-requirement" className="hover:text-foreground">Post Requirement</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Sellers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-foreground">Seller Login</Link></li>
                <li><Link to="/auth" className="hover:text-foreground">Sell on Upcurv Trade</Link></li>
                <li><Link to="/seller/subscription" className="hover:text-foreground">Pricing Plans</Link></li>
                <li><Link to="/seller/onboarding" className="hover:text-foreground">Seller Onboarding</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company & Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground">About Us</Link></li>
                <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
                <li><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
                <li><Link to="/terms-of-service" className="hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link></li>
                <li><a href="https://wjtxyoaqtxsfbtrzsimb.supabase.co/functions/v1/rss-products" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">RSS Feed</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Upcurv Trade — a unit of Upcurv Innovations Pvt Ltd. All rights reserved.</p>
            <p className="mt-1 text-xs">Version {APP_VERSION}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

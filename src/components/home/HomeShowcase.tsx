// Modern marketplace home modules: top-category link cloud, popular products cloud,
// sellers-by-city tiles, value-add cards and buyer/seller promo cards.
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShoppingBag, Store, CalendarDays, FileText, Globe, BadgeIndianRupee, Users2, MapPin } from "lucide-react";

const CITY_GRADIENTS = [
  "from-primary/80 to-primary",
  "from-accent/80 to-accent",
  "from-trust/80 to-trust",
  "from-primary/70 to-accent",
  "from-accent/70 to-primary",
  "from-trust/70 to-primary",
];

export function TopCategoriesCloud({ categories }: { categories: any[] }) {
  const items = categories.filter((c) => c.is_active !== false).slice(0, 48);
  if (!items.length) return null;
  return (
    <section className="py-10 bg-muted/40">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Top Categories</h2>
        <div className="rounded-xl bg-background border p-4 md:p-5">
          <div className="flex flex-wrap gap-x-2 gap-y-2">
            {items.map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.slug}`}
                className="text-[13px] md:text-sm text-muted-foreground hover:text-primary rounded-md px-2.5 py-1.5 hover:bg-primary/5 transition-colors"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PopularProductsCloud({ products }: { products: any[] }) {
  const items = products.slice(0, 42);
  if (!items.length) return null;
  return (
    <section className="py-10 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Popular Products</h2>
        <div className="rounded-xl bg-muted/40 border p-4 md:p-5">
          <div className="flex flex-wrap gap-x-2 gap-y-2">
            {items.map((p) => (
              <Link
                key={p.id}
                to={`/product/${p.slug || p.id}`}
                className="text-[13px] md:text-sm text-muted-foreground hover:text-primary rounded-md px-2.5 py-1.5 hover:bg-primary/5 transition-colors"
              >
                {p.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SellersByCities({ cities, images = {} }: { cities: { city: string; count: number }[]; images?: Record<string, string> }) {
  if (!cities.length) return null;
  return (
    <section className="py-10 bg-muted/40">
      <div className="container mx-auto px-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-bold">Sellers by Cities</h2>
              <Link to="/find-businesses" className="text-sm font-medium text-accent hover:underline">View All</Link>
            </div>
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {cities.map((c, i) => (
                <Link
                  key={c.city}
                  to={`/city/${encodeURIComponent(c.city.toLowerCase())}`}
                  className="group relative shrink-0 snap-start w-36 h-36 md:w-44 md:h-44 rounded-xl overflow-hidden border"
                >
                  {images[c.city] ? (
                    <img src={images[c.city]} alt={`Suppliers in ${c.city}`} loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <>
                      <div className={`absolute inset-0 bg-gradient-to-br ${CITY_GRADIENTS[i % CITY_GRADIENTS.length]} group-hover:scale-105 transition-transform duration-300`} />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
                    </>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                    <div className="text-primary-foreground font-semibold text-sm md:text-base leading-tight">{c.city}</div>
                    <div className="text-primary-foreground/80 text-[11px] flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {c.count} seller{c.count > 1 ? "s" : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>

          </CardContent>
        </Card>
      </div>
    </section>
  );
}

const VALUE_ADDS = [
  { kicker: "Explore Cities", title: "Suppliers by City", to: "/cities", icon: MapPin },
  { kicker: "Upcurv Trade", title: "Trade Shows & Exhibitions", to: "/trade-shows", icon: CalendarDays },
  { kicker: "Upcurv Trade", title: "Buy Trade Leads", to: "/trade-leads", icon: Users2 },
  { kicker: "Upcurv Trade", title: "Buying Guides", to: "/guides", icon: FileText },
  { kicker: "Upcurv Trade", title: "Membership Plans", to: "/pricing", icon: BadgeIndianRupee },
  { kicker: "Find Distributors", title: "For Your Business", to: "/distributors", icon: Globe },
];

export function ValueAdds() {
  return (
    <section className="py-10 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-4">More Value Adds</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {VALUE_ADDS.map((v) => (
            <Link key={v.title} to={v.to} className="group">
              <Card className="h-full relative overflow-hidden hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <v.icon className="absolute -right-3 -bottom-3 h-20 w-20 text-muted/50" />
                  <p className="text-xs text-muted-foreground">{v.kicker}</p>
                  <p className="text-sm font-semibold mb-6">{v.title}</p>
                  <span className="text-sm text-accent font-medium inline-flex items-center gap-1.5">
                    Learn more
                    <span className="h-5 w-5 rounded-full bg-accent text-accent-foreground inline-flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PromoCards({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-premium/30 to-accent/30">
        <CardContent className="p-5">
          <ShoppingBag className="absolute right-3 top-3 h-16 w-16 text-background/50" />
          <p className="text-xl leading-tight mb-4">
            Looking<br />for a <span className="font-bold">Product</span>
          </p>
          <Button variant="outline" className="w-full bg-background/80" asChild>
            <Link to="/post-requirement">Post Buy <span className="font-bold ml-1">Requirement</span></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-destructive/80 to-destructive">
        <CardContent className="p-5">
          <Store className="absolute right-3 top-3 h-16 w-16 text-primary-foreground/20" />
          <p className="text-xl leading-tight mb-4 text-primary-foreground">
            Want to grow your<br /><span className="font-bold">business 10x faster</span>
          </p>
          <Button variant="secondary" className="w-full" asChild>
            <Link to="/auth?mode=seller" className="gap-2">
              Sell on <span className="font-bold">Upcurv Trade</span> <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { AiDiscoveryBar } from "@/components/AiDiscoveryBar";
import { ProductBadgeStack } from "@/components/ProductBadgeStack";
import { ProductCardPrice } from "@/components/product/ProductCardPrice";
import { LookingForStepper } from "@/components/LookingForStepper";
import { TopCategoriesCloud, PopularProductsCloud, SellersByCities, ValueAdds, PromoCards } from "@/components/home/HomeShowcase";
import { ServicesExplore } from "@/components/home/ServicesExplore";
import { SearchSuggest } from "@/components/SearchSuggest";

import { AdSlot } from "@/components/AdSlot";
import { UrgencyBadgeStack } from "@/lib/urgencyBadges";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Helmet } from "react-helmet-async";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  Package,
  Star,
  CheckCircle2,
  Phone,
  MessageSquare,
  Zap,
  Award,
  Globe,
  IndianRupee,
  Building2,
  Factory,
  Truck,
  HeartHandshake,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [sellerCities, setSellerCities] = useState<{ city: string; count: number }[]>([]);
  const [topSellers, setTopSellers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [cityImages, setCityImages] = useState<Record<string, string>>({});
  const [categoryDemand, setCategoryDemand] = useState<Record<string, number>>({});


  useEffect(() => {
    fetchData();
  }, []);

  /**
   * Trending top-level categories: ranked by real demand (listings, views and
   * enquiries rolled up from the category and all of its subcategories).
   * Falls back to display order when there is no activity yet.
   */
  const trendingCategories = useMemo(() => {
    const roots = categories.filter((c) => c.level === 1);
    const rootOf = new Map<string, string>();
    const resolve = (id: string, depth = 0): string | null => {
      if (depth > 6) return null;
      const cat = categories.find((c) => c.id === id);
      if (!cat) return null;
      if (!cat.parent_id) return cat.id;
      return resolve(cat.parent_id, depth + 1);
    };
    categories.forEach((c) => {
      const root = resolve(c.id);
      if (root) rootOf.set(c.id, root);
    });

    const score: Record<string, number> = {};
    Object.entries(categoryDemand).forEach(([catId, value]) => {
      const root = rootOf.get(catId);
      if (root) score[root] = (score[root] || 0) + value;
    });

    return [...roots].sort(
      (a, b) =>
        (score[b.id] || 0) - (score[a.id] || 0) ||
        (a.display_order ?? 999) - (b.display_order ?? 999),
    );
  }, [categories, categoryDemand]);

  const fetchData = async () => {
    // Fetch all active categories (parents + subs)
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order");
    setCategories(cats || []);

    // Demand signal per category (listings + views) to surface trending ones
    const { data: demandRows } = await supabase
      .from("products")
      .select("category_id, view_count, enquiry_count")
      .eq("is_active", true)
      .limit(1000);
    const demand: Record<string, number> = {};
    for (const row of demandRows || []) {
      if (!row.category_id) continue;
      demand[row.category_id] =
        (demand[row.category_id] || 0) + 5 + (row.view_count || 0) + (row.enquiry_count || 0) * 10;
    }
    setCategoryDemand(demand);

    // Fetch featured products
    const { data: products } = await supabase
      .from("products")
      .select(`
        *,
        seller_profiles(id, business_name, city, verification_status, logo_url, slug)
      `)
      .eq("is_active", true)
      .eq("is_featured", true)
      .limit(8);
    setFeaturedProducts(products || []);

    // Fetch recently listed products
    const { data: recent } = await supabase
      .from("products")
      .select(`
        *,
        seller_profiles(id, business_name, city, verification_status, logo_url, slug)
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(4);
    setRecentProducts(recent || []);

    // Popular products (link cloud for SEO + discovery)
    const { data: popular } = await supabase
      .from("products")
      .select("id, name, slug, view_count")
      .eq("is_active", true)
      .order("view_count", { ascending: false })
      .limit(42);
    setPopularProducts(popular || []);

    // Sellers grouped by city
    const { data: citySellers } = await supabase
      .from("seller_profiles")
      .select("city")
      .eq("status", "approved")
      .not("city", "is", null)
      .limit(1000);
    const cityMap = new Map<string, number>();
    (citySellers || []).forEach((s: any) => {
      const key = String(s.city).trim();
      if (!key) return;
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      cityMap.set(label, (cityMap.get(label) || 0) + 1);
    });
    setSellerCities(
      Array.from(cityMap.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 14)
    );


    // Fetch top sellers
    const { data: sellers } = await supabase
      .from("seller_profiles")
      .select("*")
      .eq("status", "approved")
      .order("trust_score", { ascending: false })
      .limit(6);
    setTopSellers(sellers || []);

    const { data: cityImgSetting } = await supabase
      .from("platform_settings").select("value").eq("key", "city_images").maybeSingle();
    setCityImages(((cityImgSetting?.value as any) || {}) as Record<string, string>);
  };


  const popularSearches = [
    "Industrial Machinery",
    "Textile Products",
    "Electronics",
    "Chemicals",
    "Construction Materials",
    "Food Products",
    "Packaging",
    "Auto Parts",
  ];

  const categoryIcons: Record<string, React.ReactNode> = {
    default: <Package className="h-8 w-8" />,
  };

  return (

    <>
  <Helmet>

    <title>
      Upcurv Trade | India's Trusted B2B Marketplace for Manufacturers & Suppliers
    </title>

    <meta
      name="description"
      content="Connect with verified manufacturers, suppliers, wholesalers and exporters across India. Discover products, post RFQs, receive competitive quotes and grow your business with Upcurv Trade."
    />

    <meta
      name="keywords"
      content="B2B Marketplace India, Manufacturers, Suppliers, Wholesalers, Exporters, Industrial Products, RFQ, Upcurv Trade"
    />

    <link
      rel="canonical"
      href="https://upcurvtrade.upcurv.in/"
    />

    <meta
      property="og:title"
      content="Upcurv Trade | India's Trusted B2B Marketplace"
    />

    <meta
      property="og:description"
      content="Connect with verified manufacturers and suppliers across India."
    />

    <meta
      property="og:url"
      content="https://upcurvtrade.upcurv.in/"
    />

    <meta
      property="og:image"
      content="https://upcurvtrade.upcurv.in/og-image.png"
    />

    <meta
      name="twitter:card"
      content="summary_large_image"
    />

    <meta
      name="twitter:title"
      content="Upcurv Trade | India's Trusted B2B Marketplace"
    />

    <meta
      name="twitter:description"
      content="India's Trusted B2B Marketplace connecting buyers and suppliers."
    />

    <meta
      name="twitter:image"
      content="https://upcurvtrade.upcurv.in/og-image.png"
    />

  </Helmet>


    <MarketplaceLayout showSearch={false}>
      {/* Hero — trade portal style: category rail + mega search + promos */}
      <section className="bg-muted/40 border-b">
        <div className="container mx-auto px-4 py-3 md:py-8">
          <div className="grid lg:grid-cols-[240px_1fr_280px] gap-4 md:gap-5">
            {/* Category rail */}
            <aside className="hidden lg:block">
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="px-4 py-3 border-b bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" /> Trending Categories
                </div>
                <ul className="max-h-[420px] overflow-y-auto">
                  {trendingCategories.slice(0, 14).map((c) => (
                    <li key={c.id}>
                      <Link to={`/category/${c.slug}`} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-primary/5 hover:text-primary transition-colors">
                        <span className="truncate">{c.name}</span>
                        <ChevronRight className="h-3.5 w-3.5 opacity-50" />
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/categories" className="block px-4 py-2.5 text-sm font-medium text-accent hover:underline">View all categories</Link>
                  </li>
                </ul>
              </div>
            </aside>

            {/* Center: search + trust bar */}
            <div className="rounded-xl gradient-hero text-primary-foreground p-4 md:p-8 relative isolate">
              <div className="absolute -top-16 -right-10 w-64 h-64 bg-accent/20 rounded-full blur-3xl -z-10" />

              <div className="relative z-10">
                <Badge className="hidden sm:inline-flex mb-3 bg-accent text-accent-foreground text-xs font-semibold">
                  Trusted by growing businesses across India
                </Badge>
                <h1 className="text-xl md:text-4xl font-bold leading-tight mb-2">
                  Discover. Shop. <span className="text-gradient">Source.</span>
                  <br className="hidden md:block" /> All in One Place.
                </h1>
                <p className="hidden sm:block text-sm md:text-base opacity-90 mb-5 max-w-2xl">
                  Find products, services, brands and trusted sellers across India — whether you're shopping for
                  yourself or sourcing for your business.
                </p>

                <div className="bg-card rounded-xl p-2 flex flex-col sm:flex-row gap-2 shadow-xl">
                  <div className="flex-1">
                    <SearchSuggest
                      placeholder="What are you looking for? e.g. brick, TMT bar, AC service"
                      inputClassName="h-11"
                    />
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const city = (e.currentTarget.elements.namedItem("city") as HTMLInputElement)?.value?.trim();
                      if (city) window.location.href = `/cities`;
                    }}
                    className="flex gap-2 sm:w-64"
                  >
                    <div className="relative flex-1">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        name="city"
                        placeholder="City"
                        className="w-full h-11 pl-9 pr-3 rounded-lg bg-background text-foreground text-sm outline-none border focus:border-primary"
                      />
                    </div>
                    <Button type="submit" className="h-11 gradient-accent px-4">Go</Button>
                  </form>
                </div>

                <div className="hidden sm:flex flex-wrap items-center gap-2 mt-4">
                  <span className="text-xs opacity-70">Popular:</span>
                  {popularSearches.slice(0, 5).map((term) => (
                    <Link
                      key={term}
                      to={`/search?q=${encodeURIComponent(term)}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
                    >
                      {term}
                    </Link>
                  ))}
                </div>

                {/* Mobile: single compact trust strip */}
                <div className="md:hidden mt-3 flex items-center gap-2 overflow-x-auto rounded-lg bg-primary-foreground/10 px-3 py-2 text-xs whitespace-nowrap">
                  <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Verified Sellers</span>
                  <span className="opacity-40">·</span>
                  <span className="flex items-center gap-1"><Truck className="h-3.5 w-3.5" /> Pan-India</span>
                  <span className="opacity-40">·</span>
                  <span className="flex items-center gap-1"><HeartHandshake className="h-3.5 w-3.5" /> Direct Contact</span>
                </div>

                <div className="hidden md:grid grid-cols-4 gap-2 mt-5 text-xs">
                  {[
                    { icon: Shield, label: "Verified Suppliers" },
                    { icon: IndianRupee, label: "Best Price Quotes" },
                    { icon: Truck, label: "Pan India Delivery" },
                    { icon: HeartHandshake, label: "Secure Enquiries" },
                  ].map((t) => (
                    <div key={t.label} className="flex items-center gap-1.5 rounded-lg bg-primary-foreground/10 px-2.5 py-2">
                      <t.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t.label}</span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Right promos — desktop only */}
            <div className="hidden lg:block">
              <PromoCards />
            </div>
          </div>
        </div>
      </section>

      {/* Value adds — desktop only */}
      <div className="hidden md:block">
        <ValueAdds />
      </div>


      {/* Step-by-step "What are you looking for" — desktop only */}
      <section className="hidden md:block py-10 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <LookingForStepper />
        </div>
      </section>

      <div className="container mx-auto px-4 py-4"><AdSlot placement="home_top" /></div>


      {/* Categories Section — compact square tiles */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-1">Trending Categories</h2>
              <p className="text-sm text-muted-foreground">Most viewed and most enquired categories right now</p>
            </div>
            <Button variant="outline" asChild className="hidden md:flex">
              <Link to="/categories" className="gap-2">View All <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
            {trendingCategories.slice(0, 16).map((cat) => (
                <Link key={cat.id} to={`/category/${cat.slug}`} className="group text-center">
                  <div className="aspect-square rounded-xl overflow-hidden border-2 bg-card group-hover:border-primary/40 group-hover:shadow-md transition-all flex items-center justify-center">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <Package className="h-8 w-8 md:h-10 md:w-10 text-primary/60" />
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-medium mt-2 line-clamp-2 group-hover:text-primary">{cat.name}</p>
                </Link>
              ))}
          </div>

          <div className="text-center mt-8 md:hidden">
            <Button variant="outline" asChild>
              <Link to="/categories" className="gap-2">View All Categories <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recently Listed Products */}
      {recentProducts.length > 0 && (
        <section className="py-16 bg-background border-b">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-2">Recently Listed Products</h2>
                <p className="text-muted-foreground">Fresh listings from verified suppliers</p>
              </div>
              <Button variant="outline" asChild className="hidden md:flex">
                <Link to="/search" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {recentProducts.map((product) => (
                <Card key={product.id} className="card-hover overflow-hidden border-2 hover:border-primary/20 relative">
                  <Link to={`/product/${product.slug || product.id}`}>
                    <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden relative">
                      {product.images && (product.images as string[])[0] ? (
                        <img
                          src={(product.images as string[])[0]}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="absolute top-2 left-2">
                        <UrgencyBadgeStack product={product} count={1} size="xs" />
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-3 md:p-4 space-y-1.5">
                    <Link
                      to={`/product/${product.slug || product.id}`}
                      className="text-sm md:text-base font-semibold hover:text-primary transition-colors line-clamp-2 block"
                    >
                      {product.name}
                    </Link>
                    <div className="hidden md:block">
                      <ProductBadgeStack product={product} seller={product.seller_profiles} max={3} />
                    </div>
                    <ProductCardPrice product={product} size="sm" />
                    {product.seller_profiles && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1 border-t">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {product.seller_profiles.business_name}
                          {product.seller_profiles.city ? ` · ${product.seller_profiles.city}` : ""}
                        </span>
                      </div>
                    )}
                  </CardContent>

                </Card>
              ))}
            </div>
          </div>
        </section>
      )}


      {/* Sellers by cities */}
      <SellersByCities cities={sellerCities} images={cityImages} />

      <div className="container mx-auto px-4 py-4"><AdSlot placement="home_middle" /></div>

      {/* Services exploration */}
      <ServicesExplore />

      {/* Top categories link cloud */}
      <TopCategoriesCloud categories={categories} />

      {/* Popular products link cloud */}
      <PopularProductsCloud products={popularProducts} />



      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <Badge variant="secondary" className="bg-accent/10 text-accent">Featured</Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
              </div>
              <Button variant="outline" asChild className="hidden md:flex">
                <Link to="/search?featured=true" className="gap-2">
                  View All <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {featuredProducts.map((product) => (
                <Card key={product.id} className="card-hover h-full group overflow-hidden">
                  <Link to={`/product/${product.slug || product.id}`} className="block">
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      {product.images && (product.images as any[]).length > 0 ? (
                        <img
                          src={(product.images as any[])[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2">
                        <UrgencyBadgeStack product={product} count={1} size="xs" />
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-4">
                    <Link to={`/product/${product.slug || product.id}`} className="block">
                      <h3 className="font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                    </Link>
                    {product.seller_profiles?.city && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.seller_profiles.city}</span>
                      </div>
                    )}
                      <div className="mb-2">
                        <ProductCardPrice product={product} />
                      </div>
                      {product.seller_profiles && (
                        <Link
                          to={`/seller-profile/${product.seller_profiles.slug || product.seller_profiles.id}`}
                          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
                        >
                          {product.seller_profiles.verification_status === "verified" && (
                            <CheckCircle2 className="h-3 w-3 text-trust" />
                          )}
                          <span className="truncate">{product.seller_profiles.business_name}</span>
                          {product.seller_profiles.city && <span>• {product.seller_profiles.city}</span>}
                        </Link>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Top Sellers */}
      {topSellers.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-5 w-5 text-premium" />
                  <Badge variant="secondary" className="bg-premium/10 text-premium">Top Rated</Badge>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold">Top Verified Sellers</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {topSellers.map((seller) => (
                <Link key={seller.id} to={`/seller-profile/${seller.slug || seller.id}`}>
                  <Card className="card-hover h-full group">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {seller.logo_url ? (
                            <img src={seller.logo_url} alt={seller.business_name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <Building2 className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {seller.business_name}
                            </h3>
                            {seller.verification_status === "verified" && (
                              <CheckCircle2 className="h-4 w-4 text-trust shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {seller.city}, {seller.state}
                          </p>
                          {seller.business_type && (
                            <Badge variant="outline" className="text-xs">
                              {seller.business_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-premium text-premium" />
                          <span className="text-sm font-medium">{seller.trust_score || 0}% Trust Score</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {seller.response_rate || 0}% Response Rate
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">How Upcurv Trade Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're shopping for yourself or sourcing for your business
            </p>
          </div>

          <Tabs defaultValue="shop" className="max-w-4xl mx-auto">
            <TabsList className="mx-auto mb-8 flex w-full max-w-md">
              <TabsTrigger value="shop" className="flex-1">Shop</TabsTrigger>
              <TabsTrigger value="business" className="flex-1">Business</TabsTrigger>
              <TabsTrigger value="services" className="flex-1">Services</TabsTrigger>
            </TabsList>

            {[
              {
                value: "shop",
                steps: [
                  { title: "Discover", description: "Find products and sellers.", icon: Search, color: "bg-primary text-primary-foreground" },
                  { title: "Compare", description: "Check prices, reviews and seller details.", icon: Users, color: "bg-accent text-accent-foreground" },
                  { title: "Buy", description: "Order directly from the seller.", icon: TrendingUp, color: "bg-trust text-trust-foreground" },
                ],
              },
              {
                value: "business",
                steps: [
                  { title: "Post Requirement", description: "Tell us what you need.", icon: MessageSquare, color: "bg-primary text-primary-foreground" },
                  { title: "Get Quotes", description: "Receive offers from relevant suppliers.", icon: IndianRupee, color: "bg-accent text-accent-foreground" },
                  { title: "Choose & Connect", description: "Compare and close the deal.", icon: HeartHandshake, color: "bg-trust text-trust-foreground" },
                ],
              },
              {
                value: "services",
                steps: [
                  { title: "Search a Service", description: "Browse service providers near you.", icon: Search, color: "bg-primary text-primary-foreground" },
                  { title: "Check Availability", description: "See ratings, coverage and response times.", icon: Star, color: "bg-accent text-accent-foreground" },
                  { title: "Book or Enquire", description: "Connect directly with the provider.", icon: Phone, color: "bg-trust text-trust-foreground" },
                ],
              },
            ].map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <div className="grid md:grid-cols-3 gap-8">
                  {tab.steps.map((item, i) => (
                    <div key={item.title} className="text-center relative">
                      <div className={`w-16 h-16 ${item.color} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg`}>
                        <item.icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{i + 1}. {item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.description}</p>
                      {i < 2 && (
                        <ChevronRight className="hidden md:block absolute top-8 -right-4 h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Why Choose Upcurv Trade?</h2>
            <p className="text-muted-foreground">Built for shoppers and businesses alike</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Verified Sellers",
                description: "Buy and source from businesses with verified profiles.",
                color: "text-trust",
                bgColor: "bg-trust/10",
              },
              {
                icon: Star,
                title: "Better Choices",
                description: "Compare products, sellers, prices and offers.",
                color: "text-success",
                bgColor: "bg-success/10",
              },
              {
                icon: Phone,
                title: "Direct Connection",
                description: "Connect directly with sellers and service providers.",
                color: "text-primary",
                bgColor: "bg-primary/10",
              },
              {
                icon: Zap,
                title: "Easy Buying",
                description: "Shop online or request a quote for bulk purchases.",
                color: "text-accent",
                bgColor: "bg-accent/10",
              },
              {
                icon: Globe,
                title: "Local & Pan-India",
                description: "Discover businesses near you or source from anywhere in India.",
                color: "text-info",
                bgColor: "bg-info/10",
              },
              {
                icon: HeartHandshake,
                title: "Secure & Reliable",
                description: "Safe buying experiences with transparent seller information.",
                color: "text-premium",
                bgColor: "bg-premium/10",
              },
            ].map((feature, i) => (
              <Card key={i} className="card-hover border-2 hover:border-primary/20">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Whatever You Need. Whoever You Are.
            </h2>
            <p className="text-xl opacity-90 mb-8">
              Shop products, source for your business, or find trusted services — all on Upcurv Trade.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" variant="secondary" asChild className="shadow-lg text-lg px-8">
                <Link to="/search" className="gap-2">
                  Start Shopping
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/post-requirement">Source for Business</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link to="/seller/onboarding">Sell on Upcurv</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm opacity-70">
              Free to browse • Free to enquire • Free to list products
            </p>
          </div>
        </div>
      </section>
    </MarketplaceLayout>
    </>
  );
}
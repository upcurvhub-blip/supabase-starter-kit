import { AdSlot } from "@/components/AdSlot";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCityPreference, sortByCityPriority } from "@/hooks/useCityPreference";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { ProductCardPrice } from "@/components/product/ProductCardPrice";
import { ProductBadgeStack } from "@/components/ProductBadgeStack";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search as SearchIcon, MapPin, Building2, Shield, Package, IndianRupee, Filter, X, ChevronRight, SlidersHorizontal, Star, Phone, MessageCircle } from "lucide-react";
import { useIntentTracking } from "@/hooks/useIntentTracking";
import { EnquiryForm } from "@/components/EnquiryForm";
import { PageMeta } from "@/components/seo/PageMeta";
import { parseQuery, searchTerms } from "@/lib/searchIntelligence";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const query = searchParams.get("q") || "";
  // Every non-empty query goes through semantic search first; keyword search is the fallback.
  const aiMode = searchParams.get("ai") !== "0" && query.trim().length > 0;
  const { trackSearch } = useIntentTracking();
  
  const [products, setProducts] = useState<any[]>([]);
  const { city: prefCity } = useCityPreference();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentCategorySlug, setCurrentCategorySlug] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Track search query
  useEffect(() => {
    if (query) {
      trackSearch(query, selectedCategory !== "all" ? selectedCategory : undefined);
    }
  }, [query, selectedCategory, trackSearch]);

  // Fetch category by slug if navigating from /category/:slug
  useEffect(() => {
    const fetchCategoryBySlug = async () => {
      if (slug) {
        const { data } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("slug", slug)
          .maybeSingle();
        
        if (data) {
          setSelectedCategory(data.id);
          setCurrentCategorySlug(data.slug);
        }
      } else {
        setSelectedCategory("all");
        setCurrentCategorySlug(null);
      }
    };
    fetchCategoryBySlug();
  }, [slug]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [query, aiMode, selectedCategory, priceRange, verifiedOnly, sortBy, selectedLocations, categories.length]);

  const fetchCategories = async () => {
    const { data } = await supabase.from("categories").select("*").eq("is_active", true).order("name");
    setCategories(data || []);
  };

  const fetchProducts = async () => {
    setLoading(true);

    // AI semantic search branch — used when ?ai=1 or query has 3+ words
    if (aiMode && query.trim()) {
      try {
        const { data: sem, error: semErr } = await supabase.functions.invoke("semantic-search", {
          body: { q: query, limit: 48 },
        });
        if (!semErr && sem?.results?.length) {
          const ids: string[] = sem.results.map((r: any) => r.id).filter(Boolean);
          const rank = new Map<string, number>(ids.map((id, i) => [id, i]));

          // Hydrate full rows so cards get images, MOQ, seller contact, etc.
          const { data: rows } = await supabase
            .from("products")
            .select(`*, seller_profiles(*), categories(*)`)
            .in("id", ids)
            .eq("is_active", true);

          const hydrated = (rows || [])
            .map((row: any) => ({
              ...row,
              _similarity: sem.results.find((r: any) => r.id === row.id)?.similarity,
            }))
            .sort((a: any, b: any) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));

          if (hydrated.length) {
            setProducts(hydrated);
            const uniq = [...new Set(hydrated.map((p: any) => p.seller_profiles?.city).filter(Boolean))];
            setLocations(uniq as string[]);
            setLoading(false);
            return;
          }
        }

      } catch (e) {
        console.warn("semantic-search failed, falling back to keyword", e);
      }
    }

    let q = supabase
      .from("products")
      .select(`*, seller_profiles(*), categories(*)`)
      .eq("is_active", true);

    if (query) {
      // Typo-tolerant, multi-field keyword fallback: correct spelling, expand
      // synonyms, then OR every term across name/description/tags.
      const parsed = parseQuery(query);
      const terms = searchTerms(parsed);
      const words = parsed.tokens.filter((t) => t.length > 2);
      const candidates = [...new Set([...terms, ...words])].slice(0, 10);
      const filters = candidates.flatMap((t) => {
        const safe = t.replace(/[,%()]/g, " ").trim();
        if (!safe) return [];
        return [
          `name.ilike.%${safe}%`,
          `short_description.ilike.%${safe}%`,
          `description.ilike.%${safe}%`,
        ];
      });
      if (filters.length) q = q.or(filters.join(","));
    }
    if (selectedCategory !== "all") {
      const selectedCat = categories.find((c) => c.id === selectedCategory);
      const childIds = categories.filter((c) => c.parent_id === selectedCategory).map((c) => c.id);
      if (selectedCat?.level === 1 && childIds.length > 0) {
        q = q.in("category_id", [selectedCategory, ...childIds]);
      } else {
        q = q.eq("category_id", selectedCategory);
      }
    }
    if (priceRange[0] > 0) q = q.gte("price_min", priceRange[0]);
    if (priceRange[1] < 100000) q = q.lte("price_max", priceRange[1]);
    if (verifiedOnly) q = q.eq("seller_profiles.verification_status", "verified");

    if (sortBy === "newest") q = q.order("created_at", { ascending: false });
    else if (sortBy === "price_low") q = q.order("price_min", { ascending: true });
    else if (sortBy === "price_high") q = q.order("price_min", { ascending: false });
    else if (sortBy === "popular") q = q.order("view_count", { ascending: false });

    const { data } = await q.limit(50);
    let filteredData = data || [];

    if (selectedLocations.length > 0) {
      filteredData = filteredData.filter((p) =>
        selectedLocations.includes(p.seller_profiles?.city || "")
      );
    }
    if (verifiedOnly) {
      filteredData = filteredData.filter((p) => p.seller_profiles?.verification_status === "verified");
    }

    setProducts(filteredData);
    const uniqueLocations = [...new Set(data?.map((p) => p.seller_profiles?.city).filter(Boolean))];
    setLocations(uniqueLocations as string[]);
    setLoading(false);
  };

  // Same-city sellers first when the visitor shared their location.
  const visibleProducts = useMemo(
    () => sortByCityPriority(products, prefCity, (p: any) => p.seller_profiles?.city),
    [products, prefCity],
  );

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const topLevelCategories = categories
    .filter((c) => c.level === 1)
    .sort((a, b) => {
      const aChildren = categories.filter((c) => c.parent_id === a.id).length;
      const bChildren = categories.filter((c) => c.parent_id === b.id).length;
      if ((bChildren > 0 ? 1 : 0) !== (aChildren > 0 ? 1 : 0)) {
        return (bChildren > 0 ? 1 : 0) - (aChildren > 0 ? 1 : 0);
      }
      return (a.display_order ?? 999) - (b.display_order ?? 999) || a.name.localeCompare(b.name);
    });
  const clearFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, 100000]);
    setVerifiedOnly(false);
    setSelectedLocations([]);
    setSortBy("newest");
  };

  const hasActiveFilters = selectedCategory !== "all" || priceRange[0] > 0 || priceRange[1] < 100000 || verifiedOnly || selectedLocations.length > 0;

  const filtersCard = (
            <Card>

              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filters
                  </h3>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                      <X className="h-3 w-3 mr-1" /> Clear All
                    </Button>
                  )}
                </div>

                <div className="space-y-6">
                {/* Category Filter with Subcategories */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      <button
                        onClick={() => setSelectedCategory("all")}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }`}
                      >
                        All Categories
                      </button>
                      {topLevelCategories.map((parent) => {
                        const subCats = categories.filter(c => c.parent_id === parent.id);
                        const isExpanded = expandedCategories.includes(parent.id);
                        
                        return (
                          <div key={parent.id}>
                            <button
                              onClick={() => {
                                setSelectedCategory(parent.id);
                                if (subCats.length > 0) {
                                  setExpandedCategories(prev => 
                                    prev.includes(parent.id) 
                                      ? prev.filter(id => id !== parent.id)
                                      : [...prev, parent.id]
                                  );
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                                selectedCategory === parent.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                              }`}
                            >
                              <span>{parent.name}</span>
                              {subCats.length > 0 && (
                                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              )}
                            </button>
                            {isExpanded && subCats.length > 0 && (
                              <div className="ml-4 border-l pl-2 space-y-1 mt-1">
                                {subCats.map((sub) => (
                                  <button
                                    key={sub.id}
                                    onClick={() => setSelectedCategory(sub.id)}
                                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                                      selectedCategory === sub.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {sub.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Price Range: ₹{priceRange[0].toLocaleString()} - ₹{priceRange[1].toLocaleString()}
                    </label>
                    <Slider
                      value={priceRange}
                      onValueChange={(v) => setPriceRange(v as [number, number])}
                      min={0}
                      max={100000}
                      step={1000}
                      className="w-full"
                    />
                  </div>

                  {/* Verified Only */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="verified"
                      checked={verifiedOnly}
                      onCheckedChange={(checked) => setVerifiedOnly(checked === true)}
                    />
                    <label htmlFor="verified" className="text-sm cursor-pointer flex items-center gap-1">
                      <Shield className="h-4 w-4 text-trust" /> Verified Sellers Only
                    </label>
                  </div>

                  {/* Location Filter */}
                  {locations.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Location</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {locations.slice(0, 10).map((loc) => (
                          <div key={loc} className="flex items-center gap-2">
                            <Checkbox
                              id={`loc-${loc}`}
                              checked={selectedLocations.includes(loc)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedLocations([...selectedLocations, loc]);
                                } else {
                                  setSelectedLocations(selectedLocations.filter((l) => l !== loc));
                                }
                              }}
                            />
                            <label htmlFor={`loc-${loc}`} className="text-sm cursor-pointer">
                              {loc}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
  );

  return (
    <MarketplaceLayout>
      <PageMeta
        title={query ? `Search results for "${query}"` : "Search Products, Brands & Verified Sellers"}
        description="Search thousands of products, brands and verified sellers across India — buy retail or source wholesale, compare prices and request quotes instantly."
        path="/search"
        noindex={!!query}
      />
      <div className="container mx-auto px-4 py-8">
        <AdSlot placement="search_results" className="mb-4" />

        {/* Mobile filter trigger */}
        <div className="md:hidden mb-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{filtersCard}</div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Filters Sidebar (desktop) */}
          <aside className="hidden md:block w-full md:w-72 shrink-0 space-y-4">
            {filtersCard}
          </aside>


          {/* Results */}
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">
                  {currentCategory ? currentCategory.name : query ? `Results for "${query}"` : "All Products"}
                </h1>
                <p className="text-muted-foreground text-sm">{visibleProducts.length} products found</p>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="grid gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 bg-muted rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/2" />
                          <div className="h-3 bg-muted rounded w-3/4" />
                          <div className="h-3 bg-muted rounded w-1/4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : visibleProducts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No products found</p>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your filters or search term
                  </p>
                  <Button asChild>
                    <Link to="/post-requirement">Post a Requirement</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
              {/* Mobile: IndiaMart-style list layout */}
              <div className="md:hidden divide-y rounded-lg border bg-card">
                {visibleProducts.map((product) => {
                  const seller = product.seller_profiles;
                  const specs = (product.specifications && typeof product.specifications === "object")
                    ? Object.entries(product.specifications as Record<string, any>).filter(([, v]) => v).slice(0, 4)
                    : [];
                  const img = product.images && (product.images as string[])[0];
                  const phone = seller?.phone;
                  const whatsapp = seller?.whatsapp || seller?.phone;
                  return (
                    <div key={product.id} className="p-3">
                      <div className="flex gap-3">
                        <Link
                          to={`/product/${product.slug || product.id}`}
                          className="w-28 h-28 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center"
                        >
                          {img ? (
                            <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                          ) : (
                            <Package className="h-8 w-8 text-muted-foreground" />
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${product.slug || product.id}`}
                            className="font-semibold text-primary leading-snug line-clamp-2 block"
                          >
                            {product.name}
                          </Link>
                          <div className="mt-1"><ProductBadgeStack product={product} seller={seller} max={3} /></div>
                          <div className="mt-1"><ProductCardPrice product={product} showCta={false} size="sm" /></div>
                          <div className="mt-1 space-y-0.5">
                            {specs.map(([k, v]) => (
                              <div key={k} className="text-xs text-muted-foreground truncate">
                                {k}: <span className="font-medium text-foreground">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      {seller && (
                        <div className="mt-2 pt-2 border-t flex items-center justify-between gap-2">
                          <Link
                            to={`/seller-profile/${seller.slug || seller.id}`}
                            className="min-w-0"
                          >
                            <div className="font-medium text-sm truncate flex items-center gap-1">
                              {seller.business_name}
                              {seller.verification_status === "verified" && (
                                <Shield className="h-3 w-3 text-trust shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {seller.city && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />{seller.city}
                                </span>
                              )}
                              {seller.avg_rating ? (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-warning text-warning" />
                                  {Number(seller.avg_rating).toFixed(1)}
                                  {seller.total_reviews ? ` (${seller.total_reviews})` : ""}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        </div>
                      )}
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {whatsapp ? (
                          <Button size="sm" variant="outline" asChild className="border-success text-success hover:bg-success/10">
                            <a href={`https://wa.me/${String(whatsapp).replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="h-4 w-4 mr-1" /> WhatsApp
                            </a>
                          </Button>
                        ) : (
                          <EnquiryForm
                            product={product}
                            trigger={<Button size="sm" variant="outline" className="w-full">Enquire Now</Button>}
                          />
                        )}
                        {phone ? (
                          <Button size="sm" asChild className="gradient-accent">
                            <a href={`tel:${phone}`}>
                              <Phone className="h-4 w-4 mr-1" /> Call Now
                            </a>
                          </Button>
                        ) : (
                          <EnquiryForm
                            product={product}
                            trigger={<Button size="sm" className="gradient-accent w-full">Enquire Now</Button>}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop grid */}
              <div className="hidden md:grid grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-all overflow-hidden border-2 hover:border-primary/20">
                    <CardContent className="p-0">
                      <Link to={`/product/${product.slug || product.id}`}>
                        <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                            {product.images && (product.images as string[])[0] ? (
                              <img
                                src={(product.images as string[])[0]}
                                alt={product.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Package className="h-12 w-12 text-muted-foreground" />
                            )}
                        </div>
                      </Link>
                      <div className="p-4 space-y-3">
                          <Link
                            to={`/product/${product.slug || product.id}`}
                            className="font-semibold hover:text-primary transition-colors line-clamp-2 min-h-[2.5rem] block"
                          >
                            {product.name}
                          </Link>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {product.description}
                          </p>
                          <ProductCardPrice product={product} showCta={false} />
                          {product.seller_profiles && (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                              <Link
                                to={`/seller-profile/${product.seller_profiles.slug || product.seller_profiles.id}`}
                                className="text-sm text-accent hover:underline flex items-center gap-1 min-w-0"
                              >
                                <Building2 className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{product.seller_profiles.business_name}</span>
                              </Link>
                              {product.seller_profiles.verification_status === "verified" && (
                                <Badge variant="secondary" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                              {product.seller_profiles.city && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {product.seller_profiles.city}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <EnquiryForm
                              product={product}
                              trigger={<Button size="sm" className="gradient-accent w-full">Enquire Now</Button>}
                            />
                            <Button size="sm" variant="outline" asChild>
                              <Link to={`/product/${product.slug || product.id}`}>Details</Link>
                            </Button>
                          </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

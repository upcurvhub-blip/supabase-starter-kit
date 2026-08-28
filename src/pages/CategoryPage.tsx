import { AdSlot } from "@/components/AdSlot";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { ProductBadgeStack } from "@/components/ProductBadgeStack";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, IndianRupee, Building2, ArrowRight, ShieldCheck } from "lucide-react";
import { UrgencyBadgeStack } from "@/lib/urgencyBadges";
import { ProductGridSkeleton } from "@/components/ui/loading-states";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();

  /**
   * Cached with React Query (persisted under the "category" public prefix) so
   * returning to this page from a product shows content instantly and only
   * revalidates in the background — no loading flash, no scroll jump.
   */
  const { data, isLoading } = useQuery({
    queryKey: ["category", slug],
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data: cat } = await supabase
        .from("categories").select("*").eq("slug", slug!).eq("is_active", true).maybeSingle();
      if (!cat) return { category: null, parent: null, subs: [], products: [] as any[] };

      const [{ data: parentCat }, { data: children }] = await Promise.all([
        cat.parent_id
          ? supabase.from("categories").select("*").eq("id", cat.parent_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase.from("categories").select("*")
          .eq("parent_id", cat.id).eq("is_active", true)
          .order("display_order").order("name"),
      ]);

      const catIds = [cat.id, ...(children || []).map((c: any) => c.id)];
      const { data: prods } = await supabase
        .from("products")
        .select(`*, seller_profiles(id, business_name, city, verification_status, logo_url, slug)`)
        .in("category_id", catIds)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(60);

      return { category: cat, parent: parentCat || null, subs: children || [], products: prods || [] };
    },
  });

  const category = data?.category ?? null;
  const parent = data?.parent ?? null;
  const subs = data?.subs ?? [];
  const products = data?.products ?? [];
  const loading = isLoading && !data;


  const BASE = "https://upcurvtrade.upcurv.in";
  const title = category ? `${category.name} — Suppliers, Manufacturers & Products | Upcurv Trade` : "Category | Upcurv Trade";
  const desc = category
    ? `Browse ${products.length}+ verified ${category.name.toLowerCase()} suppliers on Upcurv Trade. Compare prices, view catalogs, request quotes and connect via WhatsApp or phone.`
    : "";
  const url = category ? `${BASE}/category/${category.slug}` : BASE;
  const ogImage = category?.image_url || `${BASE}/placeholder.svg`;

  const categoryJsonLd = category ? [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: category.name,
      description: desc,
      url,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE },
          { "@type": "ListItem", position: 2, name: "Categories", item: `${BASE}/categories` },
          ...(parent ? [{ "@type": "ListItem", position: 3, name: parent.name, item: `${BASE}/category/${parent.slug}` }] : []),
          { "@type": "ListItem", position: parent ? 4 : 3, name: category.name, item: url },
        ],
      },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: products.length,
        itemListElement: products.slice(0, 20).map((p: any, i: number) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE}/product/${p.slug || p.id}`,
          name: p.name,
        })),
      },
    },
  ] : [];

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        {categoryJsonLd.length > 0 && (
          <script type="application/ld+json">{JSON.stringify(categoryJsonLd)}</script>
        )}
      </Helmet>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-6 md:py-10">
          <nav className="text-xs md:text-sm mb-3 text-muted-foreground flex items-center gap-1 flex-wrap">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/categories" className="hover:text-foreground">Categories</Link>
            {parent && (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link to={`/category/${parent.slug}`} className="hover:text-foreground">{parent.name}</Link>
              </>
            )}
            {category && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">{category.name}</span>
              </>
            )}
          </nav>
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 border">
              {category?.image_url ? (
                <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">{category?.name || "Category"}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {subs.length} subcategories · {products.length} products
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 space-y-10">
        <AdSlot placement="category_top" categoryId={category?.id} />

        {/* Subcategories grid */}
        {subs.length > 0 && (
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">Subcategories</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4">
              {subs.map(sub => (
                <Link key={sub.id} to={`/category/${sub.slug}`} className="group text-center">
                  <div className="aspect-square rounded-xl overflow-hidden border bg-card group-hover:border-primary/40 group-hover:shadow-md transition-all flex items-center justify-center">
                    {sub.image_url ? (
                      <img src={sub.image_url} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    ) : (
                      <Package className="h-8 w-8 text-primary/60" />
                    )}
                  </div>
                  <p className="text-xs md:text-sm font-medium mt-1.5 line-clamp-2 group-hover:text-primary">{sub.name}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Products */}
        <section>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Products in {category?.name || "this category"}</h2>
            <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
              <Link to={`/search?category=${category?.slug || ""}`} className="gap-1">See all <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : products.length === 0 ? (
            <div className="text-center py-12 border rounded-xl bg-card">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No products listed yet in this category.</p>
              <Button asChild className="mt-4 gradient-accent">
                <Link to="/post-requirement">Post Your Requirement</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {products.map((product) => (
                <Card key={product.id} className="card-hover overflow-hidden border-2 hover:border-primary/20 relative">
                  <Link to={`/product/${product.slug || product.id}`} className="block">
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                      {product.images && (product.images as string[])[0] ? (
                        <img src={(product.images as string[])[0]} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                      ) : (
                        <Package className="h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="absolute top-2 left-2">
                        <UrgencyBadgeStack product={product} count={1} size="xs" />
                      </div>
                    </div>
                  </Link>
                  <CardContent className="p-3 space-y-1.5">
                    <Link to={`/product/${product.slug || product.id}`} className="font-semibold text-sm hover:text-primary transition-colors line-clamp-2 block min-h-[2.25rem]">
                      {product.name}
                    </Link>
                    <ProductBadgeStack product={product} seller={product.seller_profiles} max={2} />
                    {product.seller_profiles?.city && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{product.seller_profiles.city}</span>
                      </div>
                    )}
                    {product.price_min && (
                      <div className="font-bold text-primary text-sm flex items-center">
                        <IndianRupee className="h-3 w-3" />
                        {product.price_min.toLocaleString()}
                        {product.price_max ? ` - ${product.price_max.toLocaleString()}` : ""}
                      </div>
                    )}
                    {product.seller_profiles && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 border-t">
                        {product.seller_profiles.verification_status === "verified" ? (
                          <ShieldCheck className="h-3 w-3 shrink-0 text-trust" />
                        ) : (
                          <Building2 className="h-3 w-3 shrink-0" />
                        )}
                        <span className="truncate">{product.seller_profiles.business_name}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </MarketplaceLayout>
  );
}

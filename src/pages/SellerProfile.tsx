import { AdSlot } from "@/components/AdSlot";
import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GalleryView, type GalleryItem } from "@/components/seller/GalleryView";
import { Separator } from "@/components/ui/separator";
import { ReviewForm } from "@/components/ReviewForm";
import { StarRating } from "@/components/StarRating";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
  Users,
  CheckCircle2,
  Shield,
  Star,
  Package,
  Clock,
  TrendingUp,
  Award,
  Factory,
  IndianRupee,
  Heart,
  Share2,
  MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ShareDialog } from "@/components/ShareDialog";
import { getDeviceId, hasDeviceConsent } from "@/hooks/useDeviceId";

const getEphemeralSessionId = () => {
  if (typeof window === "undefined") return `session_${Date.now()}`;
  try {
    const existing = sessionStorage.getItem("bt_ephemeral_session_id");
    if (existing) return existing;
    const next = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem("bt_ephemeral_session_id", next);
    return next;
  } catch {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
};

export default function SellerProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("products");
  const [shareOpen, setShareOpen] = useState(false);

  const pageViewRecordId = useRef<string | null>(null);
  const viewStartTime = useRef(Date.now());
  const hasTrackedProfileView = useRef(false);

  // Fetch seller profile - try both slug and id
  const { data: seller, isLoading: sellerLoading } = useQuery({
    queryKey: ["seller-profile", slug],
    queryFn: async () => {
      // First try to find by slug
      let { data, error } = await supabase
        .from("seller_profiles")
        .select(`
          *,
          subscription_plans(name, tier)
        `)
        .eq("slug", slug)
        .maybeSingle();
      
      // If not found by slug, try by id
      if (!data && slug) {
        const result = await supabase
          .from("seller_profiles")
          .select(`
            *,
            subscription_plans(name, tier)
          `)
          .eq("id", slug)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const sellerId = seller?.id;

  // Fetch seller products
  const { data: products } = useQuery({
    queryKey: ["seller-products", sellerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!sellerId,
  });

  // Fetch seller services
  const { data: services } = useQuery({
    queryKey: ["seller-services-public", sellerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("*, categories:category_id(name)")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!sellerId,
  });



  // Fetch reviews
  const { data: reviews } = useQuery({
    queryKey: ["seller-reviews", sellerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, profiles!reviews_buyer_id_fkey(full_name, avatar_url)")
        .eq("seller_id", sellerId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!sellerId,
  });

  // Get current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      return { ...user, profile };
    },
  });

  const isBuyer = currentUser?.profile?.role === "buyer";

  useEffect(() => {
    const trackProfileView = async () => {
      if (!seller?.id || hasTrackedProfileView.current) return;
      hasTrackedProfileView.current = true;
      const sessionId = hasDeviceConsent()
        ? (localStorage.getItem("session_id") || getEphemeralSessionId())
        : getEphemeralSessionId();
      if (hasDeviceConsent() && !localStorage.getItem("session_id")) localStorage.setItem("session_id", sessionId);
      const { data } = await supabase.rpc("record_visitor_page_view" as any, {
        p_page_type: "seller_profile",
        p_page_path: window.location.pathname,
        p_product_id: null,
        p_seller_id: seller.id,
        p_category_id: null,
        p_user_id: currentUser?.id || null,
        p_device_id: hasDeviceConsent() ? getDeviceId() || null : null,
        p_session_id: sessionId,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent || null,
        p_metadata: { seller_name: seller.business_name },
      });
      if (data) pageViewRecordId.current = String(data);
    };
    trackProfileView();
  }, [seller?.id, currentUser?.id]);

  useEffect(() => {
    const updateDuration = () => {
      if (!pageViewRecordId.current) return;
      const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
      supabase.rpc("update_visitor_page_view_duration" as any, {
        p_view_id: pageViewRecordId.current,
        p_duration: duration,
      });
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") updateDuration(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      updateDuration();
    };
  }, [seller?.id]);

  // Check if saved
  const { data: isSaved } = useQuery({
    queryKey: ["saved-seller", sellerId, currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return false;
      const { data } = await supabase
        .from("saved_suppliers")
        .select("id")
        .eq("buyer_id", currentUser.id)
        .eq("seller_id", sellerId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!currentUser && !!sellerId,
  });

  // Save/unsave seller
  const toggleSave = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Please login to save sellers");
      
      if (isSaved) {
        await supabase
          .from("saved_suppliers")
          .delete()
          .eq("buyer_id", currentUser.id)
          .eq("seller_id", sellerId);
      } else {
        await supabase
          .from("saved_suppliers")
          .insert({ buyer_id: currentUser.id, seller_id: sellerId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-seller", sellerId] });
      toast({ title: isSaved ? "Removed from saved suppliers" : "Added to saved suppliers" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate average rating
  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (sellerLoading) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </MarketplaceLayout>
    );
  }

  if (!seller) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Seller Not Found</h1>
          <p className="text-muted-foreground mb-4">The seller you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/search">Browse Sellers</Link>
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  const BASE = "https://upcurvtrade.upcurv.in";
  const sellerUrl = `${BASE}/seller-profile/${seller.slug || seller.id}`;
  const sellerName = seller.business_name || seller.company_name || "Supplier";
  const locationBits = [seller.city, seller.state].filter(Boolean).join(", ");
  const metaTitle = `${sellerName}${locationBits ? ` — ${locationBits}` : ""} | ${seller.business_type || "Verified Supplier"} on Upcurv Trade`;
  const metaDesc =
    (seller.about || seller.description || `${sellerName} is a ${seller.verification_status === "verified" ? "verified " : ""}${(seller.business_type || "supplier").toLowerCase()}${locationBits ? ` in ${locationBits}` : ""} on Upcurv Trade offering ${products?.length || 0}+ products. Contact directly via WhatsApp, phone or request a quote.`).slice(0, 300);
  const sellerImage = seller.logo_url || seller.banner_url || `${BASE}/placeholder.svg`;

  /**
   * Brand-name search (JustDial-style): searching the business name on Google
   * should surface this profile. That needs the name in the title, name
   * variants as alternateName, and a FAQ block answering the queries people
   * actually type ("is X genuine", "X contact number", "X address").
   */
  const nameVariants = Array.from(
    new Set(
      [
        sellerName,
        seller.company_name,
        seller.business_name,
        locationBits ? `${sellerName} ${seller.city}` : null,
        sellerName.replace(/\b(pvt|private|ltd|limited|llp|industries|enterprises|traders|company|co)\b\.?/gi, "").trim(),
      ].filter((n): n is string => !!n && n.length > 2 && n !== sellerName || n === sellerName),
    ),
  );

  const sellerJsonLd = [
    {
      "@context": "https://schema.org",
      "@type": ["Organization", "LocalBusiness"],
      "@id": sellerUrl,
      name: sellerName,
      alternateName: nameVariants.filter((n) => n !== sellerName),
      legalName: seller.company_name || undefined,
      url: sellerUrl,
      image: sellerImage,
      logo: seller.logo_url || undefined,
      description: seller.about || seller.description || undefined,
      telephone: seller.phone || undefined,
      email: seller.email || undefined,
      areaServed: seller.state ? { "@type": "State", name: seller.state } : { "@type": "Country", name: "India" },
      foundingDate: seller.established_year ? String(seller.established_year) : undefined,
      address: (seller.city || seller.state || seller.address) ? {
        "@type": "PostalAddress",
        streetAddress: seller.address || undefined,
        addressLocality: seller.city || undefined,
        addressRegion: seller.state || undefined,
        postalCode: seller.pincode || undefined,
        addressCountry: seller.country || "IN",
      } : undefined,
      aggregateRating: avgRating && reviews && reviews.length > 0 ? {
        "@type": "AggregateRating",
        ratingValue: avgRating,
        reviewCount: reviews.length,
      } : undefined,
      makesOffer: (products || []).slice(0, 20).map((p: any) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Product", name: p.name, url: `${BASE}/product/${p.slug || p.id}` },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `Where is ${sellerName} located?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${sellerName} operates${locationBits ? ` from ${locationBits}` : " in India"} and supplies buyers across India through Upcurv Trade.`,
          },
        },
        {
          "@type": "Question",
          name: `Is ${sellerName} a verified supplier?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: seller.verification_status === "verified"
              ? `Yes. ${sellerName} is a verified seller on Upcurv Trade — business details and contact information have been checked.`
              : `${sellerName} is listed on Upcurv Trade. Verification is in progress; request documents before placing a bulk order.`,
          },
        },
        {
          "@type": "Question",
          name: `How do I contact ${sellerName}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Send an enquiry from this profile to reach ${sellerName} directly on WhatsApp or phone, and get pricing and MOQ for the products you need.`,
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE },
        { "@type": "ListItem", position: 2, name: "Suppliers", item: `${BASE}/search` },
        { "@type": "ListItem", position: 3, name: sellerName, item: sellerUrl },
      ],
    },
  ];


  return (
    <MarketplaceLayout>
      <div className="container mx-auto px-4 pt-4"><AdSlot placement="seller_profile" /></div>

      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={sellerUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={sellerUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:image" content={sellerImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        <meta name="twitter:image" content={sellerImage} />
        <meta name="keywords" content={[sellerName, ...nameVariants, `${sellerName} contact number`, `${sellerName} ${seller.city || "India"}`, `${sellerName} products`, `${sellerName} reviews`].join(", ")} />
        <meta name="robots" content="index,follow,max-image-preview:large" />

        <script type="application/ld+json">{JSON.stringify(sellerJsonLd)}</script>
      </Helmet>

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-r from-primary to-primary/70">
        {seller.banner_url && (
          <img 
            src={seller.banner_url} 
            alt="Banner" 
            className="w-full h-full object-cover opacity-80" 
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Logo */}
              <div className="w-32 h-32 rounded-xl bg-card border-4 border-background shadow-lg overflow-hidden shrink-0 -mt-16 md:-mt-20">
                {seller.logo_url ? (
                  <img src={seller.logo_url} alt={seller.business_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Building2 className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold">{seller.business_name}</h1>
                      {seller.verification_status === "verified" && (
                        <Badge className="bg-trust text-trust-foreground">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      )}
                      {seller.subscription_plans?.tier === "premium" && (
                        <Badge className="bg-premium text-premium-foreground">
                          <Award className="h-3 w-3 mr-1" /> Premium
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4" />
                      {seller.address && `${seller.address}, `}
                      {seller.city}, {seller.state}, {seller.country}
                      {seller.pincode && ` - ${seller.pincode}`}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {seller.business_type && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Factory className="h-3 w-3" /> {seller.business_type}
                        </Badge>
                      )}
                      {seller.established_year && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Est. {seller.established_year}
                        </Badge>
                      )}
                      {seller.employee_count && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {seller.employee_count} Employees
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={isSaved ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleSave.mutate()}
                      disabled={toggleSave.isPending}
                    >
                      <Heart className={`h-4 w-4 mr-1 ${isSaved ? "fill-current" : ""}`} />
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                      <Share2 className="h-4 w-4 mr-1" /> Share
                    </Button>
                    <ShareDialog
                      open={shareOpen}
                      onOpenChange={setShareOpen}
                      title={seller?.business_name || seller?.company_name || "Supplier"}
                      text={`${seller?.business_name || seller?.company_name || "This supplier"}${seller?.city ? ` in ${seller.city}` : ""} on Upcurv Trade`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{seller.trust_score || 0}%</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Shield className="h-3 w-3" /> Trust Score
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{seller.response_rate || 0}%</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Response Rate
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{seller.avg_response_time || 24}h</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" /> Avg Response
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{products?.length || 0}</div>
                <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Package className="h-3 w-3" /> Products
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  {avgRating || "N/A"}
                  {avgRating && <Star className="h-4 w-4 text-accent fill-accent" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {reviews?.length || 0} Reviews
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start border-b bg-transparent h-auto p-0 mb-6">
            <TabsTrigger 
              value="products" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Products ({products?.length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Services ({services?.length || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="about" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              About
            </TabsTrigger>
            <TabsTrigger 
              value="gallery" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Gallery ({((seller as any)?.gallery as GalleryItem[] | undefined)?.length || 0})
            </TabsTrigger>
            <TabsTrigger 
              value="reviews" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Reviews ({reviews?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Products Tab */}
          <TabsContent value="products">
            {products && products.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product: any) => (
                  <Link key={product.id} to={`/product/${product.slug}`}>
                    <Card className="h-full group overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="aspect-square relative overflow-hidden bg-muted">
                        {product.images && (product.images as any[]).length > 0 ? (
                          <img
                            src={(product.images as any[])[0]}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        {product.is_featured && (
                          <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                            <Star className="h-3 w-3 mr-1" /> Featured
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        {product.categories && (
                          <p className="text-xs text-muted-foreground mb-2">{product.categories.name}</p>
                        )}
                        {(product.price_min || product.price_max) && (
                          <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                            <IndianRupee className="h-3 w-3" />
                            {product.price_min?.toLocaleString()}
                            {product.price_max && product.price_max !== product.price_min && (
                              <span> - {product.price_max.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                        {product.min_order_quantity && (
                          <p className="text-xs text-muted-foreground mt-1">
                            MOQ: {product.min_order_quantity} {product.moq_unit || "Pieces"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No products listed yet</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            <GalleryView items={((seller as any)?.gallery as GalleryItem[]) || []} />
          </TabsContent>

          {/* About Tab */}
          <TabsContent value="about">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Business Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {seller.description && (
                    <div>
                      <h4 className="font-medium mb-2">About Us</h4>
                      <p className="text-muted-foreground text-sm whitespace-pre-line">{seller.description}</p>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Business Type</span>
                      <p className="font-medium">{seller.business_type || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Established</span>
                      <p className="font-medium">{seller.established_year || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Employees</span>
                      <p className="font-medium">{seller.employee_count || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Annual Turnover</span>
                      <p className="font-medium">{seller.annual_turnover || "N/A"}</p>
                    </div>
                  </div>

                  {seller.gst_number && (
                    <div className="pt-4 border-t">
                      <span className="text-muted-foreground text-sm">GST Number</span>
                      <p className="font-medium">{seller.gst_number}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {seller.address && `${seller.address}, `}
                        {seller.city}, {seller.state}
                        {seller.pincode && ` - ${seller.pincode}`}
                        <br />{seller.country}
                      </p>
                    </div>
                  </div>

                  {seller.website && (
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a 
                          href={seller.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {seller.website}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                {reviews && reviews.length > 0 ? (
                  reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            {review.profiles?.avatar_url ? (
                              <img 
                                src={review.profiles.avatar_url} 
                                alt="" 
                                className="w-full h-full rounded-full object-cover" 
                              />
                            ) : (
                              <span className="text-sm font-semibold text-primary">
                                {review.profiles?.full_name?.charAt(0) || "U"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium">{review.profiles?.full_name || "Anonymous"}</h4>
                              <span className="text-xs text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <StarRating rating={review.rating} readonly size="sm" />
                            {review.title && (
                              <p className="font-medium mt-2">{review.title}</p>
                            )}
                            {review.review && (
                              <p className="text-sm text-muted-foreground mt-1">{review.review}</p>
                            )}
                            {review.is_verified_purchase && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Verified Purchase
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No reviews yet</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Review Form - Only for logged-in buyers */}
              <div>
                {isBuyer && sellerId ? (
                  <ReviewForm sellerId={sellerId} />
                ) : currentUser ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Only buyers can write reviews
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground mb-4">
                        Login to write a review
                      </p>
                      <Button asChild size="sm">
                        <Link to="/auth">Login</Link>
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MarketplaceLayout>
  );
}
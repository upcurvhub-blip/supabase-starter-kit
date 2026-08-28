import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  productSeoTitle,
  productSeoDescription,
  productSeoKeywords,
  productFaqs,
  faqJsonLd as buildFaqJsonLd,
} from "@/lib/seo/productSeo";
import { supabase } from "@/integrations/supabase/client";
import { publicQueryKeys } from "@/lib/queryKeys";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { UrgencyBadgeStack } from "@/lib/urgencyBadges";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LeadPersuasionLayer } from "@/components/LeadPersuasionLayer";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Package,
  Building2,
  MapPin,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  Shield,
  Clock,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Share2,
  Heart,
  Truck,
  Zap,
  Award,
  Calendar,
  Globe,
  Users,
  Factory,
  Mail,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoLeadCapture } from "@/hooks/useAutoLeadCapture";
import { DEVICE_CONSENT_EVENT, getDeviceId, ensureDeviceId, hasDeviceConsent } from "@/hooks/useDeviceId";
import RelatedServices from "@/components/RelatedServices";
import MarketplacePsychology from "@/components/MarketplacePsychology";
import { AdSlot } from "@/components/AdSlot";
import { AiInsightCard } from "@/components/AiInsightCard";
import { GetBestPriceButton } from "@/components/GetBestPriceButton";
import { ProductReviews } from "@/components/product/ProductReviews";
import { DetailSkeleton } from "@/components/ui/loading-states";
import { ProductCommercials } from "@/components/product/ProductCommercials";
import { useShoppingIntent } from "@/hooks/useShoppingIntent";
import { ShareDialog } from "@/components/ShareDialog";
import { trackCta } from "@/lib/ctaTracking";

import { PriceBenchmark } from "@/components/PriceBenchmark";




const getEphemeralSessionId = () => {
  if (typeof window === "undefined") return `session_${Date.now()}`;
  const key = "bt_ephemeral_session_id";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
};

const playSuccessTone = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    gain.connect(ctx.destination);
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + 0.36 + index * 0.04);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {}
};

const getProductNudge = (product: any) => {
  const seed = String(product?.id || product?.slug || product?.name || "").split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const createdAt = product?.created_at ? new Date(product.created_at).getTime() : 0;
  const daysOld = createdAt ? Math.floor((Date.now() - createdAt) / 86400000) : 999;
  if (product?.is_featured) return { label: "Priority supplier", detail: "Fast quote window", icon: Star, tone: "accent" };
  if ((product?.enquiry_count || 0) >= 5) return { label: "High enquiry item", detail: `${product.enquiry_count} buyers asked recently`, icon: Zap, tone: "warning" };
  if (daysOld <= 14 && seed % 2 === 0) return { label: "New stock alert", detail: "Recently listed", icon: Clock, tone: "info" };
  if ((product?.view_count || 0) >= 20 && seed % 3 === 0) return { label: "Trending in category", detail: `${product.view_count} product views`, icon: TrendingUp, tone: "primary" };
  if (seed % 5 === 0) return { label: "Bulk-ready supplier", detail: "MOQ available", icon: Truck, tone: "success" };
  return null;
};

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [bestPriceOpen, setBestPriceOpen] = useState(false);
  const shoppingIntent = useShoppingIntent();
  const [enquiryMode, setEnquiryMode] = useState<"enquire" | "call">("enquire");
  const [bottomBarExpanded, setBottomBarExpanded] = useState(false);
  const [unlockedSellers, setUnlockedSellers] = useState<Record<string, { name: string; phone: string; city: string; until: number }>>({});
  const [enquiryReceipt, setEnquiryReceipt] = useState<{ name: string; phone: string; city: string } | null>(null);
  const viewStartTime = useRef<number>(Date.now());
  const hasTrackedView = useRef(false);
  const viewRecordId = useRef<string | null>(null);
  const pageViewRecordId = useRef<string | null>(null);
  const touchStartY = useRef<number | null>(null);
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    phone: "",
    city: "",
  });
  const [deviceConsentTick, setDeviceConsentTick] = useState(0);

  // Auto-open enquiry at 10s and the multi-supplier "Get Best Price" at 20s,
  // once per product per browser session.
  useEffect(() => {
    if (!slug) return;
    const key = `bt_auto_popup_${slug}`;
    let seen = 0;
    try { seen = Number(sessionStorage.getItem(key) || 0); } catch {}
    const mark = (step: number) => { try { sessionStorage.setItem(key, String(step)); } catch {} };

    const t1 = window.setTimeout(() => {
      if (seen >= 1 || enquiryReceipt) return;
      setEnquiryMode("enquire");
      setEnquiryOpen(true);
      mark(1);
    }, 10000);

    const t2 = window.setTimeout(() => {
      if (seen >= 2) return;
      setEnquiryOpen(false);
      setBestPriceOpen(true);
      mark(2);
    }, 20000);

    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const onConsent = () => setDeviceConsentTick((tick) => tick + 1);
    window.addEventListener(DEVICE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(DEVICE_CONSENT_EVENT, onConsent);
  }, []);

  // Load unlocked sellers from localStorage (30 min TTL per seller)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bt_unlocked_sellers");
      if (raw) {
        const parsed = JSON.parse(raw);
        const now = Date.now();
        const filtered: Record<string, any> = {};
        Object.entries(parsed).forEach(([k, v]: [string, any]) => {
          if (v?.until && v.until > now) filtered[k] = v;
        });
        setUnlockedSellers(filtered);
      }
    } catch {}
  }, []);

  const unlockSeller = (sellerId: string, info: { name: string; phone: string; city: string }) => {
    const until = Date.now() + 30 * 60 * 1000;
    const next = { ...unlockedSellers, [sellerId]: { ...info, until } };
    setUnlockedSellers(next);
    localStorage.setItem("bt_unlocked_sellers", JSON.stringify(next));
  };

  const maskText = (text: string) => {
    if (!text) return "";
    const clean = text.trim();
    if (clean.length <= 4) return clean[0] + "x".repeat(Math.max(0, clean.length - 1));
    return clean.slice(0, 2) + "x".repeat(Math.max(3, clean.length - 4)) + clean.slice(-2);
  };

  // Fetch product - try both slug and id
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: publicQueryKeys.product(slug),
    queryFn: async () => {
      // First try to find by slug
      let { data, error } = await supabase
        .from("products")
        .select(`
          *,
          seller_profiles(
            id, business_name, city, state, logo_url, banner_url,
            verification_status, trust_score, response_rate, phone, whatsapp, email,
            avg_response_time, description, established_year,
            business_type, employee_count, annual_turnover, address, website, user_id, slug
          ),
          categories(id, name, slug)
        `)
        .eq("slug", slug)
        .maybeSingle();
      
      // If not found by slug, try by id
      if (!data && slug) {
        const result = await supabase
          .from("products")
          .select(`
            *,
            seller_profiles(
              id, business_name, city, state, logo_url, banner_url,
              verification_status, trust_score, response_rate, phone, whatsapp, email,
              avg_response_time, description, established_year,
              business_type, employee_count, annual_turnover, address, website, user_id, slug
            ),
            categories(id, name, slug)
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
    staleTime: 30_000,
    refetchOnMount: true,
  });

  // Per-product rating aggregate (powers the JSON-LD AggregateRating)
  const { data: productRating } = useQuery({
    queryKey: ["product-rating", product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", product!.id)
        .eq("is_visible", true);
      const rows = data || [];
      if (!rows.length) return null;
      return {
        count: rows.length,
        avg: rows.reduce((a: number, r: any) => a + r.rating, 0) / rows.length,
      };
    },
    enabled: !!product?.id,
    staleTime: 60_000,
  });

  // Fetch related products
  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category_id, product?.id],
    queryFn: async () => {
      if (!product?.category_id) return [];
      const { data } = await supabase
        .from("products")
        .select(`
          *,
          seller_profiles(id, business_name, city, verification_status)
        `)
        .eq("category_id", product.category_id)
        .eq("is_active", true)
        .neq("id", product.id)
        .limit(8);
      return data || [];
    },
    enabled: !!product?.category_id,
  });

  const { data: sellerProducts } = useQuery({
    queryKey: ["seller-more-products", product?.seller_id, product?.id],
    queryFn: async () => {
      if (!product?.seller_id) return [];
      const { data } = await supabase
        .from("products")
        .select(`
          *,
          seller_profiles(id, business_name, city, verification_status, slug)
        `)
        .eq("seller_id", product.seller_id)
        .eq("is_active", true)
        .neq("id", product.id)
        .order("created_at", { ascending: false })
        .limit(12);
      return data || [];
    },
    enabled: !!product?.seller_id,
  });

  // Get current user
  const { data: currentUser, refetch: refetchUser } = useQuery({
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

  // Listen for auth changes to update pending views
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user && product?.id) {
        const pendingView = localStorage.getItem("pending_product_view");
        if (pendingView) {
          try {
            const { product_id, session_id } = JSON.parse(pendingView);
            if (product_id === product.id) {
              // Update the view record with user_id
              await supabase
                .from("product_views")
                .update({ user_id: session.user.id })
                .eq("session_id", session_id)
                .eq("product_id", product_id)
                .is("user_id", null);
              
              localStorage.removeItem("pending_product_view");
              refetchUser();
            }
          } catch (e) {
            console.error("Error updating pending view on auth change:", e);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [product?.id, refetchUser]);

  // Check if current user is the seller of this product
  const isOwnProduct = currentUser?.id && product?.seller_profiles?.user_id === currentUser.id;

  // Auto lead-capture: 3+ product views in same category, 10s+ each, known device
  useAutoLeadCapture(product?.id, product?.category_id);


  // Track product and page views for all visitors; device_id is only attached after consent.
  useEffect(() => {
    const trackView = async () => {
      if (!product?.id || hasTrackedView.current) return;
      hasTrackedView.current = true;

      const sessionId = hasDeviceConsent()
        ? (localStorage.getItem("session_id") || getEphemeralSessionId())
        : getEphemeralSessionId();
      if (hasDeviceConsent() && !localStorage.getItem("session_id")) localStorage.setItem("session_id", sessionId);

      if (!currentUser?.id && hasDeviceConsent()) {
        localStorage.setItem("pending_product_view", JSON.stringify({
          product_id: product.id,
          session_id: sessionId,
          start_time: Date.now(),
        }));
      }

      const { data: viewId, error: viewError } = await supabase.rpc("record_product_view" as any, {
        p_product_id: product.id,
        p_user_id: currentUser?.id || null,
        p_session_id: sessionId,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent || null,
      });
      if (!viewError && viewId) viewRecordId.current = String(viewId);

      const { data: pageViewId } = await supabase.rpc("record_visitor_page_view" as any, {
        p_page_type: "product",
        p_page_path: window.location.pathname,
        p_product_id: product.id,
        p_seller_id: product.seller_id || seller?.id || null,
        p_category_id: product.category_id || null,
        p_user_id: currentUser?.id || null,
        p_device_id: hasDeviceConsent() ? getDeviceId() || null : null,
        p_session_id: sessionId,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent || null,
        p_metadata: { product_name: product.name, seller_name: seller?.business_name || null },
      });
      if (pageViewId) pageViewRecordId.current = String(pageViewId);
    };

    trackView();
  }, [product?.id, currentUser?.id, deviceConsentTick]);

  // Update view with user data when user logs in
  useEffect(() => {
    const updatePendingView = async () => {
      if (currentUser?.id && product?.id) {
        const pendingView = localStorage.getItem("pending_product_view");
        if (pendingView) {
          try {
            const { product_id, session_id } = JSON.parse(pendingView);
            if (product_id === product.id) {
              // Update the view record with user_id
              await supabase
                .from("product_views")
                .update({ user_id: currentUser.id })
                .eq("session_id", session_id)
                .eq("product_id", product_id)
                .is("user_id", null);
              
              localStorage.removeItem("pending_product_view");
            }
          } catch (e) {
            console.error("Error updating pending view:", e);
          }
        }
      }
    };
    
    updatePendingView();
  }, [currentUser?.id, product?.id]);

  // Track view duration on unmount or page change
  useEffect(() => {
    const updateViewDuration = async () => {
      const duration = Math.floor((Date.now() - viewStartTime.current) / 1000);
      if (product?.id && viewRecordId.current) {
        await supabase.rpc("update_product_view_duration" as any, {
          p_view_id: viewRecordId.current,
          p_duration: duration,
        });
      }
      if (pageViewRecordId.current) {
        await supabase.rpc("update_visitor_page_view_duration" as any, {
          p_view_id: pageViewRecordId.current,
          p_duration: duration,
        });
      }
    };

    // Update on visibility change (user switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updateViewDuration();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      updateViewDuration();
    };
  }, [product?.id]);

  // Submit enquiry
  const submitEnquiry = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Product not found");
      if (!product.seller_profiles?.id) throw new Error("Seller profile not available. Please try again shortly.");
      
      if (enquiryForm.name.trim().length < 2) throw new Error("Please enter your name");
      if (enquiryForm.phone.replace(/\D/g, "").length < 7) throw new Error("Please enter a valid mobile number");
      if (enquiryForm.city.trim().length < 2) throw new Error("Please enter your city");

      const deviceId = ensureDeviceId();
      const storedSessionId = localStorage.getItem("session_id");
      const sessionId = storedSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (!storedSessionId) localStorage.setItem("session_id", sessionId);

      const { error } = await supabase.from("leads").insert({
        buyer_id: currentUser?.id || null,
        device_id: deviceId || null,
        guest_name: enquiryForm.name.trim(),
        guest_phone: enquiryForm.phone.trim(),
        seller_id: product.seller_profiles?.id,
        product_id: product.id,
        category_id: product.category_id,
        message: `Product enquiry: ${product.name}\nName: ${enquiryForm.name.trim()}\nMobile: ${enquiryForm.phone.trim()}\nCity: ${enquiryForm.city.trim()}`,
        status: "new",
        source: "public_product_enquiry",
        metadata: {
          product_name: product.name,
          seller_name: product.seller_profiles?.business_name,
          category_name: product.categories?.name,
          buyer_city: enquiryForm.city.trim(),
          session_id: sessionId,
          ...(deviceId ? { device_id: deviceId } : {}),
          product_slug: product.slug || product.id,
        },
      });
      if (error) throw error;

      if (deviceId) {
        const { error: vdErr } = await supabase.from("visitor_devices").upsert({
          device_id: deviceId,
          name: enquiryForm.name.trim(),
          phone: enquiryForm.phone.trim(),
          city: enquiryForm.city.trim(),
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "device_id" });
        if (vdErr) console.warn("visitor_devices upsert failed", vdErr);
      }


      await supabase
        .from("products")
        .update({ enquiry_count: (product.enquiry_count || 0) + 1 })
        .eq("id", product.id);

      return {
        id: crypto?.randomUUID?.() || `${Date.now()}`,
        status: "new",
        created_at: new Date().toISOString(),
      };
    },
    onSuccess: (data) => {
      setEnquiryReceipt({ name: enquiryForm.name.trim(), phone: enquiryForm.phone.trim(), city: enquiryForm.city.trim() });
      playSuccessTone();
      toast({ title: "Enquiry received", description: "The seller will contact you shortly." });
      if (product?.seller_profiles?.id) {
        unlockSeller(product.seller_profiles.id, {
          name: enquiryForm.name.trim(),
          phone: enquiryForm.phone.trim(),
          city: enquiryForm.city.trim(),
        });
      }
      setBottomBarExpanded(false);
    },
    onError: (error: any) => {
      setEnquiryReceipt(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Pre-fill enquiry form with user data
  useEffect(() => {
    if (currentUser?.profile) {
      setEnquiryForm((prev) => ({
        ...prev,
        name: currentUser.profile?.full_name || "",
        phone: currentUser.profile?.phone || "",
      }));
    }
  }, [currentUser]);

  const images = (product?.images as string[]) || [];
  const specifications = product?.specifications as Record<string, string> || {};

  if (productLoading) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-8">
          <DetailSkeleton />
        </div>
      </MarketplaceLayout>
    );
  }

  if (!product) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Product Not Found</h1>
          <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist or has been removed.</p>
          <Button asChild>
            <Link to="/search">Browse Products</Link>
          </Button>
        </div>
      </MarketplaceLayout>
    );
  }

  const seller = product.seller_profiles;
  const isSellerUnlocked = seller?.id ? !!unlockedSellers[seller.id] : false;
  const productUrl = `https://upcurvtrade.upcurv.in/product/${product.slug || product.id}`;
  const sellerProfileUrl = seller ? `/seller-profile/${seller.slug || seller.id}` : "/search";
  const productNudge = getProductNudge(product);

  // SEO helpers — keyword-first templates shared with the crawler renderer.
  const priceLabel = product.price_min
    ? `₹${product.price_min.toLocaleString()}${product.price_max ? ` - ₹${product.price_max.toLocaleString()}` : ""}/${product.moq_unit || "unit"}`
    : "";
  const seoTitle = productSeoTitle(product, seller);
  const seoDescription = productSeoDescription({
    product,
    seller,
    categoryName: product.categories?.name,
    specifications,
  });
  const seoKeywords = productSeoKeywords(product, seller, product.categories?.name);
  const productFaqList = productFaqs({ product, seller, categoryName: product.categories?.name });

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://upcurvtrade.upcurv.in/" },
      ...(product.categories ? [{ "@type": "ListItem", "position": 2, "name": product.categories.name, "item": `https://upcurvtrade.upcurv.in/category/${product.categories.slug}` }] : []),
      { "@type": "ListItem", "position": product.categories ? 3 : 2, "name": product.name, "item": productUrl },
    ],
  };
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || product.name,
    "image": images,
    "sku": product.id,
    "category": product.categories?.name,
    "brand": { "@type": "Brand", "name": seller?.business_name || "Upcurv Trade" },
    "url": productUrl,
    "additionalProperty": Object.entries(specifications).map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
    ...(productRating ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": productRating.avg.toFixed(1),
        "reviewCount": productRating.count,
      }
    } : (seller as any)?.avg_rating && (seller as any)?.total_reviews ? {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": Number((seller as any).avg_rating).toFixed(1),
        "reviewCount": (seller as any).total_reviews,
      }
    } : {}),
    ...(product.price_min && {
      "offers": {
        "@type": product.price_max ? "AggregateOffer" : "Offer",
        "url": productUrl,
        "priceCurrency": "INR",
        ...(product.price_max
          ? { "lowPrice": product.price_min, "highPrice": product.price_max }
          : { "price": product.price_min }),
        "availability": "https://schema.org/InStock",
        "seller": { "@type": "Organization", "name": seller?.business_name || "Upcurv Trade" }
      }
    })
  };

  const faqJsonLd = buildFaqJsonLd(productFaqList);


  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": seoTitle,
    "url": productUrl,
    "description": seoDescription,
    "isPartOf": { "@type": "WebSite", "name": "Upcurv Trade", "url": "https://upcurvtrade.upcurv.in/" },
    "about": { "@type": "Product", "name": product.name },
    "primaryImageOfPage": images[0] ? { "@type": "ImageObject", "url": images[0] } : undefined
  };

  return (
    <MarketplaceLayout hideMobileCta>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={seoKeywords} />
        <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
        <meta name="author" content={seller?.business_name || "Upcurv Trade"} />
        <link rel="canonical" href={productUrl} />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Upcurv Trade" />
        <meta property="og:url" content={productUrl} />
        {images[0] && <meta property="og:image" content={images[0]} />}
        {images[0] && <meta name="twitter:image" content={images[0]} />}
        {product.price_min && <meta property="product:price:amount" content={String(product.price_min)} />}
        {product.price_min && <meta property="product:price:currency" content="INR" />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(faqJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(webPageJsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <nav className="text-sm mb-6">
          <ol className="flex items-center gap-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li>/</li>
            {product.categories && (
              <>
                <li>
                  <Link to={`/category/${product.categories.slug}`} className="hover:text-foreground">
                    {product.categories.name}
                  </Link>
                </li>
                <li>/</li>
              </>
            )}
            <li className="text-foreground truncate">{product.name}</li>
          </ol>
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 mb-12 min-w-0">
          {/* Image Gallery */}
          <div className="space-y-4 min-w-0">

            <div className="relative aspect-square bg-muted rounded-xl overflow-hidden border">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-32 w-32 text-muted-foreground/30" />
                </div>
              )}
              
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-card transition-colors shadow-lg"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/80 backdrop-blur rounded-full flex items-center justify-center hover:bg-card transition-colors shadow-lg"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.is_featured && (
                  <Badge className="bg-accent text-accent-foreground">
                    <Star className="h-3 w-3 mr-1" /> Featured
                  </Badge>
                )}
                {seller?.verification_status === "verified" && (
                  <Badge className="bg-trust text-trust-foreground">
                    <Shield className="h-3 w-3 mr-1" /> Verified Seller
                  </Badge>
                )}
              </div>

              {/* Actions */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full"
                  aria-label="Share this product"
                  onClick={() => { setShareOpen(true); trackCta(product.id, product.seller_id, "share"); }}
                >
                  <Share2 className="h-4 w-4" />
                </Button>

              </div>
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-20 h-20 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      i === currentImageIndex ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6 min-w-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {product.categories && (
                  <Badge variant="outline">{product.categories.name}</Badge>
                )}
              </div>
              
              {productNudge && (() => {
                const NudgeIcon = productNudge.icon;
                return (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm shadow-sm">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-background text-accent">
                      <NudgeIcon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold text-foreground">{productNudge.label}</span>
                      <span className="block text-xs text-muted-foreground">{productNudge.detail}</span>
                    </span>
                  </div>
                );
              })()}

              <UrgencyBadgeStack product={product} count={3} size="sm" className="mb-3" />
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{product.name}</h1>
              
              {/* Intent-aware pricing (retail vs wholesale) */}
              <ProductCommercials product={product} onBulkQuote={() => setBestPriceOpen(true)} />

              {/* Get Best Price (multi-supplier RFQ) + Market benchmark */}
              <div className="grid gap-3 sm:grid-cols-2 mb-6">
                <GetBestPriceButton
                  product={{ id: product.id, name: product.name, unit: product.price_unit || product.unit }}
                  open={bestPriceOpen}
                  onOpenChange={setBestPriceOpen}
                />
                <PriceBenchmark
                  categoryId={product.category_id}
                  city={seller?.city}
                  currentPrice={product.price || product.price_min || null}
                  currency={product.currency || "₹"}
                  unit={product.price_unit || product.unit}
                />
              </div>



              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 py-4 border-y border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{seller?.avg_response_time || 24}h avg response</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <span>Pan India Delivery</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-trust" />
                  <span>{seller?.response_rate || 0}% response rate</span>
                </div>
              </div>
            </div>

            <AiInsightCard product={product} seller={seller} />

            {/* Also suitable for — checklist instead of hashtags */}
            {product.tags && product.tags.length > 0 && (
              <div className="rounded-xl border bg-muted/30 p-4">
                <h3 className="mb-2.5 text-sm font-semibold">Also suitable for</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {product.tags.map((tag: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" />
                      <span className="min-w-0 break-words text-foreground">{tag}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}


            {/* Description */}
            {product.description && (
              <div className="min-w-0">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" /> Product Description
                </h3>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed break-words">{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {Object.keys(specifications).length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Specifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3 py-2 px-3 bg-muted rounded-lg text-sm min-w-0">
                      <span className="text-muted-foreground shrink-0">{key}</span>
                      <span className="font-medium text-foreground text-right break-words min-w-0">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Quick-contact action bar (WhatsApp / Call / Quote / Requirement) */}
            {seller && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
                {seller.whatsapp || seller.phone ? (
                  <a
                    href={`https://wa.me/${(seller.whatsapp || seller.phone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name} listed on Upcurv Trade.`)}`}
                    onClick={() => trackCta(product.id, product.seller_id, "whatsapp")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-[#25D366] bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366] hover:text-white px-3 py-3 text-sm font-semibold transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" /> WhatsApp
                  </a>
                ) : null}
                {seller.phone ? (
                  <a
                    href={`tel:${seller.phone}`}
                    onClick={() => trackCta(product.id, product.seller_id, "call")}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-3 py-3 text-sm font-semibold transition-colors"
                  >
                    <Phone className="h-4 w-4" /> Call Supplier
                  </a>
                ) : null}
                <button
                  onClick={() => { trackCta(product.id, product.seller_id, "quote"); setEnquiryOpen(true); }}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-accent bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground px-3 py-3 text-sm font-semibold transition-colors"
                >
                  <IndianRupee className="h-4 w-4" /> Request Quote
                </button>
                <Link
                  to={`/post-requirement?product=${encodeURIComponent(product.name)}${product.category_id ? `&category=${product.category_id}` : ""}`}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 bg-card hover:bg-muted px-3 py-3 text-sm font-semibold transition-colors"
                >
                  <Package className="h-4 w-4" /> Send Requirement
                </Link>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">

              <Dialog open={enquiryOpen} onOpenChange={(next) => { setEnquiryOpen(next); if (!next) setEnquiryReceipt(null); }}>
                <DialogTrigger asChild>
                  <Button size="lg" className="flex-1 gradient-accent hover:opacity-90 text-lg h-14">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    {shoppingIntent.isBusiness ? "Request Bulk Quote" : "Enquire Now"}
                  </Button>
                </DialogTrigger>
                <DialogContent overlayClassName="backdrop-blur-none" className="max-w-md rounded-2xl sm:rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {enquiryReceipt
                        ? (enquiryMode === "call" ? "Supplier's Number" : "Enquiry Sent")
                        : (enquiryMode === "call" ? "Fill the form to get their number immediately" : `Send Enquiry for ${product.name}`)}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {enquiryReceipt ? (
                      <div className="py-6 text-center space-y-4">
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-trust/10 text-trust animate-pulse-slow">
                          <svg viewBox="0 0 96 96" className="h-20 w-20" fill="none" aria-hidden="true">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" opacity="0.22" />
                            <path d="M30 49.5 42.5 62 68 34" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">Enquiry sent successfully</h3>
                          <p className="mt-1 text-sm text-muted-foreground">The seller will contact you shortly.</p>
                        </div>
                        <div className="text-left rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Product</span><span className="font-medium text-right line-clamp-1">{product.name}</span></div>
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Name</span><span className="font-medium">{enquiryReceipt.name}</span></div>
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">Mobile</span><span className="font-medium">{enquiryReceipt.phone}</span></div>
                          <div className="flex justify-between gap-3"><span className="text-muted-foreground">City</span><span className="font-medium">{enquiryReceipt.city}</span></div>
                        </div>
                        {seller?.phone && enquiryMode === "call" && (
                          <a
                            href={`tel:${seller.phone}`}
                            className="block rounded-lg border-2 border-primary bg-primary/5 p-4 text-center hover:bg-primary/10 transition"
                          >
                            <div className="text-xs text-muted-foreground mb-1">Tap to call</div>
                            <div className="text-2xl font-bold text-primary">{seller.phone}</div>
                          </a>
                        )}
                        <Button type="button" className="w-full" onClick={() => setEnquiryOpen(false)}>Done</Button>
                      </div>
                    ) : (
                    <>

                    <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                      {images.length > 0 ? (
                        <img src={images[0]} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-background rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{seller?.business_name}</p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <Input placeholder="Your name" value={enquiryForm.name} onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Mobile Number *</Label>
                        <Input inputMode="tel" placeholder="+91 98765 43210" value={enquiryForm.phone} onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>City *</Label>
                        <Input placeholder="Your city" value={enquiryForm.city} onChange={(e) => setEnquiryForm({ ...enquiryForm, city: e.target.value })} required />
                      </div>
                    </div>

                    <Button
                      onClick={() => submitEnquiry.mutate()}
                      disabled={submitEnquiry.isPending || !enquiryForm.name || !enquiryForm.phone || !enquiryForm.city}
                      className="w-full gradient-accent"
                    >
                      {submitEnquiry.isPending ? "Sending..." : (enquiryMode === "call" ? "Get Their Number" : "Enquire Now")}
                    </Button>
                    </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {seller && (
                <Button size="lg" variant="outline" asChild className="flex-1 h-14">
                  <Link to={sellerProfileUrl}>
                    <Building2 className="h-5 w-5 mr-2" />
                    View Seller Profile
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Marketplace psychology strip */}
        <MarketplacePsychology product={product} seller={seller} />

        <AdSlot placement="product_bottom" categoryId={product?.category_id} className="mb-8" />


        {/* Seller Info Card */}
        {seller && (
          <Card className="mb-12">

            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                    {seller.logo_url ? (
                      <img src={seller.logo_url} alt={seller.business_name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        to={sellerProfileUrl}
                        className="font-semibold text-lg tracking-wide hover:text-primary hover:underline"
                      >
                        {seller.business_name}
                      </Link>
                      {seller.verification_status === "verified" && (
                        <CheckCircle2 className="h-5 w-5 text-trust" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm flex items-center gap-1 mb-2">
                      <MapPin className="h-4 w-4" />
                      {seller.city}, {seller.state}
                    </p>
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="font-medium tracking-wider">
                        {isSellerUnlocked
                          ? (unlockedSellers[seller.id]?.phone || "Contact via enquiry")
                          : "+91 XXXXX-XXXXX"}
                      </span>
                    </div>
                    {!isSellerUnlocked && (
                      <Button size="sm" onClick={() => setEnquiryOpen(true)} className="gradient-accent mb-3">
                        <Phone className="h-4 w-4 mr-2" /> Reveal Contact
                      </Button>
                    )}
                    {isSellerUnlocked && (
                      <Badge className="mb-3 bg-trust text-trust-foreground">Unlocked · 30 min</Badge>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {seller.business_type && (
                        <Badge variant="outline" className="text-xs">
                          <Factory className="h-3 w-3 mr-1" /> {seller.business_type}
                        </Badge>
                      )}
                      {seller.established_year && (
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" /> Est. {seller.established_year}
                        </Badge>
                      )}
                      {seller.employee_count && (
                        <Badge variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" /> {seller.employee_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator orientation="vertical" className="hidden md:block h-auto" />

                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Shield className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{seller.trust_score || 0}%</div>
                    <div className="text-xs text-muted-foreground">Trust Score</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <MessageSquare className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{seller.response_rate || 0}%</div>
                    <div className="text-xs text-muted-foreground">Response Rate</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{seller.avg_response_time || 24}h</div>
                    <div className="text-xs text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <Award className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{seller.annual_turnover || "N/A"}</div>
                    <div className="text-xs text-muted-foreground">Turnover</div>
                  </div>
                </div>
              </div>

              {seller.description && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">{seller.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <ProductReviews productId={product.id} sellerId={product.seller_id} productName={product.name} />
        </div>

        {/* Visible FAQ — mirrors the FAQPage schema so Google can award rich results */}
        <Card className="mb-8">
          <CardContent className="p-5 md:p-6">
            <h2 className="mb-3 text-lg font-bold">
              {product.name} — frequently asked questions
            </h2>
            <Accordion type="single" collapsible>
              {productFaqList.map((f) => (
                <AccordionItem key={f.question} value={f.question}>
                  <AccordionTrigger className="text-left text-sm font-medium">{f.question}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>


        <RelatedServices
          productName={product.name}
          categoryName={product.categories?.name}
          city={seller?.city}
        />

        <Tabs defaultValue="seller-products" className="mb-12">
          <TabsList className="mb-4">
            <TabsTrigger value="seller-products">More from this seller</TabsTrigger>
            <TabsTrigger value="similar-products">Similar products</TabsTrigger>
          </TabsList>
          {[
            { value: "seller-products", items: sellerProducts || [] },
            { value: "similar-products", items: relatedProducts || [] },
          ].map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {tab.items.map((relProduct: any) => (
                    <Link key={relProduct.id} to={`/product/${relProduct.slug || relProduct.id}`}>
                      <Card className="h-full group overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
                          {relProduct.images && (relProduct.images as string[]).length > 0 ? (
                            <img
                              src={(relProduct.images as string[])[0]}
                              alt={relProduct.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                            {relProduct.name}
                          </h3>
                          {(relProduct.price_min || relProduct.price_max) && (
                            <div className="flex items-center gap-0.5 text-sm font-semibold text-primary">
                              <IndianRupee className="h-3.5 w-3.5" />
                              {relProduct.price_min?.toLocaleString()}
                            </div>
                          )}
                          {relProduct.seller_profiles && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
                              {relProduct.seller_profiles.verification_status === "verified" && (
                                <CheckCircle2 className="h-3 w-3 text-trust" />
                              )}
                              {relProduct.seller_profiles.business_name}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">No products to show yet.</CardContent>
                </Card>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Mobile sticky Enquire Now bar with swipe-up expand */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background border-t shadow-2xl transition-all duration-300"
        style={{ transform: bottomBarExpanded ? "translateY(0)" : "translateY(0)" }}
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (touchStartY.current == null) return;
          const dy = touchStartY.current - e.changedTouches[0].clientY;
          if (dy > 40) setBottomBarExpanded(true);
          if (dy < -40) setBottomBarExpanded(false);
          touchStartY.current = null;
        }}
      >
        <div className="flex justify-center py-1.5 cursor-pointer" onClick={() => setBottomBarExpanded(v => !v)}>
          <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        </div>
        {bottomBarExpanded && (
          <div className="px-4 pb-3 space-y-2 border-b">
            <div className="flex items-center gap-3">
              {images[0] ? (
                <img src={images[0]} alt="" className="w-12 h-12 rounded object-cover" />
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                {product.price_min && (
                  <p className="text-sm font-semibold text-primary flex items-center">
                    <IndianRupee className="h-3 w-3" />{product.price_min.toLocaleString()}
                    <span className="text-xs text-muted-foreground ml-1">/ {product.price_unit || "Piece"}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="p-3 grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-12 font-semibold text-base border-2"
            onClick={() => { setEnquiryMode("call"); setEnquiryOpen(true); }}
          >
            <Phone className="h-5 w-5 mr-2" /> Call
          </Button>
          <Button className="h-12 gradient-accent font-semibold text-base" onClick={() => { setEnquiryMode("enquire"); setEnquiryOpen(true); }}>
            <MessageSquare className="h-5 w-5 mr-2" /> Enquire Now
          </Button>
        </div>
      </div>
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        title={product.name}
        text={`${product.name}${seller?.business_name ? ` by ${seller.business_name}` : ""} on Upcurv Trade`}
      />
      <LeadPersuasionLayer
        productId={product.id}
        avgResponseHours={seller?.avg_response_time || undefined}
        submitted={!!enquiryReceipt}
        onCta={() => setEnquiryOpen(true)}
      />
    </MarketplaceLayout>

  );
}

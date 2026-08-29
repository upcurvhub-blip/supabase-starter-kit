import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { hydrateQueryCache } from "./lib/queryCachePersist";

// Auth

// Public Pages
import Home from "./pages/Home";

// Seller Pages

// Admin Pages
import ScrollToTop from "./components/ScrollToTop";
import { ExitIntentDialog } from "./components/ExitIntentDialog";
import { CookieConsentPrompt } from "./components/CookieConsentPrompt";
import { ShoppingIntentProvider } from "./hooks/useShoppingIntent";
import { ShoppingIntentDialog } from "./components/intent/ShoppingIntentDialog";
import { CityPreferenceProvider } from "./hooks/useCityPreference";
import { LocationCapturePrompt } from "./components/LocationCapturePrompt";
import { FloatingActions } from "./components/FloatingActions";


import { RedirectHandler } from "./components/RedirectHandler";
import { RequireRole } from "./components/RequireRole";
import { RouteTransition } from "./components/RouteTransition";
import { PageSkeleton } from "./components/ui/loading-states";

// Route-level code splitting: only the visited page's JS is downloaded.
const Auth = lazy(() => import("./pages/Auth"));
const Search = lazy(() => import("./pages/Search"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ServiceDetail = lazy(() => import("./pages/ServiceDetail"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const Categories = lazy(() => import("./pages/Categories"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const SuppliersByCityCategory = lazy(() => import("./pages/SuppliersByCityCategory"));
const LocalLandingPage = lazy(() => import("./pages/LocalLandingPage"));
const LocalLandingPages = lazy(() => import("./pages/admin/LocalLandingPages"));
const PostRequirement = lazy(() => import("./pages/PostRequirement"));
const MatchedLeads = lazy(() => import("./pages/seller/MatchedLeads"));
const SellerDashboard = lazy(() => import("./pages/seller/Dashboard"));
const SellerOnboarding = lazy(() => import("./pages/seller/Onboarding"));
const MyProducts = lazy(() => import("./pages/seller/MyProducts"));
const LeadInbox = lazy(() => import("./pages/seller/LeadInbox"));
const SellerAnalytics = lazy(() => import("./pages/seller/Analytics"));
const Subscription = lazy(() => import("./pages/seller/Subscription"));
const EditProfile = lazy(() => import("./pages/seller/EditProfile"));
const SellerAvailability = lazy(() => import("./pages/seller/Availability"));
const DealPipeline = lazy(() => import("./pages/seller/DealPipeline"));
const SellerServices = lazy(() => import("./pages/seller/Services"));
const SellerGuide = lazy(() => import("./pages/seller/Guide"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const SellerDetail = lazy(() => import("./pages/admin/SellerDetail"));
const ManageSellers = lazy(() => import("./pages/admin/ManageSellers"));
const ManageCategories = lazy(() => import("./pages/admin/ManageCategories"));
const ManagePlans = lazy(() => import("./pages/admin/ManagePlans"));
const ManageLeads = lazy(() => import("./pages/admin/ManageLeads"));
const ManageRequirements = lazy(() => import("./pages/admin/ManageRequirements"));
const PlatformSettings = lazy(() => import("./pages/admin/PlatformSettings"));
const AdminAnalytics = lazy(() => import("./pages/admin/Analytics"));
const LeadPricing = lazy(() => import("./pages/admin/LeadPricing"));
const AutoLeads = lazy(() => import("./pages/admin/AutoLeads"));
const BusinessLeads = lazy(() => import("./pages/admin/BusinessLeads"));
const TodayAnalysis = lazy(() => import("./pages/admin/TodayAnalysis"));
const SeoConsole = lazy(() => import("./pages/admin/SeoConsole"));
const SeoGuide = lazy(() => import("./pages/admin/SeoGuide"));
const ManageAds = lazy(() => import("./pages/admin/ManageAds"));
const DailyOps = lazy(() => import("./pages/admin/DailyOps"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const FindBusinesses = lazy(() => import("./pages/FindBusinesses"));
const Cities = lazy(() => import("./pages/Cities"));
const DirectoryPage = lazy(() => import("./pages/directory/DirectoryPage"));
const BrandPage = lazy(() => import("./pages/directory/BrandPage"));
const CityHubPage = lazy(() => import("./pages/directory/CityHubPage"));
const BuyingGuide = lazy(() => import("./pages/directory/BuyingGuide"));
const Guides = lazy(() => import("./pages/directory/Guides"));
const TradeShows = lazy(() => import("./pages/TradeShows"));
const TradeLeads = lazy(() => import("./pages/TradeLeads"));
const Distributors = lazy(() => import("./pages/Distributors"));
const Pricing = lazy(() => import("./pages/Pricing"));
const BusinessNeeds = lazy(() => import("./pages/BusinessNeeds"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 min — return cached data instantly on back-nav
      gcTime: 60 * 60 * 1000, // keep in memory 1 hour
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

// Lightweight public-page cache: persist successful query results to
// localStorage so repeat visits render instantly without refetching.
hydrateQueryCache(queryClient);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ShoppingIntentProvider>
        <CityPreferenceProvider>
        <ScrollToTop />
        <RedirectHandler />
        <ExitIntentDialog />
        <CookieConsentPrompt />
        <ShoppingIntentDialog />
        <LocationCapturePrompt />
        <FloatingActions />
        <Suspense fallback={<PageSkeleton />}>
        <RouteTransition>
        <Routes>
          {/* Public Routes (anonymous buyers) */}
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/search" element={<Search />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/service/:slug" element={<ServiceDetail />} />
          <Route path="/seller-profile/:slug" element={<SellerProfile />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/suppliers/:categorySlug/:citySlug" element={<SuppliersByCityCategory />} />
          <Route path="/manufacturers/:categorySlug" element={<DirectoryPage role="manufacturers" />} />
          <Route path="/manufacturers/:categorySlug/:citySlug" element={<DirectoryPage role="manufacturers" />} />
          <Route path="/suppliers/:categorySlug" element={<DirectoryPage role="suppliers" />} />
          <Route path="/exporters/:categorySlug" element={<DirectoryPage role="exporters" />} />
          <Route path="/exporters/:categorySlug/:citySlug" element={<DirectoryPage role="exporters" />} />
          <Route path="/wholesalers/:categorySlug" element={<DirectoryPage role="wholesalers" />} />
          <Route path="/wholesalers/:categorySlug/:citySlug" element={<DirectoryPage role="wholesalers" />} />
          <Route path="/brand/:brandSlug" element={<BrandPage />} />
          <Route path="/brand/:brandSlug/:categorySlug" element={<BrandPage />} />
          <Route path="/city/:citySlug" element={<CityHubPage />} />
          <Route path="/city/:citySlug/:categorySlug" element={<CityHubPage />} />
          <Route path="/guides" element={<Guides />} />
          <Route path="/guides/:categorySlug" element={<BuyingGuide />} />

          <Route path="/local/:slug" element={<LocalLandingPage />} />
          <Route path="/post-requirement" element={<PostRequirement />} />
          <Route path="/requirements" element={<PostRequirement />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />
          <Route path="/find-businesses" element={<FindBusinesses />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/trade-shows" element={<TradeShows />} />
          <Route path="/trade-leads" element={<TradeLeads />} />
          <Route path="/distributors" element={<Distributors />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/business-needs" element={<BusinessNeeds />} />

          {/* Seller Routes */}
          <Route path="/seller" element={<RequireRole role="seller"><SellerDashboard /></RequireRole>} />
          <Route path="/seller/onboarding" element={<RequireRole role="seller"><SellerOnboarding /></RequireRole>} />
          <Route path="/seller/products" element={<RequireRole role="seller"><MyProducts /></RequireRole>} />
          <Route path="/seller/leads" element={<RequireRole role="seller"><LeadInbox /></RequireRole>} />
          <Route path="/seller/matched-leads" element={<RequireRole role="seller"><MatchedLeads /></RequireRole>} />
          <Route path="/seller/analytics" element={<RequireRole role="seller"><SellerAnalytics /></RequireRole>} />
          <Route path="/seller/subscription" element={<RequireRole role="seller"><Subscription /></RequireRole>} />
          <Route path="/seller/profile" element={<RequireRole role="seller"><EditProfile /></RequireRole>} />
          <Route path="/seller/availability" element={<RequireRole role="seller"><SellerAvailability /></RequireRole>} />
          <Route path="/seller/deals" element={<RequireRole role="seller"><DealPipeline /></RequireRole>} />
          <Route path="/seller/services" element={<RequireRole role="seller"><SellerServices /></RequireRole>} />
          <Route path="/seller/guide" element={<RequireRole role="seller"><SellerGuide /></RequireRole>} />

          {/* Admin Routes */}
          <Route path="/admin" element={<RequireRole role="admin"><AdminDashboard /></RequireRole>} />
          <Route path="/admin/sellers" element={<RequireRole role="admin"><ManageSellers /></RequireRole>} />
          <Route path="/admin/sellers/:id" element={<RequireRole role="admin"><SellerDetail /></RequireRole>} />
          <Route path="/admin/categories" element={<RequireRole role="admin"><ManageCategories /></RequireRole>} />
          <Route path="/admin/plans" element={<RequireRole role="admin"><ManagePlans /></RequireRole>} />
          <Route path="/admin/leads" element={<RequireRole role="admin"><ManageLeads /></RequireRole>} />
          <Route path="/admin/requirements" element={<RequireRole role="admin"><ManageRequirements /></RequireRole>} />
          <Route path="/admin/pricing" element={<RequireRole role="admin"><LeadPricing /></RequireRole>} />
          <Route path="/admin/analytics" element={<RequireRole role="admin"><AdminAnalytics /></RequireRole>} />
          <Route path="/admin/settings" element={<RequireRole role="admin"><PlatformSettings /></RequireRole>} />
          <Route path="/admin/auto-leads" element={<RequireRole role="admin"><AutoLeads /></RequireRole>} />
          <Route path="/admin/business-leads" element={<RequireRole role="admin"><BusinessLeads /></RequireRole>} />
          <Route path="/admin/daily-ops" element={<RequireRole role="admin"><DailyOps /></RequireRole>} />
          <Route path="/admin/today" element={<RequireRole role="admin"><TodayAnalysis /></RequireRole>} />
          <Route path="/admin/local-pages" element={<RequireRole role="admin"><LocalLandingPages /></RequireRole>} />
          <Route path="/admin/seo" element={<RequireRole role="admin"><SeoConsole /></RequireRole>} />
          <Route path="/admin/seo-guide" element={<RequireRole role="admin"><SeoGuide /></RequireRole>} />
          <Route path="/admin/ads" element={<RequireRole role="admin"><ManageAds /></RequireRole>} />


          {/* Catch-all */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </RouteTransition>
        </Suspense>
        </CityPreferenceProvider>
        </ShoppingIntentProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

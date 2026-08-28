import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Building2, Target, Shield, Zap } from "lucide-react";

export default function About() {
  return (
    <MarketplaceLayout>
      <Helmet>
        <title>About Upcurv Trade — India's Trusted B2B Marketplace</title>
        <meta name="description" content="Upcurv Trade is a unit of Upcurv Innovations Pvt Ltd, connecting Indian buyers with verified suppliers across every industry." />
        <link rel="canonical" href="https://upcurvtrade.upcurv.in/about" />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-10 w-10 text-accent" />
          <h1 className="text-3xl md:text-4xl font-bold">About Upcurv Trade</h1>
        </div>
        <p className="text-lg text-muted-foreground mb-6">
          Upcurv Trade is India's fast-growing B2B marketplace, built to connect genuine buyers with
          verified manufacturers, wholesalers and service providers across every category.
        </p>
        <p className="text-muted-foreground mb-8">
          Upcurv Trade is a unit of <strong>Upcurv Innovations Pvt Ltd</strong>, a technology company
          headquartered in Coimbatore, Tamil Nadu. Our mission is to make B2B trade in India simple,
          transparent and trustworthy — powered by verified supplier profiles, admin-curated lead routing
          and intelligent buyer-intent matching.
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-10">
          <div className="p-6 rounded-xl border bg-card">
            <Target className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Our Mission</h3>
            <p className="text-sm text-muted-foreground">Empower every Indian business — small or large — with the tools to buy and sell smarter.</p>
          </div>
          <div className="p-6 rounded-xl border bg-card">
            <Shield className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Trust First</h3>
            <p className="text-sm text-muted-foreground">Every seller is manually reviewed by our admin team before going live on the platform.</p>
          </div>
          <div className="p-6 rounded-xl border bg-card">
            <Zap className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Faster Deals</h3>
            <p className="text-sm text-muted-foreground">Smart RFQ routing puts your requirement in front of the right suppliers within minutes.</p>
          </div>
        </div>

        <div className="mt-12 p-6 rounded-xl bg-muted">
          <h2 className="font-semibold text-lg mb-3">Parent Company</h2>
          <p className="text-sm text-muted-foreground">
            <strong>Upcurv Innovations Pvt Ltd</strong> — Building thoughtful technology products for Indian
            businesses. Upcurv Trade is one of the flagship products of Upcurv Innovations.
          </p>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

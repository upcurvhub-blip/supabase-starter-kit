import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";

export default function TermsOfService() {
  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Terms of Service — Upcurv Trade</title>
        <meta name="description" content="Terms of service for using Upcurv Trade — India's verified B2B marketplace by Upcurv Innovations Pvt Ltd." />
        <link rel="canonical" href="https://upcurvtrade.upcurv.in/terms-of-service" />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 2026</p>

        <section className="space-y-4 text-muted-foreground">
          <p>By accessing or using Upcurv Trade (operated by Upcurv Innovations Pvt Ltd), you agree to be bound by these Terms of Service.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">1. Platform role</h2>
          <p>Upcurv Trade is an online marketplace that connects buyers and sellers. We are not a party to the actual sale transaction between buyer and seller.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">2. Seller obligations</h2>
          <p>Sellers must provide accurate business information, genuine product listings and respond to buyer enquiries within the agreed SLA. False or misleading listings may lead to account suspension.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">3. Buyer obligations</h2>
          <p>Buyers must submit genuine enquiries with accurate contact details. Misuse of the enquiry system for spam or scraping is prohibited.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">4. Subscriptions</h2>
          <p>Paid seller subscriptions are billed as per the plan chosen. Please read the Refund Policy for cancellation terms.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">5. Limitation of liability</h2>
          <p>Upcurv Trade is not liable for disputes, quality issues or damages arising from transactions between buyers and sellers.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">6. Modifications</h2>
          <p>We may update these terms from time to time. Continued use of the platform indicates acceptance of updated terms.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">7. Governing law</h2>
          <p>These terms are governed by the laws of India, with exclusive jurisdiction in Coimbatore, Tamil Nadu.</p>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

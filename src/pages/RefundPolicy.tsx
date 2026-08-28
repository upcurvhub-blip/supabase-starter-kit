import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";

export default function RefundPolicy() {
  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Refund Policy — Upcurv Trade</title>
        <meta name="description" content="Upcurv Trade refund and cancellation policy for seller subscription plans and paid services." />
        <link rel="canonical" href="https://upcurvtrade.upcurv.in/refund-policy" />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Refund Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 2026</p>

        <section className="space-y-4 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground mt-2">1. Subscription refunds</h2>
          <p>Seller subscription fees paid to Upcurv Trade are refundable within 7 days of purchase provided no leads have been consumed against the subscription.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">2. Lead credits</h2>
          <p>Consumed lead credits are non-refundable. Unused lead credits may be carried forward to the next billing cycle at our discretion.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">3. How to request a refund</h2>
          <p>Email <strong>upcurvinnovations@gmail.com</strong> with your registered mobile number and reason for cancellation. Approved refunds are processed within 7–10 working days to the original payment source.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">4. Non-refundable items</h2>
          <p>Verification fees, custom onboarding services and third-party gateway charges are non-refundable.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">5. Contact</h2>
          <p>For any refund query, contact us at +91 6380715292 or upcurvinnovations@gmail.com.</p>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

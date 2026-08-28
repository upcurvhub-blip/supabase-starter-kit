import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";

export default function PrivacyPolicy() {
  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Privacy Policy — Upcurv Trade</title>
        <meta name="description" content="Read the Upcurv Trade privacy policy. How we collect, use and safeguard your information on India's B2B marketplace." />
        <link rel="canonical" href="https://upcurvtrade.upcurv.in/privacy-policy" />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-3xl prose prose-slate">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: July 2026</p>

        <section className="space-y-4 text-muted-foreground">
          <p>Upcurv Trade ("we", "our", "us"), a unit of Upcurv Innovations Pvt Ltd, respects your privacy and is committed to protecting the personal information you share with us on this platform.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">1. Information we collect</h2>
          <p>When you submit an enquiry, post a requirement, or register as a seller, we collect information such as your name, mobile number, city, email, business details and enquiry content.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">2. How we use your information</h2>
          <p>We use your information to route enquiries to relevant suppliers, verify seller profiles, improve platform features, and communicate transactional updates.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">3. Sharing with suppliers</h2>
          <p>When you submit an enquiry, your name, mobile number and city are shared with the specific supplier(s) you enquired with. We never sell your data to third parties.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">4. Cookies & analytics</h2>
          <p>We use cookies and anonymous session identifiers to understand product interest patterns and improve the buyer experience.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">5. Data security</h2>
          <p>All data is stored on secure infrastructure with role-based access controls. We follow industry best practices to protect your data.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">6. Your rights</h2>
          <p>You may request deletion or correction of your data any time by writing to upcurvinnovations@gmail.com.</p>

          <h2 className="text-xl font-semibold text-foreground mt-6">7. Contact</h2>
          <p>Upcurv Innovations Pvt Ltd, Coimbatore, Tamil Nadu — upcurvinnovations@gmail.com — +91 6380715292</p>
        </section>
      </div>
    </MarketplaceLayout>
  );
}

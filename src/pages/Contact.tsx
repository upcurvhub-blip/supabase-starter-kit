import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Phone, Mail, MapPin } from "lucide-react";

export default function Contact() {
  return (
    <MarketplaceLayout>
      <Helmet>
        <title>Contact Upcurv Trade — Get in Touch</title>
        <meta name="description" content="Contact Upcurv Trade support. Call 6380715292, email upcurvinnovations@gmail.com, or visit us in Coimbatore, Tamil Nadu." />
        <link rel="canonical" href="https://upcurvtrade.upcurv.in/contact" />
      </Helmet>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Contact Us</h1>
        <p className="text-muted-foreground mb-8">
          We'd love to hear from you. Reach out for support, partnership or seller onboarding queries.
        </p>

        <div className="grid gap-4">
          <a href="tel:+916380715292" className="flex items-center gap-4 p-6 rounded-xl border bg-card hover:border-primary transition-colors">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Call us</p>
              <p className="font-semibold text-lg">+91 6380715292</p>
            </div>
          </a>

          <a href="mailto:upcurvinnovations@gmail.com" className="flex items-center gap-4 p-6 rounded-xl border bg-card hover:border-primary transition-colors">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email us</p>
              <p className="font-semibold text-lg">upcurvinnovations@gmail.com</p>
            </div>
          </a>

          <div className="flex items-center gap-4 p-6 rounded-xl border bg-card">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Visit us</p>
              <p className="font-semibold text-lg">Coimbatore, Tamil Nadu, India</p>
            </div>
          </div>
        </div>

        <div className="mt-10 p-6 rounded-xl bg-muted">
          <p className="text-sm text-muted-foreground">
            Upcurv Trade is a unit of <strong>Upcurv Innovations Pvt Ltd</strong>. For business partnership or
            press queries, please email us with a brief note and we will respond within 1–2 working days.
          </p>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

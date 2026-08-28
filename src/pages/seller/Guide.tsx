import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Package,
  MessageSquare,
  BarChart3,
  Briefcase,
  UserCog,
  CreditCard,
} from "lucide-react";

const SECTIONS = [
  {
    icon: UserCog,
    title: "1. Complete your business profile",
    body: "Add your business name, city, GST, logo and cover photo. Verified, complete profiles rank higher in supplier listings and get noticeably more enquiries.",
    href: "/seller/profile",
    cta: "Edit profile",
  },
  {
    icon: Package,
    title: "2. Add products the right way",
    body: "Pick a selling mode first — Retail for individual shoppers, Wholesale for bulk buyers, or both. Retail needs MRP, selling price and stock; wholesale needs a price range, MOQ and lead time. Fill specifications and policies so buyers stop asking basic questions.",
    href: "/seller/products",
    cta: "Manage products",
  },
  {
    icon: MessageSquare,
    title: "3. Respond to leads fast",
    body: "Every enquiry, call request and quote request lands in the Lead Inbox. Buyers usually pick whoever replies first, so aim to respond within an hour — your response rate is shown on your public profile.",
    href: "/seller/leads",
    cta: "Open inbox",
  },
  {
    icon: Briefcase,
    title: "4. Work the deal pipeline",
    body: "Move each lead through New, Contacted, Quoted and Won so nothing goes cold. The pipeline is your follow-up list, not just a report.",
    href: "/seller/deals",
    cta: "View pipeline",
  },
  {
    icon: BarChart3,
    title: "5. Read your analytics weekly",
    body: "Rising views with flat enquiries usually means price, photos or missing specs. Falling views means your listings need fresher titles, tags and categories.",
    href: "/seller/analytics",
    cta: "See analytics",
  },
  {
    icon: CreditCard,
    title: "6. Upgrade when leads outgrow the free plan",
    body: "Paid plans unlock more lead credits, featured placement and matched leads that fit your categories and city.",
    href: "/seller/subscription",
    cta: "View plans",
  },
];

export default function SellerGuide() {
  return (
    <DashboardLayout role="seller" title="Seller Guide">
      <div className="max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">How to use the seller portal</h1>
          <p className="text-muted-foreground mt-1">
            A short, practical walkthrough of everything in the sidebar — in the order that actually gets you sales.
          </p>
        </header>

        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <Card key={s.title}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <s.icon className="h-4 w-4 text-accent" />
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                <Link to={s.href} className="text-sm font-semibold text-primary hover:underline">
                  {s.cta} →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-medium text-foreground">Why is my product not visible?</span> New listings go live after approval and need at least one image and a category.</p>
            <p><span className="font-medium text-foreground">Retail or wholesale?</span> Choose both if you sell single pieces and bulk — buyers then see the version that fits them.</p>
            <p><span className="font-medium text-foreground">How do buyers reach me?</span> Through WhatsApp, call and enquiry buttons on your listings; all of them are logged as leads.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/**
 * Unique head metadata for every static (non-dynamic) public route.
 *
 * Used twice:
 *  - at build time, to emit a prerendered `dist/<route>/index.html` with the
 *    right title/description/canonical baked in (so Google's sitelinks stop
 *    showing one boilerplate snippet for every page);
 *  - at runtime, as the source of truth for <PageMeta /> on those routes.
 */
export type StaticRouteMeta = {
  path: string;
  title: string;
  description: string;
};

export const SITE_ORIGIN = "https://upcurvtrade.upcurv.in";

export const STATIC_ROUTE_META: StaticRouteMeta[] = [
  {
    path: "/",
    title: "Upcurv Trade | India's Trusted B2B Marketplace for Manufacturers & Suppliers",
    description:
      "Source from verified Indian manufacturers, wholesalers and exporters on Upcurv Trade. Compare prices, post a requirement and get quotes from 3 suppliers within 24 hours.",
  },
  {
    path: "/categories",
    title: "All B2B Product Categories in India — Industrial, Raw Material & Machinery",
    description:
      "Browse every Upcurv Trade category: industrial machinery, chemicals, packaging, building materials, electricals and more, each with verified Indian suppliers and live price ranges.",
  },
  {
    path: "/cities",
    title: "Manufacturers & Suppliers by City in India — City-Wise B2B Directory",
    description:
      "Find manufacturers, wholesalers and exporters city by city — Mumbai, Delhi, Coimbatore, Ahmedabad, Surat and 700+ more districts, with verified sellers and local price benchmarks.",
  },
  {
    path: "/search",
    title: "Search Products, Services & Suppliers — Upcurv Trade B2B Search",
    description:
      "Search across thousands of B2B products, services and verified suppliers. Filter by category, city, price and MOQ, then send one enquiry to multiple sellers at once.",
  },
  {
    path: "/post-requirement",
    title: "Post Your Requirement — Get Quotes From 3 Verified Suppliers in 24 Hours",
    description:
      "Tell us what you need to buy and we broadcast your RFQ to matched verified suppliers. Free to post, quotes usually within 24 hours, no obligation to purchase.",
  },
  {
    path: "/requirements",
    title: "Live Buyer Requirements & RFQs from Indian Businesses",
    description:
      "Browse open buyer requirements posted on Upcurv Trade. Sellers can view live RFQs by category and city and respond with a quote directly.",
  },
  {
    path: "/business-needs",
    title: "Sourcing Engine — Tell Us Your Business, Get Your Buy List",
    description:
      "Describe your business and the Upcurv sourcing engine maps the raw materials, machinery, packaging and services you need, with matched suppliers for each line item.",
  },
  {
    path: "/find-businesses",
    title: "Find Verified Businesses in India — Supplier & Manufacturer Search",
    description:
      "Search verified Indian businesses by name, category and city. See GST-verified status, product range, response time and contact them on WhatsApp instantly.",
  },
  {
    path: "/trade-shows",
    title: "Indian Trade Shows & B2B Exhibitions Calendar",
    description:
      "Upcoming industrial trade shows and B2B exhibitions across India by sector and city — dates, venues and who exhibits, for buyers and suppliers planning visits.",
  },
  {
    path: "/trade-leads",
    title: "Buy Trade Leads — Verified Buyer Enquiries for Indian Sellers",
    description:
      "Purchase verified buyer enquiries matched to your category and city. Pay only for leads relevant to what you manufacture or supply.",
  },
  {
    path: "/distributors",
    title: "Find Distributors & Dealers for Your Products in India",
    description:
      "Appoint distributors, dealers and channel partners across Indian states and districts. List your distribution opportunity and reach interested businesses.",
  },
  {
    path: "/guides",
    title: "B2B Buying Guides — Specs, Price Ranges & Supplier Checklists",
    description:
      "Practical buying guides for Indian B2B purchases: what specifications matter, typical price ranges, MOQ norms and how to vet a supplier before ordering.",
  },
  {
    path: "/pricing",
    title: "Seller Membership Plans & Pricing — Upcurv Trade",
    description:
      "Compare Upcurv Trade seller plans: lead credits, listing limits, verified badge, priority placement and analytics. Transparent pricing with no hidden fees.",
  },
  {
    path: "/about",
    title: "About Upcurv Trade — Who We Are and How the Marketplace Works",
    description:
      "Upcurv Trade connects Indian buyers with verified manufacturers and suppliers. Learn how we verify sellers, route enquiries and keep quotes competitive.",
  },
  {
    path: "/contact",
    title: "Contact Upcurv Trade — Support for Buyers and Sellers",
    description:
      "Get in touch with the Upcurv Trade team for onboarding, verification, billing or lead-related support. Response within one working day.",
  },
  {
    path: "/privacy-policy",
    title: "Privacy Policy — How Upcurv Trade Handles Your Data",
    description:
      "How Upcurv Trade collects, stores and shares buyer and seller data, what we share with suppliers when you enquire, and how to request deletion.",
  },
  {
    path: "/terms-of-service",
    title: "Terms of Service — Using the Upcurv Trade Marketplace",
    description:
      "The terms governing buyer and seller use of Upcurv Trade, including listing rules, lead usage, prohibited items and dispute handling.",
  },
  {
    path: "/refund-policy",
    title: "Refund & Cancellation Policy — Upcurv Trade Memberships",
    description:
      "When Upcurv Trade membership fees and lead credits are refundable, how to raise a request and the timelines for processing refunds.",
  },
];

export const staticRouteMeta = (path: string) =>
  STATIC_ROUTE_META.find((r) => r.path === (path.replace(/\/+$/, "") || "/"));

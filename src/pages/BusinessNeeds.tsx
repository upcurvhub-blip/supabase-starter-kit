import { Helmet } from "react-helmet-async";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { BusinessNeedsFinder } from "@/components/BusinessNeedsFinder";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { Factory, Boxes, PackageCheck, Sparkles } from "lucide-react";

const STEPS = [
  { icon: Factory, title: "Describe your business", text: "One line is enough — “fertilizer manufacturer”, “water plant”, “garment unit”." },
  { icon: Boxes, title: "We map your buy-list", text: "Our engine converts your industry into raw material, machinery, packing and service groups." },
  { icon: PackageCheck, title: "Get verified suppliers", text: "Every group links to live categories and products with verified sellers ready to quote." },
];

const BusinessNeeds = () => (
  <MarketplaceLayout>
    <Helmet>
      <title>Sourcing Engine — What Does My Business Need to Buy? | {SITE_NAME}</title>
      <meta
        name="description"
        content="Describe your business and our sourcing engine lists the raw materials, machinery, packing materials and services you need — with verified suppliers and live products for each."
      />
      <link rel="canonical" href={`${SITE_URL}/business-needs`} />
    </Helmet>

    <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="container relative mx-auto px-4 py-12 md:py-16 max-w-4xl">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Sourcing engine
        </span>
        <h1 className="mt-4 text-3xl md:text-5xl font-bold leading-tight">
          Tell us your business — we'll show exactly what you need to buy
        </h1>
        <p className="mt-4 text-muted-foreground md:text-lg">
          A fertilizer manufacturer needs chemicals, HDPE bottles, granulating machines and packing
          material. A water plant needs RO systems, PET bottles, caps and labels. Type your business
          and get the full sourcing checklist — mapped to live categories and real products.
        </p>
        <div className="mt-8">
          <BusinessNeedsFinder />
        </div>
      </div>
    </section>

    <section className="container mx-auto px-4 py-10 md:py-14 max-w-5xl">
      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <Card key={s.title} className="border-primary/10">
            <CardContent className="p-5">
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </span>
              <h2 className="text-sm font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  </MarketplaceLayout>
);

export default BusinessNeeds;

// Proactive "AI consultant" advisory panel for the seller dashboard.
// Turns raw dashboard numbers into ranked, actionable growth actions.
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, ArrowRight, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Props {
  seller: any;
  products: any[];
  leads: any[];
  services?: any[];
}

type Action = {
  key: string;
  title: string;
  detail: string;
  impact: string;
  severity: "high" | "medium" | "low";
  cta?: { label: string; to: string };
};

const MARKET = { minProducts: 10, minImages: 3, replyMins: 12, minDescription: 250 };

export function AiConsultantPanel({ seller, products = [], leads = [], services = [] }: Props) {
  const actions: Action[] = [];
  const totalProducts = products.length;
  const withFewImages = products.filter((p) => (p.images?.length || (p.primary_image_url ? 1 : 0)) < MARKET.minImages).length;
  const thinDescriptions = products.filter((p) => (p.description?.length || 0) < MARKET.minDescription).length;
  const noPrice = products.filter((p) => !p.price && !p.price_min).length;
  const newLeads = leads.filter((l) => l.status === "new" || !l.status).length;
  const replyMins = seller?.response_time_minutes ?? seller?.avg_response_time ?? null;
  const certs = Array.isArray(seller?.certifications) ? seller.certifications.length : 0;

  if (totalProducts < MARKET.minProducts) {
    const gap = MARKET.minProducts - totalProducts;
    actions.push({
      key: "catalog",
      title: `Upload ${gap} more product${gap > 1 ? "s" : ""} to increase enquiries by ~${Math.min(80, gap * 9)}%`,
      detail: `Sellers with ${MARKET.minProducts}+ listings appear in far more category and city search results.`,
      impact: `+${Math.min(80, gap * 9)}% enquiry potential`,
      severity: "high",
      cta: { label: "Add products", to: "/seller/products" },
    });
  }
  if (withFewImages > 0) {
    actions.push({
      key: "images",
      title: `Your images are below marketplace average on ${withFewImages} listing${withFewImages > 1 ? "s" : ""}`,
      detail: `Buyers shortlist listings with ${MARKET.minImages}+ real photos. Add factory, packaging and in-use shots.`,
      impact: "+34% click-through",
      severity: "high",
      cta: { label: "Fix images", to: "/seller/products" },
    });
  }
  if (replyMins === null || replyMins > MARKET.replyMins) {
    actions.push({
      key: "response",
      title: `Respond within ${MARKET.replyMins} mins to improve rankings`,
      detail: replyMins ? `Your average is ${replyMins} mins. Faster repliers get lead priority in matching.` : "Set your availability so leads route to you instantly.",
      impact: "Higher lead priority",
      severity: newLeads > 0 ? "high" : "medium",
      cta: { label: "Open lead inbox", to: "/seller/leads" },
    });
  }
  if (newLeads > 0) {
    actions.push({
      key: "leads",
      title: `${newLeads} lead${newLeads > 1 ? "s are" : " is"} still unanswered`,
      detail: "Buyers usually pick the supplier who quotes first. Quote now before your competitors do.",
      impact: `${newLeads} deals at risk`,
      severity: "high",
      cta: { label: "Quote now", to: "/seller/leads" },
    });
  }
  if (thinDescriptions > 0) {
    actions.push({
      key: "content",
      title: `${thinDescriptions} listing${thinDescriptions > 1 ? "s have" : " has"} thin descriptions`,
      detail: "Add specifications, applications and MOQ. Longer, keyword-rich content ranks on Google product searches.",
      impact: "+22% organic traffic",
      severity: "medium",
      cta: { label: "Improve content", to: "/seller/products" },
    });
  }
  if (noPrice > 0) {
    actions.push({
      key: "price",
      title: `Add pricing to ${noPrice} listing${noPrice > 1 ? "s" : ""}`,
      detail: "Listings with a price or price range get significantly more serious enquiries than 'ask for quote'.",
      impact: "+18% qualified leads",
      severity: "medium",
      cta: { label: "Set prices", to: "/seller/products" },
    });
  }
  if (seller?.verification_status !== "verified") {
    actions.push({
      key: "verify",
      title: "Complete verification to unlock the Verified Supplier badge",
      detail: "Verified suppliers win the majority of high-value enquiries on the platform.",
      impact: "Trust multiplier",
      severity: "high",
      cta: { label: "Complete profile", to: "/seller/profile" },
    });
  }
  if (certs === 0) {
    actions.push({
      key: "certs",
      title: "Add certifications (ISO, BIS, CE) to your company profile",
      detail: "Certifications are one of the top trust checks buyers scan before shortlisting.",
      impact: "Stronger trust report",
      severity: "medium",
      cta: { label: "Add certifications", to: "/seller/profile" },
    });
  }
  if (!services.length) {
    actions.push({
      key: "services",
      title: "Publish a service to capture installation & AMC enquiries",
      detail: "Service listings appear on related product pages and pull additional recurring leads.",
      impact: "New lead channel",
      severity: "low",
      cta: { label: "Add a service", to: "/seller/services" },
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  actions.sort((a, b) => order[a.severity] - order[b.severity]);

  const healthChecks = [
    totalProducts >= MARKET.minProducts,
    withFewImages === 0,
    thinDescriptions === 0,
    noPrice === 0,
    seller?.verification_status === "verified",
    certs > 0,
    replyMins !== null && replyMins <= MARKET.replyMins,
    newLeads === 0,
  ];
  const score = Math.round((healthChecks.filter(Boolean).length / healthChecks.length) * 100);

  const tone = {
    high: "border-destructive/40 bg-destructive/5",
    medium: "border-premium/40 bg-premium/5",
    low: "border-border bg-muted/40",
  } as const;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" /> Your AI Growth Consultant
            </CardTitle>
            <CardDescription>Prioritised actions based on today's marketplace benchmarks</CardDescription>
          </div>
          <div className="min-w-[170px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Account health</span>
              <span className="font-semibold">{score}%</span>
            </div>
            <Progress value={score} className="h-2" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {actions.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Everything looks strong — keep responding fast to hold your ranking.
          </div>
        ) : (
          actions.slice(0, 6).map((a) => (
            <div key={a.key} className={`rounded-lg border p-3 ${tone[a.severity]}`}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {a.severity === "high" ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <TrendingUp className="h-4 w-4 text-primary shrink-0" />}
                    <span className="text-sm font-semibold">{a.title}</span>
                    <Badge variant="outline" className="text-[10px]">{a.impact}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{a.detail}</p>
                </div>
                {a.cta && (
                  <Button size="sm" variant={a.severity === "high" ? "default" : "outline"} asChild className="shrink-0">
                    <Link to={a.cta.to} className="gap-1">{a.cta.label} <ArrowRight className="h-3 w-3" /></Link>
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default AiConsultantPanel;

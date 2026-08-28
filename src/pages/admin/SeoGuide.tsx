import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Search, MapPin, Image as ImageIcon, HelpCircle, TrendingUp, Building2 } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "1. Verify the property & submit sitemaps",
    body: [
      "Search Console → Add property → Domain → upcurv.in (covers upcurvtrade.upcurv.in and every subdomain).",
      "Sitemaps → submit `sitemap.xml`. Confirm status is Success and the discovered URL count is close to (active products + services + sellers + categories + city pages).",
      "Re-submit the sitemap whenever bulk listings are added — it is the fastest way to get new URLs crawled.",
    ],
  },
  {
    icon: TrendingUp,
    title: "2. Read the Performance report the right way",
    body: [
      "Filter Page contains `/product/` and sort by Impressions. High impressions + CTR under 2% = the title tag is the problem, not the ranking.",
      "Positions 11–20 are the fastest wins: improve those existing pages (specs, FAQs, price band) instead of publishing new ones.",
      "Filter Query contains a city name to see which city pages already earn impressions — double down on those districts first.",
    ],
  },
  {
    icon: HelpCircle,
    title: "3. Watch the Indexing report",
    body: [
      "`Crawled – currently not indexed` on city/category pages means Google sees them as near-duplicates. Add unique local context, seller count and price range to those templates.",
      "`Discovered – currently not indexed` means crawl budget: reduce thin pages and link the important ones from the homepage and category hubs.",
      "Use URL Inspection → Test live URL on a new product to confirm the prerendered HTML (title, description, FAQ schema) is what Google receives.",
    ],
  },
  {
    icon: Building2,
    title: "4. Make vendor brand searches land on us",
    body: [
      "Every approved seller has a public profile with Organization + LocalBusiness schema, alternateName variants and the business name first in the title tag.",
      "Ask sellers to link their profile URL from their own website, Google Business Profile and social bios — brand-name ranking is driven by external mentions.",
      "In Search Console, filter Query contains the seller's business name to confirm the profile page is the page ranking for it.",
    ],
  },
  {
    icon: MapPin,
    title: "5. City-wise SEO",
    body: [
      "Sellers now pick State → City from a fixed district list, so `/city/:city` and `/manufacturers/:category/:city` pages group cleanly with no spelling variants.",
      "Each city page needs at least a few genuinely unique sentences: supplier count, top categories, typical price band, local industrial clusters.",
      "Interlink: city hub → top categories in that city → individual products, using the product name as anchor text.",
    ],
  },
  {
    icon: ImageIcon,
    title: "6. Image SEO",
    body: [
      "Uploaded product and category images are automatically renamed to the product/category slug (e.g. `ms-angle-bar-…jpg`) — this is a real ranking factor in Google Images.",
      "Always keep alt text as the product name + city. It is generated automatically on product cards and detail pages.",
      "Google Images sends a meaningful share of B2B enquiries; check Performance → Search type: Image monthly.",
    ],
  },
];

const FAQS = [
  {
    q: "How long until new products get indexed?",
    a: "IndexNow (Bing/Yandex) picks them up within minutes. Google typically takes 3–14 days for a new domain; the crawl rate improves as more pages earn impressions. Use SEO Console → Submit single URL for high-priority listings.",
  },
  {
    q: "Why do several pages show the same description in Google?",
    a: "That happens when Google indexes the app shell before the page-specific tags render. Every public route now ships a unique server-rendered title and description via the crawler renderer plus build-time prerendering of static routes. Re-request indexing for the affected URLs after a deploy.",
  },
  {
    q: "What should I fix first each week?",
    a: "1) Pages at position 11–20 with impressions. 2) Product pages with CTR below 2%. 3) Any 'Crawled – currently not indexed' cluster. In that order.",
  },
];

export default function SeoGuide() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Playbook</h1>
        <p className="text-sm text-muted-foreground">
          How to use Google Search Console to grow product, seller and city-wise visibility.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="https://search.google.com/search-console" target="_blank" rel="noopener">
          <Badge variant="secondary" className="gap-1 py-1.5">
            <ExternalLink className="h-3 w-3" /> Google Search Console
          </Badge>
        </a>
        <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener">
          <Badge variant="secondary" className="gap-1 py-1.5">
            <ExternalLink className="h-3 w-3" /> Bing Webmaster Tools
          </Badge>
        </a>
        <a href="/sitemap.xml" target="_blank" rel="noopener">
          <Badge variant="secondary" className="gap-1 py-1.5">
            <ExternalLink className="h-3 w-3" /> sitemap.xml
          </Badge>
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {STEPS.map((s) => (
          <Card key={s.title} className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <h2 className="font-semibold">{s.title}</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {s.body.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-2 font-semibold">Common questions</h2>
        <Accordion type="single" collapsible>
          {FAQS.map((f) => (
            <AccordionItem key={f.q} value={f.q}>
              <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}

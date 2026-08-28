import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { ChevronRight, BookOpen } from "lucide-react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { canonical } from "@/lib/seo/meta";

interface Faq {
  question: string;
  answer: string;
}

export default function BuyingGuide() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const [guide, setGuide] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: cat } = await supabase.from("categories").select("*").eq("slug", categorySlug || "").maybeSingle();
      if (!active) return;
      setCategory(cat);

      // Match by slug first, else by category
      let { data: g } = await supabase
        .from("buying_guides")
        .select("*")
        .eq("slug", categorySlug || "")
        .eq("is_published", true)
        .maybeSingle();
      if (!g && cat) {
        const { data: byCat } = await supabase
          .from("buying_guides")
          .select("*")
          .eq("category_id", cat.id)
          .eq("is_published", true)
          .maybeSingle();
        g = byCat;
      }
      setGuide(g);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [categorySlug]);

  const title = guide?.title || (category ? `${category.name} Buying Guide` : "Buying Guide");
  const desc = guide?.meta_description || (category
    ? `Complete buying guide for ${category.name.toLowerCase()}: types, sizes, applications, price factors, how to choose, and FAQs — curated on ${SITE_NAME}.`
    : "");
  const url = canonical(`/guides/${categorySlug}`);

  const faqs: Faq[] = Array.isArray(guide?.faq_json) ? guide.faq_json : [];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: desc,
      url,
      author: { "@type": "Organization", name: SITE_NAME },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      datePublished: guide?.created_at,
      dateModified: guide?.updated_at,
    },
    ...(faqs.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          },
        ]
      : []),
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_URL}/guides` },
        { "@type": "ListItem", position: 3, name: title, item: url },
      ],
    },
  ];

  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{title} | {SITE_NAME}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={desc} />
        <meta property="og:url" content={url} />
        <meta name="robots" content="index,follow,max-image-preview:large" />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      <div className="container mx-auto px-4 py-6 md:py-10 max-w-4xl">
        <nav className="text-xs md:text-sm mb-3 text-muted-foreground flex items-center gap-1 flex-wrap">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span>Guides</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>
        <h1 className="text-2xl md:text-4xl font-bold flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" /> {title}
        </h1>

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !guide ? (
          <div className="mt-8 rounded-xl border p-6 bg-card">
            <p className="text-muted-foreground">
              No buying guide published for {category?.name || "this category"} yet.
            </p>
            {category && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/category/${category.slug}`} className="text-sm px-3 py-1.5 rounded-full border hover:border-primary">
                  Browse {category.name} products
                </Link>
                <Link to={`/manufacturers/${category.slug}`} className="text-sm px-3 py-1.5 rounded-full border hover:border-primary">
                  Top {category.name} manufacturers
                </Link>
              </div>
            )}
          </div>
        ) : (
          <>
            <article className="prose prose-slate max-w-none mt-6" dangerouslySetInnerHTML={{ __html: guide.body_md || "" }} />
            {faqs.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {faqs.map((f, i) => (
                    <details key={i} className="rounded-lg border p-4 bg-card">
                      <summary className="font-medium cursor-pointer">{f.question}</summary>
                      <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </MarketplaceLayout>
  );
}

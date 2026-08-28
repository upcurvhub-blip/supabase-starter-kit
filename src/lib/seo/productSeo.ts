import { SITE_NAME } from "@/lib/site";

export type SeoFaq = { question: string; answer: string };

type BuildArgs = {
  product: any;
  seller?: any;
  categoryName?: string;
  specifications?: Record<string, any>;
};

function priceLabel(product: any) {
  if (!product?.price_min) return "";
  const unit = product.moq_unit || product.price_unit || "unit";
  return product.price_max
    ? `₹${Number(product.price_min).toLocaleString()} – ₹${Number(product.price_max).toLocaleString()}/${unit}`
    : `₹${Number(product.price_min).toLocaleString()}/${unit}`;
}

/**
 * Exact-match first product title: the product name leads the tag with no
 * prefix, then buying intent keywords ("Price", "Buy Online / Bulk"), then
 * city and brand. Google weighs the earliest words most for name queries.
 */
export function productSeoTitle(product: any, seller?: any) {
  const name = product?.name || "Product";
  const city = seller?.city ? ` in ${seller.city}` : "";
  const full = `${name} — Price, Buy Online & Bulk Quote${city} | ${SITE_NAME}`;
  if (full.length <= 70) return full;
  const mid = `${name} — Price & Buy Online${city} | ${SITE_NAME}`;
  if (mid.length <= 70) return mid;
  const short = `${name} | ${SITE_NAME}`;
  return short.length <= 70 ? short : short.slice(0, 67) + "…";
}


/**
 * Unique, page-specific meta description. Never boilerplate — every product
 * page must read differently or Google collapses them into one snippet.
 */
export function productSeoDescription(args: BuildArgs) {
  const { product, seller, categoryName, specifications = {} } = args;
  const specSnippet = Object.entries(specifications)
    .slice(0, 2)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const price = priceLabel(product);
  const parts = [
    `${product?.name}${categoryName ? ` (${categoryName})` : ""}`,
    `from ${seller?.business_name || "verified suppliers"}${seller?.city ? `, ${seller.city}` : ""}`,
    price ? `at ${price}` : "",
  ].filter(Boolean);
  const tail = [
    specSnippet,
    `MOQ ${product?.min_order_quantity || 1} ${product?.moq_unit || "unit"}`,
    "Get price & delivery in 24 hrs.",
  ]
    .filter(Boolean)
    .join(". ");
  return `Buy ${parts.join(" ")}. ${tail}`.replace(/\s+/g, " ").slice(0, 158);
}

export function productSeoKeywords(product: any, seller?: any, categoryName?: string) {
  return [
    product?.name,
    `${product?.name} price`,
    `${product?.name} supplier`,
    `${product?.name} manufacturer`,
    seller?.city ? `${product?.name} in ${seller.city}` : "",
    categoryName,
    ...(product?.tags || []),
    seller?.business_name,
    seller?.city,
    "wholesale",
    "B2B",
    SITE_NAME,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * FAQ template used both for the visible on-page FAQ block and FAQPage
 * structured data — Google needs the answer text visible to award rich results.
 */
export function productFaqs(args: BuildArgs): SeoFaq[] {
  const { product, seller, categoryName } = args;
  const name = product?.name || "this product";
  const city = seller?.city || "India";
  const sellerName = seller?.business_name || "a verified supplier";
  const price = priceLabel(product);
  const unit = product?.moq_unit || product?.price_unit || "unit";

  const faqs: SeoFaq[] = [
    {
      question: `What is the price of ${name} in ${city}?`,
      answer: price
        ? `${name} is listed at ${price} by ${sellerName}${seller?.city ? ` in ${seller.city}` : ""}. Final pricing depends on order quantity, specification and delivery location — send an enquiry to get a written quote.`
        : `Pricing for ${name} is quoted on request by ${sellerName}${seller?.city ? ` in ${seller.city}` : ""}, because it varies with quantity, specification and delivery location. Send an enquiry to receive a written quote.`,
    },
    {
      question: `What is the minimum order quantity (MOQ) for ${name}?`,
      answer: `The minimum order quantity is ${product?.min_order_quantity || 1} ${unit}. Larger volumes usually attract better per-${unit} pricing.`,
    },
    {
      question: `Who supplies ${name}${seller?.city ? ` in ${seller.city}` : ""}?`,
      answer: `${sellerName}${seller?.city ? `, based in ${seller.city}` : ""}, supplies ${name} on ${SITE_NAME}. You can view the full company profile, product range and contact the supplier directly on WhatsApp or phone.`,
    },
    {
      question: `How fast will I get a quote for ${name}?`,
      answer: `Enquiries are routed instantly to the supplier and, on request, to up to 5 verified ${categoryName ? categoryName.toLowerCase() + " " : ""}suppliers. Most buyers receive their first quote within 24 hours.`,
    },
    {
      question: `Can I get ${name} delivered across India?`,
      answer: `Yes. Suppliers on ${SITE_NAME} ship pan-India; freight, packaging and lead time are confirmed with your quote. Mention your delivery city in the enquiry for an accurate landed price.`,
    },
    {
      question: `Is the supplier of ${name} verified?`,
      answer:
        seller?.verification_status === "verified"
          ? `Yes — ${sellerName} is a verified supplier on ${SITE_NAME}, with business details checked before listing.`
          : `${sellerName} is listed on ${SITE_NAME} with business details on file. Always confirm GST, capacity and samples before placing a bulk order.`,
    },
  ];

  return faqs;
}

export function faqJsonLd(faqs: SeoFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

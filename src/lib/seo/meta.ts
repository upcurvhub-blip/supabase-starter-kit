import { SITE_NAME, SITE_URL } from "@/lib/site";

export function pageTitle(...parts: string[]) {
  return [...parts.filter(Boolean), SITE_NAME].join(" | ");
}

export function canonical(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function productTitleTemplate(name: string, city?: string, seller?: string) {
  // Keyword-first: product name leads, then the dual buy/bulk intent, then place.
  const sellerPart = seller ? ` by ${seller}` : "";
  const cityPart = city ? ` – ${city}` : "";
  return `${name}${sellerPart} — Buy Online or Get Bulk Price${cityPart} | ${SITE_NAME}`;
}

export function productDescription(name: string, city?: string, brand?: string) {
  const b = brand ? `${brand} branded ` : "";
  const c = city ? ` in ${city}` : "";
  return `Buy ${b}${name}${c} online at retail price or request a bulk wholesale quote from verified sellers on ${SITE_NAME}. Compare prices, specs, delivery and returns, then contact the seller directly.`;
}

export function directoryTitle(role: string, categoryName: string, cityName?: string) {
  const cap = role[0].toUpperCase() + role.slice(1);
  return cityName
    ? `${categoryName} ${cap} in ${cityName} — Buy Retail or Bulk from Verified ${cap}`
    : `${categoryName} ${cap} in India — Retail & Wholesale from Verified ${cap}`;
}

export function directoryDescription(role: string, categoryName: string, cityName?: string, count?: number) {
  const c = cityName ? ` in ${cityName}` : " across India";
  const n = count ? `${count}+ ` : "";
  return `Find ${n}verified ${categoryName.toLowerCase()} ${role}${c} on ${SITE_NAME}. Shop single pieces at retail prices or request bulk quotes, compare sellers and connect instantly via WhatsApp or phone.`;
}

export function cityHubTitle(cityName: string) {
  return `Shops, Suppliers & Manufacturers in ${cityName} — Verified Sellers Directory`;
}

export function brandTitle(brand: string, category?: string) {
  return category
    ? `${brand} ${category} — Authorized Dealers & Suppliers`
    : `${brand} — Products, Suppliers & Dealer Directory`;
}

// Rule-based "tell us your business → what you need to buy" engine.
// Maps a free-text business description to need groups, then matches those
// groups against real categories in the database (name / slug / keywords).

export interface NeedGroup {
  label: string;
  terms: string[];
}

interface IndustryProfile {
  id: string;
  label: string;
  match: string[];
  needs: NeedGroup[];
}

const UNIVERSAL: NeedGroup[] = [
  { label: "Packing & Packaging", terms: ["packaging", "packing", "carton", "box", "bottle", "label", "bag", "film", "printing"] },
  { label: "Machinery & Equipment", terms: ["machine", "machinery", "equipment", "plant", "automation", "industrial"] },
  { label: "Logistics & Handling", terms: ["logistics", "transport", "material handling", "pallet", "trolley", "warehouse", "courier"] },
  { label: "Safety & Maintenance", terms: ["safety", "ppe", "glove", "maintenance", "tool", "spare", "lubricant"] },
];

export const INDUSTRY_PROFILES: IndustryProfile[] = [
  {
    id: "fertilizer",
    label: "Fertilizer / Agro-input manufacturing",
    match: ["fertilizer", "fertiliser", "agro", "agri", "pesticide", "manure", "compost"],
    needs: [
      { label: "Raw Chemicals", terms: ["chemical", "urea", "acid", "solvent", "mineral", "additive"] },
      { label: "Bottles, Bags & Containers", terms: ["bottle", "hdpe", "bag", "sack", "drum", "container", "jar"] },
      { label: "Processing Machinery", terms: ["granulator", "mixer", "blender", "dryer", "machine", "conveyor", "plant"] },
      { label: "Packing Material", terms: ["packaging", "label", "printing", "carton", "sealing", "film"] },
      { label: "Lab & Testing", terms: ["laboratory", "testing", "instrument", "analyser", "weighing"] },
    ],
  },
  {
    id: "food",
    label: "Food, beverage & packaged water",
    match: ["food", "beverage", "water", "snack", "bakery", "dairy", "juice", "spice", "restaurant", "hotel"],
    needs: [
      { label: "Ingredients & Raw Material", terms: ["ingredient", "spice", "flour", "sugar", "oil", "food", "dairy", "grain"] },
      { label: "Bottles, Jars & Cans", terms: ["bottle", "pet", "jar", "can", "cap", "container", "pouch"] },
      { label: "Processing & Filling Machines", terms: ["filling machine", "packaging machine", "machine", "boiler", "chiller", "ro plant", "water treatment"] },
      { label: "Cold Chain & Storage", terms: ["refrigeration", "cold storage", "freezer", "chiller", "storage"] },
      { label: "Hygiene & Cleaning", terms: ["cleaning", "sanitizer", "detergent", "hygiene", "housekeeping"] },
    ],
  },
  {
    id: "construction",
    label: "Construction & infrastructure",
    match: ["construction", "builder", "contractor", "infra", "civil", "real estate", "interior"],
    needs: [
      { label: "Building Materials", terms: ["cement", "brick", "steel", "tile", "sand", "aggregate", "construction"] },
      { label: "Hardware & Fittings", terms: ["hardware", "fitting", "pipe", "valve", "fastener", "plumbing"] },
      { label: "Tools & Equipment", terms: ["tool", "equipment", "machinery", "scaffolding", "mixer"] },
      { label: "Electrical & Lighting", terms: ["electrical", "cable", "wire", "light", "switch", "panel"] },
      { label: "Safety Gear", terms: ["safety", "helmet", "ppe", "glove", "harness"] },
    ],
  },
  {
    id: "textile",
    label: "Textile, apparel & garments",
    match: ["textile", "garment", "apparel", "fashion", "fabric", "clothing", "knit", "yarn"],
    needs: [
      { label: "Fabric & Yarn", terms: ["fabric", "yarn", "cotton", "textile", "thread"] },
      { label: "Trims & Accessories", terms: ["button", "zipper", "label", "trim", "elastic", "accessor"] },
      { label: "Sewing & Finishing Machines", terms: ["sewing machine", "embroidery", "machine", "iron", "cutting"] },
      { label: "Dyes & Chemicals", terms: ["dye", "chemical", "bleach", "finishing"] },
      { label: "Packing Material", terms: ["poly bag", "packaging", "carton", "hanger", "printing"] },
    ],
  },
  {
    id: "pharma",
    label: "Pharma, medical & healthcare",
    match: ["pharma", "medical", "hospital", "clinic", "healthcare", "medicine", "diagnostic", "lab"],
    needs: [
      { label: "Active Ingredients & Chemicals", terms: ["chemical", "api", "excipient", "solvent", "reagent"] },
      { label: "Bottles, Blisters & Vials", terms: ["bottle", "vial", "blister", "ampoule", "cap", "packaging"] },
      { label: "Lab & Medical Equipment", terms: ["laboratory", "medical equipment", "instrument", "machine", "analyser"] },
      { label: "Disposables & Hygiene", terms: ["glove", "mask", "syringe", "disposable", "sanitizer"] },
      { label: "Cold Chain", terms: ["refrigeration", "cold storage", "chiller"] },
    ],
  },
  {
    id: "electronics",
    label: "Electronics & electrical manufacturing",
    match: ["electronic", "electrical", "pcb", "solar", "battery", "led", "appliance"],
    needs: [
      { label: "Components", terms: ["component", "electronic", "semiconductor", "connector", "resistor", "pcb"] },
      { label: "Wires, Cables & Panels", terms: ["cable", "wire", "panel", "switch", "electrical"] },
      { label: "Assembly Machines", terms: ["machine", "soldering", "automation", "testing equipment"] },
      { label: "Enclosures & Packaging", terms: ["enclosure", "plastic", "sheet metal", "packaging", "carton"] },
    ],
  },
  {
    id: "it",
    label: "IT, software & services business",
    match: ["it ", "software", "saas", "agency", "marketing", "consult", "startup", "digital"],
    needs: [
      { label: "IT Hardware", terms: ["computer", "laptop", "server", "electronics", "printer", "network"] },
      { label: "Office Supplies & Furniture", terms: ["office", "stationery", "furniture", "chair", "desk"] },
      { label: "Business Services", terms: ["business service", "legal", "accounting", "marketing", "advertising", "training"] },
      { label: "Facility & Housekeeping", terms: ["cleaning", "housekeeping", "security", "pantry"] },
    ],
  },
  {
    id: "retail",
    label: "Retail, distribution & trading",
    match: ["retail", "shop", "store", "distributor", "wholesale", "trading", "supermarket", "ecommerce"],
    needs: [
      { label: "Bulk Stock & Products", terms: ["wholesale", "bulk", "consumer", "fmcg", "grocery"] },
      { label: "Store Fixtures & Display", terms: ["display", "rack", "shelf", "furniture", "signage"] },
      { label: "Billing & POS Equipment", terms: ["pos", "billing", "printer", "barcode", "scanner", "computer"] },
      { label: "Packing Material", terms: ["carry bag", "packaging", "carton", "label", "printing"] },
    ],
  },
];

export function detectIndustry(input: string): IndustryProfile | null {
  const q = ` ${input.toLowerCase()} `;
  let best: { p: IndustryProfile; score: number } | null = null;
  for (const p of INDUSTRY_PROFILES) {
    const score = p.match.reduce((n, m) => (q.includes(m) ? n + m.length : n), 0);
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  return best?.p ?? null;
}

/** Build the need groups for a business description (industry-specific + universal). */
export function buildNeedGroups(input: string): { industry: string; groups: NeedGroup[] } {
  const profile = detectIndustry(input);
  const groups = profile ? [...profile.needs] : [];
  for (const u of UNIVERSAL) {
    if (!groups.some((g) => g.label === u.label)) groups.push(u);
  }
  return {
    industry: profile?.label || "General business sourcing",
    groups: groups.slice(0, 7),
  };
}

export interface MatchableCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  related_keywords?: string[] | null;
}

/** Match categories (top-level + subcategories) to each need group. */
export function matchCategories(
  groups: NeedGroup[],
  categories: MatchableCategory[],
  perGroup = 8,
) {
  const used = new Set<string>();
  return groups.map((group) => {
    const hits: MatchableCategory[] = [];
    for (const term of group.terms) {
      const t = term.toLowerCase();
      for (const c of categories) {
        if (used.has(c.id) || hits.some((h) => h.id === c.id)) continue;
        const haystack = `${c.name} ${c.slug} ${(c.related_keywords || []).join(" ")}`.toLowerCase();
        if (haystack.includes(t)) hits.push(c);
        if (hits.length >= perGroup) break;
      }
      if (hits.length >= perGroup) break;
    }
    hits.forEach((h) => used.add(h.id));
    return { ...group, categories: hits };
  }).filter((g) => g.categories.length > 0);
}

// Marketplace search intelligence: synonyms, misspelling repair, query expansion.
// Pure functions — safe to run on every keystroke.

export const SYNONYMS: Record<string, string[]> = {
  brick: ["bricks", "fly ash brick", "clay brick", "brick making machine", "brick kiln", "brick plant", "cement brick"],
  cement: ["opc cement", "ppc cement", "white cement", "cement bags", "ready mix concrete"],
  sand: ["m sand", "p sand", "river sand", "plastering sand", "construction sand"],
  ac: ["air conditioner", "split ac", "window ac", "ac installation", "ac repair service", "vrf system"],
  pipe: ["pipes", "pipe fittings", "gi pipe", "pvc pipe", "steel pipe", "ms pipe"],
  steel: ["tmt bar", "mild steel", "stainless steel", "steel sheets", "steel plates"],
  generator: ["dg set", "diesel generator", "genset", "silent generator"],
  pump: ["water pump", "submersible pump", "centrifugal pump", "monoblock pump"],
  machine: ["machinery", "industrial machine", "automatic machine", "manufacturing plant"],
  packaging: ["packing material", "carton box", "corrugated box", "shrink wrap", "packaging machine"],
  chemical: ["chemicals", "industrial chemical", "solvent", "additive"],
  paint: ["paints", "primer", "enamel paint", "industrial coating"],
  furniture: ["office furniture", "modular furniture", "chairs", "tables"],
  led: ["led lights", "led bulb", "led panel", "street light"],
  solar: ["solar panel", "solar inverter", "rooftop solar", "solar water heater"],
  transformer: ["distribution transformer", "power transformer", "step down transformer"],
  fabric: ["textile", "cloth", "cotton fabric", "garment fabric"],
  rice: ["basmati rice", "raw rice", "boiled rice", "rice mill"],
  oil: ["edible oil", "lubricant oil", "hydraulic oil", "engine oil"],
  crusher: ["stone crusher", "jaw crusher", "crushing plant"],
};

// Common typing/spelling mistakes seen in Indian B2B search
const MISSPELLINGS: Record<string, string> = {
  brik: "brick", bricks: "brick", brik_s: "brick", bric: "brick",
  cemnt: "cement", ciment: "cement", semant: "cement",
  machin: "machine", mashine: "machine", mechine: "machine", machien: "machine",
  suplier: "supplier", supplyer: "supplier", manufacturor: "manufacturer",
  manufaturer: "manufacturer", manufacturar: "manufacturer",
  aluminiun: "aluminium", alluminium: "aluminium",
  stainles: "stainless", stainlesss: "stainless",
  genarator: "generator", jenerator: "generator",
  transformar: "transformer", tranformer: "transformer",
  hydralic: "hydraulic", hydrolic: "hydraulic",
  coimbatoor: "coimbatore", coimbtore: "coimbatore", chenai: "chennai",
  banglore: "bangalore", bengalore: "bengaluru", mumabi: "mumbai",
  ahemdabad: "ahmedabad", hydrabad: "hyderabad",
};

const ROLE_WORDS = ["manufacturer", "manufacturers", "supplier", "suppliers", "dealer", "dealers", "wholesaler", "wholesalers", "exporter", "exporters", "distributor", "distributors"];
const CITY_HINTS = ["chennai", "coimbatore", "mumbai", "delhi", "bengaluru", "bangalore", "hyderabad", "pune", "ahmedabad", "kolkata", "surat", "jaipur", "madurai", "salem", "tiruppur", "kochi", "nagpur", "indore", "lucknow", "noida"];

export interface ParsedQuery {
  raw: string;
  corrected: string;
  didYouMean: string | null;
  tokens: string[];
  core: string;           // query with city/role words removed
  city: string | null;
  role: string | null;
  hsn: string | null;      // HSN code if the query looks like one
  partNumber: string | null;
  expansions: string[];    // related searches to surface
}

function correctToken(t: string): string {
  return MISSPELLINGS[t] || t;
}

export function parseQuery(raw: string): ParsedQuery {
  const cleaned = (raw || "").toLowerCase().replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ").filter(Boolean);
  const correctedTokens = tokens.map(correctToken);
  const corrected = correctedTokens.join(" ");

  const city = correctedTokens.find((t) => CITY_HINTS.includes(t)) || null;
  const role = correctedTokens.find((t) => ROLE_WORDS.includes(t)) || null;
  const hsn = /^\d{4,8}$/.test(cleaned) ? cleaned : null;
  const partNumber = /^[a-z0-9]*\d[a-z0-9-]{3,}$/i.test(cleaned) && !hsn ? cleaned : null;

  const stop = new Set([...ROLE_WORDS, ...CITY_HINTS, "in", "near", "me", "at", "for", "the", "and", "best", "top"]);
  const core = correctedTokens.filter((t) => !stop.has(t)).join(" ").trim() || corrected;

  const expansions: string[] = [];
  for (const t of correctedTokens) {
    const syn = SYNONYMS[t] || SYNONYMS[t.replace(/s$/, "")];
    if (syn) expansions.push(...syn);
  }
  if (core) {
    expansions.push(
      `${core} manufacturers`,
      `${core} suppliers`,
      `${core} wholesale price`,
      city ? `${core} in ${city}` : `${core} near me`,
      `${core} service`,
    );
  }

  const uniqueExpansions = [...new Set(expansions.map((e) => e.trim()).filter((e) => e && e !== corrected))].slice(0, 12);

  return {
    raw,
    corrected,
    didYouMean: corrected !== cleaned && cleaned ? corrected : null,
    tokens: correctedTokens,
    core,
    city,
    role,
    hsn,
    partNumber,
    expansions: uniqueExpansions,
  };
}

/** Terms to actually match against the DB — core + first-level synonyms. */
export function searchTerms(parsed: ParsedQuery): string[] {
  const base = [parsed.core, parsed.corrected].filter(Boolean);
  for (const t of parsed.tokens) {
    const syn = SYNONYMS[t] || SYNONYMS[t.replace(/s$/, "")];
    if (syn) base.push(...syn.slice(0, 4));
  }
  return [...new Set(base)].slice(0, 8);
}

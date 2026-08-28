export type ChatRole = "buyer" | "seller";

interface Ctx {
  productName?: string | null;
  lastMessage?: string | null;
  lastFromOther?: boolean;
}

const BUYER_DEFAULTS = (p?: string | null) => [
  `What is your best price for ${p || "this product"}?`,
  "What is the minimum order quantity?",
  "Do you deliver to my city? What's the timeline?",
  "Can you share the specification sheet?",
];

const SELLER_DEFAULTS = (p?: string | null) => [
  `Thanks for your interest in ${p || "our product"}. What quantity do you need?`,
  "Sharing our best price shortly. Which city should we quote delivery for?",
  "Yes, this is in stock. MOQ and pricing details below.",
  "Can you share your requirement in detail so I can quote accurately?",
];

const RULES: { match: RegExp; buyer?: string[]; seller?: string[] }[] = [
  {
    match: /\b(price|rate|cost|quote|quotation|₹)\b/i,
    seller: ["Our best price is ₹___ per unit for this quantity.", "Price depends on quantity — how many units do you need?", "Sharing a detailed quotation now."],
    buyer: ["Can you do better on price for a bulk order?", "Does that price include GST and delivery?"],
  },
  {
    match: /\b(moq|minimum|quantity|qty|bulk)\b/i,
    seller: ["Our MOQ is ___ units.", "We can supply from ___ units onwards.", "Yes, we can handle bulk orders of this size."],
    buyer: ["I need ___ units to start with.", "Can you supply this quantity monthly?"],
  },
  {
    match: /\b(deliver|delivery|ship|shipping|dispatch|courier)\b/i,
    seller: ["We dispatch within ___ days and deliver pan-India.", "Delivery to your city takes about ___ days.", "Shipping is charged extra at actuals."],
    buyer: ["What is the delivery time to my city?", "Do you offer free delivery on bulk orders?"],
  },
  {
    match: /\b(stock|available|availability)\b/i,
    seller: ["Yes, this is currently in stock.", "Currently out of stock — restocking in ___ days."],
    buyer: ["Is this available right now?"],
  },
  {
    match: /\b(sample|trial)\b/i,
    seller: ["Yes, we can provide a paid sample.", "Sample charges are ₹___ , adjustable against your first order."],
    buyer: ["Can I get a sample before ordering?"],
  },
  {
    match: /\b(gst|invoice|bill|payment|advance)\b/i,
    seller: ["We provide a GST invoice on all orders.", "Payment terms: ___% advance, balance before dispatch."],
    buyer: ["Do you provide a GST invoice?", "What are your payment terms?"],
  },
];

/** Context-aware quick replies for the composer. */
export function getQuickReplies(role: ChatRole, ctx: Ctx = {}): string[] {
  const text = ctx.lastMessage || "";
  const out: string[] = [];
  if (ctx.lastFromOther && text) {
    for (const rule of RULES) {
      if (rule.match.test(text)) out.push(...((role === "seller" ? rule.seller : rule.buyer) || []));
    }
  }
  const defaults = role === "seller" ? SELLER_DEFAULTS(ctx.productName) : BUYER_DEFAULTS(ctx.productName);
  return [...new Set([...out, ...defaults])].slice(0, 4);
}

// Deterministic per-product pseudo-random persuasion helpers.
// Never invents identifiable user data — only aggregate/temporal signals.

const CITIES = ["Mumbai", "Chennai", "Bengaluru", "Delhi", "Hyderabad", "Ahmedabad", "Pune", "Kolkata", "Surat", "Jaipur"];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function hourBucket(): number {
  return Math.floor(Date.now() / (1000 * 60 * 60));
}

/** Aggregate signal — "N buyers from <city> viewed this in the last hour". Stable within an hour. */
export function nearbyDemand(productId: string) {
  const seed = hash(productId + ":" + hourBucket());
  const count = 2 + (seed % 6); // 2–7
  const city = CITIES[seed % CITIES.length];
  return { count, city };
}

/** Response-slot scarcity: sellers reply to ~N enquiries/day. Rotates every 30m. */
export function responseSlotsLeft(productId: string) {
  const bucket = Math.floor(Date.now() / (1000 * 60 * 30));
  const seed = hash(productId + ":slots:" + bucket);
  const capacity = 5;
  // Time-of-day pressure: fewer slots as day progresses
  const hour = new Date().getHours();
  const baseLeft = hour < 10 ? 4 : hour < 14 ? 3 : hour < 18 ? 2 : 1;
  const left = Math.max(1, baseLeft - (seed % 2));
  const variant = seed % 4; // pick one of 4 message styles
  return { capacity, left, variant };
}

/** Rolling deadline for "price valid till" style urgency (end of local day). */
export function endOfDayCountdown(): string {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const diff = end.getTime() - Date.now();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

export const PERSUASION_COPY = {
  socialProof: (city: string, count: number) =>
    `${count} buyer${count > 1 ? "s" : ""} from ${city} enquired in the last hour`,
  slotScarcity: (left: number, variant: number = 0) => {
    const options = [
      `Seller has ${left} response slot${left > 1 ? "s" : ""} left today`,
      `Only ${left} quote${left > 1 ? "s" : ""} left before seller pauses`,
      `${left} priority reply slot${left > 1 ? "s" : ""} remaining`,
      `Fast-track: ${left} enquiry slot${left > 1 ? "s" : ""} open now`,
    ];
    return options[variant % options.length];
  },
  priceValid: (countdown: string) => `Best price valid for ${countdown}`,
  fastReply: (avgHours?: number) =>
    avgHours ? `Sellers usually reply in ~${avgHours}h` : `Sellers usually reply within a few hours`,
  microNudge: "You're one step away from getting the best quote",
  inactivity: "Not sure yet? Get 3 similar quotes free — takes 20 seconds.",
} as const;

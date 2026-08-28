import { Flame, Zap, TrendingUp, Clock, Award, Sparkles, Users, Target, ShieldCheck, Rocket, BadgePercent, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type UrgencyBadge = {
  key: string;
  label: string;
  icon: LucideIcon;
  className: string; // background + text styling for the badge chip
};

const BADGES: UrgencyBadge[] = [
  { key: "hot", label: "🔥 Hot Deal", icon: Flame, className: "bg-gradient-to-r from-rose-500 to-orange-500 text-white" },
  { key: "trending", label: "Trending Now", icon: TrendingUp, className: "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white" },
  { key: "fastmover", label: "Fast Mover", icon: Rocket, className: "bg-gradient-to-r from-indigo-500 to-blue-500 text-white" },
  { key: "bestprice", label: "Best Price", icon: BadgePercent, className: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" },
  { key: "limited", label: "Limited Stock", icon: Clock, className: "bg-gradient-to-r from-amber-500 to-orange-600 text-white" },
  { key: "toppick", label: "Top Pick", icon: Award, className: "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900" },
  { key: "newarrival", label: "New Arrival", icon: Sparkles, className: "bg-gradient-to-r from-sky-500 to-cyan-500 text-white" },
  { key: "verified", label: "Verified Supplier", icon: ShieldCheck, className: "bg-gradient-to-r from-green-600 to-emerald-600 text-white" },
  { key: "highdemand", label: "High Demand", icon: Zap, className: "bg-gradient-to-r from-red-500 to-rose-600 text-white" },
  { key: "buyerchoice", label: "Buyers' Choice", icon: Users, className: "bg-gradient-to-r from-violet-500 to-purple-600 text-white" },
  { key: "moqfriendly", label: "Low MOQ", icon: Target, className: "bg-gradient-to-r from-lime-500 to-green-500 text-slate-900" },
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getUrgencyBadges(product: { id?: string; name?: string; created_at?: string; is_featured?: boolean; views_count?: number }, count = 2): UrgencyBadge[] {
  const seed = hash(String(product?.id || product?.name || "x"));
  const picks: UrgencyBadge[] = [];
  const used = new Set<string>();

  // deterministic contextual boosts
  if (product?.is_featured) picks.push(BADGES.find(b => b.key === "toppick")!), used.add("toppick");
  if (product?.created_at && (Date.now() - new Date(product.created_at).getTime()) < 1000 * 60 * 60 * 24 * 14) {
    if (!used.has("newarrival")) picks.push(BADGES.find(b => b.key === "newarrival")!), used.add("newarrival");
  }
  if ((product?.views_count || 0) > 25 && !used.has("trending")) picks.push(BADGES.find(b => b.key === "trending")!), used.add("trending");

  // fill remaining deterministic slots
  let i = 0;
  while (picks.length < count && i < BADGES.length * 2) {
    const b = BADGES[(seed + i) % BADGES.length];
    if (!used.has(b.key)) { picks.push(b); used.add(b.key); }
    i++;
  }
  return picks.slice(0, count);
}

export function UrgencyBadgeChip({ badge, size = "sm" }: { badge: UrgencyBadge; size?: "xs" | "sm" | "md" }) {
  const Icon = badge.icon;
  const sizes = {
    xs: "text-[10px] px-1.5 py-0.5 gap-0.5",
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-2.5 py-1 gap-1.5",
  } as const;
  const icons = { xs: "h-2.5 w-2.5", sm: "h-3 w-3", md: "h-3.5 w-3.5" } as const;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold shadow-sm ${sizes[size]} ${badge.className}`}>
      <Icon className={icons[size]} />
      {badge.label}
    </span>
  );
}

export function UrgencyBadgeStack({ product, count = 2, size = "sm", className = "" }: { product: any; count?: number; size?: "xs" | "sm" | "md"; className?: string }) {
  const badges = getUrgencyBadges(product, count);
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {badges.map(b => <UrgencyBadgeChip key={b.key} badge={b} size={size} />)}
    </div>
  );
}

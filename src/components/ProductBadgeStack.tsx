// Dynamic Product Badges renderer
import { getBadges, badgeClass } from "@/lib/productBadges";
import { cn } from "@/lib/utils";

interface Props {
  product: any;
  seller?: any;
  category?: any;
  max?: number;
  className?: string;
  size?: "sm" | "md";
}

export function ProductBadgeStack({ product, seller, category, max = 3, className, size = "sm" }: Props) {
  const badges = getBadges({ product, seller, category }, max);
  if (!badges.length) return null;
  const sizeCls = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border font-medium leading-tight",
            sizeCls,
            badgeClass[b.variant],
          )}
        >
          {b.emoji && <span aria-hidden>{b.emoji}</span>}
          {b.label}
        </span>
      ))}
    </div>
  );
}

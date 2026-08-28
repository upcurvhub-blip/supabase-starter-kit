import { supabase } from "@/integrations/supabase/client";

export function slugify(input: string): string {
  return (input || "")
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 96);
}

/**
 * Reserve a unique slug for an entity in the global `slugs` registry.
 * On collision, appends -2, -3, ... until unique.
 * If the entity already has a slug and it changed, records a redirect from old → new.
 */
export async function reserveSlug(params: {
  entityType: "product" | "category" | "seller" | "brand" | "city" | "guide";
  entityId: string;
  desired: string;
  currentPath?: (slug: string) => string; // e.g. (s) => `/product/${s}`
}): Promise<string> {
  const base = slugify(params.desired) || params.entityType;
  let slug = base;
  let n = 1;

  // Try up to 25 variants
  while (n < 25) {
    const { data: existing } = await supabase
      .from("slugs")
      .select("id, entity_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing || existing.entity_id === params.entityId) break;
    n += 1;
    slug = `${base}-${n}`;
  }

  // Check for previous primary slug for this entity
  const { data: prior } = await supabase
    .from("slugs")
    .select("id, slug")
    .eq("entity_type", params.entityType)
    .eq("entity_id", params.entityId)
    .eq("is_primary", true)
    .maybeSingle();

  if (prior && prior.slug !== slug) {
    await supabase.from("slugs").update({ is_primary: false }).eq("id", prior.id);
    if (params.currentPath) {
      await supabase.from("redirects").upsert(
        {
          from_path: params.currentPath(prior.slug),
          to_path: params.currentPath(slug),
          entity_type: params.entityType,
          entity_id: params.entityId,
          status_code: 301,
        },
        { onConflict: "from_path" }
      );
    }
  }

  await supabase.from("slugs").upsert(
    {
      entity_type: params.entityType,
      entity_id: params.entityId,
      slug,
      is_primary: true,
    },
    { onConflict: "slug" }
  );

  return slug;
}

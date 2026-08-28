// Embed product text into search_embedding using Lovable AI Gateway.
// POST { product_ids: string[] }  ->  { updated, failed }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input: text.slice(0, 8000),
    }),
  });
  if (!r.ok) throw new Error(`embed ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.data[0].embedding as number[];
}

function buildText(p: any, catName?: string | null): string {
  const parts = [
    p.name,
    p.short_description,
    p.description,
    catName,
    p.brand,
    p.model,
    Array.isArray(p.tags) ? p.tags.join(" ") : "",
    Array.isArray(p.features) ? p.features.join(" ") : "",
  ].filter(Boolean);
  return parts.join(" \n ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { product_ids, backfill } = await req.json().catch(() => ({}));
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

    let query = sb.from("products").select("id, name, short_description, description, brand, model, tags, features, category_id, categories:category_id(name)");
    if (Array.isArray(product_ids) && product_ids.length) {
      query = query.in("id", product_ids);
    } else if (backfill) {
      query = query.is("search_embedding", null).eq("is_active", true).limit(50);
    } else {
      return new Response(JSON.stringify({ error: "product_ids or backfill required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: products, error } = await query;
    if (error) throw error;

    let updated = 0, failed = 0;
    for (const p of products || []) {
      try {
        const text = buildText(p, (p as any).categories?.name);
        if (!text.trim()) { failed++; continue; }
        const vec = await embed(text);
        const { error: upErr } = await sb
          .from("products")
          .update({ search_embedding: `[${vec.join(",")}]`, embedding_updated_at: new Date().toISOString() })
          .eq("id", p.id);
        if (upErr) { console.error("update", p.id, upErr); failed++; } else { updated++; }
      } catch (e) {
        console.error("embed failed", p.id, e);
        failed++;
      }
    }

    return new Response(JSON.stringify({ updated, failed, total: products?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

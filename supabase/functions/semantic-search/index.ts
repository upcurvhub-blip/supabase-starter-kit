// Semantic product search — embeds query, calls match_products RPC.
// POST { q: string, city?: string, limit?: number }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { q, city, limit } = await req.json();
    if (!q || typeof q !== "string" || !q.trim()) {
      return new Response(JSON.stringify({ error: "q required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const embedRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({ model: "google/gemini-embedding-001", input: q.trim().slice(0, 2000) }),
    });
    if (!embedRes.ok) {
      const t = await embedRes.text();
      return new Response(JSON.stringify({ error: `embed failed: ${t}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data } = await embedRes.json();
    const vec: number[] = data[0].embedding;

    const sb = createClient(SUPABASE_URL, ANON_KEY);
    const { data: rows, error } = await sb.rpc("match_products", {
      query_embedding: `[${vec.join(",")}]`,
      match_count: Math.min(Math.max(Number(limit) || 24, 1), 60),
      p_city: city || null,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ results: rows || [], q }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

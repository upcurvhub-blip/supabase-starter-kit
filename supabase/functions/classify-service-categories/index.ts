// Classifies every category as product vs service using Lovable AI.
// Writes service_confidence (0-1), service_ai_flagged (bool), service_ai_reason.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: cats, error } = await supabase
    .from("categories")
    .select("id, name, parent:parent_id(name)")
    .eq("is_active", true);
  if (error) throw error;

  // batch of 40 per LLM call
  const batches: any[][] = [];
  for (let i = 0; i < (cats?.length || 0); i += 40) batches.push((cats || []).slice(i, i + 40));

  let updated = 0;
  for (const batch of batches) {
    const list = batch.map((c: any, i: number) =>
      `${i + 1}. ${c.name}${c.parent?.name ? ` (parent: ${c.parent.name})` : ""}`
    ).join("\n");

    const prompt = `Classify each item below as "service" or "product".
A "service" is labour/installation/repair/consulting/rental/cleaning/maintenance/training/design work.
A "product" is a physical/manufactured/tradable good.

Return ONLY a JSON array. One object per numbered item with: {"i": <number>, "kind": "service"|"product", "confidence": 0-1, "reason": "<8 words>"}.

Items:
${list}`;

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
        }),
      });
      const j = await r.json();
      const content = j.choices?.[0]?.message?.content || "[]";
      let arr: any[] = [];
      try {
        const parsed = JSON.parse(content);
        arr = Array.isArray(parsed) ? parsed : (parsed.items || parsed.results || parsed.classifications || []);
      } catch { arr = []; }

      for (const item of arr) {
        const idx = (item.i ?? 0) - 1;
        const cat = batch[idx];
        if (!cat) continue;
        const isService = String(item.kind).toLowerCase() === "service";
        await supabase.from("categories").update({
          service_confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0)),
          service_ai_flagged: isService,
          service_ai_reason: String(item.reason || "").slice(0, 200),
        }).eq("id", cat.id);
        updated++;
      }
    } catch (e) {
      console.error("batch failed", e);
    }
  }

  return new Response(JSON.stringify({ ok: true, total: cats?.length || 0, updated }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

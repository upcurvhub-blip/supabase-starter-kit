// Generates or refreshes a buying guide for a category using AI.
// POST { category_id } -> writes public.buying_guides row and pings IndexNow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const BASE = "https://upcurvtrade.upcurv.in";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAI(prompt: string, system: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  try {
    const { category_id } = await req.json();
    if (!category_id) return new Response(JSON.stringify({ error: "category_id required" }), { status: 400, headers: CORS });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: cat } = await sb.from("categories").select("*").eq("id", category_id).maybeSingle();
    if (!cat) throw new Error("category not found");

    const raw = await callAI(
      `Write a comprehensive buying guide for "${cat.name}" for Indian B2B buyers. Return STRICT JSON with keys: title (SEO friendly, includes "Buying Guide"), meta_description (max 155 chars), body_html (semantic HTML: h2/h3 sections covering Overview, Types & Variants, Key Specifications, Applications, Price Factors, How to Choose, Maintenance, Certifications; 800-1200 words, use <ul> lists, no <html>/<body> tags), faqs (array of 8, each {question, answer} of 40-80 words). Return ONLY the JSON.`,
      "You are an expert B2B procurement writer. Output valid JSON only."
    );
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    await sb.from("buying_guides").upsert(
      {
        slug: cat.slug,
        category_id: cat.id,
        title: parsed.title || `${cat.name} Buying Guide`,
        body_md: parsed.body_html || "",
        faq_json: parsed.faqs || [],
        meta_description: parsed.meta_description || "",
        is_published: true,
      },
      { onConflict: "slug" }
    );

    await sb.functions.invoke("notify-indexnow", { body: { urls: [`${BASE}/guides/${cat.slug}`] } }).catch(() => {});

    return new Response(JSON.stringify({ success: true, slug: cat.slug }), { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});

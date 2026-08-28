// Google Indexing API — submit URL_UPDATED / URL_DELETED notifications
// Requires GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON secret (full JSON key file)
// The service account must be added as an Owner in Google Search Console.
//
// Usage:
//   POST /google-indexing
//   { "urls": ["https://..."], "type": "URL_UPDATED" | "URL_DELETED" }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const SA_JSON = Deno.env.get("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON");

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

async function getAccessToken(): Promise<string> {
  if (!SA_JSON) throw new Error("GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON not set");
  const sa = JSON.parse(SA_JSON);
  const keyBuf = pemToArrayBuffer(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBuf,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      exp: getNumericDate(3600),
      iat: getNumericDate(0),
    },
    key,
  );

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const j = await resp.json();
  if (!resp.ok) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body.urls) ? body.urls : [];
    const type: string = body.type === "URL_DELETED" ? "URL_DELETED" : "URL_UPDATED";
    if (!urls.length) {
      return new Response(JSON.stringify({ error: "urls required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getAccessToken();
    const results: any[] = [];
    // Google Indexing API is 1 URL per call; cap at 200 per invocation.
    const batch = urls.slice(0, 200);
    for (const url of batch) {
      const r = await fetch(
        "https://indexing.googleapis.com/v3/urlNotifications:publish",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url, type }),
        },
      );
      const j = await r.json().catch(() => ({}));
      results.push({ url, status: r.status, ok: r.ok, response: j });
    }

    return new Response(
      JSON.stringify({
        success: true,
        submitted: results.length,
        ok_count: results.filter((r) => r.ok).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("google-indexing error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

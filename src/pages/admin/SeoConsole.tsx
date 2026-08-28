import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Globe, Search, ExternalLink } from "lucide-react";

export default function SeoConsole() {
  const [minutes, setMinutes] = useState(60);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);
  const [testUrl, setTestUrl] = useState("");
  const [stats, setStats] = useState<{
    products: number;
    sellers: number;
    categories: number;
    localPages: number;
    freshSeo: number;
  } | null>(null);

  const loadStats = async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [p, s, c, l, f] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("seller_profiles").select("*", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("categories").select("*", { count: "exact", head: true }),
      supabase.from("local_landing_pages").select("*", { count: "exact", head: true }).eq("is_published", true),
      supabase.from("seo_metadata").select("*", { count: "exact", head: true }).gte("generated_at", since),
    ]);
    setStats({
      products: p.count || 0,
      sellers: s.count || 0,
      categories: c.count || 0,
      localPages: l.count || 0,
      freshSeo: f.count || 0,
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const triggerCron = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-cron-indexnow", {
        body: { minutes },
      });
      if (error) throw error;
      setLastRun(data);
      toast.success(
        `Submitted: IndexNow ${data?.submitted ?? 0}, Google ${data?.google_submitted ?? 0}`,
      );
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setRunning(false);
    }
  };

  const submitSingle = async () => {
    if (!testUrl.startsWith("http")) return toast.error("Enter full URL");
    try {
      const [inRes, gRes] = await Promise.all([
        supabase.functions.invoke("notify-indexnow", { body: { urls: [testUrl] } }),
        supabase.functions.invoke("google-indexing", { body: { urls: [testUrl], type: "URL_UPDATED" } }),
      ]);
      toast.success(
        `IndexNow: ${inRes.error ? "err" : "ok"} · Google: ${gRes.error ? "not configured" : "ok"}`,
      );
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">SEO Console</h1>
        <p className="text-sm text-muted-foreground">
          Automated indexing status & manual submission tools
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Active Products</div>
            <div className="text-2xl font-bold">{stats.products}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Approved Sellers</div>
            <div className="text-2xl font-bold">{stats.sellers}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Categories</div>
            <div className="text-2xl font-bold">{stats.categories}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">Local Pages</div>
            <div className="text-2xl font-bold">{stats.localPages}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs text-muted-foreground">SEO refreshed (24h)</div>
            <div className="text-2xl font-bold text-primary">{stats.freshSeo}</div>
          </Card>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Batch re-index (IndexNow + Google)</h2>
          <Badge variant="secondary">runs every 15 min via cron</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Look back</label>
          <Input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">minutes</span>
          <Button onClick={triggerCron} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run now"}
          </Button>
        </div>
        {lastRun && (
          <pre className="max-h-40 overflow-auto rounded bg-muted p-3 text-xs">
            {JSON.stringify(lastRun, null, 2)}
          </pre>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Submit single URL</h2>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="https://upcurvtrade.upcurv.in/product/..."
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
          />
          <Button onClick={submitSingle}>Submit</Button>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Quick links</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded border p-3 text-sm hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Sitemap
          </a>
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded border p-3 text-sm hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Products RSS
          </a>
          <a
            href="https://search.google.com/search-console"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded border p-3 text-sm hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Google Search Console
          </a>
          <a
            href="https://www.bing.com/webmasters"
            target="_blank"
            rel="noopener"
            className="flex items-center gap-2 rounded border p-3 text-sm hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Bing Webmaster Tools
          </a>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold mb-2">Setup checklist</h2>
        <ul className="space-y-1 text-sm">
          <li>✅ IndexNow (Bing/Yandex) — active</li>
          <li>
            {stats && stats.freshSeo > 0 ? "✅" : "⚠️"} AI SEO auto-fill on product publish
          </li>
          <li>⚙️ Google Indexing API — requires service account JSON secret</li>
          <li>⚙️ Cloudflare Worker (public/_worker.js) — deploy to route bots to prerender</li>
        </ul>
      </Card>

      <RankingTransparency />
    </div>
  );
}

function RankingTransparency() {
  const [urls, setUrls] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: seo }, { data: il }] = await Promise.all([
        supabase.from("seo_metadata")
          .select("url, title, description, keywords, generated_at")
          .order("generated_at", { ascending: false }).limit(200),
        supabase.from("internal_links")
          .select("source_url, target_url, anchor_text").limit(300),
      ]);
      setUrls(seo || []);
      setLinks(il || []);
    })();
  }, []);

  const filtered = urls.filter(u => !q || u.url?.includes(q) || u.title?.toLowerCase().includes(q.toLowerCase()));
  const linkMap: Record<string, number> = {};
  links.forEach((l: any) => { linkMap[l.target_url] = (linkMap[l.target_url] || 0) + 1; });

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold">Ranking Transparency</h2>
          <p className="text-xs text-muted-foreground">Every indexed URL, its metadata, keyword targets, and internal link inflow.</p>
        </div>
        <Input placeholder="Filter by URL or title…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs mb-3">
        <div className="rounded bg-muted p-2"><b>{urls.length}</b> URLs with metadata</div>
        <div className="rounded bg-muted p-2"><b>{links.length}</b> internal links</div>
        <div className="rounded bg-muted p-2"><b>{new Set(urls.flatMap((u: any) => u.keywords || [])).size}</b> unique keywords</div>
        <div className="rounded bg-muted p-2"><b>{Object.values(linkMap).filter(n => n >= 3).length}</b> URLs with 3+ inbound links</div>
      </div>
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-background border-b">
            <tr className="text-left">
              <th className="py-2 pr-2">URL</th>
              <th className="pr-2">Title</th>
              <th className="pr-2">Keywords</th>
              <th className="pr-2">Inbound</th>
              <th>Fresh</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((u: any) => (
              <tr key={u.url} className="border-b">
                <td className="py-1.5 pr-2 font-mono text-[10px] max-w-[220px] truncate"><a href={u.url} target="_blank" rel="noopener" className="text-primary hover:underline">{u.url}</a></td>
                <td className="pr-2 max-w-[200px] truncate">{u.title}</td>
                <td className="pr-2 max-w-[200px] truncate">{(u.keywords || []).slice(0, 5).join(", ")}</td>
                <td className="pr-2">{linkMap[u.url] || 0}</td>
                <td>{u.generated_at ? new Date(u.generated_at).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


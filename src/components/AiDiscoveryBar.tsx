import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search } from "lucide-react";

/**
 * AI-powered discovery bar. Buyer types plain English ("looking for
 * white office chair for a small clinic") and we send them to the search
 * page in AI mode — semantic embeddings match ergonomic/mesh/executive
 * variants automatically.
 */
export function AiDiscoveryBar() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const go = (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/search?q=${encodeURIComponent(term)}&ai=1`);
  };

  const suggestions = ["Cotton T-Shirts", "Steel Pipes", "PVC Granules", "Rice Exporter"];

  return (
    <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/10">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" /> AI Buyer Discovery
          </div>
          <h2 className="text-2xl md:text-4xl font-bold tracking-tight">What are you looking for?</h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Describe what you need in plain words — our AI finds the right products, alternatives and nearby suppliers.
          </p>

          <form onSubmit={go} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="e.g. eco-friendly cotton t-shirts under ₹200 in Tiruppur"
                className="h-12 pl-10 text-base rounded-xl"
                aria-label="AI product search"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 gradient-accent px-6 rounded-xl">
              <Sparkles className="mr-2 h-4 w-4" /> Discover
            </Button>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground">Try:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => navigate(`/search?q=${encodeURIComponent(s)}&ai=1`)}
                className="rounded-full border bg-card px-3 py-1 hover:border-primary hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

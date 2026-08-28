import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/loading-states";
import { ChatThread } from "@/components/chat/ChatThread";
import { PageMeta } from "@/components/seo/PageMeta";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

const BuyerMessages = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", "buyer", userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("conversations")
        .select("*, products(name, slug), seller_profiles(business_name)")
        .eq("buyer_id", userId)
        .order("last_message_at", { ascending: false });
      return data || [];
    },
    enabled: !!userId,
  });

  const active = conversations?.find((c: any) => c.id === activeId) || conversations?.[0];

  return (
    <MarketplaceLayout>
      <PageMeta title="My Messages | Upcurv Trade" description="Your conversations with sellers on Upcurv Trade." path="/messages" noindex />
      <div className="container mx-auto px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold">Messages</h1>

        {!userId ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <MessageSquare className="h-10 w-10 mx-auto opacity-40" />
              <p className="text-sm text-muted-foreground">Login to view your conversations with sellers.</p>
              <Button asChild size="sm"><Link to="/auth">Login</Link></Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <ListSkeleton rows={4} />
        ) : !conversations?.length ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No conversations yet. Start a chat from any product page.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
              {conversations.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors hover:bg-muted/60",
                    active?.id === c.id && "border-primary bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">{c.seller_profiles?.business_name || "Seller"}</span>
                    {c.buyer_unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{c.buyer_unread}</Badge>}
                  </div>
                  {c.products?.name && <p className="text-xs text-primary truncate">{c.products.name}</p>}
                  <p className="text-xs text-muted-foreground truncate">{c.last_message || "New conversation"}</p>
                </button>
              ))}
            </div>
            <div className="lg:col-span-2">
              {active && (
                <ChatThread
                  key={active.id}
                  conversationId={active.id}
                  role="buyer"
                  productName={active.products?.name}
                  headerTitle={active.seller_profiles?.business_name || "Seller"}
                  headerSubtitle={active.products?.name || undefined}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
};

export default BuyerMessages;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/loading-states";
import { ChatThread } from "@/components/chat/ChatThread";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

const SellerMessages = () => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("seller_profiles").select("id, business_name").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", "seller", sellerProfile?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("conversations")
        .select("*, products(name)")
        .eq("seller_id", sellerProfile!.id)
        .order("last_message_at", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile?.id,
  });

  const active = conversations?.find((c: any) => c.id === activeId) || conversations?.[0];

  return (
    <DashboardLayout role="seller" title="Messages">
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">Chat with buyers in real time. Faster replies win more deals.</p>
        </div>

        {isLoading ? (
          <ListSkeleton rows={4} />
        ) : !conversations?.length ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No conversations yet. Buyers can start a chat from your product pages.</p>
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
                    <span className="font-medium text-sm truncate">{c.guest_name || "Buyer"}</span>
                    {c.seller_unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{c.seller_unread}</Badge>}
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
                  role="seller"
                  productName={active.products?.name}
                  headerTitle={active.guest_name || "Buyer"}
                  headerSubtitle={active.products?.name || active.subject || undefined}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SellerMessages;

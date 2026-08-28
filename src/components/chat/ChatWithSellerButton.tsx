import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatThread } from "@/components/chat/ChatThread";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Loader2 } from "lucide-react";

interface Props {
  sellerId: string;
  productId?: string;
  productName?: string;
  sellerName?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

export function ChatWithSellerButton({
  sellerId,
  productId,
  productName,
  sellerName,
  className,
  variant = "outline",
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const start = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Login required", description: "Login to chat with this seller." });
        navigate("/auth");
        return;
      }

      // Reuse an existing thread for this buyer + seller + product.
      let query = (supabase as any)
        .from("conversations")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("seller_id", sellerId)
        .limit(1);
      query = productId ? query.eq("product_id", productId) : query.is("product_id", null);
      const { data: existing } = await query.maybeSingle();

      if (existing?.id) {
        setConversationId(existing.id);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle();
        const { data: created, error } = await (supabase as any)
          .from("conversations")
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            product_id: productId ?? null,
            guest_name: profile?.full_name || user.email?.split("@")[0] || "Buyer",
            guest_phone: profile?.phone ?? null,
            subject: productName ?? null,
          })
          .select("id")
          .single();
        if (error) throw error;
        setConversationId(created.id);
      }
      setOpen(true);
    } catch (e: any) {
      toast({ title: "Could not open chat", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant={variant} className={className} onClick={start} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
        Chat with Seller
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b">
            <DialogTitle className="text-base">{sellerName || "Seller"}</DialogTitle>
          </DialogHeader>
          {conversationId && (
            <ChatThread
              conversationId={conversationId}
              role="buyer"
              productName={productName}
              className="border-0 rounded-none"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

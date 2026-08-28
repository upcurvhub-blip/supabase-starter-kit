import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getQuickReplies, type ChatRole } from "./quickReplies";
import { Send, Check, CheckCheck, Zap } from "lucide-react";

interface ChatThreadProps {
  conversationId: string;
  role: ChatRole;
  productName?: string | null;
  headerTitle?: string;
  headerSubtitle?: string;
  className?: string;
}

interface Msg {
  id: string;
  conversation_id: string;
  sender_role: ChatRole | "system";
  sender_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

export function ChatThread({
  conversationId,
  role,
  productName,
  headerTitle,
  headerSubtitle,
  className,
}: ChatThreadProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Msg[];
    },
    enabled: !!conversationId,
  });

  // Realtime message stream for this thread.
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  // Mark the other side's messages as read + clear my unread counter.
  useEffect(() => {
    if (!messages?.length) return;
    const unread = messages.filter((m) => m.sender_role !== role && !m.read_at).map((m) => m.id);
    if (!unread.length) return;
    (async () => {
      await (supabase as any).from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      await (supabase as any)
        .from("conversations")
        .update(role === "seller" ? { seller_unread: 0 } : { buyer_unread: 0 })
        .eq("id", conversationId);
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    })();
  }, [messages, role, conversationId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("messages").insert({
      conversation_id: conversationId,
      sender_role: role,
      sender_id: user?.id ?? null,
      body,
    });
    setSending(false);
    if (!error) {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["chat-messages", conversationId] });
    }
  };

  const last = messages?.[messages.length - 1];
  const suggestions = getQuickReplies(role, {
    productName,
    lastMessage: last?.body,
    lastFromOther: !!last && last.sender_role !== role,
  });

  return (
    <div className={cn("flex flex-col rounded-xl border bg-card overflow-hidden", className)}>
      {(headerTitle || headerSubtitle) && (
        <div className="border-b px-4 py-3">
          <p className="font-semibold text-sm truncate">{headerTitle}</p>
          {headerSubtitle && <p className="text-xs text-muted-foreground truncate">{headerSubtitle}</p>}
        </div>
      )}

      <div className="flex-1 min-h-[280px] max-h-[55vh] overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 rounded-2xl ml-auto" />
            <Skeleton className="h-16 w-3/4 rounded-2xl" />
          </div>
        ) : messages?.length ? (
          messages.map((m) => {
            const mine = m.sender_role === role;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm break-words",
                    mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <span className={cn("mt-1 flex items-center gap-1 text-[10px]", mine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground")}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && (m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground py-10">
            No messages yet — start the conversation below.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Badge variant="secondary" className="shrink-0 gap-1 py-1">
            <Zap className="h-3 w-3" /> Quick
          </Badge>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDraft(s)}
              className="shrink-0 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {s.length > 46 ? `${s.slice(0, 44)}…` : s}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Type a message…"
            className="min-h-[42px] max-h-32 resize-none"
          />
          <Button size="icon" onClick={() => send(draft)} disabled={!draft.trim() || sending} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

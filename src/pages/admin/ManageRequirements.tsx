import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  MapPin,
  Package,
  User,
  Phone,
  Mail,
  Users,
  Send,
  Clock,
} from "lucide-react";

const ManageRequirements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<any>(null);
  const [chosenSellers, setChosenSellers] = useState<string[]>([]);

  const { data: requirements, isLoading } = useQuery({
    queryKey: ["admin-requirements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("requirements")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: matches } = useQuery({
    queryKey: ["req-matches", selected?.id],
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase.rpc("match_sellers_for_requirement", {
        p_requirement_id: selected.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selected,
  });

  const assign = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("assign_requirement_to_sellers", {
        p_requirement_id: selected.id,
        p_seller_ids: chosenSellers,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast({
        title: "Requirement assigned",
        description: `${data?.assigned_count ?? 0} seller(s) received this lead.`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-requirements"] });
      setSelected(null);
      setChosenSellers([]);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s?: string) =>
    s === "assigned" ? "default" : s === "closed" ? "secondary" : "outline";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Requirements</h1>
          <p className="text-muted-foreground">Buyer requirements (RFQs) and seller assignment</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : requirements?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              No requirements posted yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requirements?.map((r: any) => (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{r.title}</h3>
                        <Badge variant={statusColor(r.status)}>{r.status || "open"}</Badge>
                        {r.urgency === "urgent" && <Badge variant="destructive">Urgent</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{r.description}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Package className="h-3 w-3" />{r.categories?.name || "Uncategorized"}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.city || r.location || "—"}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{r.response_count || 0} responses</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(r.created_at), "MMM d")}</span>
                      </div>
                    </div>
                    <Button onClick={() => { setSelected(r); setChosenSellers([]); }} className="shrink-0">
                      <Send className="h-4 w-4 mr-2" />
                      View & Assign
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setChosenSellers([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusColor(selected.status)}>{selected.status || "open"}</Badge>
                {selected.urgency && <Badge variant={selected.urgency === "urgent" ? "destructive" : "secondary"}>{selected.urgency}</Badge>}
                {selected.categories?.name && <Badge variant="outline">{selected.categories.name}</Badge>}
                <Badge variant="outline">{selected.response_count || 0} responses</Badge>
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                <p className="text-sm whitespace-pre-line">{selected.description || "—"}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[
                  ["Quantity", selected.quantity ? `${selected.quantity} ${selected.quantity_unit || selected.unit || ""}` : "—"],
                  ["Size / Spec", selected.size_spec || "—"],
                  ["Budget", selected.budget_min || selected.budget_max
                    ? `₹${(selected.budget_min ?? 0).toLocaleString()} – ₹${(selected.budget_max ?? 0).toLocaleString()}`
                    : "—"],
                  ["Delivery timeline", selected.delivery_timeline || "—"],
                  ["Preferred delivery", selected.preferred_delivery_date
                    ? format(new Date(selected.preferred_delivery_date), "dd MMM yyyy") : "—"],
                  ["City / State", [selected.city || selected.location, selected.state].filter(Boolean).join(", ") || "—"],
                  ["Country", selected.country || "—"],
                  ["Public listing", selected.is_public ? "Yes" : "No"],
                  ["Posted on", format(new Date(selected.created_at), "dd MMM yyyy, h:mm a")],
                  ["Last updated", selected.updated_at ? format(new Date(selected.updated_at), "dd MMM yyyy, h:mm a") : "—"],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-medium break-words">{value as string}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Buyer contact</p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />{selected.guest_name || (selected.buyer_id ? "Registered buyer" : "—")}</div>
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />
                    {selected.guest_phone ? <a href={`tel:${selected.guest_phone}`} className="text-primary hover:underline">{selected.guest_phone}</a> : "—"}
                  </div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />
                    {selected.guest_email ? <a href={`mailto:${selected.guest_email}`} className="text-primary hover:underline">{selected.guest_email}</a> : "—"}
                  </div>
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{selected.city || selected.location || "—"}</div>
                </div>
              </div>

              {Array.isArray(selected.attachments) && selected.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Attachments</p>
                  <div className="space-y-1">
                    {selected.attachments.map((a: any, i: number) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                        className="block text-sm text-primary hover:underline truncate">
                        {a.name || `Attachment ${i + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selected.specifications && Object.keys(selected.specifications).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Specifications</p>
                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">{JSON.stringify(selected.specifications, null, 2)}</pre>
                </div>
              )}


              <div>
                <p className="text-sm font-medium mb-2">Matched sellers</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matches?.length === 0 && <p className="text-sm text-muted-foreground">No matched sellers found.</p>}
                  {matches?.map((m: any) => (
                    <label key={m.seller_id} className="flex items-center gap-3 p-2 rounded-lg border cursor-pointer hover:bg-muted">
                      <Checkbox
                        checked={chosenSellers.includes(m.seller_id)}
                        onCheckedChange={(c) =>
                          setChosenSellers((prev) =>
                            c ? [...prev, m.seller_id] : prev.filter((id) => id !== m.seller_id)
                          )
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.business_name}</p>
                        <p className="text-xs text-muted-foreground">{m.city} · {m.product_count} products</p>
                      </div>
                      <Badge variant="secondary">Score {Math.round(m.match_score)}</Badge>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                className="w-full"
                disabled={chosenSellers.length === 0 || assign.isPending}
                onClick={() => assign.mutate()}
              >
                <Send className="h-4 w-4 mr-2" />
                {assign.isPending ? "Assigning…" : `Assign to ${chosenSellers.length} seller(s)`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ManageRequirements;

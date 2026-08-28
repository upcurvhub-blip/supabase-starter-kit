import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ensureDeviceId } from "@/hooks/useDeviceId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, Zap, ShieldCheck, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  product: { id: string; name: string; unit?: string | null };
  triggerClassName?: string;
  compact?: boolean;
  /** Controlled open state (optional) — lets the page auto-open the dialog. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  hideTrigger?: boolean;
}

export function GetBestPriceButton({ product, triggerClassName, compact, open: openProp, onOpenChange, hideTrigger }: Props) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = (v: boolean) => { onOpenChange ? onOpenChange(v) : setInternalOpen(v); };
  const [form, setForm] = useState({ name: "", phone: "", city: "", quantity: "" });
  const [receipt, setReceipt] = useState<{ sellerCount: number } | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      if (form.name.trim().length < 2) throw new Error("Please enter your name");
      if (form.phone.replace(/\D/g, "").length < 7) throw new Error("Please enter a valid mobile number");
      if (form.city.trim().length < 2) throw new Error("Please enter your city");

      const deviceId = ensureDeviceId();
      const qty = form.quantity ? parseInt(form.quantity, 10) : null;

      const { data, error } = await supabase.rpc("broadcast_rfq_to_top_sellers", {
        p_product_id: product.id,
        p_guest_name: form.name.trim(),
        p_guest_phone: form.phone.trim(),
        p_guest_email: null,
        p_buyer_city: form.city.trim(),
        p_quantity: qty && !Number.isNaN(qty) ? qty : null,
        p_unit: product.unit || null,
        p_message: null,
        p_device_id: deviceId || null,
        p_max_sellers: 5,
      });
      if (error) throw error;
      const payload = (data ?? {}) as { seller_count?: number };
      return { sellerCount: payload.seller_count ?? 0 };
    },
    onSuccess: (res) => {
      setReceipt(res);
      toast({
        title: "Request sent to top suppliers",
        description: `${res.sellerCount} verified sellers will contact you shortly.`,
      });
      setForm({ name: "", phone: "", city: "", quantity: "" });
    },
    onError: (e: any) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setReceipt(null); }}>
      {!hideTrigger && (
      <DialogTrigger asChild>
        <Button
          size={compact ? "sm" : "lg"}
          className={
            triggerClassName ||
            "w-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 hover:opacity-95 text-white font-semibold shadow-lg"
          }
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Get Best Price
        </Button>
      </DialogTrigger>
      )}
      <DialogContent overlayClassName="backdrop-blur-none" className="max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {receipt ? "Suppliers notified" : "Get quotes from up to 5 verified suppliers"}
          </DialogTitle>
        </DialogHeader>

        {receipt ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600">
              <Users className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Sent to {receipt.sellerCount} verified suppliers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Expect competing quotes on WhatsApp / phone within 24 hours.
              </p>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border bg-gradient-to-br from-fuchsia-500/5 to-orange-500/5 p-3 text-sm space-y-1.5">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-fuchsia-600" /> One request → top 5 suppliers</div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Only verified, approved sellers</div>
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Compare quotes side-by-side</div>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">Product: </span>
              <span className="font-medium">{product.name}</span>
            </div>

            <div className="grid gap-3">
              <div>
                <Label htmlFor="rfq-name">Your Name *</Label>
                <Input id="rfq-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="rfq-phone">Mobile Number *</Label>
                <Input id="rfq-phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="rfq-city">City *</Label>
                  <Input id="rfq-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="rfq-qty">Quantity {product.unit ? `(${product.unit})` : ""}</Label>
                  <Input id="rfq-qty" inputMode="numeric" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 hover:opacity-95 text-white text-lg py-6"
              onClick={() => submit.mutate()}
              disabled={submit.isPending || !form.name || !form.phone || !form.city}
            >
              {submit.isPending ? "Sending to top suppliers..." : "Send to top 5 suppliers"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Your details are shared only with the matched verified suppliers.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

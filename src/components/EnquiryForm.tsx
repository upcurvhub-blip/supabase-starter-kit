import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ensureDeviceId } from "@/hooks/useDeviceId";
import { supabase } from "@/integrations/supabase/client";
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
import { MessageSquare, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const playSuccessTone = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.42);
    gain.connect(ctx.destination);
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + 0.34 + index * 0.04);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {}
};

interface EnquiryFormProps {
  product: {
    id: string;
    name: string;
    category_id?: string;
    images?: string[];
    seller_profiles?: {
      id: string;
      business_name: string;
    };
  };
  trigger?: React.ReactNode;
  onSuccess?: (info: { name: string; phone: string; city: string; sellerId: string }) => void;
}

export function EnquiryForm({ product, trigger, onSuccess }: EnquiryFormProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [receipt, setReceipt] = useState<{ name: string; phone: string; city: string } | null>(null);

  const submitEnquiry = useMutation({
    mutationFn: async () => {
      if (form.name.trim().length < 2) throw new Error("Please enter your name");
      if (form.phone.replace(/\D/g, "").length < 7) throw new Error("Please enter a valid mobile number");
      if (form.city.trim().length < 2) throw new Error("Please enter your city");
      if (!product.seller_profiles?.id) throw new Error("Seller not found");

      const deviceId = ensureDeviceId();

      const { error } = await supabase.from("leads").insert({
        buyer_id: null,
        device_id: deviceId || null,
        guest_name: form.name.trim(),
        guest_phone: form.phone.trim(),
        seller_id: product.seller_profiles.id,
        product_id: product.id,
        category_id: product.category_id || null,
        message: `Product enquiry: ${product.name}\nName: ${form.name.trim()}\nMobile: ${form.phone.trim()}\nCity: ${form.city.trim()}`,
        status: "new",
        source: "public_product_enquiry",
        metadata: {
          product_name: product.name,
          seller_name: product.seller_profiles.business_name,
          buyer_city: form.city.trim(),
          ...(deviceId ? { device_id: deviceId } : {}),
        },
      });
      // Note: anonymous users cannot read leads back (RLS), so we don't chain .select()
      if (error) throw error;

      // Persist visitor identity so future visits can auto-match this device.
      if (deviceId) {
        const { error: vdErr } = await supabase.from("visitor_devices").upsert({
          device_id: deviceId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          city: form.city.trim(),
          last_seen_at: new Date().toISOString(),
        }, { onConflict: "device_id" });
        if (vdErr) console.warn("visitor_devices upsert failed", vdErr);
      }

      // Best-effort seller lead-notification email — non-blocking for anon insert path
      try {
        const { data: seller } = await supabase
          .from("seller_profiles")
          .select("email, business_name")
          .eq("id", product.seller_profiles.id)
          .maybeSingle();
        if (seller?.email) {
          supabase.functions.invoke("send-email", {
            body: {
              type: "lead",
              to: seller.email,
              sellerName: seller.business_name,
              buyerName: form.name.trim(),
              buyerPhone: form.phone.trim(),
              buyerCity: form.city.trim(),
              productName: product.name,
            },
          }).catch(() => {});
        }
      } catch (_) { /* ignore email failures */ }

      return {
        id: (crypto?.randomUUID?.() || `${Date.now()}`),
        status: "new",
        created_at: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      const submitted = { name: form.name.trim(), phone: form.phone.trim(), city: form.city.trim() };
      setReceipt(submitted);
      playSuccessTone();
      toast({
        title: "Enquiry received",
        description: "The seller will contact you shortly.",
      });
      if (product.seller_profiles?.id) {
        onSuccess?.({ ...submitted, sellerId: product.seller_profiles.id });
      }
      setForm({ name: "", phone: "", city: "" });
    },
    onError: (error: any) => {
      setReceipt(null);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const images = product.images || [];

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setReceipt(null); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gradient-accent hover:opacity-90">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Enquiry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent overlayClassName="backdrop-blur-none" className="max-w-md w-[calc(100%-1.5rem)] mx-auto rounded-2xl sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle>{receipt ? "Enquiry Sent" : "Send Enquiry"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {receipt ? (
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-trust/10 text-trust">
                <svg viewBox="0 0 96 96" className="h-20 w-20" fill="none" aria-hidden="true">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="6" opacity="0.22" />
                  <path d="M30 49.5 42.5 62 68 34" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Enquiry sent successfully</h3>
                <p className="mt-1 text-sm text-muted-foreground">The seller will contact you shortly.</p>
              </div>
              <div className="text-left rounded-lg border bg-muted/40 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Product</span><span className="font-medium text-right line-clamp-1">{product.name}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Name</span><span className="font-medium">{receipt.name}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Mobile</span><span className="font-medium">{receipt.phone}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">City</span><span className="font-medium">{receipt.city}</span></div>
              </div>
              <Button type="button" className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
          <>

          <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
            {images.length > 0 ? (
              <img src={images[0]} alt="" className="w-14 h-14 object-cover rounded" />
            ) : (
              <div className="w-14 h-14 bg-background rounded flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-2">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.seller_profiles?.business_name}</p>
            </div>
          </div>

          <div className="grid gap-3">
            <div>
              <Label htmlFor="name">Your Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter your full name" />
            </div>
            <div>
              <Label htmlFor="phone">Mobile Number *</Label>
              <Input id="phone" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Your city" />
            </div>
          </div>

          <Button
            className="w-full gradient-accent text-lg py-6"
            onClick={() => submitEnquiry.mutate()}
            disabled={submitEnquiry.isPending || !form.name || !form.phone || !form.city}
          >
            {submitEnquiry.isPending ? "Sending..." : "Enquire Now"}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting, you agree to our Terms of Service and Privacy Policy
          </p>
          </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

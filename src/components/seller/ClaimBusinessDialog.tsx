import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BadgeCheck, Loader2 } from "lucide-react";

/**
 * Shown on admin-created (unclaimed) business listings. Collects the owner's
 * phone + name so the admin receives the claim request with the exact business
 * name and mobile number.
 */
export function ClaimBusinessDialog({
  sellerId,
  businessName,
}: {
  sellerId: string;
  businessName: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const submit = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast({ title: "Enter a valid mobile number", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("seller_claims").insert({
      seller_id: sellerId,
      business_name: businessName,
      phone: digits,
      email: email.trim() || null,
      contact_name: contactName.trim() || null,
      message: message.trim() || null,
      page_path: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not send request", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    setPhone("");
    setContactName("");
    setEmail("");
    setMessage("");
    toast({
      title: "Claim request sent",
      description: "Our team will call you on this number to verify and hand over the listing.",
    });
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
        <BadgeCheck className="h-5 w-5 text-primary shrink-0" />
        <p className="text-sm flex-1 min-w-[200px]">
          <span className="font-semibold">Is this your business?</span>{" "}
          <span className="text-muted-foreground">
            This listing is unclaimed. Claim it to manage products, prices and enquiries.
          </span>
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>Claim this business</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim {businessName}</DialogTitle>
            <DialogDescription>
              Share your mobile number — our team will verify you own this business and transfer the listing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Business name</Label>
              <Input value={businessName} readOnly className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-phone">Mobile number *</Label>
              <Input
                id="claim-phone"
                inputMode="tel"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-name">Your name</Label>
              <Input id="claim-name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-email">Email (optional)</Label>
              <Input id="claim-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-msg">Anything else?</Label>
              <Textarea id="claim-msg" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <Button className="w-full" onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send claim request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ClaimBusinessDialog;

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Facebook, Link2, Linkedin, MessageSquare, Send, Share2, Twitter, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  url?: string;
  text?: string;
}

export function ShareDialog({ open, onOpenChange, title, url, text }: Props) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = text || `Check out ${title}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Share it anywhere you like." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Couldn't copy", description: "Copy the link manually.", variant: "destructive" });
    }
  };

  const targets = [
    {
      label: "WhatsApp",
      icon: MessageSquare,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} — ${shareUrl}`)}`,
      cls: "text-[#128C7E] border-[#25D366]/40 bg-[#25D366]/10 hover:bg-[#25D366]/20",
    },
    {
      label: "Telegram",
      icon: Send,
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      cls: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20",
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      cls: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20",
    },
    {
      label: "X",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      cls: "text-foreground border-border bg-muted hover:bg-muted/70",
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      cls: "text-primary border-primary/30 bg-primary/10 hover:bg-primary/20",
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`,
      cls: "text-accent border-accent/30 bg-accent/10 hover:bg-accent/20",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> Share
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{title}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2">
          {targets.map((t) => (
            <a
              key={t.label}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${t.cls}`}
            >
              <t.icon className="h-5 w-5" />
              {t.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input readOnly value={shareUrl} className="pl-9 text-xs" onFocus={(e) => e.currentTarget.select()} />
          </div>
          <Button onClick={copy} variant={copied ? "secondary" : "default"} className="shrink-0">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span className="ml-1.5">{copied ? "Copied" : "Copy"}</span>
          </Button>
        </div>

        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button
            variant="outline"
            onClick={() => navigator.share?.({ title, text: shareText, url: shareUrl }).catch(() => undefined)}
          >
            <Share2 className="h-4 w-4 mr-1.5" /> More sharing options
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;

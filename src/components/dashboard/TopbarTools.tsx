import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { HelpCircle, StickyNote, Trash2 } from "lucide-react";

const NOTES_KEY = "upcurv_seller_notes";

/** Desktop topbar utilities: live date/time, sticky notes and a link to the usage guide. */
export function TopbarTools({ guideHref = "/seller/guide" }: { guideHref?: string }) {
  const [now, setNow] = useState(() => new Date());
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      setNotes(localStorage.getItem(NOTES_KEY) || "");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const saveNotes = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem(NOTES_KEY, value);
    } catch {
      /* storage unavailable */
    }
  };

  const date = now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="hidden md:flex items-center gap-1">
      <div className="mr-2 text-right leading-tight">
        <p className="text-sm font-semibold text-foreground">{time}</p>
        <p className="text-[11px] text-muted-foreground">{date}</p>
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Sticky notes">
            <StickyNote className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Sticky notes</p>
            <Button variant="ghost" size="icon" aria-label="Clear notes" onClick={() => saveNotes("")}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => saveNotes(e.target.value)}
            placeholder="Follow up with buyer, restock sofa fabric…"
            className="min-h-[140px] resize-none"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">Saved on this device automatically.</p>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" asChild aria-label="How to use the portal">
        <Link to={guideHref}>
          <HelpCircle className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default TopbarTools;

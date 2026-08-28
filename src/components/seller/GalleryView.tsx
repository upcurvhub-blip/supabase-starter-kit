// Public read-only gallery viewer with lightbox for factory photos + videos.
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play, ImageIcon, X } from "lucide-react";

export type GalleryItem = { type: "image" | "video"; url: string; caption?: string; thumbnail?: string };

export function GalleryView({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!items?.length) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No factory photos or videos yet.
        </CardContent>
      </Card>
    );
  }
  const active = open !== null ? items[open] : null;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((it, idx) => (
          <button
            key={idx}
            onClick={() => setOpen(idx)}
            className="group relative rounded-xl overflow-hidden border bg-muted/30 text-left hover:shadow-lg transition"
          >
            <div className="aspect-video relative">
              {it.type === "image" ? (
                <img src={it.url} alt={it.caption || "Factory photo"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              ) : (
                <img src={it.thumbnail || "/placeholder.svg"} alt={it.caption || "Video"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
              )}
              {it.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="rounded-full bg-white/90 p-3 shadow-lg"><Play className="h-6 w-6 text-black fill-black ml-0.5" /></div>
                </div>
              )}
            </div>
            {it.caption && <div className="p-2 text-xs truncate">{it.caption}</div>}
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {active && (
            <div className="bg-black">
              {active.type === "image" ? (
                <img src={active.url} alt={active.caption || ""} className="w-full max-h-[80vh] object-contain" />
              ) : active.url.includes("youtube.com/embed/") ? (
                <div className="aspect-video">
                  <iframe src={active.url + "?autoplay=1"} className="w-full h-full" allow="autoplay; encrypted-media" allowFullScreen />
                </div>
              ) : (
                <video src={active.url} controls autoPlay className="w-full max-h-[80vh]" />
              )}
              {active.caption && <div className="bg-background p-3 text-sm">{active.caption}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

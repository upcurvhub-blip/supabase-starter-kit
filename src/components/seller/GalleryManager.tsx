// Company/factory photo + video gallery editor for sellers.
// Persists to seller_profiles.gallery (jsonb array of {type,url,caption}).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Video, Image as ImageIcon, Plus, Youtube } from "lucide-react";

export type GalleryItem = { type: "image" | "video"; url: string; caption?: string; thumbnail?: string };

interface Props {
  sellerId: string;
  /** Business name — used for SEO-friendly upload file names. */
  seoName?: string;
}

function youtubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m?.[1] || null;
}

export function GalleryManager({ sellerId, seoName }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoCaption, setVideoCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("gallery")
        .eq("id", sellerId)
        .maybeSingle();
      setItems(((data as any)?.gallery as GalleryItem[]) || []);
      setLoading(false);
    })();
  }, [sellerId]);

  const persist = async (next: GalleryItem[]) => {
    setItems(next);
    const { error } = await supabase
      .from("seller_profiles")
      .update({ gallery: next as any })
      .eq("id", sellerId);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const uploads: GalleryItem[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast({ title: `${file.name} skipped`, description: "Max 10MB", variant: "destructive" });
          continue;
        }
        const isVideo = file.type.startsWith("video/");
        const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const slug = (seoName || "factory-gallery")
          .toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "factory-gallery";
        const key = `${sellerId}/gallery/${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("seller-assets").upload(key, file, { upsert: false, contentType: file.type });
        if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); continue; }
        const { data: signed } = await supabase.storage.from("seller-assets").createSignedUrl(key, 60 * 60 * 24 * 365);
        const { data: pub } = supabase.storage.from("seller-assets").getPublicUrl(key);
        const url = signed?.signedUrl || pub.publicUrl;
        uploads.push({ type: isVideo ? "video" : "image", url });
      }
      if (uploads.length) await persist([...items, ...uploads]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addYoutube = async () => {
    const id = youtubeId(videoUrl.trim());
    if (!id) { toast({ title: "Invalid YouTube URL", variant: "destructive" }); return; }
    await persist([...items, { type: "video", url: `https://www.youtube.com/embed/${id}`, caption: videoCaption.trim() || undefined, thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg` }]);
    setVideoUrl(""); setVideoCaption("");
  };

  const updateCaption = (idx: number, caption: string) => {
    const next = items.map((it, i) => i === idx ? { ...it, caption } : it);
    setItems(next);
  };
  const saveCaption = (idx: number) => persist(items);
  const remove = (idx: number) => persist(items.filter((_, i) => i !== idx));

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading gallery…</div>;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Upload */}
        <Card className="p-4 border-dashed">
          <Label className="flex items-center gap-2 mb-3"><ImageIcon className="h-4 w-4" /> Upload factory photos or videos</Label>
          <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Uploading…" : "Choose files"}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Images or videos up to 10MB each.</p>
        </Card>
        {/* YouTube */}
        <Card className="p-4 border-dashed">
          <Label className="flex items-center gap-2 mb-3"><Youtube className="h-4 w-4 text-red-500" /> Add a YouTube video</Label>
          <div className="space-y-2">
            <Input placeholder="https://youtube.com/watch?v=…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
            <Input placeholder="Caption (optional)" value={videoCaption} onChange={(e) => setVideoCaption(e.target.value)} />
            <Button type="button" onClick={addYoutube} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add video</Button>
          </div>
        </Card>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No gallery items yet. Add factory tours, machinery, warehouse or team photos to build trust.
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((it, idx) => (
            <div key={idx} className="group relative rounded-xl overflow-hidden border bg-muted/30">
              <div className="aspect-video relative">
                {it.type === "image" ? (
                  <img src={it.url} alt={it.caption || "Gallery"} className="w-full h-full object-cover" />
                ) : it.url.includes("youtube.com/embed/") ? (
                  <img src={it.thumbnail} alt={it.caption || "Video"} className="w-full h-full object-cover" />
                ) : (
                  <video src={it.url} className="w-full h-full object-cover" muted />
                )}
                {it.type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <div className="rounded-full bg-white/90 p-2"><Video className="h-5 w-5 text-black" /></div>
                  </div>
                )}
                <button onClick={() => remove(idx)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-2">
                <Input
                  className="h-8 text-xs"
                  placeholder="Caption"
                  value={it.caption || ""}
                  onChange={(e) => updateCaption(idx, e.target.value)}
                  onBlur={() => saveCaption(idx)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

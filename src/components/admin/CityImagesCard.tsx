// Admin card: attach a banner image to each seller city tile shown on the home page.
// Stored in platform_settings under the key `city_images` as { [city]: url }.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";
import { MapPin, Save } from "lucide-react";

export function CityImagesCard() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [images, setImages] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  const { data } = useQuery({
    queryKey: ["city-images-admin"],
    queryFn: async () => {
      const [{ data: setting }, { data: sellers }] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "city_images").maybeSingle(),
        supabase.from("seller_profiles").select("city").eq("status", "approved").not("city", "is", null).limit(1000),
      ]);
      const map = new Map<string, number>();
      (sellers || []).forEach((s: any) => {
        const key = String(s.city || "").trim();
        if (!key) return;
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        map.set(label, (map.get(label) || 0) + 1);
      });
      return {
        saved: ((setting?.value as any) || {}) as Record<string, string>,
        cities: Array.from(map.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count),
      };
    },
  });

  useEffect(() => {
    if (data?.saved) setImages(data.saved);
  }, [data?.saved]);

  const save = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("platform_settings").upsert(
      { key: "city_images", value: images, description: "Banner images for city tiles on the home page", updated_by: auth.user?.id },
      { onConflict: "key" }
    );
    if (error) return toast({ title: "Could not save", description: error.message, variant: "destructive" });
    toast({ title: "City images saved" });
    qc.invalidateQueries({ queryKey: ["city-images-admin"] });
  };

  const cities = (data?.cities || []).filter((c) => c.city.toLowerCase().includes(search.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Sellers by Cities — Images</CardTitle>
            <CardDescription>Upload a photo for each city tile shown on the home page</CardDescription>
          </div>
          <Button onClick={save} size="sm"><Save className="h-4 w-4 mr-2" /> Save</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Search city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {cities.map((c) => (
            <div key={c.city} className="rounded-lg border p-3 space-y-2">
              <Label className="text-sm">{c.city} <span className="text-xs text-muted-foreground">({c.count} sellers)</span></Label>
              <ImageUpload
                bucket="media"
                folder="cities"
                images={images[c.city] ? [images[c.city]] : []}
                onImagesChange={(urls: string[]) => setImages((prev) => ({ ...prev, [c.city]: urls[0] || "" }))}
                maxImages={1}
                seoName={`${c.city}-suppliers`}
              />

            </div>
          ))}
          {!cities.length && <p className="text-sm text-muted-foreground">No approved sellers with a city yet.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default CityImagesCard;

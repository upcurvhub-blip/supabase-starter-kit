import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Wrench, MapPin, Clock, IndianRupee } from "lucide-react";

interface Service {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  price: number | null;
  city: string | null;
  images: string[] | null;
  response_time: string | null;
  category_id: string | null;
  seller_id: string;
}

export function ServicesExplore() {
  const [services, setServices] = useState<Service[]>([]);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: svcs }, { data: cats }] = await Promise.all([
        supabase.from("services").select("id, title, slug, description, price, city, images, response_time, category_id, seller_id")
          .eq("is_active", true).order("view_count", { ascending: false }).limit(8),
        supabase.from("categories").select("id, name, slug, image_url").eq("is_active", true).eq("is_service", true).limit(12),
      ]);
      setServices((svcs || []) as any);
      setServiceCategories(cats || []);
    })();
  }, []);

  if (!services.length && !serviceCategories.length) return null;

  return (
    <section className="py-12 bg-muted/40 border-t">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-2">
              <Wrench className="h-3 w-3" /> Services on Upcurv Trade
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1">Explore Services</h2>
            <p className="text-sm text-muted-foreground">Book verified service providers — repairs, installation, consulting & more</p>
          </div>
          <Button variant="outline" asChild className="hidden md:flex">
            <Link to="/categories?type=service" className="gap-2">View All <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>

        {serviceCategories.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 mb-8">
            {serviceCategories.slice(0, 8).map((c) => (
              <Link key={c.id} to={`/category/${c.slug}`} className="group text-center">
                <div className="aspect-square rounded-xl overflow-hidden border-2 bg-card group-hover:border-accent/40 group-hover:shadow-md transition-all flex items-center justify-center">
                  {c.image_url ? (
                    <img src={c.image_url} alt={c.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Wrench className="h-8 w-8 text-accent/60" />
                  )}
                </div>
                <p className="text-xs md:text-sm font-medium mt-2 line-clamp-2 group-hover:text-accent">{c.name}</p>
              </Link>
            ))}
          </div>
        )}

        {services.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {services.map((s) => (
              <Card key={s.id} className="card-hover overflow-hidden border-2 hover:border-accent/30">
                <Link to={`/service/${s.slug || s.id}`}>
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                    {s.images && s.images[0] ? (
                      <img src={s.images[0]} alt={s.title} loading="lazy"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <Wrench className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                </Link>
                <CardContent className="p-4 space-y-1.5">
                  <p className="font-semibold line-clamp-2 min-h-[2.5rem]">{s.title}</p>
                  {s.city && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {s.city}
                    </div>
                  )}
                  {s.response_time && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {s.response_time}
                    </div>
                  )}
                  {s.price && (
                    <div className="text-accent font-bold flex items-center text-sm">
                      <IndianRupee className="h-3.5 w-3.5" />{s.price.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ServicesExplore;

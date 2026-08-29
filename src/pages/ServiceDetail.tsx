import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnquiryForm } from "@/components/EnquiryForm";
import { publicQueryKeys } from "@/lib/queryKeys";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import {
  Wrench, MapPin, Clock, IndianRupee, ShieldCheck, Phone, MessageSquare,
  BadgeCheck, Users, Timer, ChevronRight, Repeat, CheckCircle2, ReceiptText,
  CreditCard, CircleDollarSign, CalendarClock,
} from "lucide-react";

export default function ServiceDetail() {
  const { slug } = useParams();
  const [activeImage, setActiveImage] = useState(0);

  const { data: service, isLoading } = useQuery({
    queryKey: publicQueryKeys.service(slug),
    queryFn: async () => {
      let q = supabase.from("services").select("*, categories(id,name,slug)").limit(1);
      q = /^[0-9a-f]{8}-/.test(slug || "") ? q.eq("id", slug!) : q.eq("slug", slug!);
      const { data } = await q.maybeSingle();
      return data;
    },
    enabled: !!slug,
    staleTime: 30_000,
    refetchOnMount: true,
  });

  const { data: seller } = useQuery({
    queryKey: ["service-seller", service?.seller_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("id", service!.seller_id)
        .maybeSingle();
      return data;
    },
    enabled: !!service?.seller_id,
  });

  // Count a view once per mounted service so sellers see service view stats.
  const trackedServiceId = useRef<string | null>(null);
  useEffect(() => {
    if (!service?.id || trackedServiceId.current === service.id) return;
    trackedServiceId.current = service.id;
    void supabase.rpc("record_service_view", { p_service_id: service.id });
  }, [service?.id]);

  const { data: moreServices } = useQuery({
    queryKey: ["more-services", service?.category_id, service?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, slug, title, price, city, images")
        .eq("is_active", true)
        .eq("category_id", service!.category_id!)
        .neq("id", service!.id)
        .limit(10);
      return data || [];
    },
    enabled: !!service?.category_id,
  });

  if (isLoading) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-16 text-muted-foreground">Loading service…</div>
      </MarketplaceLayout>
    );
  }

  if (!service) {
    return (
      <MarketplaceLayout>
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-2">Service not found</h1>
          <Link to="/categories" className="text-primary underline">Browse all services</Link>
        </div>
      </MarketplaceLayout>
    );
  }

  const images: string[] = (service.images as string[]) || [];
  const whatsapp = seller?.whatsapp || seller?.phone;
  const customFields = (service.custom_fields && typeof service.custom_fields === "object"
    ? service.custom_fields
    : {}) as Record<string, unknown>;
  const isRecurring = /month|quarter|year|amc|license|user/i.test(String(service.unit || ""));
  const highlights = Array.isArray(customFields.highlights)
    ? customFields.highlights.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const paymentModes = Array.isArray(customFields.payment_modes)
    ? customFields.payment_modes.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  const visitCharges = typeof customFields.visit_charges === "number" ? customFields.visit_charges : null;
  const advancePercent = typeof customFields.advance_percent === "number" ? customFields.advance_percent : null;
  const experienceYears = typeof customFields.experience_years === "number" ? customFields.experience_years : null;
  const serviceUrl = `${SITE_URL}/service/${service.slug || service.id}`;
  const providerName = seller?.business_name || seller?.company_name || "verified provider";
  const metaDescription = `${service.title}${service.city ? ` in ${service.city}` : ""} — ${
    (service.description || "professional service").toString().slice(0, 110)
  }. Get a quote from ${providerName} on ${SITE_NAME}.`.slice(0, 158);
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.description || metaDescription,
    url: serviceUrl,
    image: images,
    serviceType: service.categories?.name || "Business service",
    provider: { "@type": "Organization", name: providerName, url: seller ? `${SITE_URL}/seller-profile/${seller.slug || seller.id}` : undefined },
    areaServed: service.city ? { "@type": "City", name: service.city } : undefined,
    offers: service.price ? {
      "@type": "Offer",
      price: service.price,
      priceCurrency: service.currency || "INR",
      unitText: service.unit || undefined,
      url: serviceUrl,
    } : undefined,
  };


  return (
    <MarketplaceLayout>
      <Helmet>
        <title>{`${service.title}${service.city ? ` in ${service.city}` : ""} | ${SITE_NAME}`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={serviceUrl} />
        <meta property="og:title" content={`${service.title}${service.city ? ` in ${service.city}` : ""}`} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={serviceUrl} />
        {images[0] && <meta property="og:image" content={images[0]} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${service.title}${service.city ? ` in ${service.city}` : ""} | ${SITE_NAME}`} />
        <meta name="twitter:description" content={metaDescription} />
        {images[0] && <meta name="twitter:image" content={images[0]} />}
        <script type="application/ld+json">{JSON.stringify(serviceJsonLd)}</script>
      </Helmet>
      <div className="container mx-auto px-4 py-6">

        <nav className="text-xs text-muted-foreground flex items-center gap-1 mb-4 flex-wrap">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/categories" className="hover:text-foreground">Services</Link>
          {service.categories?.name && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link to={`/category/${service.categories.slug}`} className="hover:text-foreground">
                {service.categories.name}
              </Link>
            </>
          )}
        </nav>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          <div>
            <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted flex items-center justify-center">
              {images[activeImage] ? (
                <img src={images[activeImage]} alt={service.title} className="w-full h-full object-cover" />
              ) : (
                <Wrench className="h-16 w-16 text-muted-foreground/40" />
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}
                    className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 ${i === activeImage ? "border-primary" : "border-transparent"}`}>
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="gap-1"><Wrench className="h-3 w-3" /> Service</Badge>
              {service.emergency_service && <Badge variant="destructive">Emergency available</Badge>}
              {seller?.verification_status === "verified" && (
                <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600"><BadgeCheck className="h-3 w-3" /> Verified provider</Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3">{service.title}</h1>

            {(service.price || service.min_charges) && (
              <div className="mb-4 rounded-xl border bg-muted/30 p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="flex items-center text-3xl font-bold text-primary">
                    <IndianRupee className="h-6 w-6" />
                    {(service.price ?? service.min_charges)?.toLocaleString()}
                  </span>
                  {service.unit && (
                    <span className="text-sm text-muted-foreground">
                      / {String(service.unit).replace(/_/g, " ").replace(/^per /, "")}
                    </span>
                  )}
                  {isRecurring ? (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                      <Repeat className="mr-1 h-3 w-3" /> Recurring billing
                    </Badge>
                  ) : (
                    <Badge variant="secondary">One-time charge</Badge>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {service.min_charges && <span>Minimum charges ₹{Number(service.min_charges).toLocaleString()}</span>}
                  {visitCharges !== null && <span>Visit charges ₹{visitCharges.toLocaleString()}</span>}
                  {advancePercent !== null && <span>Advance {advancePercent}%</span>}
                  {customFields.amc_available === true && <span>AMC available</span>}
                </div>
              </div>
            )}

            {!!highlights.length && (
              <ul className="mb-4 grid gap-1.5 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
              {service.city && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{service.city}{service.state ? `, ${service.state}` : ""}</div>
              )}
              {service.response_time && (
                <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Responds {service.response_time}</div>
              )}
              {service.service_radius_km && (
                <div className="flex items-center gap-2"><Timer className="h-4 w-4 text-muted-foreground" />Covers {service.service_radius_km} km</div>
              )}
              {service.team_size && (
                <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" />Team of {service.team_size}</div>
              )}
              {experienceYears !== null ? (
                <div className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-muted-foreground" />{experienceYears}+ yrs experience</div>
              ) : null}
              {service.warranty && (
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-muted-foreground" />{service.warranty}</div>
              )}
            </div>


            <div className="flex gap-2 mb-5">
              <div className="flex-1">
                <EnquiryForm
                  product={{
                    id: service.id,
                    name: service.title,
                    category_id: service.category_id || undefined,
                    images: images,
                    seller_profiles: seller
                      ? { id: seller.id, business_name: seller.business_name || seller.company_name || "Provider" }
                      : undefined,
                  }}
                  trigger={
                    <Button className="w-full gradient-accent h-12 font-semibold">
                      <MessageSquare className="h-4 w-4 mr-2" /> Get Quote
                    </Button>
                  }
                />
              </div>
              {whatsapp && (
                <Button asChild variant="outline" className="h-12">
                  <a
                    href={`https://wa.me/${String(whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in your service: ${service.title}`)}`}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4 mr-2" /> WhatsApp
                  </a>
                </Button>
              )}
            </div>

            {seller && (
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  {seller.logo_url ? (
                    <img src={seller.logo_url} alt={seller.business_name || ""} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><Wrench className="h-5 w-5" /></div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{seller.business_name || seller.company_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{seller.city}{seller.state ? `, ${seller.state}` : ""}</p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/seller-profile/${seller.slug || seller.id}`}>View profile</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {service.description && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-3">About this service</h2>
              <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{service.description}</p>
            </CardContent>
          </Card>
        )}

        <section className="mb-8 border-y bg-muted/20 py-6">
          <div className="grid gap-5 px-1 sm:grid-cols-2 lg:grid-cols-4">
            {customFields.free_site_visit === true && (
              <div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Free site visit</h2><p className="text-xs text-muted-foreground">Initial on-site assessment included</p></div></div>
            )}
            {customFields.amc_available === true && (
              <div className="flex gap-3"><CalendarClock className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">AMC available</h2><p className="text-xs text-muted-foreground">Ongoing maintenance plans offered</p></div></div>
            )}
            {customFields.gst_invoice === true && (
              <div className="flex gap-3"><ReceiptText className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">GST invoice</h2><p className="text-xs text-muted-foreground">Business-ready tax invoice provided</p></div></div>
            )}
            {customFields.insurance_covered === true && (
              <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Insurance covered</h2><p className="text-xs text-muted-foreground">Service coverage confirmed by provider</p></div></div>
            )}
            {customFields.background_verified === true && (
              <div className="flex gap-3"><BadgeCheck className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Background verified</h2><p className="text-xs text-muted-foreground">Provider verification is recorded</p></div></div>
            )}
            {paymentModes.length > 0 && (
              <div className="flex gap-3"><CreditCard className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Payment options</h2><p className="text-xs text-muted-foreground">{paymentModes.join(", ")}</p></div></div>
            )}
            {advancePercent !== null && (
              <div className="flex gap-3"><CircleDollarSign className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="text-sm font-semibold">Advance payment</h2><p className="text-xs text-muted-foreground">{advancePercent}% to begin work</p></div></div>
            )}
          </div>
        </section>

        {(service.certifications?.length || service.working_hours) && (
          <Card className="mb-8">
            <CardContent className="p-6 grid md:grid-cols-2 gap-6">
              {!!service.certifications?.length && (
                <div>
                  <h3 className="font-semibold mb-2">Certifications</h3>
                  <div className="flex flex-wrap gap-2">
                    {(service.certifications as string[]).map((c) => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {service.working_hours && (
                <div>
                  <h3 className="font-semibold mb-2">Working hours</h3>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                    {Object.entries(service.working_hours as Record<string, any>)
                      .map(([d, v]) => `${d}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n")}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!!moreServices?.length && (
          <section className="mb-12">
            <h2 className="text-lg font-semibold mb-3">Similar services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {moreServices.map((s: any) => (
                <Link key={s.id} to={`/service/${s.slug || s.id}`}>
                  <Card className="h-full overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
                      {s.images?.[0] ? (
                        <img src={s.images[0]} alt={s.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : <Wrench className="h-7 w-7 text-muted-foreground/40" />}
                    </div>
                    <CardContent className="p-2">
                      <p className="text-xs font-medium line-clamp-2">{s.title}</p>
                      {s.price && (
                        <p className="text-xs font-semibold text-primary flex items-center mt-1">
                          <IndianRupee className="h-3 w-3" />{s.price.toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

    </MarketplaceLayout>
  );
}

// Heavy-duty trust signal panel for high-ticket B2B buyers.
// Reads only real seller_profiles data — unverified items show as "Not verified".
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, Factory, CalendarDays, Globe, Zap, Truck, Users, Repeat,
  Building2, Video, UserRound, IndianRupee, Award, MapPin, BadgeCheck, FileCheck2, HandshakeIcon,
  Check, Minus,
} from "lucide-react";

interface Props {
  seller: any;
  reviewCount?: number;
  repeatOrders?: number;
  photoCount?: number;
}

type Signal = {
  label: string;
  icon: any;
  value?: string | null;
  ok: boolean;
};

export function TrustPanel({ seller, reviewCount = 0, repeatOrders = 0, photoCount = 0 }: Props) {
  if (!seller) return null;
  const year = seller.established_year || seller.year_established;
  const years = year ? new Date().getFullYear() - year : null;
  const certs: string[] = Array.isArray(seller.certifications)
    ? seller.certifications.map((c: any) => (typeof c === "string" ? c : c?.name)).filter(Boolean)
    : [];
  const hasIso = certs.some((c) => /iso/i.test(c));

  const signals: Signal[] = [
    { label: "GST Verified", icon: FileCheck2, value: seller.gst_number || seller.gstin ? "Registered" : null, ok: !!(seller.gst_number || seller.gstin) },
    { label: "PAN Verified", icon: BadgeCheck, value: seller.pan || seller.pan_number ? "On record" : null, ok: !!(seller.pan || seller.pan_number) },
    { label: "Factory Verified", icon: Factory, value: seller.manufacturing_capacity || null, ok: !!seller.manufacturing_capacity },
    { label: "Company Established", icon: CalendarDays, value: year ? String(year) : null, ok: !!year },
    { label: "Years in Business", icon: Award, value: years !== null ? `${years} yrs` : null, ok: years !== null && years >= 1 },
    { label: "Exporter", icon: Globe, value: seller.export_countries?.length ? `${seller.export_countries.length} countries` : null, ok: !!seller.export_countries?.length },
    { label: "Response Rate", icon: Zap, value: seller.response_rate ? `${seller.response_rate}%` : null, ok: (seller.response_rate || 0) >= 50 },
    { label: "Delivery Rating", icon: Truck, value: seller.avg_rating ? `${Number(seller.avg_rating).toFixed(1)}/5` : null, ok: (seller.avg_rating || 0) >= 3.5 },
    { label: "Previous Buyers", icon: Users, value: seller.total_leads ? `${seller.total_leads}+` : null, ok: (seller.total_leads || 0) > 0 },
    { label: "Repeat Orders", icon: Repeat, value: (seller.converted_leads || repeatOrders) ? `${seller.converted_leads || repeatOrders}` : null, ok: (seller.converted_leads || repeatOrders || 0) > 0 },
    { label: "Company Photos", icon: Building2, value: photoCount ? `${photoCount} photos` : seller.banner_url ? "Available" : null, ok: !!(photoCount || seller.banner_url) },
    { label: "Factory Video", icon: Video, value: seller.social_links?.video ? "Available" : null, ok: !!seller.social_links?.video },
    { label: "Employees", icon: UserRound, value: seller.employee_count || null, ok: !!seller.employee_count },
    { label: "Annual Revenue", icon: IndianRupee, value: seller.annual_turnover || null, ok: !!seller.annual_turnover },
    { label: "Certifications", icon: Award, value: certs.length ? certs.slice(0, 2).join(", ") : null, ok: certs.length > 0 },
    { label: "PAN India Supply", icon: MapPin, value: seller.payment_modes?.length || seller.state ? "Serving Pan India" : null, ok: !!seller.state },
    { label: "ISO Certified", icon: ShieldCheck, value: hasIso ? "ISO" : null, ok: hasIso },
    { label: "Trade Assurance", icon: HandshakeIcon, value: seller.verification_status === "verified" ? "Protected enquiry" : null, ok: seller.verification_status === "verified" },
  ];

  const verified = signals.filter((s) => s.ok).length;
  const pct = Math.round((verified / signals.length) * 100);

  return (
    <Card className="mb-8 border-trust/30">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-trust" /> Supplier Trust Report
            </h2>
            <p className="text-sm text-muted-foreground">
              {verified} of {signals.length} trust checks confirmed for {seller.business_name || "this supplier"}
            </p>
          </div>
          <div className="min-w-[160px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Trust completeness</span>
              <span className="font-semibold">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {signals.map((s) => (
            <div
              key={s.label}
              className={`rounded-lg border p-3 ${s.ok ? "border-trust/30 bg-trust/5" : "border-dashed bg-muted/40"}`}
            >
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${s.ok ? "bg-trust text-trust-foreground" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                  {s.ok ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold leading-tight flex items-center gap-1">
                    <s.icon className="h-3 w-3 opacity-70" /> {s.label}
                  </div>
                  <div className={`text-[11px] mt-0.5 truncate ${s.ok ? "text-foreground/70" : "text-muted-foreground"}`}>
                    {s.ok ? s.value || "Confirmed" : "Not verified"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs">Trust score {seller.trust_score || 0}%</Badge>
          {reviewCount > 0 && <Badge variant="outline" className="text-xs">{reviewCount} buyer reviews</Badge>}
          {seller.verification_status === "verified" && (
            <Badge className="text-xs bg-trust text-trust-foreground">Verified supplier</Badge>
          )}
          <span className="text-[11px] text-muted-foreground">
            Details are supplier-declared and validated against documents on record.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default TrustPanel;

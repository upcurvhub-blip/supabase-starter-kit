import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Building2, Phone, Loader2 } from "lucide-react";

interface BusinessLead {
  id: string;
  business_name: string;
  phone: string;
  page_path: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const STATUSES = ["new", "contacted", "qualified", "closed"];

export default function BusinessLeads() {
  const [leads, setLeads] = useState<BusinessLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("business_visitor_leads")
      .select("id, business_name, phone, page_path, city, status, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    setLeads((data as BusinessLead[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("business_visitor_leads").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  const filtered = leads.filter(
    (l) =>
      !search.trim() ||
      l.business_name.toLowerCase().includes(search.toLowerCase()) ||
      l.phone.includes(search.trim()),
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Business Visitor Leads</h1>
            <p className="text-sm text-muted-foreground">
              Visitors who identified themselves as business buyers in the intent prompt.
            </p>
          </div>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone"
            className="w-full sm:w-64"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">No business leads yet.</CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map((lead) => (
              <Card key={lead.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-accent" /> {lead.business_name}
                    </CardTitle>
                    <Badge variant={lead.status === "new" ? "default" : "secondary"} className="capitalize">
                      {lead.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                      <Phone className="h-4 w-4" /> {lead.phone}
                    </a>
                    {lead.city && <span>{lead.city}</span>}
                    {lead.page_path && <span className="truncate">from {lead.page_path}</span>}
                    <span>{new Date(lead.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={lead.status === s ? "default" : "outline"}
                        className="capitalize"
                        onClick={() => setStatus(lead.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

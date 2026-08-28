import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowRight,
  Plus,
  MessageSquare,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
} from "lucide-react";
import { MetricCard, ProgressBar, FunnelChart } from "@/components/analytics/ZohoStyleChart";

const DealPipeline = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [newStageId, setNewStageId] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [newDeal, setNewDeal] = useState<{ leadId: string; value: string }>({ leadId: "", value: "" });

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: sellerProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["seller-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("seller_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: dealStages, isLoading: stagesLoading } = useQuery({
    queryKey: ["deal-stages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("deal_stages")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      return data || [];
    },
  });

  const { data: deals, isLoading: dealsLoading } = useQuery({
    queryKey: ["seller-deals", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("deal_tracking")
        .select(`
          *,
          deal_stages(*),
          leads(*, products(name))
        `)
        .eq("seller_id", sellerProfile.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  // Leads that don't yet have a deal — available to convert
  const { data: openLeads, isLoading: leadsLoading } = useQuery({
    queryKey: ["seller-open-leads", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("leads")
        .select("*, products(name)")
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!sellerProfile,
  });

  const { data: dealActivities } = useQuery({
    queryKey: ["deal-activities", selectedDeal?.id],
    queryFn: async () => {
      if (!selectedDeal) return [];
      const { data } = await supabase
        .from("deal_activities")
        .select("*")
        .eq("deal_id", selectedDeal.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedDeal,
  });

  const createDealMutation = useMutation({
    mutationFn: async ({ leadId, value, stageId }: { leadId: string; value: number; stageId: string }) => {
      if (!sellerProfile) throw new Error("No seller profile");
      const { error } = await supabase.from("deal_tracking").insert({
        seller_id: sellerProfile.id,
        lead_id: leadId,
        current_stage_id: stageId || null,
        deal_value: value || 0,
        probability: 20,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Deal created from lead!" });
      queryClient.invalidateQueries({ queryKey: ["seller-deals"] });
      queryClient.invalidateQueries({ queryKey: ["seller-open-leads"] });
      setCreateOpen(false);
      setNewDeal({ leadId: "", value: "" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ dealId, stageId, notes }: { dealId: string; stageId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc("update_deal_stage", {
        p_deal_id: dealId,
        p_new_stage_id: stageId,
        p_notes: notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Deal stage updated!" });
      queryClient.invalidateQueries({ queryKey: ["seller-deals"] });
      setSelectedDeal(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addActivityMutation = useMutation({
    mutationFn: async ({ dealId, type, description }: { dealId: string; type: string; description: string }) => {
      const { error } = await supabase.from("deal_activities").insert({
        deal_id: dealId,
        activity_type: type,
        description,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Activity added!" });
      queryClient.invalidateQueries({ queryKey: ["deal-activities"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Calculate pipeline metrics
  const pipelineValue = deals?.reduce((sum, d) => sum + (d.deal_value || 0), 0) || 0;
  const wonDeals = deals?.filter((d) => d.deal_stages?.is_won) || [];
  const lostDeals = deals?.filter((d) => d.deal_stages?.is_lost) || [];
  const activeDeals = deals?.filter((d) => !d.deal_stages?.is_final) || [];

  const dealLeadIds = new Set((deals || []).map((d) => d.lead_id).filter(Boolean));
  const availableLeads = (openLeads || []).filter((l: any) => !dealLeadIds.has(l.id));

  // Group deals by stage for funnel
  const stageGroups = dealStages?.map((stage) => ({
    name: stage.name,
    count: deals?.filter((d) => d.current_stage_id === stage.id).length || 0,
    value: deals?.filter((d) => d.current_stage_id === stage.id).reduce((s, d) => s + (d.deal_value || 0), 0) || 0,
    color: stage.color,
  })) || [];

  const isPipelineLoading = userLoading || profileLoading || stagesLoading || dealsLoading || leadsLoading;

  const PipelineSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72 max-w-[70vw]" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-lg" />
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-max gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-[280px] shrink-0 space-y-3">
              <Skeleton className="h-10 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout role="seller">
      {isPipelineLoading ? (
        <PipelineSkeleton />
      ) : (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deal Pipeline</h1>
            <p className="text-muted-foreground">Track and manage your deals through each stage</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-accent">
                <Plus className="h-4 w-4 mr-1" /> Create Deal from Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>Create Deal from Lead</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Select Lead</p>
                  <Select value={newDeal.leadId} onValueChange={(v) => setNewDeal({ ...newDeal, leadId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a lead to convert" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableLeads.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No leads available</div>
                      )}
                      {availableLeads.map((lead: any) => (
                        <SelectItem key={lead.id} value={lead.id}>
                          {(lead.products?.name || "Enquiry")} — {lead.guest_name || "Public Buyer"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Estimated Deal Value (₹)</p>
                  <Input
                    type="number"
                    placeholder="0"
                    value={newDeal.value}
                    onChange={(e) => setNewDeal({ ...newDeal, value: e.target.value })}
                  />
                </div>
                <Button
                  className="w-full gradient-accent"
                  disabled={!newDeal.leadId || createDealMutation.isPending}
                  onClick={() => createDealMutation.mutate({
                    leadId: newDeal.leadId,
                    value: parseFloat(newDeal.value) || 0,
                    stageId: dealStages?.[0]?.id || "",
                  })}
                >
                  {createDealMutation.isPending ? "Creating..." : "Create Deal"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>


        {/* Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Pipeline Value"
            value={`₹${(pipelineValue / 1000).toFixed(1)}K`}
            icon={<DollarSign className="h-5 w-5" />}
            color="primary"
          />
          <MetricCard
            title="Active Deals"
            value={activeDeals.length}
            icon={<Target className="h-5 w-5" />}
            color="info"
          />
          <MetricCard
            title="Won Deals"
            value={wonDeals.length}
            icon={<CheckCircle2 className="h-5 w-5" />}
            change={wonDeals.length > 0 ? 15 : 0}
            color="success"
          />
          <MetricCard
            title="Lost Deals"
            value={lostDeals.length}
            icon={<XCircle className="h-5 w-5" />}
            color="danger"
          />
        </div>

        {/* Pipeline Funnel */}
        <FunnelChart
          title="Pipeline Funnel"
          steps={stageGroups.map((s) => ({
            label: s.name,
            value: s.count,
            percentage: deals?.length ? Math.round((s.count / deals.length) * 100) : 0,
            color: s.color,
          }))}
        />

        {/* Kanban-style Pipeline */}
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {dealStages?.map((stage) => {
              const stageDeals = deals?.filter((d) => d.current_stage_id === stage.id) || [];
              return (
                <div key={stage.id} className="w-[280px] shrink-0">
                <div 
                  className="flex items-center gap-2 mb-3 p-2 rounded-lg"
                  style={{ backgroundColor: `${stage.color}20` }}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="font-medium text-sm">{stage.name}</span>
                  <Badge variant="secondary" className="ml-auto">{stageDeals.length}</Badge>
                </div>

                <div className="space-y-2">
                  {stageDeals.map((deal) => (
                    <Card 
                      key={deal.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedDeal(deal)}
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {deal.leads?.products?.name || "Untitled Deal"}
                          </h4>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {deal.leads?.guest_name || "Public Buyer"}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-primary">
                              ₹{((deal.deal_value || 0) / 1000).toFixed(1)}K
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {deal.probability}%
                            </span>
                          </div>
                          {deal.next_action_date && (
                            <div className="flex items-center gap-1 text-xs text-warning">
                              <Clock className="h-3 w-3" />
                              {format(new Date(deal.next_action_date), "MMM d")}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {stageDeals.length === 0 && (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                      No deals
                    </div>
                  )}
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Deal Detail Dialog */}
      <Dialog open={!!selectedDeal} onOpenChange={(open) => !open && setSelectedDeal(null)}>
        <DialogContent className="max-w-2xl rounded-2xl sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Deal Details</DialogTitle>
          </DialogHeader>
          
          {selectedDeal && (
            <div className="space-y-6">
              {/* Deal Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">{selectedDeal.leads?.products?.name || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Buyer</p>
                  <p className="font-medium">{selectedDeal.leads?.guest_name || "Public Buyer"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deal Value</p>
                  <p className="font-medium text-primary">₹{selectedDeal.deal_value?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Probability</p>
                  <ProgressBar label="Win Probability" value={selectedDeal.probability} max={100} showValue />
                </div>
              </div>

              {/* Change Stage */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Move to Stage</p>
                <div className="flex gap-2">
                  <Select value={newStageId} onValueChange={setNewStageId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select new stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {dealStages?.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => {
                      if (newStageId) {
                        updateStageMutation.mutate({
                          dealId: selectedDeal.id,
                          stageId: newStageId,
                        });
                      }
                    }}
                    disabled={!newStageId || updateStageMutation.isPending}
                  >
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Move
                  </Button>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-1" />
                  Call
                </Button>
                <Button variant="outline" size="sm">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  WhatsApp
                </Button>
              </div>

              {/* Activities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Recent Activities</p>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Activity
                  </Button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {dealActivities?.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                      <Badge variant="outline" className="shrink-0">{activity.activity_type}</Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {dealActivities?.length === 0 && (
                    <p className="text-center py-4 text-muted-foreground text-sm">No activities yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DealPipeline;

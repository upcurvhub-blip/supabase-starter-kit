import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ManagePlans = () => {
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    tier: "basic",
    description: "",
    price_monthly: "",
    price_yearly: "",
    leads_per_month: "",
    featured_products: "",
    verified_badge: false,
    show_contact_details: false,
    analytics_access: false,
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_monthly");
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("subscription_plans").insert({
        name: data.name,
        tier: data.tier as "free" | "basic" | "pro" | "premium",
        description: data.description || null,
        price_monthly: parseFloat(data.price_monthly) || 0,
        price_yearly: parseFloat(data.price_yearly) || 0,
        leads_per_month: parseInt(data.leads_per_month) || 0,
        featured_products: parseInt(data.featured_products) || 0,
        verified_badge: data.verified_badge,
        show_contact_details: data.show_contact_details,
        analytics_access: data.analytics_access,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setOpen(false);
      resetForm();
      toast({ title: "Plan created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from("subscription_plans").update({
        name: data.name,
        tier: data.tier as "free" | "basic" | "pro" | "premium",
        description: data.description || null,
        price_monthly: parseFloat(data.price_monthly) || 0,
        price_yearly: parseFloat(data.price_yearly) || 0,
        leads_per_month: parseInt(data.leads_per_month) || 0,
        featured_products: parseInt(data.featured_products) || 0,
        verified_badge: data.verified_badge,
        show_contact_details: data.show_contact_details,
        analytics_access: data.analytics_access,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setOpen(false);
      setEditingPlan(null);
      resetForm();
      toast({ title: "Plan updated successfully" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("subscription_plans").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      tier: "basic",
      description: "",
      price_monthly: "",
      price_yearly: "",
      leads_per_month: "",
      featured_products: "",
      verified_badge: false,
      show_contact_details: false,
      analytics_access: false,
    });
  };

  const openEditDialog = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      tier: plan.tier,
      description: plan.description || "",
      price_monthly: plan.price_monthly.toString(),
      price_yearly: plan.price_yearly.toString(),
      leads_per_month: plan.leads_per_month.toString(),
      featured_products: (plan.featured_products || 0).toString(),
      verified_badge: plan.verified_badge || false,
      show_contact_details: plan.show_contact_details || false,
      analytics_access: plan.analytics_access || false,
    });
    setOpen(true);
  };

  const tierColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-800",
    basic: "bg-blue-100 text-blue-800",
    pro: "bg-purple-100 text-purple-800",
    premium: "bg-yellow-100 text-yellow-800",
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Plans</h1>
            <p className="text-muted-foreground">Configure subscription plans and pricing</p>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingPlan(null); resetForm(); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Plan</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Edit Plan" : "Add Plan"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Plan Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Select
                    value={formData.tier}
                    onValueChange={(value) => setFormData({ ...formData, tier: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Monthly Price (₹)"
                    value={formData.price_monthly}
                    onChange={(e) => setFormData({ ...formData, price_monthly: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Yearly Price (₹)"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({ ...formData, price_yearly: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Leads per Month"
                    value={formData.leads_per_month}
                    onChange={(e) => setFormData({ ...formData, leads_per_month: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Featured Products"
                    value={formData.featured_products}
                    onChange={(e) => setFormData({ ...formData, featured_products: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Verified Badge</span>
                    <Switch
                      checked={formData.verified_badge}
                      onCheckedChange={(checked) => setFormData({ ...formData, verified_badge: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Show Contact Details</span>
                    <Switch
                      checked={formData.show_contact_details}
                      onCheckedChange={(checked) => setFormData({ ...formData, show_contact_details: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Analytics Access</span>
                    <Switch
                      checked={formData.analytics_access}
                      onCheckedChange={(checked) => setFormData({ ...formData, analytics_access: checked })}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    if (editingPlan) {
                      updateMutation.mutate({ id: editingPlan.id, data: formData });
                    } else {
                      createMutation.mutate(formData);
                    }
                  }}
                  disabled={!formData.name}
                >
                  {editingPlan ? "Update" : "Create"} Plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans?.map((plan) => (
              <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge className={tierColors[plan.tier]}>{plan.tier}</Badge>
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: plan.id, is_active: checked })}
                    />
                  </div>
                  <CardTitle className="mt-2">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">₹{plan.price_monthly}/mo</div>
                    <p className="text-sm text-muted-foreground">₹{plan.price_yearly}/year</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>{plan.leads_per_month} leads/month</div>
                    {plan.featured_products > 0 && <div>{plan.featured_products} featured products</div>}
                    {plan.verified_badge && <div>✓ Verified badge</div>}
                    {plan.show_contact_details && <div>✓ Show contact details</div>}
                    {plan.analytics_access && <div>✓ Analytics access</div>}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ManagePlans;

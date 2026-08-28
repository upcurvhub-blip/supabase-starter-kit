import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format } from "date-fns";
import {
  DollarSign,
  TrendingUp,
  Calculator,
  Settings2,
  Plus,
  Edit,
  History,
  Target,
  MapPin,
  Clock,
} from "lucide-react";
import { MetricCard } from "@/components/analytics/ZohoStyleChart";

const LeadPricing = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: pricingConfigs } = useQuery({
    queryKey: ["lead-pricing-configs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_pricing_config")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const { data: priceHistory } = useQuery({
    queryKey: ["lead-price-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("lead_price_history")
        .select("*, leads(products(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: pricingStats } = useQuery({
    queryKey: ["pricing-stats"],
    queryFn: async () => {
      const { data } = await supabase.from("lead_price_history").select("final_price");
      if (!data || data.length === 0) return { avg: 0, min: 0, max: 0, total: 0 };
      const prices = data.map((p) => p.final_price);
      return {
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        min: Math.min(...prices),
        max: Math.max(...prices),
        total: prices.reduce((a, b) => a + b, 0),
      };
    },
  });

  const [formData, setFormData] = useState({
    category_id: "",
    base_price: 50,
    intent_multiplier_low: 0.8,
    intent_multiplier_medium: 1.0,
    intent_multiplier_high: 1.5,
    urgency_multiplier_normal: 1.0,
    urgency_multiplier_urgent: 1.5,
    urgency_multiplier_critical: 2.0,
    min_price: 20,
    max_price: 500,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("lead_pricing_config").insert({
        ...formData,
        category_id: formData.category_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Pricing config saved!" });
      queryClient.invalidateQueries({ queryKey: ["lead-pricing-configs"] });
      setShowAddDialog(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lead Pricing Configuration</h1>
            <p className="text-muted-foreground">Configure dynamic lead pricing based on intent, geography, and urgency</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Pricing Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Pricing Configuration</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Category (leave empty for default)</Label>
                  <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Default (All Categories)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Default (All Categories)</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Price (₹)</Label>
                    <Input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Price (₹)</Label>
                    <Input
                      type="number"
                      value={formData.min_price}
                      onChange={(e) => setFormData({ ...formData, min_price: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Intent Multipliers</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Low (&lt;30)</p>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.intent_multiplier_low}
                        onChange={(e) => setFormData({ ...formData, intent_multiplier_low: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Medium (30-70)</p>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.intent_multiplier_medium}
                        onChange={(e) => setFormData({ ...formData, intent_multiplier_medium: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">High (&gt;70)</p>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.intent_multiplier_high}
                        onChange={(e) => setFormData({ ...formData, intent_multiplier_high: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Urgency Multipliers</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Normal</p>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.urgency_multiplier_normal}
                        onChange={(e) => setFormData({ ...formData, urgency_multiplier_normal: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Urgent</p>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.urgency_multiplier_urgent}
                        onChange={(e) => setFormData({ ...formData, urgency_multiplier_urgent: parseFloat(e.target.value) })}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Critical</p>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.urgency_multiplier_critical}
                        onChange={(e) => setFormData({ ...formData, urgency_multiplier_critical: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full">
                  Save Configuration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Avg Lead Price"
            value={`₹${pricingStats?.avg.toFixed(0) || 0}`}
            icon={<DollarSign className="h-5 w-5" />}
            color="primary"
          />
          <MetricCard
            title="Min Price"
            value={`₹${pricingStats?.min || 0}`}
            icon={<TrendingUp className="h-5 w-5" />}
            color="info"
          />
          <MetricCard
            title="Max Price"
            value={`₹${pricingStats?.max || 0}`}
            icon={<Target className="h-5 w-5" />}
            color="warning"
          />
          <MetricCard
            title="Total Revenue"
            value={`₹${((pricingStats?.total || 0) / 1000).toFixed(1)}K`}
            icon={<Calculator className="h-5 w-5" />}
            color="success"
          />
        </div>

        <Tabs defaultValue="configs">
          <TabsList>
            <TabsTrigger value="configs">Pricing Rules</TabsTrigger>
            <TabsTrigger value="history">Price History</TabsTrigger>
            <TabsTrigger value="formula">Formula Breakdown</TabsTrigger>
          </TabsList>

          <TabsContent value="configs">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Base Price</TableHead>
                      <TableHead>Intent Multipliers</TableHead>
                      <TableHead>Urgency Multipliers</TableHead>
                      <TableHead>Price Range</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingConfigs?.map((config: any) => (
                      <TableRow key={config.id}>
                        <TableCell className="font-medium">
                          {config.categories?.name || "Default (All)"}
                        </TableCell>
                        <TableCell>₹{config.base_price}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="secondary">{config.intent_multiplier_low}x</Badge>
                            <Badge variant="outline">{config.intent_multiplier_medium}x</Badge>
                            <Badge>{config.intent_multiplier_high}x</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Badge variant="secondary">{config.urgency_multiplier_normal}x</Badge>
                            <Badge variant="outline">{config.urgency_multiplier_urgent}x</Badge>
                            <Badge>{config.urgency_multiplier_critical}x</Badge>
                          </div>
                        </TableCell>
                        <TableCell>₹{config.min_price} - ₹{config.max_price}</TableCell>
                        <TableCell>
                          <Badge variant={config.is_active ? "default" : "secondary"}>
                            {config.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Intent Score</TableHead>
                      <TableHead>Geography</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Final Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceHistory?.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(record.created_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>{record.leads?.products?.name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={
                            record.intent_score >= 70 ? "default" :
                            record.intent_score >= 30 ? "outline" : "secondary"
                          }>
                            {record.intent_score}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {record.geography_tier}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {record.urgency_level}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          ₹{record.final_price}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="formula">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Dynamic Pricing Formula
                </CardTitle>
                <CardDescription>
                  Understanding how lead prices are calculated
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted rounded-lg font-mono text-sm">
                  Final Price = Base Price × Intent Multiplier × Geography Multiplier × Urgency Multiplier × Demand Factor
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Intent Score Multipliers
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Low Intent (&lt;30)</span>
                        <Badge variant="secondary">0.8x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Medium Intent (30-70)</span>
                        <Badge variant="outline">1.0x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>High Intent (&gt;70)</span>
                        <Badge>1.5x</Badge>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-info" />
                      Geography Premium
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Tier 1 Cities (Metro)</span>
                        <Badge>1.3x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Tier 2 Cities</span>
                        <Badge variant="outline">1.1x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Tier 3 & Others</span>
                        <Badge variant="secondary">1.0x</Badge>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-warning" />
                      Urgency Multipliers
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Normal</span>
                        <Badge variant="secondary">1.0x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Urgent (within 7 days)</span>
                        <Badge variant="outline">1.5x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Critical (within 24hrs)</span>
                        <Badge>2.0x</Badge>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      Demand Factor
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span>Low Demand (&lt;20 leads/week)</span>
                        <Badge variant="secondary">0.9x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>Normal (20-50 leads)</span>
                        <Badge variant="outline">1.0x</Badge>
                      </li>
                      <li className="flex justify-between">
                        <span>High Demand (&gt;100 leads)</span>
                        <Badge>1.3x</Badge>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LeadPricing;

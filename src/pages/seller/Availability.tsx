import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Clock,
  Calendar as CalendarIcon,
  Bell,
  Palmtree,
  Save,
  AlertCircle,
  CheckCircle2,
  Settings2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const timezones = [
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (EST)" },
];

const timeSlots = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const SellerAvailability = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [vacationDate, setVacationDate] = useState<Date | undefined>();

  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: sellerProfile } = useQuery({
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

  const { data: availability, isLoading } = useQuery({
    queryKey: ["seller-availability", sellerProfile?.id],
    queryFn: async () => {
      if (!sellerProfile) return null;
      const { data } = await supabase
        .from("seller_availability")
        .select("*")
        .eq("seller_id", sellerProfile.id)
        .single();
      return data;
    },
    enabled: !!sellerProfile,
  });

  const [formData, setFormData] = useState({
    is_available: true,
    max_leads_per_day: 50,
    available_from: "09:00",
    available_to: "18:00",
    timezone: "Asia/Kolkata",
    vacation_mode: false,
    vacation_until: null as Date | null,
    auto_response_enabled: false,
  });

  useEffect(() => {
    if (availability) {
      setFormData({
        is_available: availability.is_available ?? true,
        max_leads_per_day: availability.max_leads_per_day ?? 50,
        available_from: availability.available_from ?? "09:00",
        available_to: availability.available_to ?? "18:00",
        timezone: availability.timezone ?? "Asia/Kolkata",
        vacation_mode: availability.vacation_mode ?? false,
        vacation_until: availability.vacation_until ? new Date(availability.vacation_until) : null,
        auto_response_enabled: availability.auto_response_enabled ?? false,
      });
      if (availability.vacation_until) {
        setVacationDate(new Date(availability.vacation_until));
      }
    }
  }, [availability]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!sellerProfile) throw new Error("Seller profile not found");
      
      const payload = {
        seller_id: sellerProfile.id,
        is_available: formData.is_available,
        max_leads_per_day: formData.max_leads_per_day,
        available_from: formData.available_from,
        available_to: formData.available_to,
        timezone: formData.timezone,
        vacation_mode: formData.vacation_mode,
        vacation_until: formData.vacation_until?.toISOString() || null,
        auto_response_enabled: formData.auto_response_enabled,
      };

      if (availability) {
        const { error } = await supabase
          .from("seller_availability")
          .update(payload)
          .eq("id", availability.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("seller_availability")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Settings saved!", description: "Your availability settings have been updated." });
      queryClient.invalidateQueries({ queryKey: ["seller-availability"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout role="seller">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Availability Settings</h1>
            <p className="text-muted-foreground">Manage when you receive leads and your working hours</p>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={cn(
            "border-2 transition-colors",
            formData.is_available && !formData.vacation_mode 
              ? "border-success bg-success/5" 
              : "border-warning bg-warning/5"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {formData.is_available && !formData.vacation_mode ? (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                ) : (
                  <AlertCircle className="h-8 w-8 text-warning" />
                )}
                <div>
                  <p className="font-semibold">
                    {formData.vacation_mode ? "On Vacation" : formData.is_available ? "Available" : "Unavailable"}
                  </p>
                  <p className="text-sm text-muted-foreground">Current status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">{formData.max_leads_per_day} leads/day</p>
                  <p className="text-sm text-muted-foreground">Daily limit</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-info" />
                <div>
                  <p className="font-semibold">{formData.available_from} - {formData.available_to}</p>
                  <p className="text-sm text-muted-foreground">Working hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>Control your overall availability for receiving leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Available for Leads</Label>
                  <p className="text-sm text-muted-foreground">Turn off to stop receiving new leads temporarily</p>
                </div>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Leads Per Day</Label>
                <Input
                  type="number"
                  value={formData.max_leads_per_day}
                  onChange={(e) => setFormData({ ...formData, max_leads_per_day: parseInt(e.target.value) || 0 })}
                  min={1}
                  max={500}
                />
                <p className="text-xs text-muted-foreground">You won't receive more than this many leads per day</p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Response</Label>
                  <p className="text-sm text-muted-foreground">Send automatic replies to new leads</p>
                </div>
                <Switch
                  checked={formData.auto_response_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_response_enabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Working Hours
              </CardTitle>
              <CardDescription>Set your preferred working hours for receiving leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select
                  value={formData.timezone}
                  onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Available From</Label>
                  <Select
                    value={formData.available_from}
                    onValueChange={(value) => setFormData({ ...formData, available_from: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Available To</Label>
                  <Select
                    value={formData.available_to}
                    onValueChange={(value) => setFormData({ ...formData, available_to: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vacation Mode */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palmtree className="h-5 w-5" />
                Vacation Mode
              </CardTitle>
              <CardDescription>Temporarily pause all lead assignments while you're away</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex items-center justify-between md:justify-start gap-4">
                  <div className="space-y-0.5">
                    <Label>Enable Vacation Mode</Label>
                    <p className="text-sm text-muted-foreground">No leads will be assigned during this period</p>
                  </div>
                  <Switch
                    checked={formData.vacation_mode}
                    onCheckedChange={(checked) => setFormData({ ...formData, vacation_mode: checked })}
                  />
                </div>

                {formData.vacation_mode && (
                  <div className="space-y-2">
                    <Label>Vacation Until</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn(
                          "w-[240px] justify-start text-left font-normal",
                          !vacationDate && "text-muted-foreground"
                        )}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {vacationDate ? format(vacationDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={vacationDate}
                          onSelect={(date) => {
                            setVacationDate(date);
                            setFormData({ ...formData, vacation_until: date || null });
                          }}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {formData.vacation_mode && (
                <div className="mt-4 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">Vacation Mode Active</p>
                      <p className="text-sm text-muted-foreground">
                        You will not receive any new leads while vacation mode is enabled. 
                        Existing leads will remain in your inbox.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SellerAvailability;

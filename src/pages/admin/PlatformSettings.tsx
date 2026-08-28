import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Save, RefreshCw, Mail, Send, Loader2 } from "lucide-react";
import { CityImagesCard } from "@/components/admin/CityImagesCard";

const PlatformSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, refetch } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      const settingsMap: Record<string, any> = {};
      data?.forEach(s => {
        settingsMap[s.key] = s.value;
      });
      return settingsMap;
    },
  });

  // Real-time subscription for settings updates
  useEffect(() => {
    const channel = supabase
      .channel("platform-settings-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "platform_settings" },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const updateSetting = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          key,
          value,
          description,
          updated_by: user?.id,
        }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast({ title: "Setting updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating setting", description: error.message, variant: "destructive" });
    },
  });

  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast({ title: "Enter an email address", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type: "test", to: testEmail },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: "Test email sent!", description: `Check the inbox of ${testEmail}` });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  // Initialize form values when settings load
  useEffect(() => {
    if (settings) {
      setFormValues(settings);
    }
  }, [settings]);

  const handleSave = (key: string, description?: string) => {
    const value = formValues[key] ?? settings?.[key];
    updateSetting.mutate({ key, value, description });
  };

  const handleToggle = (key: string, checked: boolean, description: string) => {
    setFormValues({ ...formValues, [key]: checked });
    updateSetting.mutate({ key, value: checked, description });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
            <p className="text-muted-foreground">Configure global platform settings (changes apply in real-time)</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Platform Name</Label>
                <div className="flex gap-2">
                  <Input
                    value={formValues.platform_name ?? settings?.platform_name ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, platform_name: e.target.value })}
                    placeholder="B2B Marketplace"
                  />
                  <Button onClick={() => handleSave("platform_name", "Platform display name")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Support Email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={formValues.support_email ?? settings?.support_email ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, support_email: e.target.value })}
                    placeholder="support@example.com"
                  />
                  <Button onClick={() => handleSave("support_email", "Platform support email")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Support Phone</Label>
                <div className="flex gap-2">
                  <Input
                    value={formValues.support_phone ?? settings?.support_phone ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, support_phone: e.target.value })}
                    placeholder="+91 9999999999"
                  />
                  <Button onClick={() => handleSave("support_phone", "Platform support phone")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Footer Text</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={formValues.footer_text ?? settings?.footer_text ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, footer_text: e.target.value })}
                    placeholder="Your platform footer text..."
                    rows={2}
                  />
                  <Button onClick={() => handleSave("footer_text", "Platform footer text")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Settings</CardTitle>
              <CardDescription>Configure lead distribution and expiry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Lead Expiry Days</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formValues.lead_expiry_days ?? settings?.lead_expiry_days ?? 7}
                    onChange={(e) => setFormValues({ ...formValues, lead_expiry_days: parseInt(e.target.value) })}
                  />
                  <Button onClick={() => handleSave("lead_expiry_days", "Days before a lead expires")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Leads Per Seller Per Day</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formValues.max_leads_per_day ?? settings?.max_leads_per_day ?? 50}
                    onChange={(e) => setFormValues({ ...formValues, max_leads_per_day: parseInt(e.target.value) })}
                  />
                  <Button onClick={() => handleSave("max_leads_per_day", "Maximum leads a seller can receive per day")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Lead Price (₹)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={formValues.lead_price ?? settings?.lead_price ?? 100}
                    onChange={(e) => setFormValues({ ...formValues, lead_price: parseInt(e.target.value) })}
                  />
                  <Button onClick={() => handleSave("lead_price", "Price per lead in INR")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>Enable or disable platform features (instant effect)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Seller Registration</p>
                  <p className="text-sm text-muted-foreground">Allow new sellers to register</p>
                </div>
                <Switch
                  checked={formValues.enable_seller_registration ?? settings?.enable_seller_registration ?? true}
                  onCheckedChange={(checked) => handleToggle("enable_seller_registration", checked, "Allow new seller registrations")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Buyer Requirements</p>
                  <p className="text-sm text-muted-foreground">Allow buyers to post requirements</p>
                </div>
                <Switch
                  checked={formValues.enable_requirements ?? settings?.enable_requirements ?? true}
                  onCheckedChange={(checked) => handleToggle("enable_requirements", checked, "Allow buyers to post requirements")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Reviews</p>
                  <p className="text-sm text-muted-foreground">Allow buyers to post reviews</p>
                </div>
                <Switch
                  checked={formValues.enable_reviews ?? settings?.enable_reviews ?? true}
                  onCheckedChange={(checked) => handleToggle("enable_reviews", checked, "Allow buyers to post reviews")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">Show maintenance page to users</p>
                </div>
                <Switch
                  checked={formValues.maintenance_mode ?? settings?.maintenance_mode ?? false}
                  onCheckedChange={(checked) => handleToggle("maintenance_mode", checked, "Platform maintenance mode")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show Pricing</p>
                  <p className="text-sm text-muted-foreground">Display product prices publicly</p>
                </div>
                <Switch
                  checked={formValues.show_pricing ?? settings?.show_pricing ?? true}
                  onCheckedChange={(checked) => handleToggle("show_pricing", checked, "Show product pricing publicly")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Require Email Verification</p>
                  <p className="text-sm text-muted-foreground">Require email verification for new accounts</p>
                </div>
                <Switch
                  checked={formValues.require_email_verification ?? settings?.require_email_verification ?? false}
                  onCheckedChange={(checked) => handleToggle("require_email_verification", checked, "Require email verification")}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Enable Viewer Data for Sellers</p>
                  <p className="text-sm text-muted-foreground">Allow sellers to see visitor information for their products</p>
                </div>
                <Switch
                  checked={formValues.enable_viewer_data_for_sellers ?? settings?.enable_viewer_data_for_sellers ?? false}
                  onCheckedChange={(checked) => handleToggle("enable_viewer_data_for_sellers", checked, "Allow sellers to see product visitor data")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SEO Settings</CardTitle>
              <CardDescription>Configure search engine optimization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Meta Title</Label>
                <div className="flex gap-2">
                  <Input
                    value={formValues.meta_title ?? settings?.meta_title ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, meta_title: e.target.value })}
                    placeholder="B2B Marketplace - Buy & Sell Products"
                  />
                  <Button onClick={() => handleSave("meta_title", "SEO meta title")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Meta Description</Label>
                <div className="flex gap-2">
                  <Textarea
                    value={formValues.meta_description ?? settings?.meta_description ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, meta_description: e.target.value })}
                    placeholder="Your SEO meta description..."
                    rows={2}
                  />
                  <Button onClick={() => handleSave("meta_description", "SEO meta description")}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" /> Email (Gmail SMTP)
              </CardTitle>
              <CardDescription>
                Automated emails are sent via Gmail SMTP. Welcome emails go out on signup and lead
                notifications are emailed to sellers when a new enquiry arrives. Send a test below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/40 p-4 text-sm space-y-1">
                <p className="font-medium">Active email templates</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  <li>Welcome email — sent when a buyer or seller signs up</li>
                  <li>New lead alert — sent to the seller when an enquiry is received</li>
                  <li>SMTP test — verify your configuration</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label>Send Test Email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button onClick={sendTestEmail} disabled={sendingTest}>
                    {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="ml-2">Send Test</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requires GMAIL_USER and GMAIL_APP_PASSWORD secrets (Gmail app password) to be configured.
                </p>
              </div>
            </CardContent>
          </Card>

          <CityImagesCard />
        </div>
      </div>

    </DashboardLayout>
  );
};

export default PlatformSettings;

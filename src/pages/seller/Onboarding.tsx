import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StateCitySelect } from "@/components/StateCitySelect";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRight, CheckCircle, Loader2 } from "lucide-react";

const SellerOnboarding = () => {
  const [step, setStep] = useState(1);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [account, setAccount] = useState({ full_name: "", email: "", phone: "", password: "" });
  const [signingUp, setSigningUp] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    gst_number: "",
    pan_number: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    website: "",
    employee_count: "",
    annual_turnover: "",
    established_year: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthed(!!user);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsAuthed(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (account.password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters", variant: "destructive" });
      return;
    }
    setSigningUp(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: account.email.trim(),
        password: account.password,
        options: {
          data: { full_name: account.full_name.trim(), phone: account.phone.trim(), role: "seller" },
          emailRedirectTo: window.location.href,
        },
      });
      if (error) throw error;

      // Ensure we have an active session (in case email confirmation is disabled)
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: account.email.trim(),
          password: account.password,
        });
        if (signInError) throw new Error("Account created. Please check your email to confirm, then sign in to continue.");
        ({ data: { user } } = await supabase.auth.getUser());
      }

      // Welcome email (best-effort)
      supabase.functions.invoke("send-email", {
        body: { type: "welcome", to: account.email.trim(), name: account.full_name.trim(), role: "seller" },
      }).catch(() => {});

      setFormData((f) => ({ ...f, business_name: f.business_name || account.full_name.trim() }));
      setIsAuthed(true);
      toast({ title: "Account created!", description: "Now set up your business profile." });
    } catch (error: any) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } finally {
      setSigningUp(false);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("seller_profiles").upsert({
        user_id: user.id,
        business_name: formData.business_name,
        company_name: formData.business_name,
        business_type: formData.business_type,
        gst_number: formData.gst_number || null,
        pan_number: formData.pan_number || null,
        description: formData.description || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        website: formData.website || null,
        employee_count: formData.employee_count || null,
        annual_turnover: formData.annual_turnover || null,
        established_year: formData.established_year ? parseInt(formData.established_year) : null,
      }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Seller profile created! Pending approval." });
      navigate("/seller");
    },
    onError: (error) => {
      toast({ title: "Failed to create profile", description: error.message, variant: "destructive" });
    },
  });

  const businessTypes = [
    "Manufacturer", "Wholesaler", "Distributor", "Retailer", "Service Provider", "Exporter", "Importer",
  ];
  const employeeCounts = ["1-10", "11-50", "51-200", "201-500", "500+"];
  const turnovers = [
    "Below ₹10 Lakh", "₹10 Lakh - ₹50 Lakh", "₹50 Lakh - ₹1 Crore",
    "₹1 Crore - ₹5 Crore", "₹5 Crore - ₹25 Crore", "Above ₹25 Crore",
  ];

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Account creation gate for non-authenticated visitors
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Become a Seller — It's Free</CardTitle>
            <CardDescription>Create your free account to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={account.full_name} onChange={(e) => setAccount({ ...account, full_name: e.target.value })} placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input type="tel" value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} placeholder="+91 98765 43210" required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} placeholder="name@company.com" required />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input type="password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} placeholder="Create a password" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={signingUp}>
                {signingUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account & Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <button type="button" className="text-primary underline" onClick={() => navigate("/auth")}>Sign in</button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Become a Seller</CardTitle>
          <CardDescription>Set up your business profile to start selling</CardDescription>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`w-3 h-3 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Business Information</h3>
              <Input
                placeholder="Business Name *"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              />
              <Select
                value={formData.business_type}
                onValueChange={(value) => setFormData({ ...formData, business_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Business Type *" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Business Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
              <Button
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!formData.business_name || !formData.business_type}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Location & Contact</h3>
              <Input
                placeholder="Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
              <StateCitySelect
                state={formData.state}
                city={formData.city}
                onStateChange={(state) => setFormData((p: any) => ({ ...p, state }))}
                onCityChange={(city) => setFormData((p: any) => ({ ...p, city }))}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                />
                <Input
                  placeholder="Website (optional)"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Business Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="GST Number (optional)"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                />
                <Input
                  placeholder="PAN Number (optional)"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value })}
                />
              </div>
              <Select
                value={formData.employee_count}
                onValueChange={(value) => setFormData({ ...formData, employee_count: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Number of Employees" />
                </SelectTrigger>
                <SelectContent>
                  {employeeCounts.map((count) => (
                    <SelectItem key={count} value={count}>{count}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={formData.annual_turnover}
                onValueChange={(value) => setFormData({ ...formData, annual_turnover: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Annual Turnover" />
                </SelectTrigger>
                <SelectContent>
                  {turnovers.map((turnover) => (
                    <SelectItem key={turnover} value={turnover}>{turnover}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Established Year"
                value={formData.established_year}
                onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button
                  className="flex-1"
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Submit for Approval
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerOnboarding;

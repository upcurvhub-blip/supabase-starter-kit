import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Store, ArrowRight, MailCheck } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const resendConfirmation = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth` },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Could not resend", description: error.message, variant: "destructive" });
    } else {
      setResent(true);
      toast({ title: "Confirmation email sent again" });
    }
  };


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectBasedOnRole(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session) redirectBasedOnRole(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  const redirectBasedOnRole = async (userId: string) => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role === "admin" || profile?.role === "super_admin") {
      navigate("/admin");
      return;
    }
    // Everyone else routes through seller portal
    const { data: sellerProfile } = await supabase
      .from("seller_profiles")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sellerProfile) {
      navigate("/seller/onboarding");
    } else {
      navigate("/seller");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back!" });
        if (data.user) redirectBasedOnRole(data.user.id);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, role: "seller" },
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (error) throw error;
        if (data.user && !data.session) {
          setPendingEmail(email);
        } else if (data.user) {
          toast({ title: "Seller account created!", description: "Complete your business profile to start receiving leads." });
          redirectBasedOnRole(data.user.id);
        }
      }

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (pendingEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Almost there — confirm your email</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We've sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{pendingEmail}</span>. Open it and click
            the link to activate your seller account.
          </p>
          <ul className="mt-5 space-y-2 text-left text-sm text-muted-foreground">
            <li>1. Open your inbox (check spam / promotions too).</li>
            <li>2. Click “Confirm your email”.</li>
            <li>3. You'll land back here, signed in and ready to list products.</li>
          </ul>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={resendConfirmation} disabled={loading || resent} variant="outline">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {resent ? "Email sent again" : "Resend confirmation email"}
            </Button>
            <Button variant="ghost" onClick={() => { setPendingEmail(null); setIsLogin(true); }}>
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (

    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="relative z-10 text-center space-y-8 max-w-lg">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10">
              <Building2 className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">Sell on Upcurv Trade</h1>
          <p className="text-xl text-white/70 font-medium leading-relaxed">
            One listing, two markets — sell to everyday shoppers and to businesses buying in bulk.
          </p>
          <ul className="space-y-3 text-left pt-6">
            {[
              { t: "Retail + wholesale in one listing", d: "Set a retail price and a bulk price range; buyers see what fits them." },
              { t: "Leads come to you", d: "Enquiries, calls and quote requests land in a single inbox." },
              { t: "Get found on search", d: "Every product gets its own SEO page with your city and category." },
              { t: "No commission on enquiries", d: "You talk to the buyer directly — no middleman in the conversation." },
            ].map((f) => (
              <li key={f.t} className="flex gap-3 rounded-xl bg-white/5 border border-white/10 p-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span>
                  <span className="block font-semibold text-white">{f.t}</span>
                  <span className="block text-sm text-white/60">{f.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 bg-background">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 mb-4 lg:hidden">
              <Building2 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Upcurv Trade</h1>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full bg-accent/10 border border-accent/20">
              <Store className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Seller Portal</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              {isLogin ? "Welcome back" : "Create your seller account"}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "Sign in to manage your products and leads" : "Start receiving qualified buyer enquiries"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Business / Full Name</Label>
                  <Input id="fullName" placeholder="Acme Industries" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="business@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
            <Button type="submit" className="w-full gradient-accent" disabled={loading}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Please wait...</>
              ) : isLogin ? (
                <>Sign In<ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <>Create Seller Account<ArrowRight className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t"></div></div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted-foreground">
                {isLogin ? "New to the platform?" : "Already have an account?"}
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Create a seller account" : "Sign in instead"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Looking to buy?{" "}
            <a href="/" className="text-primary font-medium hover:underline">
              Browse suppliers and post your requirement
            </a>{" "}
            — no signup needed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

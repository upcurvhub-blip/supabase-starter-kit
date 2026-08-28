import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";

type Status = "loading" | "ok" | "denied" | "anon";

/** Module-level cache so route changes inside a dashboard don't re-flash the guard. */
const roleCache: Partial<Record<"seller" | "admin", Status>> = {};

/**
 * Route guard. Blocks dashboard routes for anonymous users and for signed-in
 * users who don't hold the required role. Admins pass every guard.
 */
export function RequireRole({
  role,
  children,
}: {
  role: "seller" | "admin";
  children: React.ReactNode;
}) {
  const cacheKey = role;
  const [status, setStatus] = useState<Status>(() => roleCache[cacheKey] ?? "loading");
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) { roleCache[cacheKey] = "anon"; setStatus("anon"); return; }

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (cancelled) return;
      if (isAdmin) { roleCache[cacheKey] = "ok"; setStatus("ok"); return; }
      if (role === "admin") { roleCache[cacheKey] = "denied"; setStatus("denied"); return; }

      const { data: isSeller } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "seller",
      });
      if (cancelled) return;
      const next: Status = isSeller ? "ok" : "denied";
      roleCache[cacheKey] = next;
      setStatus(next);
    };

    // Only show the blocking spinner on a genuinely first check — navigating
    // between dashboard routes reuses the cached result so the shell never flickers.
    if (!roleCache[cacheKey]) setStatus("loading");
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [role, cacheKey]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "ok") return <>{children}</>;

  const signedOut = status === "anon";
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">
            {signedOut ? "Sign in to continue" : `${role === "admin" ? "Admin" : "Seller"} access only`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {signedOut
              ? "This area is for registered users. Please sign in to access your dashboard."
              : `Your account doesn't have ${role} access. Register as a seller to list products and manage leads.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            <Button asChild>
              <Link to={signedOut ? `/auth?redirect=${encodeURIComponent(location.pathname)}` : "/auth?mode=seller"}>
                {signedOut ? "Sign in" : "Become a seller"}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RequireRole;

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks the redirects table on every navigation and 301-style redirects the SPA.
 */
export function RedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const path = location.pathname;
      const { data } = await supabase
        .from("redirects")
        .select("to_path")
        .eq("from_path", path)
        .maybeSingle();
      if (!cancelled && data?.to_path && data.to_path !== path) {
        navigate(data.to_path + location.search, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, navigate]);

  return null;
}

import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

/**
 * Soft fade between routes so navigation never reads as a blank flash.
 * Keeps the previous frame painted for one tick, then fades the new one in.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [stage, setStage] = useState<"in" | "out">("in");

  useEffect(() => {
    setStage("out");
    const id = window.requestAnimationFrame(() => setStage("in"));
    return () => window.cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <div
      className={
        "transition-opacity duration-200 ease-out " +
        (stage === "in" ? "opacity-100" : "opacity-0")
      }
    >
      {children}
    </div>
  );
}

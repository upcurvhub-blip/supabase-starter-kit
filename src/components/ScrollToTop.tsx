import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { notePageView } from "@/lib/popupGate";


const scrollPositions = new Map<number, number>();

const getIdx = () => Number(window.history.state?.idx ?? 0);

/**
 * Starts new navigations at the top and restores Back/Forward scroll depth.
 *
 * Restoration retries only until the target depth is reachable (or ~1.5s),
 * and aborts instantly on any user input so the page never fights the user
 * (which previously caused the "can't scroll / flickering" behaviour).
 */
export function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const restoringRef = useRef(false);

  // One proactive popup per page visit.
  useEffect(() => {
    notePageView();
  }, [location.pathname]);

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

    return () => {
      if ("scrollRestoration" in window.history) window.history.scrollRestoration = "auto";
    };
  }, []);

  // Continuously remember how deep the user is on the current history entry.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (restoringRef.current || frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        scrollPositions.set(getIdx(), window.scrollY);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useLayoutEffect(() => {
    const idx = getIdx();

    if (navigationType !== "POP") {
      restoringRef.current = false;
      window.scrollTo(0, 0);
      return;
    }

    const target = scrollPositions.get(idx);
    if (!target) {
      window.scrollTo(0, 0);
      return;
    }

    restoringRef.current = true;
    let raf = 0;
    let cancelled = false;
    const deadline = Date.now() + 1500;

    const stop = () => {
      cancelled = true;
      restoringRef.current = false;
      if (raf) window.cancelAnimationFrame(raf);
    };

    // Any real user gesture wins over the restore loop.
    const abortEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    abortEvents.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));

    const step = () => {
      if (cancelled) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.min(target, Math.max(0, maxScroll)));
      // Done once the page is tall enough to actually hold the target depth.
      if (maxScroll >= target - 2 || Date.now() > deadline) {
        stop();
        return;
      }
      raf = window.requestAnimationFrame(step);
    };
    step();

    return () => {
      stop();
      abortEvents.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [location.key, navigationType]);

  return null;
}

export default ScrollToTop;

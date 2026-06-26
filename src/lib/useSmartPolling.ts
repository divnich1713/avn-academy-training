/**
 * useSmartPolling — Visibility-aware polling interval.
 *
 * Returns a dynamic refetch interval for React Query:
 *   • When the browser tab is **active** → fast polling (`activeMs`)
 *   • When the browser tab is **hidden** → slow polling (`inactiveMs`)
 *
 * This saves server resources when the user isn't looking at the page,
 * while providing near-real-time updates when they are.
 */
import { useState, useEffect } from "react";

export function useSmartRefetchInterval(activeMs: number, inactiveMs: number): number {
  const [visible, setVisible] = useState(() =>
    typeof document !== "undefined" ? document.visibilityState === "visible" : true
  );

  useEffect(() => {
    const handler = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return visible ? activeMs : inactiveMs;
}

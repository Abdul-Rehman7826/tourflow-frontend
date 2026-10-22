"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { INACTIVITY_TIMEOUT_MS } from "@/lib/profile-session";

const EXCLUDED_PATHS = ["/login", "/admin/login", "/profiles"];
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
];

export function useInactivityLock(timeoutMs = INACTIVITY_TIMEOUT_MS): void {
  const pathname = usePathname();
  const { isAuthenticated, lockProfile } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || EXCLUDED_PATHS.some((path) => pathname.startsWith(path))) return;
    let timer = window.setTimeout(() => lockProfile("inactive"), timeoutMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => lockProfile("inactive"), timeoutMs);
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [isAuthenticated, lockProfile, pathname, timeoutMs]);
}

"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef(pathname);

  // Complete progress whenever the pathname or search parameters change
  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
    }

    if (visible) {
      setProgress(100);
      const fadeTimeout = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(fadeTimeout);
    }
  }, [pathname, searchParams, visible]);

  // Intercept click on links for instantaneous visual feedback
  useEffect(() => {
    const startProgress = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setVisible(true);
      setProgress(25);

      let current = 25;
      timerRef.current = setInterval(() => {
        if (current < 65) {
          current += Math.random() * 15;
        } else if (current < 88) {
          current += Math.random() * 6;
        }
        setProgress(Math.min(current, 92));
      }, 150);
    };

    const stopProgress = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
    };

    const handleAnchorClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = (event.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external or non-navigational links
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        target.target === "_blank" ||
        target.hasAttribute("download")
      ) {
        return;
      }

      // If clicking the current path, don't show loading
      const currentFull = window.location.pathname + window.location.search;
      if (href === currentFull || href === window.location.pathname) {
        return;
      }

      startProgress();
    };

    const onCustomStart = () => startProgress();
    const onCustomStop = () => stopProgress();

    document.addEventListener("click", handleAnchorClick, { capture: true });
    window.addEventListener("tourflow:navigation-start", onCustomStart);
    window.addEventListener("tourflow:navigation-end", onCustomStop);

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("tourflow:navigation-start", onCustomStart);
      window.removeEventListener("tourflow:navigation-end", onCustomStop);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page navigation progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="fixed top-0 left-0 right-0 z-[99999] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-[#1B7167] via-[#2DD4BF] to-[#10B981] transition-all duration-200 ease-out shadow-[0_0_12px_rgba(27,113,103,0.8),0_0_6px_rgba(45,212,191,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}

export function NavigationProgressBar() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarInner />
    </Suspense>
  );
}

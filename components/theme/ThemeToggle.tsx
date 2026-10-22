"use client";

import React, { useSyncExternalStore } from "react";
import { useTheme, useAgencySettings } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";

const subscribe = () => () => {};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const { update } = useAgencySettings();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return (
      <div
        className={`w-10 h-10 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 opacity-50 ${
          className || ""
        }`}
      >
        <Moon className="w-4 h-4" />
      </div>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => {
        const mode = isDark ? "light" : "dark";
        update({ mode });
        toggleTheme();
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "Light" : "Dark"} mode`}
      className={`w-10 h-10 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] hover:bg-gray-100 dark:hover:bg-white/[0.05] text-gray-700 dark:text-gray-200 flex items-center justify-center transition-all shadow-sm ${
        className || ""
      }`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-gray-700 transition-transform duration-200 hover:-rotate-12" />
      )}
    </button>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LockKeyhole, LogOut, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function HeaderProfileDropdown() {
  const { user, lockProfile, logoutTerminal } = useAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (!user) return null;
  const initials = (user.name || user.email).split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div ref={root} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-left dark:border-white/10 dark:bg-[#0B0F19]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black text-white" style={{ backgroundColor: user.avatar_color || "#1B7167" }}>{initials || <UserRound className="h-4 w-4" />}</span>
        <span className="hidden max-w-28 sm:block"><span className="block truncate text-xs font-bold">{user.name || "Staff"}</span><span className="block truncate text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">{user.role.replaceAll("_", " ")}</span></span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {open && <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="border-b border-gray-100 px-3 py-3 dark:border-white/5"><p className="truncate text-sm font-bold">{user.name}</p><p className="mt-1 text-[11px] text-gray-500">{user.department || user.role.replaceAll("_", " ")}</p></div>
        <button type="button" onClick={() => lockProfile()} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium hover:bg-gray-100 dark:hover:bg-white/5"><LockKeyhole className="h-4 w-4 text-amber-500" />Lock &amp; Switch Profile</button>
        <button type="button" onClick={logoutTerminal} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Sign Out Terminal</button>
      </div>}
    </div>
  );
}

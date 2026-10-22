"use client";

import { useAgencySettings } from "@/context/ThemeContext";

import React from "react";
import Link from "next/link";
import { useRole, UserRole } from "@/context/RoleContext";
import { ArrowLeft, ShieldAlert, Sparkles, CheckCircle } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  category: string;
  allowedRoles: UserRole[];
}

export function ModulePlaceholder({
  title,
  subtitle,
  category,
  allowedRoles,
}: ModulePlaceholderProps) {
  const { role, roleMeta } = useRole();
  const { settings } = useAgencySettings();
  const isAuthorized = allowedRoles.includes(role);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Module Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </Link>
            <span className="text-gray-300 dark:text-slate-700">&bull;</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-slate-400">
              {category}
            </span>
            <span className="text-gray-300 dark:text-slate-700">&bull;</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-white/10">
              {settings.name}
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 text-xs self-start sm:self-auto shadow-sm">
          <span className="text-gray-500 dark:text-slate-400">Active Role:</span>
          <span className={`font-bold ${roleMeta.textColor}`}>{roleMeta.code}</span>
        </div>
      </div>

      {/* Access Control Guard */}
      {!isAuthorized ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4 max-w-xl mx-auto my-12 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Restricted Module: Access Denied
            </h2>
            <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
              Your active session role (<span className="font-bold text-rose-500">{role}</span>) is not permitted to access this module.
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400">
            Authorized roles: <span className="font-mono text-gray-800 dark:text-slate-200">{allowedRoles.join(", ")}</span>
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Return to Overview
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 p-8 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {title} Ready for Step Implementation
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Authorized session confirmed for <span className="text-purple-600 dark:text-purple-400 font-semibold">{roleMeta.code}</span> in tenant space <strong className="text-gray-900 dark:text-white">{settings.name}</strong>.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>RBAC Authorization &amp; Tenant Isolation Confirmed</span>
          </div>
        </div>
      )}
    </div>
  );
}

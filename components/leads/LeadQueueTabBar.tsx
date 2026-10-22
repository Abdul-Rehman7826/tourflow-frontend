"use client";

import React from "react";
import { LeadQueueType } from "@/lib/leads-api";
import {
  Inbox,
  Flame,
  AlertCircle,
  Archive,
} from "lucide-react";

interface LeadQueueTabBarProps {
  activeQueue: LeadQueueType;
  onChangeQueue: (queue: LeadQueueType) => void;
  counts: {
    unassigned: number;
    activeSales: number;
    paymentRecovery: number;
    archive: number;
  };
  isAdmin?: boolean;
}

export function LeadQueueTabBar({
  activeQueue,
  onChangeQueue,
  counts,
  isAdmin = false,
}: LeadQueueTabBarProps) {
  const tabs = [
    {
      id: "UNASSIGNED" as LeadQueueType,
      label: "Unassigned Leads",
      icon: Inbox,
      count: counts.unassigned,
      badgeColor:
        counts.unassigned > 0
          ? "bg-amber-500 text-white font-mono"
          : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono",
      visible: isAdmin, // Visible to Admins/Managers
    },
    {
      id: "ACTIVE_SALES" as LeadQueueType,
      label: "Active Sales Queue",
      icon: Flame,
      count: counts.activeSales,
      badgeColor:
        counts.activeSales > 0
          ? "bg-[#1B7167] text-white font-mono"
          : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono",
      visible: true,
    },
    {
      id: "PAYMENT_RECOVERY" as LeadQueueType,
      label: "Payment Recovery",
      icon: AlertCircle,
      count: counts.paymentRecovery,
      badgeColor:
        counts.paymentRecovery > 0
          ? "bg-rose-500 text-white font-mono"
          : "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono",
      visible: true,
    },
    {
      id: "ARCHIVE" as LeadQueueType,
      label: "Archived & Closed",
      icon: Archive,
      count: counts.archive,
      badgeColor: "bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono",
      visible: true,
    },
  ];

  return (
    <div className="border-b border-gray-200 dark:border-white/10">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
        {tabs
          .filter((t) => t.visible)
          .map((tab) => {
            const Icon = tab.icon;
            const isActive = activeQueue === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onChangeQueue(tab.id)}
                className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold rounded-t-xl transition-all border-b-2 relative whitespace-nowrap ${
                  isActive
                    ? "border-[#1B7167] text-[#1B7167] dark:text-teal-400 bg-teal-50/50 dark:bg-teal-950/20"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#1B7167] dark:text-teal-400" : "text-gray-400"}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-bold transition-transform ${tab.badgeColor} ${
                    isActive ? "scale-105" : ""
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

"use client";

import React from "react";

interface TourCapacityBarProps {
  bookedSeats: number;
  maxCapacity: number;
  showLabels?: boolean;
  className?: string;
}

export function TourCapacityBar({
  bookedSeats,
  maxCapacity,
  showLabels = true,
  className = "",
}: TourCapacityBarProps) {
  const safeCapacity = maxCapacity > 0 ? maxCapacity : 1;
  const percentage = Math.min(Math.round((bookedSeats / safeCapacity) * 100), 100);

  // Determine indicator color by threshold: Green <75%, Amber 75-94%, Rose >=95%
  let barColorClass = "bg-emerald-500 dark:bg-emerald-400";

  if (percentage >= 95) {
    barColorClass = "bg-rose-500 dark:bg-rose-400";
  } else if (percentage >= 75) {
    barColorClass = "bg-amber-500 dark:bg-amber-400";
  }

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Capacity
          </span>
          <span className="font-mono text-gray-700 dark:text-gray-300 font-medium text-[11px]">
            <strong className="text-gray-900 dark:text-white">{bookedSeats}</strong> / {maxCapacity} Seats Booked ({percentage}%)
          </span>
        </div>
      )}

      {/* Progress Track */}
      <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-200/60 dark:border-gray-700/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barColorClass}`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={bookedSeats}
          aria-valuemin={0}
          aria-valuemax={maxCapacity}
        />
      </div>
    </div>
  );
}

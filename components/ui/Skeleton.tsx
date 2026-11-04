import React from "react";

export function Skeleton({
  className = "",
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`skeleton-shimmer animate-pulse rounded-md bg-slate-200/80 dark:bg-white/10 ${className}`}
      style={style}
      {...props}
    />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#121C18] p-5 space-y-3.5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-24" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#121C18] overflow-hidden shadow-sm ${className}`}
    >
      {/* Header bar */}
      <div className="border-b border-gray-200/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-6 py-4 flex items-center justify-between gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1">
            <Skeleton className={`h-4 ${i === 0 ? "w-2/3" : i === cols - 1 ? "w-1/2 ml-auto" : "w-4/5"}`} />
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-100 dark:divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-6 py-4 flex items-center justify-between gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="flex-1">
                <Skeleton
                  className={`h-4 ${
                    c === 0
                      ? "w-4/5"
                      : c === 1
                      ? "w-3/5"
                      : c === cols - 1
                      ? "w-20 ml-auto rounded-lg"
                      : "w-1/2"
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPageSkeleton({
  title = "Loading workspace...",
  subtitle = "Please wait while your data is synchronized securely.",
  cardsCount = 4,
}: {
  title?: string;
  subtitle?: string;
  cardsCount?: number;
}) {
  return (
    <div
      role="status"
      aria-label={title}
      className="space-y-6 animate-in fade-in duration-200"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-64 sm:w-80" />
          <Skeleton className="h-4 w-72 sm:w-96" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(
          cardsCount,
          4
        )} gap-4`}
      >
        {Array.from({ length: cardsCount }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Filter / Search Bar */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#121C18] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>

      {/* Data Table */}
      <TableSkeleton rows={7} cols={5} />
      <span className="sr-only">
        {title} - {subtitle}
      </span>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div role="status" aria-label="Loading settings" className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#121C18] p-6 space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Tabs bar */}
      <div className="flex gap-2 border-b border-gray-200/80 dark:border-white/10 pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-lg" />
        ))}
      </div>

      {/* Form cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#121C18] p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#121C18] p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading saved preferences...</span>
    </div>
  );
}

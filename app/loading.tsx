import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function RootLoading() {
  return (
    <div
      role="status"
      aria-label="Restoring workspace"
      className="min-h-screen flex flex-col items-center justify-center bg-[#F9FAFB] dark:bg-[#030712] p-4 text-gray-500 dark:text-gray-400"
    >
      <div className="w-full max-w-sm space-y-4 text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-2xl bg-[#1B7167]/10 flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 rounded-full border-2 border-[#1B7167] border-t-transparent animate-spin" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 mx-auto rounded-lg" />
          <Skeleton className="h-3.5 w-56 mx-auto rounded-md" />
        </div>
      </div>
      <span className="sr-only">Restoring secure workspace...</span>
    </div>
  );
}

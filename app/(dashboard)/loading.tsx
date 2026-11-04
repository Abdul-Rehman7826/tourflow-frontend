import React from "react";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <DashboardPageSkeleton
      title="Loading workspace..."
      subtitle="Fetching real-time agency records..."
    />
  );
}

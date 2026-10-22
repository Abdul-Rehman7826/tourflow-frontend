"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import { updateManifestItem as updateManifestItemApi } from "@/lib/tours-api";
import { TourOperationsWorkspace } from "@/components/tours/TourOperationsWorkspace";
import type { TravelerManifestItem } from "@/types/erp";
import { ArrowLeft, BadgeAlert } from "lucide-react";

export default function TourDetailPage() {
  const { settings } = useAgencySettings();
  const params = useParams();
  const tourId = (params?.id as string) || "";

  const { tours, passengers } = useData();

  const tour = useMemo(() => {
    return tours.find((t) => t.id === tourId);
  }, [tours, tourId]);

  const manifestItems = useMemo(() => {
    return passengers.filter((p) => p.tourId === tourId) as unknown as TravelerManifestItem[];
  }, [passengers, tourId]);

  const handleSaveManifestItem = async (
    travelerId: string,
    updatedData: Partial<TravelerManifestItem>
  ) => {
    await updateManifestItemApi(tourId, travelerId, updatedData);
  };

  if (!tour) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <BadgeAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white font-sans">
          Tour Departure Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
          The requested departure ID <code className="text-[#1B7167] dark:text-teal-400 font-mono">&quot;{tourId}&quot;</code> does not exist for {settings.name}.
        </p>
        <div className="pt-2">
          <Link
            href="/tours"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1B7167] text-white font-semibold text-xs hover:bg-[#155a52] transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Tour Departures Catalog</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TourOperationsWorkspace
      tour={tour}
      manifestItems={manifestItems}
      onSaveManifestItem={handleSaveManifestItem}
      showToast={() => {}}
    />
  );
}

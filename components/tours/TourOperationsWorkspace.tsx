"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAgencySettings } from "@/context/ThemeContext";
import { useRole } from "@/context/RoleContext";
import { canViewTourCosts } from "@/lib/analytics-governance";
import { checkPassport6MWarning, downloadManifestCSV } from "@/lib/tours-api";
import { PassengerManifestTab } from "./PassengerManifestTab";
import { RoomingMatrixTab } from "./RoomingMatrixTab";
import { ItineraryTab } from "./ItineraryTab";
import { FlightBlocksTab } from "./FlightBlocksTab";
import { TourFinancialsTab } from "./TourFinancialsTab";
import { TravelerIntakeDrawer } from "./TravelerIntakeDrawer";
import type { TourPackage, TravelerManifestItem } from "@/types/erp";
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Download,
  Printer,
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
  BedDouble,
  CalendarDays,
  Plane,
  ShieldCheck,
} from "lucide-react";

export { PassengerManifestTab } from "./PassengerManifestTab";
export { RoomingMatrixTab, RoomingMatrixTab as RoomingWorkspace } from "./RoomingMatrixTab";
export { ItineraryTab, ItineraryTab as ItineraryWorkspace } from "./ItineraryTab";
export { FlightBlocksTab, FlightBlocksTab as FlightWorkspace } from "./FlightBlocksTab";
export { TourFinancialsTab } from "./TourFinancialsTab";

export type TourTabKey = "MANIFEST" | "ROOMING" | "ITINERARY" | "FLIGHTS" | "FINANCIALS";

interface TourOperationsWorkspaceProps {
  tour: TourPackage;
  manifestItems: TravelerManifestItem[];
  onSaveManifestItem: (travelerId: string, updatedData: Partial<TravelerManifestItem>) => Promise<void>;
  showToast: (message: string) => void;
}

export function TourOperationsWorkspace({
  tour,
  manifestItems,
  onSaveManifestItem,
  showToast,
}: TourOperationsWorkspaceProps) {
  const { formatMoney } = useAgencySettings();
  const { role } = useRole();

  const [activeTab, setActiveTab] = useState<TourTabKey>("MANIFEST");
  const [selectedTraveler, setSelectedTraveler] = useState<TravelerManifestItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isFrontDesk = role === "FRONT_DESK";
  const financialAccess = canViewTourCosts(role);

  // Passport 6M Warnings Stats
  const manifestStats = useMemo(() => {
    const warningCount = manifestItems.filter((item) =>
      checkPassport6MWarning(item.passportExpiry, tour.departureDate)
    ).length;
    return {
      total: manifestItems.length,
      warningCount,
    };
  }, [manifestItems, tour.departureDate]);

  const handleOpenDrawer = (traveler: TravelerManifestItem) => {
    setSelectedTraveler(traveler);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTraveler(null);
  };

  const handleExportCSV = async () => {
    try {
      await downloadManifestCSV(tour.id);
      showToast("Downloaded Passenger Manifest CSV.");
    } catch (err) {
      console.error("Export CSV failed:", err);
      showToast("Failed to download CSV manifest.");
    }
  };

  const availableTabs = [
    {
      key: "MANIFEST" as const,
      label: "Tab 1: Passenger Manifest",
      icon: Users,
      badge: `${manifestStats.total} Pax`,
    },
    {
      key: "ROOMING" as const,
      label: "Tab 2: Rooming Matrix",
      icon: BedDouble,
      badge: `${tour.rooms?.length ?? 0} Rooms`,
    },
    {
      key: "ITINERARY" as const,
      label: "Tab 3: Daily Itinerary",
      icon: CalendarDays,
      badge: `${tour.durationDays} Days`,
    },
    {
      key: "FLIGHTS" as const,
      label: "Tab 4: Group Flights & PNR",
      icon: Plane,
      badge: tour.flightBlock?.pnrCode || "Group PNR",
    },
    ...(!isFrontDesk && financialAccess
      ? [
          {
            key: "FINANCIALS" as const,
            label: "Tab 5: Financials & Costing",
            icon: ShieldCheck,
            badge: "Live ROI",
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* Top Breadcrumb & Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Link
            href="/tours"
            className="hover:text-[#1B7167] dark:hover:text-teal-400 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Tour Departures Catalog</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600" />
          <span className="text-gray-900 dark:text-white font-medium truncate font-sans">
            {tour.title}
          </span>
        </div>

        {/* Departure Banner Hero Card */}
        <div className="p-6 rounded-2xl bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 shadow-sm relative overflow-hidden transition-all">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Tour Title & Route Flags */}
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-teal-500/10 text-[#1B7167] dark:text-teal-400 border border-teal-500/20 uppercase tracking-wider">
                  Tour ID: {tour.id}
                </span>
                <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  {tour.status.replace("_", " ")}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#1B7167]" />
                  {tour.durationDays} Days / {tour.durationNights ?? tour.durationDays - 1} Nights
                </span>
              </div>

              <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight font-sans">
                {tour.title}
              </h1>

              {/* Route Flags / Dest Tags */}
              {tour.routeFlags && tour.routeFlags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-[11px] font-semibold text-gray-400 font-mono">Route:</span>
                  {tour.routeFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-white/10 shadow-sm"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-[#1B7167] hover:bg-[#155a52] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV Manifest</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 font-medium text-xs flex items-center gap-1.5 border border-gray-200 dark:border-white/10 transition-colors"
              >
                <Printer className="w-4 h-4 text-gray-400" />
                <span className="hidden sm:inline">Print Manifest</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-white/10 text-xs">
            <div className="space-y-1">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#1B7167]" />
                Departure Date
              </span>
              <p className="text-gray-900 dark:text-white font-mono font-bold text-sm">
                {tour.departureDate}
              </p>
              <p className="text-[10px] text-gray-400 font-mono">Return: {tour.returnDate}</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Base Price / Pax
              </span>
              <p className="text-gray-900 dark:text-white font-mono font-bold text-sm">
                {formatMoney(tour.pricePerPerson)}
              </p>
              <p className="text-[10px] text-gray-400">PKR Group Base</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-500" />
                Capacity &amp; Booked
              </span>
              <p className="text-gray-900 dark:text-white font-mono font-bold text-sm">
                {tour.bookedSeats} / {tour.maxCapacity} Seats
              </p>
              <p className="text-[10px] text-gray-400 font-mono">
                {Math.round(((tour.bookedSeats || 0) / (tour.maxCapacity || 1)) * 100)}% Occupancy
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                6M Passport Alert
              </span>
              <p className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">
                {manifestStats.warningCount} Passengers
              </p>
              <p className="text-[10px] text-gray-400 font-mono">Expiring &lt; 6 months</p>
            </div>
          </div>
        </div>
      </div>

      {/* 5 OPERATIONAL TABS SWITCHER */}
      <nav
        aria-label="Tour Operations Navigation"
        className="flex w-full min-w-0 flex-wrap items-stretch gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-[#030712]"
      >
        {availableTabs.map(({ key, label, icon: Icon, badge }) => (
          <button
            key={key}
            type="button"
            aria-current={activeTab === key ? "page" : undefined}
            onClick={() => setActiveTab(key)}
            className={`grid min-w-0 flex-[1_1_10rem] grid-cols-[1rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 rounded-lg px-3 py-2.5 text-left transition-all ${
              activeTab === key
                ? "bg-[#1B7167] text-white font-semibold shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate text-xs font-semibold font-sans">{label}</span>
            <span className="col-start-2 min-w-0 max-w-full justify-self-start truncate rounded-full bg-black/10 dark:bg-white/10 px-2 py-0.5 text-[10px] font-mono leading-4">
              {badge}
            </span>
          </button>
        ))}
      </nav>

      {/* ACTIVE TAB RENDER */}
      {activeTab === "MANIFEST" && (
        <PassengerManifestTab
          tour={tour}
          manifestItems={manifestItems}
          onOpenIntakeDrawer={handleOpenDrawer}
          showToast={showToast}
        />
      )}

      {activeTab === "ROOMING" && (
        <RoomingMatrixTab tour={tour} showToast={showToast} />
      )}

      {activeTab === "ITINERARY" && (
        <ItineraryTab tour={tour} showToast={showToast} />
      )}

      {activeTab === "FLIGHTS" && (
        <FlightBlocksTab tour={tour} showToast={showToast} />
      )}

      {activeTab === "FINANCIALS" && !isFrontDesk && financialAccess && (
        <TourFinancialsTab tour={tour} />
      )}

      {/* SLIDE-OVER TRAVELER INTAKE DRAWER */}
      <TravelerIntakeDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        traveler={selectedTraveler}
        tourDepartureDate={tour.departureDate}
        onSave={async (travelerId, updatedData) => {
          await onSaveManifestItem(travelerId, updatedData);
        }}
      />
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { TourPackage, TravelerManifestItem } from "@/types/erp";
import { checkPassport6MWarning, downloadManifestCSV } from "@/lib/tours-api";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Download,
  Printer,
  Bed,
  ShieldAlert,
  UserCheck,
  CreditCard,
  Edit,
} from "lucide-react";

interface PassengerManifestTabProps {
  tour: TourPackage;
  manifestItems: TravelerManifestItem[];
  onOpenIntakeDrawer: (traveler: TravelerManifestItem) => void;
  showToast: (message: string) => void;
}

export function PassengerManifestTab({
  tour,
  manifestItems,
  onOpenIntakeDrawer,
  showToast,
}: PassengerManifestTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [onlyWarnings, setOnlyWarnings] = useState(false);

  // Evaluate each manifest item with 6-month passport rule
  const evaluatedManifest = useMemo(() => {
    return manifestItems.map((item) => {
      const expiry = item.passportExpiry || (item as unknown as { passportExpiryDate?: string }).passportExpiryDate;
      const isWarning = checkPassport6MWarning(expiry, tour.departureDate);
      const roomPref = (item.roomPreference === "SINGLE" || item.roomPreference === "DOUBLE" || item.roomPreference === "TRIPLE" || item.roomPreference === "FAMILY")
        ? item.roomPreference
        : "DOUBLE";
      return {
        ...item,
        fullName: item.fullName || (item as unknown as { name?: string }).name || "",
        passportNo: item.passportNo || (item as unknown as { passportNo?: string }).passportNo || "",
        passportExpiry: expiry || "",
        familyGroup: item.familyGroup || (item as unknown as { familyGroup?: string }).familyGroup || "",
        roomPreference: roomPref,
        roomAllocation: item.roomAllocation || (item as unknown as { roomAllocation?: string }).roomAllocation || item.roomPreference || "DOUBLE",
        isPassportWarning6m: isWarning,
      };
    });
  }, [manifestItems, tour.departureDate]);

  const displayedManifest = useMemo(() => {
    return evaluatedManifest.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (item.fullName || "").toLowerCase().includes(q);
        const matchesPassport = (item.passportNo || "").toLowerCase().includes(q);
        const matchesBooking = (item.bookingId || "").toLowerCase().includes(q);
        if (!matchesName && !matchesPassport && !matchesBooking) return false;
      }

      if (roomFilter !== "ALL" && item.roomPreference !== roomFilter && item.roomAllocation !== roomFilter) {
        return false;
      }

      if (onlyWarnings && !item.isPassportWarning6m) {
        return false;
      }

      return true;
    });
  }, [evaluatedManifest, searchQuery, roomFilter, onlyWarnings]);

  const manifestStats = useMemo(() => {
    const total = evaluatedManifest.length;
    const warningCount = evaluatedManifest.filter((item) => item.isPassportWarning6m).length;
    const readyCount = evaluatedManifest.filter((item) => item.isComplete).length;
    return { total, warningCount, readyCount };
  }, [evaluatedManifest]);

  const handleExportCSV = async () => {
    try {
      await downloadManifestCSV(tour.id);
      showToast("Downloaded Passenger Manifest CSV.");
    } catch (err) {
      console.error("Export CSV failed:", err);
      showToast("Failed to download CSV manifest.");
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* 6-Month Passport Rule Banner */}
      {manifestStats.warningCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-rose-800 dark:text-rose-300 font-sans text-sm">
                6-Month Passport Compliance Alert ({manifestStats.warningCount} Passengers At Risk)
              </h3>
            </div>
            <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
              International immigration regulations require minimum 6 months passport validity from departure date (
              <span className="font-mono font-semibold">{tour.departureDate}</span>). Passengers flagged in amber/rose must renew their passports immediately.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#030712] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by passenger name, passport #, or booking code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>

          {/* Room Filter */}
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:border-[#1B7167] focus:outline-none text-gray-700 dark:text-gray-300"
          >
            <option value="ALL">All Room Types</option>
            <option value="SINGLE">Single Room</option>
            <option value="DOUBLE">Double / Twin</option>
            <option value="TRIPLE">Triple Room</option>
            <option value="FAMILY">Family Suite</option>
          </select>

          {/* Passport Warnings Checkbox */}
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer select-none bg-gray-50 dark:bg-white/5 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10">
            <input
              type="checkbox"
              checked={onlyWarnings}
              onChange={(e) => setOnlyWarnings(e.target.checked)}
              className="rounded text-[#1B7167] focus:ring-[#1B7167]"
            />
            <span className="flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              6M Warnings Only ({manifestStats.warningCount})
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#1B7167] hover:bg-[#155a52] rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Manifest Table */}
      <div className="bg-white dark:bg-[#030712] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 uppercase tracking-wider text-[10px] font-mono">
                <th className="py-3 px-4"># Slot / Booking</th>
                <th className="py-3 px-4">Passenger Name</th>
                <th className="py-3 px-4">Passport &amp; Expiry</th>
                <th className="py-3 px-4">Room Setup</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Compliance &amp; Docs</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {displayedManifest.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <UserCheck className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="font-semibold">No passengers found matching filter criteria.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Try broadening your search or resetting filters.</p>
                  </td>
                </tr>
              ) : (
                displayedManifest.map((passenger) => {
                  return (
                    <tr
                      key={passenger.id}
                      className="hover:bg-gray-50/75 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Slot & Booking */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            Slot #{passenger.slotNumber || "1"}
                          </span>
                          {passenger.familyGroup && (
                            <span className="ml-1.5 inline-block text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/50 font-mono">
                              {passenger.familyGroup}
                            </span>
                          )}
                          <p className="font-mono text-[11px] text-[#1B7167] dark:text-teal-400 font-medium">
                            {passenger.bookingId || "WCH-BK-000000"}
                          </p>
                        </div>
                      </td>

                      {/* Passenger Name & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-gray-900 dark:text-white font-sans text-xs">
                              {passenger.fullName || "Unnamed Passenger Slot"}
                            </span>
                            {passenger.isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <span className="text-[10px] text-amber-500 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Incomplete
                              </span>
                            )}
                          </div>
                          {passenger.phone && (
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                              {passenger.phone}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Passport & Expiry (6M Warning) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="font-mono text-xs font-semibold text-gray-800 dark:text-gray-200">
                            {passenger.passportNo || "—"}
                          </div>
                          {passenger.passportExpiry ? (
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[11px] font-mono font-medium px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  passenger.isPassportWarning6m
                                    ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                                    : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {passenger.isPassportWarning6m && (
                                  <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                )}
                                {passenger.isPassportWarning6m ? (
                                  <span className="text-rose-600 font-semibold">Expiring within 6 mo ({passenger.passportExpiry})</span>
                                ) : (
                                  `Exp: ${passenger.passportExpiry}`
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-500 font-mono">Expiry Missing</span>
                          )}
                        </div>
                      </td>

                      {/* Room Setup */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-mono">
                            <Bed className="w-3 h-3 text-[#1B7167]" />
                            {passenger.roomAllocation || passenger.roomPreference || "DOUBLE"}
                          </span>
                          {passenger.assignedRoomId && (
                            <p className="text-[10px] text-gray-500 font-mono">
                              Room #{passenger.assignedRoomId}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight inline-flex items-center gap-1 ${
                            passenger.paymentStatus === "PAID"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : passenger.paymentStatus === "PARTIAL"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <CreditCard className="w-2.5 h-2.5" />
                          {passenger.paymentStatus || "UNPAID"}
                        </span>
                      </td>

                      {/* Compliance & Docs */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              passenger.documents?.passportCopyUploaded
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-gray-100 dark:bg-white/5 text-gray-400"
                            }`}
                          >
                            Pass
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              passenger.documents?.visaGranted
                                ? "bg-teal-500/10 text-[#1B7167] dark:text-teal-400"
                                : "bg-gray-100 dark:bg-white/5 text-gray-400"
                            }`}
                          >
                            Visa
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              passenger.documents?.ticketIssued
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                : "bg-gray-100 dark:bg-white/5 text-gray-400"
                            }`}
                          >
                            Tkt
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenIntakeDrawer(passenger)}
                          className="px-2.5 py-1 text-xs font-semibold text-[#1B7167] dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Edit Intake</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

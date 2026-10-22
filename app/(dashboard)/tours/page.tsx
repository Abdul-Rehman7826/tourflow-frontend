"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { DestinationTag, TourPackage } from "@/types/erp";
import { getTourPackages, createTourPackage as createTourApi } from "@/lib/tours-api";
import { TourCapacityBar } from "@/components/tours/TourCapacityBar";
import { CreateTourModal } from "@/components/tours/CreateTourModal";
import {
  Compass,
  Calendar,
  Users,
  ArrowRight,
  TrendingUp,
  Search,
  Plane,
  Plus,
} from "lucide-react";

const COUNTRY_CODES: Record<string, string> = {
  malaysia: "MY", singapore: "SG", thailand: "TH", "sri lanka": "LK",
  france: "FR", turkey: "TR", switzerland: "CH", italy: "IT", austria: "AT",
  germany: "DE", norway: "NO", iceland: "IS", finland: "FI", pakistan: "PK",
};

const destinationTag = (value: string | DestinationTag): DestinationTag => {
  if (typeof value !== "string") return value;
  const name = value.trim();
  return { name, code: COUNTRY_CODES[name.toLowerCase()] || name.slice(0, 2).toUpperCase() };
};

export default function ToursPage() {
  const { settings, formatMoney } = useAgencySettings();
  const { tours: contextTours, createTourPackage: contextCreateTourPackage, deleteTourPackage } = useData();
  const { roleMeta } = useRole();

  const [toursList, setToursList] = useState<TourPackage[]>(contextTours || []);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTour, setEditingTour] = useState<TourPackage | null>(null);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT" | "DUPLICATE">("CREATE");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteConfirmTour, setDeleteConfirmTour] = useState<TourPackage | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const isAdmin = roleMeta?.code === "AGENCY_ADMIN" || roleMeta?.code === "TOUR_MANAGER" || roleMeta?.title === "AGENCY_ADMIN";

  // Load tours live from API
  useEffect(() => {
    async function loadLiveTours() {
      setIsLoading(true);
      try {
        const liveTours = await getTourPackages();
        if (Array.isArray(liveTours) && liveTours.length > 0) {
          setToursList(liveTours);
        } else {
          setToursList(contextTours);
        }
      } catch (err) {
        console.warn("Falling back to context tours list:", err);
        setToursList(contextTours);
      } finally {
        setIsLoading(false);
      }
    }
    loadLiveTours();
  }, [contextTours]);

  const handleSaveDeparture = async (tourData: Partial<TourPackage>) => {
    try {
      if (modalMode === "EDIT" && editingTour) {
        setToursList((prev) =>
          prev.map((t) => (t.id === editingTour.id ? ({ ...t, ...tourData } as TourPackage) : t))
        );
        setActionFeedback({ type: "success", msg: `Departure "${tourData.title || editingTour.title}" updated.` });
      } else {
        const created = await createTourApi(tourData);
        setToursList((prev) => [created, ...prev]);
        contextCreateTourPackage(created);
        setActionFeedback({
          type: "success",
          msg: `Departure "${created.title}" ${modalMode === "DUPLICATE" ? "duplicated & published" : "created"}.`,
        });
      }
      setShowCreateModal(false);
      setEditingTour(null);
    } catch (err) {
      setActionFeedback({
        type: "error",
        msg: err instanceof Error ? err.message : "Failed to save departure.",
      });
    }
  };

  const handleEdit = (tour: TourPackage) => {
    if (!isAdmin) return;
    setEditingTour(tour);
    setModalMode("EDIT");
    setShowCreateModal(true);
    setMenuOpen(null);
  };

  const handleDuplicate = (tour: TourPackage) => {
    if (!isAdmin) return;
    setEditingTour(tour);
    setModalMode("DUPLICATE");
    setShowCreateModal(true);
    setMenuOpen(null);
  };

  const handleDelete = (tour: TourPackage) => {
    if (!isAdmin) return;
    if (tour.bookedSeats > 0) {
      setActionFeedback({
        type: "error",
        msg: `Cannot delete "${tour.title}" because it has ${tour.bookedSeats} booked passenger(s). Reassign or cancel passengers first.`,
      });
      setMenuOpen(null);
      return;
    }
    setDeleteConfirmTour(tour);
    setMenuOpen(null);
  };

  const confirmDeleteTour = () => {
    if (!deleteConfirmTour) return;
    deleteTourPackage(deleteConfirmTour.id);
    setToursList((prev) => prev.filter((t) => t.id !== deleteConfirmTour.id));
    setActionFeedback({
      type: "success",
      msg: `Departure "${deleteConfirmTour.title}" deleted.`,
    });
    setDeleteConfirmTour(null);
  };

  // Aggregated Stats
  const stats = useMemo(() => {
    const activeTours = toursList.filter((t) => (t.status as string) !== "CANCELLED" && (t.status as string) !== "COMPLETED");
    const totalActive = activeTours.length;
    const guaranteedCount = toursList.filter((t) => (t.status as string) === "GUARANTEED").length;
    const totalCapacity = toursList.reduce((sum, t) => sum + (t.maxCapacity || 0), 0);
    const totalBooked = toursList.reduce((sum, t) => sum + (t.bookedSeats || 0), 0);
    const occupancyPercent = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

    return { totalActive, guaranteedCount, totalCapacity, totalBooked, occupancyPercent };
  }, [toursList]);

  // Filtered tours
  const filteredTours = useMemo(() => {
    return toursList.filter((tour) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = tour.title.toLowerCase().includes(q);
        const matchesDest = tour.destinations.some((d) => destinationTag(d).name.toLowerCase().includes(q));
        const matchesPnr = tour.flightBlock?.pnrCode?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesDest && !matchesPnr) return false;
      }

      const st = tour.status as string;
      if (statusFilter !== "ALL") {
        if (statusFilter === "OPEN_FOR_BOOKING" && st !== "OPEN" && st !== "OPEN_FOR_BOOKING" && st !== "FILLING_FAST") return false;
        if (statusFilter === "FULL" && st !== "FULL" && st !== "SOLD_OUT") return false;
        if (statusFilter !== "OPEN_FOR_BOOKING" && statusFilter !== "FULL" && st !== statusFilter) return false;
      }

      return true;
    });
  }, [toursList, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-[#1B7167] border border-teal-500/20">
              Tour Operations &amp; Departures
            </span>
            <span className="text-gray-300 dark:text-gray-700">&bull;</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Tenant: <strong className="text-gray-900 dark:text-white">{settings.name}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Group Tours &amp; Passenger Manifests
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage scheduled group departures, visual seat capacity meters, and traveler manifests.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingTour(null);
                setModalMode("CREATE");
                setShowCreateModal(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm inline-flex items-center gap-2 text-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create Tour Departure</span>
            </button>
          )}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#121C18] border border-gray-200 dark:border-gray-800 text-xs shadow-sm">
            <span className="text-gray-500 dark:text-gray-400">Operations Access:</span>
            <span className={`font-bold ${roleMeta.textColor}`}>{roleMeta.code}</span>
          </div>
        </div>
      </div>

      {/* Action Feedback Toast */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          }`}
        >
          <span>{actionFeedback.msg}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white ml-3 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* 4-CARD TOP METRIC RIBBON */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Active Departures */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121C18] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Total Active Departures
            </span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-teal-500/10 text-[#1B7167]">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                {stats.totalActive}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Scheduled Tours</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Active scheduled group catalog
            </p>
          </div>
        </div>

        {/* Card 2: Guaranteed Groups */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121C18] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Guaranteed Groups
            </span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Plane className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {stats.guaranteedCount}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Confirmed Groups</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Lock-in threshold reached
            </p>
          </div>
        </div>

        {/* Card 3: Total Blocked Capacity */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121C18] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Total Blocked Capacity
            </span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-300 font-mono">
                {stats.totalBooked} / {stats.totalCapacity}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Seats Allotted</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Confirmed passenger allocations
            </p>
          </div>
        </div>

        {/* Card 4: Global Occupancy Rate */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#121C18] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Global Occupancy Rate
            </span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {stats.occupancyPercent}%
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-300">Avg Utilization</span>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              Commercial seat load factor
            </p>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#121C18] border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Search by tour title, country (Turkey, Saudi Arabia), or PNR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 rounded-xl focus:outline-none focus:border-[#1B7167] transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] cursor-pointer"
            >
              <option value="ALL">All Departures</option>
              <option value="PLANNING">Planning</option>
              <option value="OPEN_FOR_BOOKING">Open for Booking</option>
              <option value="GUARANTEED">Guaranteed</option>
              <option value="FULL">Full</option>
              <option value="DEPARTED">Departed</option>
            </select>
          </div>

          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {filteredTours.length} tours found
          </span>
        </div>
      </div>

      {/* TOUR CARDS GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTours.map((tour) => {
            return (
              <div
                key={tour.id}
                className="relative z-0 rounded-xl bg-white dark:bg-[#121C18] border border-gray-200 dark:border-gray-800 hover:border-[#1B7167]/40 shadow-sm flex flex-col justify-between transition-all duration-200 group"
              >
                <div>
                  {/* Banner */}
                  <div
                    className={`relative overflow-visible p-5 pb-6 bg-gradient-to-tr ${tour.bannerGradient || "from-teal-800 to-slate-900"} text-white rounded-t-xl`}
                  >
                    <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
                      <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border border-white/20 bg-black/30 backdrop-blur-md">
                        {tour.status}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg border border-white/15 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                          {tour.durationDays} Days / {tour.durationNights ?? tour.durationDays - 1} Nights
                        </span>
                        {isAdmin && (
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMenuOpen((current) => (current === tour.id ? null : tour.id));
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-black/30 text-white hover:bg-black/50"
                            >
                              •••
                            </button>
                            {menuOpen === tour.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuOpen(null);
                                  }}
                                />
                                <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-1.5 text-gray-900 dark:text-white shadow-xl">
                                  <Link
                                    href={`/tours/${tour.id}`}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                                  >
                                    Manage Workspace
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(tour)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                                  >
                                    Edit Details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDuplicate(tour)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                                  >
                                    Duplicate Departure
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(tour)}
                                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                  >
                                    Delete Departure
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <h2 className="relative z-0 mt-3 text-base font-black leading-snug tracking-tight text-white group-hover:text-teal-200 transition-colors">
                      {tour.title}
                    </h2>

                    {/* Destination Tags */}
                    {tour.destinations && tour.destinations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 relative z-10">
                        {tour.destinations.map((destination, idx) => {
                          const tag = destinationTag(destination);
                          return (
                            <span
                              key={`${tag.code}-${idx}`}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-black/40 border border-white/15 text-slate-100 backdrop-blur-sm"
                            >
                              <strong className="mr-1 text-teal-300">{tag.code}</strong>
                              {tag.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-4 text-xs">
                    {/* Departure & Return Schedule */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-800 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#1B7167]" />
                          Departure Date:
                        </span>
                        <strong className="font-mono text-gray-900 dark:text-white">{tour.departureDate}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <Plane className="w-3.5 h-3.5 text-gray-400" />
                          Return Date:
                        </span>
                        <strong className="font-mono text-gray-700 dark:text-gray-300">{tour.returnDate}</strong>
                      </div>
                    </div>

                    {/* Group Flight & PNR Badge */}
                    {tour.flightBlock?.pnrCode && (
                      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 text-[11px]">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Plane className="w-3.5 h-3.5 text-indigo-600" />
                          {tour.flightBlock.airline || "Group Flight"}
                        </span>
                        <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          PNR: {tour.flightBlock.pnrCode}
                        </span>
                      </div>
                    )}

                    {/* CAPACITY PROGRESS BAR */}
                    <TourCapacityBar bookedSeats={tour.bookedSeats} maxCapacity={tour.maxCapacity} />

                    {/* Pricing */}
                    <div className="flex items-baseline justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 dark:text-gray-400 text-xs">Base Price / Person:</span>
                      <span className="text-base font-black font-mono text-[#1B7167] dark:text-teal-400">
                        {formatMoney(tour.pricePerPerson)}
                      </span>
                    </div>

                    {/* Inclusions */}
                    {tour.inclusions && tour.inclusions.length > 0 && (
                      <div className="space-y-1 pt-1 text-[11px] text-gray-500 dark:text-gray-400">
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-[10px] uppercase tracking-wider block">
                          Key Inclusions:
                        </span>
                        <ul className="space-y-0.5 list-disc list-inside">
                          {tour.inclusions.slice(0, 2).map((inc, i) => (
                            <li key={i} className="truncate text-gray-500 dark:text-gray-400">
                              {inc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-gray-50/80 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800 rounded-b-xl">
                  <Link
                    href={`/tours/${tour.id}`}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#1B7167] hover:bg-[#155a52] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <span>Manage Departure &rarr;</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT / DUPLICATE TOUR MODAL */}
      <CreateTourModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingTour(null);
        }}
        onCreate={handleSaveDeparture}
        initialData={editingTour}
        mode={modalMode}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmTour && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#030712] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Delete Departure</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete <strong>{deleteConfirmTour.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTour(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTour}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

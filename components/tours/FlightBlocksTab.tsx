"use client";

import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { flightSeatUtilization } from "@/lib/tour-operations";
import type { TourPackage, FlightBlock } from "@/types/erp";
import {
  Plane,
  Luggage,
  Ticket,
  AlertTriangle,
  Save,
  Clock,
  ArrowRight,
} from "lucide-react";

interface FlightBlocksTabProps {
  tour: TourPackage;
  showToast: (message: string) => void;
}

export function FlightBlocksTab({ tour, showToast }: FlightBlocksTabProps) {
  const { updateTourOperations, bookings } = useData();
  const { role } = useRole();
  const canEditFlights = role === "AGENCY_ADMIN" || role === "TOUR_MANAGER";

  const [form, setForm] = useState<FlightBlock>(() => {
    return (
      tour.flightBlock ?? {
        id: "",
        tourId: tour.id,
        airline: "Turkish Airlines",
        pnrCode: "TK-GRP-9021",
        flightNumber: "TK-715",
        departureAirport: "LHE (Lahore)",
        arrivalAirport: "IST (Istanbul)",
        departureTime: `${tour.departureDate}T06:30:00Z`,
        arrivalTime: `${tour.departureDate}T11:45:00Z`,
        baggageAllowance: "30kg Check-in + 7kg Cabin",
        totalAllocatedSeats: tour.maxCapacity || 30,
      }
    );
  });

  const [isSaving, setIsSaving] = useState(false);

  const utilization = flightSeatUtilization(
    bookings,
    tour.tenantId,
    tour.id,
    form.totalAllocatedSeats ?? tour.flightBlock?.totalAllocatedSeats ?? 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditFlights) return;
    setIsSaving(true);
    try {
      const flightBlockData: FlightBlock = {
        ...form,
        id: form.id || `flight-${Date.now()}`,
        tourId: tour.id,
      };
      updateTourOperations(tour.id, { flightBlock: flightBlockData });
      showToast("Group flight block and PNR details saved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save flight block.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* Reservation Summary Card */}
      <section
        aria-label="Airline reservation summary"
        className="rounded-xl border border-teal-500/20 bg-teal-500/5 dark:bg-teal-950/20 p-5 space-y-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white font-sans">
                {form.airline || "Group Flight Block"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Flight No: <strong className="text-gray-700 dark:text-gray-300">{form.flightNumber || "GRP-101"}</strong>
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-gray-400 tracking-wider block">
              Group PNR Reference
            </span>
            <span className="px-3 py-1 rounded-lg bg-teal-500/10 text-[#1B7167] dark:text-teal-400 border border-teal-500/20 font-mono font-black text-sm tracking-tight inline-block">
              {form.pnrCode || "PENDING"}
            </span>
          </div>
        </div>

        {/* Route and Schedule */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-teal-500/10 text-xs">
          <div>
            <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px] block">Routing</span>
            <p className="font-semibold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              <span>{form.departureAirport || "Origin"}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#1B7167]" />
              <span>{form.arrivalAirport || "Destination"}</span>
            </p>
          </div>

          <div>
            <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px] block">Baggage Allowance</span>
            <p className="font-semibold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              <Luggage className="w-3.5 h-3.5 text-amber-500" />
              <span>{form.baggageAllowance || "Standard 30kg Check-in"}</span>
            </p>
          </div>

          <div>
            <span className="text-gray-500 dark:text-gray-400 font-mono text-[11px] block">Departure Time</span>
            <p className="font-semibold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-mono">{form.departureTime ? form.departureTime.slice(0, 16).replace("T", " ") : "Scheduled"}</span>
            </p>
          </div>
        </div>

        {/* Seat Utilization Bar */}
        <div className="space-y-2 pt-2 border-t border-teal-500/10">
          <div className="flex flex-wrap items-center justify-between text-xs font-mono">
            <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1">
              <Ticket className="w-3.5 h-3.5 text-[#1B7167]" />
              Seat Utilization: <strong className="text-gray-900 dark:text-white ml-1">{utilization.ticketed}</strong> / {utilization.allocated} Ticketed / Blocked
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {utilization.remaining} unticketed seats available ({Math.round(utilization.percent)}%)
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Ticketed airline seats"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={utilization.percent}
            aria-valuetext={`${utilization.ticketed} ticketed of ${utilization.allocated} blocked seats`}
            className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                utilization.overCapacity ? "bg-rose-500" : "bg-emerald-600 dark:bg-emerald-500"
              }`}
              style={{ width: `${Math.min(utilization.percent, 100)}%` }}
            />
          </div>

          {utilization.overCapacity && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Ticketed passengers ({utilization.ticketed}) exceed the saved airline seat block ({utilization.allocated}). Request additional seats from airline.
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Flight Block Edit Form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <Plane className="w-4 h-4 text-[#1B7167]" />
            Flight Block Configuration &amp; GDS Details
          </h3>
          {!canEditFlights && (
            <span className="text-xs text-gray-400 italic">Read-only (Requires Tour Manager role)</span>
          )}
        </div>

        <fieldset disabled={!canEditFlights} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Airline Name
            </label>
            <input
              type="text"
              required
              value={form.airline}
              onChange={(e) => setForm({ ...form, airline: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group PNR Code
            </label>
            <input
              type="text"
              required
              value={form.pnrCode}
              onChange={(e) => setForm({ ...form, pnrCode: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Flight Number
            </label>
            <input
              type="text"
              value={form.flightNumber}
              onChange={(e) => setForm({ ...form, flightNumber: e.target.value })}
              placeholder="e.g. TK-715, QR-621"
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Departure Airport
            </label>
            <input
              type="text"
              value={form.departureAirport}
              onChange={(e) => setForm({ ...form, departureAirport: e.target.value })}
              placeholder="e.g. LHE (Allama Iqbal Intl)"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arrival Airport
            </label>
            <input
              type="text"
              value={form.arrivalAirport}
              onChange={(e) => setForm({ ...form, arrivalAirport: e.target.value })}
              placeholder="e.g. IST (Istanbul Airport)"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Blocked Seats
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={form.totalAllocatedSeats}
              onChange={(e) => setForm({ ...form, totalAllocatedSeats: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Departure Timestamp
            </label>
            <input
              type="datetime-local"
              value={form.departureTime ? form.departureTime.slice(0, 16) : ""}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Arrival Timestamp
            </label>
            <input
              type="datetime-local"
              value={form.arrivalTime ? form.arrivalTime.slice(0, 16) : ""}
              onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Baggage Allowance
            </label>
            <input
              type="text"
              value={form.baggageAllowance}
              onChange={(e) => setForm({ ...form, baggageAllowance: e.target.value })}
              placeholder="e.g. 30kg + 7kg Cabin"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>
        </fieldset>

        {canEditFlights && (
          <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving Flight Block..." : "Save Flight Block"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

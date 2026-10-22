"use client";

import React, { useState } from "react";
import { TourPackage, FlightBlock } from "@/types/erp";
import { X, Calendar, MapPin, DollarSign, Users, Plus, Plane, Tag, AlertTriangle } from "lucide-react";

interface CreateTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (tourData: Partial<TourPackage>) => Promise<void>;
  initialData?: TourPackage | null;
  mode?: "CREATE" | "EDIT" | "DUPLICATE";
}

const PRESET_DESTINATIONS = [
  "Turkey",
  "Saudi Arabia (Umrah)",
  "France, Switzerland, Italy",
  "Malaysia, Singapore, Thailand",
  "United Arab Emirates (Dubai)",
  "United Kingdom & Scotland",
  "Azerbaijan (Baku)",
  "Egypt (Cairo & Nile Cruise)",
];

export function CreateTourModal({
  isOpen,
  onClose,
  onCreate,
  initialData,
  mode = "CREATE",
}: CreateTourModalProps) {
  if (!isOpen) return null;

  return (
    <CreateTourModalContent
      key={`${initialData?.id || "new"}-${mode}`}
      onClose={onClose}
      onCreate={onCreate}
      initialData={initialData}
      mode={mode}
    />
  );
}

function CreateTourModalContent({
  onClose,
  onCreate,
  initialData,
  mode = "CREATE",
}: Omit<CreateTourModalProps, "isOpen">) {
  const [title, setTitle] = useState(() => {
    if (!initialData) return "";
    return mode === "DUPLICATE" ? `${initialData.title} (Copy)` : initialData.title;
  });

  const [destinations, setDestinations] = useState(() => {
    if (!initialData?.destinations) return "Turkey";
    return initialData.destinations
      .map((d) => (typeof d === "string" ? d : d.name))
      .join(", ");
  });

  const [departureDate, setDepartureDate] = useState(() => initialData?.departureDate || "2026-11-01");
  const [returnDate, setReturnDate] = useState(() => initialData?.returnDate || "2026-11-12");
  const [maxCapacity, setMaxCapacity] = useState(() => initialData?.maxCapacity || 30);
  const [pricePerPerson, setPricePerPerson] = useState(() => initialData?.pricePerPerson || 385000);
  const [airline, setAirline] = useState(() => initialData?.flightBlock?.airline || "Turkish Airlines");
  const [pnrCode, setPnrCode] = useState(() => initialData?.flightBlock?.pnrCode || "TK-GRP-9021");
  const [inclusions, setInclusions] = useState(() => {
    if (!initialData) {
      return "Return group flight tickets, 4-Star Accommodations, Daily Halal breakfast & dinner, Luxury air-conditioned coach, Dedicated Tour Manager";
    }
    return initialData.inclusions ? initialData.inclusions.join(", ") : "";
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Tour title is required.");
      return;
    }

    if (Number(maxCapacity) <= 0) {
      setError("Maximum passenger capacity must be greater than 0.");
      return;
    }

    const departure = new Date(departureDate);
    const returnD = new Date(returnDate);
    if (isNaN(departure.getTime()) || isNaN(returnD.getTime())) {
      setError("Please provide valid departure and return dates.");
      return;
    }

    if (returnD < departure) {
      setError("Return date cannot be earlier than departure date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const destList = destinations.split(",").map((d) => d.trim()).filter(Boolean);
      const incList = inclusions.split(",").map((i) => i.trim()).filter(Boolean);
      const durationDays = Math.max(
        1,
        Math.round((returnD.getTime() - departure.getTime()) / (1000 * 60 * 60 * 24))
      );

      const flightBlock: FlightBlock | undefined = pnrCode.trim()
        ? {
            id: initialData?.flightBlock?.id || `flight-${Date.now()}`,
            tourId: initialData?.flightBlock?.tourId || initialData?.id || "",
            airline: airline.trim() || "Group Flight",
            pnrCode: pnrCode.trim().toUpperCase(),
            flightNumber: initialData?.flightBlock?.flightNumber || "GRP-101",
            departureAirport: initialData?.flightBlock?.departureAirport || "LHE",
            arrivalAirport: initialData?.flightBlock?.arrivalAirport || "IST",
            departureTime: initialData?.flightBlock?.departureTime || `${departureDate}T08:00:00Z`,
            arrivalTime: initialData?.flightBlock?.arrivalTime || `${departureDate}T14:00:00Z`,
            baggageAllowance: initialData?.flightBlock?.baggageAllowance || "30kg + 7kg Cabin",
            totalAllocatedSeats: Number(maxCapacity),
          }
        : undefined;

      await onCreate({
        title: title.trim(),
        destinations: destList,
        departureDate,
        returnDate,
        durationDays,
        durationNights: Math.max(0, durationDays - 1),
        maxCapacity: Number(maxCapacity),
        bookedSeats: mode === "EDIT" ? initialData?.bookedSeats || 0 : 0,
        pricePerPerson: Number(pricePerPerson),
        basePricePerPax: Number(pricePerPerson),
        status: mode === "EDIT" ? initialData?.status || "OPEN" : "OPEN",
        inclusions: incList,
        bannerGradient: initialData?.bannerGradient || "from-teal-800 via-emerald-900 to-slate-900",
        flightBlock,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save tour package.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#030712] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1B7167]/10 text-[#1B7167] dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {mode === "EDIT"
                  ? "Edit Tour Departure"
                  : mode === "DUPLICATE"
                  ? "Duplicate Tour Departure"
                  : "Create Tour Departure"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Configure group departure limits, flight PNR blocks, and base pricing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form id="create-tour-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Tour Title / Departure Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Turkey Classic Splendors (8 Days / 7 Nights)"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Destination Countries (Comma-separated) *
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder="Turkey, Istanbul, Cappadocia"
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
              />
            </div>
            {/* Quick destination suggestions */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {PRESET_DESTINATIONS.slice(0, 4).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setDestinations(p)}
                  className="px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-[10px] text-gray-600 dark:text-gray-300 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Departure Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 font-mono bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Return Date *
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="date"
                  required
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 font-mono bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Airline Name
              </label>
              <div className="relative">
                <Plane className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={airline}
                  onChange={(e) => setAirline(e.target.value)}
                  placeholder="e.g. Turkish Airlines, Qatar Airways"
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Group PNR Code
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={pnrCode}
                  onChange={(e) => setPnrCode(e.target.value)}
                  placeholder="e.g. TK-GRP-9021"
                  className="w-full pl-9 pr-3 py-2 font-mono uppercase bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Max Passenger Capacity *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  required
                  min={1}
                  max={200}
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 font-mono bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Base Price / Pax (PKR) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  required
                  min={0}
                  step={5000}
                  value={pricePerPerson}
                  onChange={(e) => setPricePerPerson(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2 font-mono bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Package Inclusions (Comma-separated)
            </label>
            <textarea
              rows={3}
              value={inclusions}
              onChange={(e) => setInclusions(e.target.value)}
              placeholder="Return flights, 4-Star Hotels, Daily Halal breakfast & dinner, Swiss Travel Pass..."
              className="w-full px-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3 bg-gray-50/80 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-tour-form"
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {isSubmitting
              ? "Saving Departure..."
              : mode === "EDIT"
              ? "Update Departure"
              : mode === "DUPLICATE"
              ? "Duplicate & Publish"
              : "Create Tour Departure"}
          </button>
        </div>
      </div>
    </div>
  );
}

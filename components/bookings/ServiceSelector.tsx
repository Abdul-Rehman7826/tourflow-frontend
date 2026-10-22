"use client";

import React, { useMemo } from "react";
import { useData } from "@/context/DataContext";
import { ServiceType } from "@/types/erp";
import {
  Palmtree,
  FileCheck,
  Compass,
  Users,
  AlertTriangle,
} from "lucide-react";

interface ServiceSelectorProps {
  serviceType: ServiceType;
  onSelectServiceType: (type: ServiceType) => void;

  // Group Tour state
  selectedTourId: string;
  onSelectTourId: (tourId: string) => void;
  paxCount: number;
  onChangePaxCount: (count: number) => void;
  pricePerPax: number;
  onChangePricePerPax: (price: number) => void;

  // Visa Consultancy state
  visaCountry: string;
  onChangeVisaCountry: (country: string) => void;
  visaCategory: string;
  onChangeVisaCategory: (cat: string) => void;
  visaServiceFee: number;
  onChangeVisaServiceFee: (fee: number) => void;
  embassyCharges: number;
  onChangeEmbassyCharges: (charges: number) => void;

  // Custom Package state
  customDescription: string;
  onChangeCustomDescription: (desc: string) => void;
  customPackagePrice: number;
  onChangeCustomPackagePrice: (price: number) => void;
}

export function ServiceSelector({
  serviceType,
  onSelectServiceType,
  selectedTourId,
  onSelectTourId,
  paxCount,
  onChangePaxCount,
  pricePerPax,
  onChangePricePerPax,
  visaCountry,
  onChangeVisaCountry,
  visaCategory,
  onChangeVisaCategory,
  visaServiceFee,
  onChangeVisaServiceFee,
  embassyCharges,
  onChangeEmbassyCharges,
  customDescription,
  onChangeCustomDescription,
  customPackagePrice,
  onChangeCustomPackagePrice,
}: ServiceSelectorProps) {
  const { tours: tourPackages } = useData();

  // Filter tours open for booking
  const availableTours = useMemo(() => {
    return tourPackages.filter((t) => ["OPEN", "FILLING_FAST", "GUARANTEED"].includes(t.status));
  }, [tourPackages]);

  const selectedTour = availableTours.find((t) => t.id === selectedTourId) || availableTours[0];
  const availableSeats = selectedTour ? selectedTour.maxCapacity - selectedTour.bookedSeats : 0;
  const isOverCapacity = paxCount > availableSeats;

  const handleTourChange = (id: string) => {
    onSelectTourId(id);
    const tour = availableTours.find((t) => t.id === id);
    if (tour) {
      onChangePricePerPax(tour.pricePerPerson || tour.basePricePerPax || 350000);
    }
  };

  return (
    <div className="space-y-5 text-gray-900 dark:text-white">
      {/* 3 Service Type Pills / Cards */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
          Select Service Category
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Group Tour Option */}
          <button
            type="button"
            onClick={() => {
              onSelectServiceType("GROUP_TOUR");
              if (!selectedTourId && availableTours.length > 0) {
                handleTourChange(availableTours[0].id);
              }
            }}
            className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
              serviceType === "GROUP_TOUR"
                ? "border-[#1B7167] bg-teal-50/60 dark:bg-teal-950/40 shadow-sm"
                : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Palmtree className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Fixed Group
              </span>
            </div>
            <div>
              <h4 className="font-bold text-xs font-sans text-gray-900 dark:text-white">
                Group Tour Departure
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Fixed dates &amp; blocked flight GDS allotment
              </p>
            </div>
          </button>

          {/* Visa Option */}
          <button
            type="button"
            onClick={() => onSelectServiceType("VISA_CONSULTANCY")}
            className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
              serviceType === "VISA_CONSULTANCY"
                ? "border-[#1B7167] bg-teal-50/60 dark:bg-teal-950/40 shadow-sm"
                : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Embassy Case
              </span>
            </div>
            <div>
              <h4 className="font-bold text-xs font-sans text-gray-900 dark:text-white">
                Visa Consultancy
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                5-Stage submission &amp; custody vault
              </p>
            </div>
          </button>

          {/* Custom Package / Umrah Option */}
          <button
            type="button"
            onClick={() => onSelectServiceType("CUSTOM_PACKAGE")}
            className={`p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between gap-2 ${
              serviceType === "CUSTOM_PACKAGE" || (serviceType as string) === "UMRAH"
                ? "border-[#1B7167] bg-teal-50/60 dark:bg-teal-950/40 shadow-sm"
                : "border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] hover:border-gray-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Bespoke / FIT
              </span>
            </div>
            <div>
              <h4 className="font-bold text-xs font-sans text-gray-900 dark:text-white">
                Custom Package / Umrah
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                Tailored itinerary, hotels &amp; transfers
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Dynamic Fields for Selected Service Type */}
      {serviceType === "GROUP_TOUR" && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Select Tour Departure Allotment
            </label>
            <select
              value={selectedTourId || selectedTour?.id || ""}
              onChange={(e) => handleTourChange(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none font-medium"
            >
              {availableTours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.departureDate}) — {t.maxCapacity - t.bookedSeats} Seats Remaining
                </option>
              ))}
            </select>
          </div>

          {selectedTour && (
            <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs flex items-center justify-between text-gray-800 dark:text-gray-200">
              <div className="space-y-0.5">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {selectedTour.title}
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                  Dep: {selectedTour.departureDate} · Ret: {selectedTour.returnDate} ({selectedTour.durationDays} Days)
                </p>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#1B7167] text-white">
                  {availableSeats} Available Seats
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Passenger Count (Pax)
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={1}
                  max={availableSeats || 100}
                  value={paxCount}
                  onChange={(e) => onChangePaxCount(Math.max(1, Number(e.target.value)))}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
                />
              </div>
              {isOverCapacity && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Exceeds available capacity ({availableSeats} seats)
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Agreed Price / Pax (PKR)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={pricePerPax}
                onChange={(e) => onChangePricePerPax(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {serviceType === "VISA_CONSULTANCY" && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Destination Country
              </label>
              <input
                type="text"
                required
                placeholder="e.g. United Kingdom, Germany, USA"
                value={visaCountry}
                onChange={(e) => onChangeVisaCountry(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Visa Category
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Standard Visitor / Tourist"
                value={visaCategory}
                onChange={(e) => onChangeVisaCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Consultancy Service Fee (PKR)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={visaServiceFee}
                onChange={(e) => onChangeVisaServiceFee(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Embassy / Gerry&apos;s Charges (PKR)
              </label>
              <input
                type="number"
                min={0}
                step={500}
                value={embassyCharges}
                onChange={(e) => onChangeEmbassyCharges(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {(serviceType === "CUSTOM_PACKAGE" || (serviceType as string) === "UMRAH") && (
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Package &amp; Itinerary Description
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. 15-Day Executive VIP Umrah Package with Swissotel Makkah & Oberoi Madinah including private GMC transfers."
              value={customDescription}
              onChange={(e) => onChangeCustomDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Total Package Agreed Value (PKR)
            </label>
            <input
              type="number"
              min={0}
              step={5000}
              value={customPackagePrice}
              onChange={(e) => onChangeCustomPackagePrice(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}

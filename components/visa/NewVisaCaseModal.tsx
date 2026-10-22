"use client";

import React, { useState } from "react";
import { LegacyVisaStage as VisaStage } from "@/types/erp";
import { useData } from "@/context/DataContext";
import { useTenant } from "@/context/TenantContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { X, Plus } from "lucide-react";

interface NewVisaCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (clientName: string) => void;
}

const POPULAR_COUNTRIES = [
  { name: "United Kingdom", flag: "🇬🇧" },
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "France (Schengen)", flag: "🇫🇷" },
  { name: "Germany (Schengen)", flag: "🇩🇪" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Saudi Arabia (Umrah/Tourist)", flag: "🇸🇦" },
  { name: "United Arab Emirates", flag: "🇦🇪" },
];

export function NewVisaCaseModal({ isOpen, onClose, onSuccess }: NewVisaCaseModalProps) {
  const { addVisaCase } = useData();
  const { tenant } = useTenant();
  const { settings, formatMoney } = useAgencySettings();

  const [clientName, setClientName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(POPULAR_COUNTRIES[0]);
  const [visaType, setVisaType] = useState("Tourist");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime] = useState("10:00 AM");
  const [consultantName, setConsultantName] = useState("Zubair Hashmi");
  const [feeAmount, setFeeAmount] = useState<number>(75000);
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !passportNo.trim() || !Number.isFinite(feeAmount) || feeAmount < 0) return;

    addVisaCase({
      tenantId: tenant.id,
      clientName: clientName.trim(),
      passportNo: passportNo.trim().toUpperCase(),
      country: selectedCountry.name,
      flagEmoji: selectedCountry.flag,
      visaType,
      stage: "Document Collection" as VisaStage,
      appointmentDate: appointmentDate || new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
      appointmentTime,
      consultantName,
      feeAmount: Math.round((feeAmount + settings.visaMarkup) * 100) / 100,
      notes: notes.trim() || undefined,
      documents: [
        { id: "doc-1", name: "Original Passport", required: true, status: "Verified" },
        { id: "doc-2", name: "6-Month Bank Statement", required: true, status: "Pending" },
        { id: "doc-3", name: "Photograph", required: true, status: "Verified" },
        { id: "doc-4", name: "Embassy Application Form", required: true, status: "Pending" },
      ],
    });

    onSuccess(clientName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              New Visa Application Dossier
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Initiate client visa case into Stage 1: Document Collection
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Name */}
            <div className="space-y-1">
              <label className="text-gray-700 dark:text-gray-300 font-semibold block">Client Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Asadullah Sheikh"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Passport Number */}
            <div className="space-y-1">
              <label className="text-gray-700 dark:text-gray-300 font-semibold block">Passport Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. PK8921092"
                value={passportNo}
                onChange={(e) => setPassportNo(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-mono uppercase focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Destination Country */}
            <div className="space-y-1">
              <label className="text-gray-700 dark:text-gray-300 font-semibold block">Destination Country</label>
              <select
                value={selectedCountry.name}
                onChange={(e) => {
                  const found = POPULAR_COUNTRIES.find((c) => c.name === e.target.value);
                  if (found) setSelectedCountry(found);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                {POPULAR_COUNTRIES.map((c) => (
                  <option key={c.name} value={c.name} className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Visa Type */}
            <div className="space-y-1">
              <label className="text-gray-700 dark:text-gray-300 font-semibold block">Visa Category</label>
              <select
                value={visaType}
                onChange={(e) => setVisaType(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Tourist" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Tourist / Short Stay</option>
                <option value="Business" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Business / Trade Delegation</option>
                <option value="Student" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Student Route / Tier 4</option>
                <option value="Family Visit" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Family / Spousal Visit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Appointment Date */}
            <div className="space-y-1">
              <label className="text-gray-700 dark:text-gray-300 font-semibold block">Embassy / VAC Date</label>
              <input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Consultant */}
            <div className="space-y-1">
              <label className="text-gray-700 dark:text-gray-300 font-semibold block">Assigned Consultant</label>
              <select
                value={consultantName}
                onChange={(e) => setConsultantName(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Zubair Hashmi" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Zubair Hashmi (Visa Lead)</option>
                <option value="Maryam Nawaz (Consultant)" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Maryam Nawaz (Senior Consultant)</option>
                <option value="Ali Raza" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Ali Raza (Desk Rep)</option>
              </select>
            </div>
          </div>

          {/* Processing Fee */}
          <div className="space-y-1">
            <label className="text-gray-700 dark:text-gray-300 font-semibold block">
              Embassy Cost (Before Service Fee)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={feeAmount}
              onChange={(e) => setFeeAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">Service fee: {formatMoney(settings.visaMarkup)} / Total client fee: {formatMoney(feeAmount + settings.visaMarkup)}</p>
          {/* Notes */}
          <div className="space-y-1">
            <label className="text-gray-700 dark:text-gray-300 font-semibold block">Case Notes</label>
            <input
              type="text"
              placeholder="e.g. Needs fast-track VIP lounge appointment at Gerry's"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm transition-colors cursor-pointer"
            >
              Create Case in Pipeline
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

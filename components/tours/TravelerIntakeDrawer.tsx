"use client";

import React, { useState } from "react";
import { TravelerManifestItem } from "@/types/erp";
import { checkPassport6MWarning } from "@/lib/tours-api";
import { X, ShieldAlert, CheckCircle2, FileText, User, Calendar, Phone, Bed, Save } from "lucide-react";

interface TravelerIntakeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  traveler: TravelerManifestItem | null;
  tourDepartureDate?: string;
  onSave: (travelerId: string, updatedData: Partial<TravelerManifestItem>) => Promise<void>;
}

export function TravelerIntakeDrawer({
  isOpen,
  onClose,
  traveler,
  tourDepartureDate,
  onSave,
}: TravelerIntakeDrawerProps) {
  if (!isOpen || !traveler) return null;

  return (
    <TravelerIntakeDrawerContent
      key={traveler.id}
      onClose={onClose}
      traveler={traveler}
      tourDepartureDate={tourDepartureDate}
      onSave={onSave}
    />
  );
}

function TravelerIntakeDrawerContent({
  onClose,
  traveler,
  tourDepartureDate,
  onSave,
}: Omit<TravelerIntakeDrawerProps, "isOpen"> & { traveler: TravelerManifestItem }) {
  const [fullName, setFullName] = useState(() => traveler.fullName || "");
  const [passportNo, setPassportNo] = useState(() => traveler.passportNo || "");
  const [passportExpiry, setPassportExpiry] = useState(() => traveler.passportExpiry || "");
  const [dateOfBirth, setDateOfBirth] = useState(() => traveler.dateOfBirth || "");
  const [phone, setPhone] = useState(() => traveler.phone || "");
  const [roomPreference, setRoomPreference] = useState<"SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY">(
    () => traveler.roomPreference || "DOUBLE"
  );
  const [passportUploaded, setPassportUploaded] = useState(
    () => traveler.documents?.passportCopyUploaded ?? true
  );
  const [visaGranted, setVisaGranted] = useState(() => traveler.documents?.visaGranted ?? false);
  const [ticketIssued, setTicketIssued] = useState(() => traveler.documents?.ticketIssued ?? false);
  const [notes, setNotes] = useState(() => traveler.notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const isPassportExpiringSoon = checkPassport6MWarning(passportExpiry, tourDepartureDate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(traveler.id, {
        fullName,
        passportNo,
        passportExpiry,
        dateOfBirth,
        phone,
        roomPreference,
        documents: {
          passportCopyUploaded: passportUploaded,
          visaGranted,
          ticketIssued,
        },
        notes,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save traveler item:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-white dark:bg-[#030712] h-full shadow-2xl border-l border-gray-200 dark:border-white/10 flex flex-col justify-between">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/60 dark:bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[#1B7167] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800">
                Slot #{traveler.slotNumber || "1"}
              </span>
              <span className="font-mono text-xs text-gray-500">{traveler.bookingId}</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white font-sans mt-1">
              Passenger Intake &amp; Compliance
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form id="traveler-intake-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Passport 6M Warning Alert */}
          {isPassportExpiringSoon && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 text-rose-800 dark:text-rose-300">
              <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold block mb-0.5">⚠️ 6-Month Passport Expiry Risk</span>
                This passport expires on <strong className="font-mono">{passportExpiry}</strong>, which is less than 6 months from the departure date ({tourDepartureDate || "upcoming tour"}). Require client to renew before flight booking.
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
              Traveler Information
            </h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name (as per Passport)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#1B7167] text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  required
                  value={passportNo}
                  onChange={(e) => setPassportNo(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#1B7167] text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Passport Expiry
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    required
                    value={passportExpiry}
                    onChange={(e) => setPassportExpiry(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#1B7167] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+92 300 0000000"
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#1B7167] text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date of Birth
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#1B7167] text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Room Allocation Preference */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/10">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-[#1B7167]" /> Rooming Preference
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(["SINGLE", "DOUBLE", "TRIPLE", "FAMILY"] as const).map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setRoomPreference(pref)}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all text-center ${
                    roomPreference === pref
                      ? "bg-[#1B7167] text-white border-[#1B7167] shadow-sm"
                      : "bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[#1B7167]"
                  }`}
                >
                  {pref} ROOM
                </button>
              ))}
            </div>
          </div>

          {/* Document Verification Checkpoints */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-white/10">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
              Travel Readiness Checkpoints
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] cursor-pointer">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" /> Passport Scan Uploaded
                </span>
                <input
                  type="checkbox"
                  checked={passportUploaded}
                  onChange={(e) => setPassportUploaded(e.target.checked)}
                  className="w-4 h-4 text-[#1B7167] rounded border-gray-300 focus:ring-[#1B7167]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] cursor-pointer">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Visa Granted / Approved
                </span>
                <input
                  type="checkbox"
                  checked={visaGranted}
                  onChange={(e) => setVisaGranted(e.target.checked)}
                  className="w-4 h-4 text-[#1B7167] rounded border-gray-300 focus:ring-[#1B7167]"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] cursor-pointer">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Flight Ticket Issued
                </span>
                <input
                  type="checkbox"
                  checked={ticketIssued}
                  onChange={(e) => setTicketIssued(e.target.checked)}
                  className="w-4 h-4 text-[#1B7167] rounded border-gray-300 focus:ring-[#1B7167]"
                />
              </label>
            </div>
          </div>

          {/* Operational Notes / Dietary */}
          <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/10">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Dietary Requirements / Medical Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Halal Asian meal, wheelchair assistance requested..."
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-[#1B7167] text-gray-900 dark:text-white"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-3 bg-gray-50/80 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="traveler-intake-form"
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#1B7167] hover:bg-[#155a52] rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Traveler Intake"}
          </button>
        </div>
      </div>
    </div>
  );
}

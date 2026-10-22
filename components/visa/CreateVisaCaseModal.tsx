"use client";

import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useAgencySettings } from "@/context/ThemeContext";
import type { VisaCaseInput } from "@/lib/visa-operations";
import { X, Plus, ShieldCheck, User, Globe, DollarSign } from "lucide-react";

interface CreateVisaCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (caseName: string) => void;
}

const POPULAR_DESTINATIONS = [
  { name: "United Kingdom", flag: "🇬🇧", defaultCategory: "Standard Visitor (6 Months)" },
  { name: "Germany (Schengen)", flag: "🇩🇪", defaultCategory: "Business C-Type" },
  { name: "France (Schengen)", flag: "🇫🇷", defaultCategory: "Tourist C-Type" },
  { name: "United States", flag: "🇺🇸", defaultCategory: "Tourist B1/B2" },
  { name: "Canada", flag: "🇨🇦", defaultCategory: "Temporary Resident Visa (V-1)" },
  { name: "Saudi Arabia", flag: "🇸🇦", defaultCategory: "Umrah eVisa / Tourist" },
  { name: "United Arab Emirates", flag: "🇦🇪", defaultCategory: "30-Day Tourist Visa" },
  { name: "Turkey", flag: "🇹🇷", defaultCategory: "Tourist eVisa / Sticker" },
];

const DEFAULT_DOCUMENTS = [
  "Original Passport",
  "6-Month Bank Statement",
  "FBR Tax Returns (2 Yrs)",
  "Employment Letter / Business Letterhead",
  "White Background Photos (35x45mm)",
  "CNIC / Family Registration Certificate",
];

export function CreateVisaCaseModal({ isOpen, onClose, onSuccess }: CreateVisaCaseModalProps) {
  const { clients, saveVisaPipelineCase } = useData();
  const { user, staffUsers = [] } = useAuth();
  const { formatMoney } = useAgencySettings();

  const eligibleStaff = (staffUsers.length ? staffUsers : user ? [user] : []).filter(
    (s) => s.tenantId === user?.tenantId && s.status === "Active" && ["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"].includes(s.role)
  );

  const [clientId, setClientId] = useState("");
  const [applicantName, setApplicantName] = useState("");
  const [applicantPhone, setApplicantPhone] = useState("");
  const [country, setCountry] = useState(POPULAR_DESTINATIONS[0].name);
  const [visaType, setVisaType] = useState(POPULAR_DESTINATIONS[0].defaultCategory);
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [assignedStaffId, setAssignedStaffId] = useState(user?.id || "");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [centerName, setCenterName] = useState("Gerry's Visa Drop Box - Lahore");
  const [consultancyFee, setConsultancyFee] = useState<number>(50000);
  const [embassyFeePaid, setEmbassyFeePaid] = useState<number>(35000);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClientSelect = (selectedId: string) => {
    setClientId(selectedId);
    const client = clients.find((c) => c.id === selectedId);
    if (client) {
      setApplicantName(client.fullName);
      setApplicantPhone(client.phone || "");
    }
  };

  const handleCountrySelect = (cName: string) => {
    setCountry(cName);
    const match = POPULAR_DESTINATIONS.find((d) => d.name === cName);
    if (match) {
      setVisaType(match.defaultCategory);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!applicantName.trim()) {
      setError("Applicant name is required.");
      return;
    }
    if (!country.trim() || !visaType.trim()) {
      setError("Destination country and visa category are required.");
      return;
    }
    if (!clientId) {
      setError("Please select or link a CRM client.");
      return;
    }

    try {
      setIsSubmitting(true);
      const assigned = eligibleStaff.find((s) => s.id === assignedStaffId);

      const payload: VisaCaseInput = {
        clientId,
        applicantName: applicantName.trim(),
        applicantPhone: applicantPhone.trim(),
        country: country.trim(),
        visaType: visaType.trim(),
        stage: "DOCUMENTS_PENDING",
        decision: "PENDING",
        assignedStaffId: assignedStaffId || user?.id || "",
        assignedStaffName: assigned?.name || user?.name || "Consultant",
        passportNumber: passportNumber.trim().toUpperCase(),
        passportExpiry: passportExpiry || undefined,
        passportCustody: "CLIENT_HOLDING",
        appointmentDate: appointmentDate || undefined,
        centerName: centerName.trim() || undefined,
        consultancyFee: Number(consultancyFee) || 0,
        embassyFeePaid: Number(embassyFeePaid) || 0,
        documentChecklist: DEFAULT_DOCUMENTS.map((name, i) => ({
          id: `doc-${Date.now()}-${i}`,
          name,
          required: true,
          received: false,
          verified: false,
        })),
      };

      saveVisaPipelineCase(null, payload);
      if (onSuccess) onSuccess(applicantName);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create visa case.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative text-gray-900 dark:text-gray-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded bg-[#1B7167]/10 px-2 py-0.5 text-[11px] font-bold text-[#1B7167] dark:bg-[#1B7167]/20 dark:text-[#2DD4BF]">
                <ShieldCheck className="h-3 w-3" />
                Case Intake
              </span>
            </div>
            <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
              New Visa Consultancy Case
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Create a standalone visa dossier and initialize Document Verification Checklist.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20 p-3 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section 1: Client & Applicant Details */}
          <div className="space-y-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#1B7167]" />
              Applicant & CRM Profile
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  CRM Client Link *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs focus:border-[#1B7167] focus:outline-none"
                  required
                >
                  <option value="">-- Select Existing Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone || "No Phone"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Assigned Case Officer
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs focus:border-[#1B7167] focus:outline-none"
                >
                  {eligibleStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Applicant Full Name *
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="As per Passport"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs focus:border-[#1B7167] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={applicantPhone}
                  onChange={(e) => setApplicantPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs font-mono focus:border-[#1B7167] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Destination & Category */}
          <div className="space-y-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-[#1B7167]" />
              Destination & Visa Category
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Destination Country *
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountrySelect(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs focus:border-[#1B7167] focus:outline-none"
                >
                  {POPULAR_DESTINATIONS.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.flag} {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Visa Category / Type *
                </label>
                <input
                  type="text"
                  value={visaType}
                  onChange={(e) => setVisaType(e.target.value)}
                  placeholder="e.g. Standard Visitor (6 Months)"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs focus:border-[#1B7167] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="PK1234567"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs font-mono uppercase tracking-wider focus:border-[#1B7167] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Passport Expiry Date
                </label>
                <input
                  type="date"
                  value={passportExpiry}
                  onChange={(e) => setPassportExpiry(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs font-mono focus:border-[#1B7167] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Appointment & Commercials */}
          <div className="space-y-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-[#1B7167]" />
              Appointment Logistics & Commercials
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Embassy / VFS Center
                </label>
                <input
                  type="text"
                  value={centerName}
                  onChange={(e) => setCenterName(e.target.value)}
                  placeholder="e.g. Gerry's Visa Drop Box - Lahore"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs focus:border-[#1B7167] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Appointment Date / Time
                </label>
                <input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs font-mono focus:border-[#1B7167] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Consultancy Fee ({formatMoney(0).slice(0, 3)})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={consultancyFee}
                  onChange={(e) => setConsultancyFee(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs font-mono focus:border-[#1B7167] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                  Embassy / Biometrics Fee Paid ({formatMoney(0).slice(0, 3)})
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={embassyFeePaid}
                  onChange={(e) => setEmbassyFeePaid(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs font-mono focus:border-[#1B7167] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#1B7167] hover:bg-[#155A52] disabled:opacity-50 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{isSubmitting ? "Creating Case..." : "Initialize Visa Dossier"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

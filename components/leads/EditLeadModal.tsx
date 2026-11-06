"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Lead, LeadInterestType, LeadSource } from "@/types/erp";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  UserCheck,
  Tag,
  DollarSign,
  Users,
} from "lucide-react";

export interface AssigneeStaffOption {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

interface EditLeadModalProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadId: string, updates: Partial<Lead>) => Promise<void>;
  staffOptions?: AssigneeStaffOption[];
  activeReps?: string[];
}

const COUNTRY_CODES = [
  { code: "+92", label: "PK (+92)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+966", label: "KSA (+966)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+1", label: "US/CA (+1)" },
  { code: "+90", label: "TR (+90)" },
  { code: "+60", label: "MY (+60)" },
];

export function EditLeadModal({
  lead,
  isOpen,
  onClose,
  onSave,
  staffOptions = [],
  activeReps = [],
}: EditLeadModalProps) {
  // Form fields
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [interestType, setInterestType] = useState<LeadInterestType>("GROUP_TOUR");
  const [destination, setDestination] = useState("");
  const [paxCount, setPaxCount] = useState(1);
  const [isOpenBudget, setIsOpenBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Populate fields when lead changes
  useEffect(() => {
    if (!lead || !isOpen) return;

    setFullName(lead.fullName || "");

    // Parse phone and country code
    let parsedCode = "+92";
    let rawDigits = lead.phone || "";
    for (const c of COUNTRY_CODES) {
      if (rawDigits.startsWith(c.code)) {
        parsedCode = c.code;
        rawDigits = rawDigits.slice(c.code.length).trim();
        break;
      }
    }
    setCountryCode(parsedCode);
    setPhone(rawDigits);

    setEmail(lead.email || "");
    setSource(lead.source || "Walk-in");
    setInterestType(lead.interestType || "GROUP_TOUR");
    setDestination(lead.destinationInterest || "");
    setPaxCount(typeof lead.groupSize === "number" && lead.groupSize > 0 ? lead.groupSize : 1);

    if (lead.budget === undefined || lead.budget === null || lead.budget <= 0) {
      setIsOpenBudget(true);
      setBudgetValue("");
    } else {
      setIsOpenBudget(false);
      setBudgetValue(String(lead.budget));
    }

    setFollowUpDate(lead.followUpDate?.slice(0, 10) || "");
    setAssignedTo(lead.assignedTo || "Unassigned");
    setNotes(lead.notes || "");
    setSubmitError("");
    setTouched({});
  }, [lead, isOpen]);

  // Validation
  const formErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errs.fullName = "Full name must be at least 2 characters.";
    }
    const cleanDigits = phone.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 7) {
      errs.phone = "Enter a valid phone number (min 7 digits).";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Enter a valid email address.";
    }
    if (!destination.trim() || destination.trim().length < 2) {
      errs.destination = "Destination is required.";
    }
    if (!paxCount || paxCount < 1) {
      errs.paxCount = "At least 1 passenger is required.";
    }
    if (!isOpenBudget && budgetValue.trim() && isNaN(Number(budgetValue))) {
      errs.budget = "Enter a valid numeric budget or select Open Budget.";
    }
    if (!followUpDate.trim()) {
      errs.followUpDate = "Follow-up callback date is required.";
    }
    return errs;
  }, [fullName, phone, email, destination, paxCount, isOpenBudget, budgetValue, followUpDate]);

  const isValid = Object.keys(formErrors).length === 0;

  // Available representatives list
  const representativeList = useMemo(() => {
    const map = new Map<string, string>();
    staffOptions.forEach((s) => {
      map.set(s.name, s.role || "Front Desk");
    });
    activeReps.forEach((name) => {
      if (!map.has(name)) map.set(name, "Front Desk");
    });
    return Array.from(map.entries()).map(([name, role]) => ({ name, role }));
  }, [staffOptions, activeReps]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !isValid) {
      setTouched({
        fullName: true,
        phone: true,
        destination: true,
        paxCount: true,
        followUpDate: true,
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const formattedPhone = `${countryCode} ${phone.trim()}`;
      const finalBudget = isOpenBudget || !budgetValue.trim() ? undefined : Number(budgetValue);
      const matchedOption = staffOptions.find(
        (s) => s.name.trim().toLowerCase() === assignedTo.trim().toLowerCase()
      );

      await onSave(lead.id, {
        fullName: fullName.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        source,
        interestType,
        destinationInterest: destination.trim(),
        groupSize: paxCount,
        budget: finalBudget,
        followUpDate,
        assignedTo: assignedTo.trim(),
        assignedEmployeeId: assignedTo === "Unassigned" ? undefined : matchedOption?.id,
        notes: notes.trim(),
      });

      onClose();
    } catch (err) {
      setSubmitError((err as Error).message || "Failed to update lead details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="max-w-2xl w-full bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Edit Lead Inquiry</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 font-mono font-medium">
                {lead.id.slice(0, 8)}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Modify contact, destination interest, target budget, and representative assignment.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {submitError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Row 1: Full Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Traveler Full Name *
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, fullName: true }))}
                  required
                  placeholder="e.g. Asad Ullah Khan"
                  className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                    formErrors.fullName && touched.fullName
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : "border-gray-200 dark:border-white/10 focus:border-[#1B7167]"
                  }`}
                />
              </div>
              {formErrors.fullName && touched.fullName && (
                <p className="mt-1 text-[11px] text-red-500">{formErrors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                WhatsApp / Phone Number *
              </label>
              <div className="flex gap-1.5">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-2 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => setTouched((p) => ({ ...p, phone: true }))}
                    required
                    placeholder="300 1234567"
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      formErrors.phone && touched.phone
                        ? "border-red-500 ring-1 ring-red-500/20"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167]"
                    }`}
                  />
                </div>
              </div>
              {formErrors.phone && touched.phone && (
                <p className="mt-1 text-[11px] text-red-500">{formErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Row 2: Email & Source */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Email Address (Optional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@gmail.com"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Lead Ingestion Source *
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
              >
                <option value="Walk-in">Walk-in (Branch Visit)</option>
                <option value="WhatsApp">WhatsApp Inquiry</option>
                <option value="Phone Call">Phone Call (Inbound)</option>
                <option value="Website">Website Ingestion</option>
              </select>
            </div>
          </div>

          {/* Row 3: Travel Category & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Travel Category Interest *
              </label>
              <select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value as LeadInterestType)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
              >
                <option value="GROUP_TOUR">Fixed Group Tour</option>
                <option value="UMRAH">Executive Umrah Package</option>
                <option value="VISA">Visa Advisory & Processing</option>
                <option value="CUSTOM_PACKAGE">Custom Tailored Itinerary</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Destination / Target Location *
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, destination: true }))}
                  required
                  placeholder="e.g. Europe, Turkey, Makkah & Madinah, UK"
                  className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                    formErrors.destination && touched.destination
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : "border-gray-200 dark:border-white/10 focus:border-[#1B7167]"
                  }`}
                />
              </div>
              {formErrors.destination && touched.destination && (
                <p className="mt-1 text-[11px] text-red-500">{formErrors.destination}</p>
              )}
            </div>
          </div>

          {/* Row 4: Passengers & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Number of Passengers (Pax) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPaxCount((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 font-bold hover:bg-gray-100 transition-colors"
                >
                  -
                </button>
                <div className="flex-1 relative">
                  <Users className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={paxCount}
                    onChange={(e) => setPaxCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-center font-bold text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPaxCount((p) => p + 1)}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 font-bold hover:bg-gray-100 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-gray-700 dark:text-gray-300 font-semibold">
                  Offer / Target Budget (PKR)
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-gray-500 hover:text-gray-700 dark:hover:text-gray-200">
                  <input
                    type="checkbox"
                    checked={isOpenBudget}
                    onChange={(e) => {
                      setIsOpenBudget(e.target.checked);
                      if (e.target.checked) setBudgetValue("");
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#1B7167] focus:ring-[#1B7167]"
                  />
                  <span className="text-[11px] font-medium">Open Budget</span>
                </label>
              </div>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={isOpenBudget}
                  value={isOpenBudget ? "Open Budget (Unspecified)" : budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 540000"
                  className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                    isOpenBudget ? "opacity-60 bg-gray-50 dark:bg-white/5 cursor-not-allowed" : ""
                  } ${
                    formErrors.budget && !isOpenBudget
                      ? "border-red-500 ring-1 ring-red-500/20"
                      : "border-gray-200 dark:border-white/10 focus:border-[#1B7167]"
                  }`}
                />
              </div>
              {!isOpenBudget && budgetValue && !isNaN(Number(budgetValue)) && (
                <p className="mt-1 text-[11px] text-teal-600 dark:text-teal-400 font-mono font-semibold">
                  PKR {Number(budgetValue).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Row 5: Callback & Assigned Representative (With Unassign Option!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Scheduled Callback / Follow-up *
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, followUpDate: true }))}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                Assigned Representative *
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] font-medium"
              >
                <option value="Unassigned" className="font-bold text-amber-600 dark:text-amber-400">
                  -- Unassigned (Return to Queue) --
                </option>
                {representativeList.map((rep) => (
                  <option key={rep.name} value={rep.name}>
                    {rep.name} ({rep.role})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-gray-400">
                Selecting &quot;Unassigned&quot; returns this inquiry directly back to the Unassigned Leads queue.
              </p>
            </div>
          </div>

          {/* Discussion Notes */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
              Discussion Notes &amp; Client Preferences
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record travel dates, room requirements, hotel star preferences, visa notes..."
              className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-5 py-2 rounded-xl bg-[#1B7167] hover:bg-[#155a52] disabled:opacity-50 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

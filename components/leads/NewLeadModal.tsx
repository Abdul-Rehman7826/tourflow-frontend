"use client";

import { useAgencySettings } from "@/context/ThemeContext";

import React, { useEffect, useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { apiClient } from "@/lib/api-client";
import { createLeadApi } from "@/lib/crm-api";
import { LeadInterestType, LeadSource } from "@/types/erp";
import {
  UserPlus,
  X,
  Phone,
  User,
  Mail,
  MapPin,
  Users,
  Calendar,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadName: string) => void;
}

interface FrontDeskAssignee { id: string; full_name: string; role: string; }

const COUNTRY_CODES = [
  { code: "+92", label: "🇵🇰 +92" },
  { code: "+971", label: "🇦🇪 +971" },
  { code: "+966", label: "🇸🇦 +966" },
  { code: "+44", label: "🇬🇧 +44" },
  { code: "+1", label: "🇺🇸 +1" },
  { code: "+974", label: "🇶🇦 +974" },
  { code: "+968", label: "🇴🇲 +968" },
  { code: "+60", label: "🇲🇾 +60" },
  { code: "+90", label: "🇹🇷 +90" },
];

export function NewLeadModal({ isOpen, onClose, onSuccess }: NewLeadModalProps) {
  const { addLead, clients } = useData();
  const { settings } = useAgencySettings();

  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [interestType, setInterestType] = useState<LeadInterestType>("GROUP_TOUR");
  const [destinationInterest, setDestinationInterest] = useState("");
  const [groupSize, setGroupSize] = useState<number>(2);
  const [budget, setBudget] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [assignedTo, setAssignedTo] = useState("");
  const [frontDeskReps, setFrontDeskReps] = useState<FrontDeskAssignee[]>([]);
  const [isLoadingReps, setIsLoadingReps] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const returningClient = useMemo(() => {
    if (!phone || phone.trim().length < 6) return null;
    const digits = phone.replace(/\D+/g, "");
    if (!clients || !Array.isArray(clients)) return null;
    return clients.find((c) => {
      const cDigits = (c.phone || "").replace(/\D+/g, "");
      return (cDigits.length >= 6 && (cDigits.endsWith(digits) || digits.endsWith(cDigits)));
    }) || null;
  }, [phone, clients]);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setIsLoadingReps(true);
    });
    apiClient.get<FrontDeskAssignee[]>("/hr/lead-assignees")
      .then((reps) => {
        if (!active) return;
        setFrontDeskReps(reps);
        setAssignedTo((current) => reps.some((rep) => rep.full_name === current) ? current : (reps[0]?.full_name || ""));
      })
      .catch(() => { if (active) { setFrontDeskReps([]); setAssignedTo(""); } })
      .finally(() => { if (active) setIsLoadingReps(false); });
    return () => { active = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;
    if (!assignedTo) { setError("Create an active Front Desk staff profile before assigning a lead."); return; }

    const formattedPhone = `${countryCode} ${phone.trim()}`;
    try {
      addLead({
        fullName: fullName.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        source,
        interestType,
        destinationInterest: destinationInterest.trim() || (interestType === "UMRAH" ? "Makkah & Madinah" : "Europe Grand Tour"),
        groupSize: Number(groupSize) || 1,
        budget: budget ? Number(budget) : undefined,
        notes: notes.trim() || `Inquiry intake via ${source}`,
        followUpDate: followUpDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        assignedTo,
        initialChannel: source === "WhatsApp" ? "WhatsApp" : source === "Walk-in" ? "Walk-in" : "Phone Call",
      });

      void createLeadApi({
        full_name: fullName.trim(),
        country_code: countryCode,
        phone: phone.trim(),
        email: email.trim() || undefined,
        source,
        service_type: interestType,
        package_interest: destinationInterest.trim() || undefined,
        pax_count: Number(groupSize) || 1,
        budget_target: budget ? Number(budget) : undefined,
        notes: notes.trim() || `Inquiry intake via ${source}`,
        scheduled_callback: followUpDate,
      }).catch(() => {});
    } catch (err) { setError((err as Error).message); return; }
    setError("");
    setIsSubmitted(true);
    if (onSuccess) onSuccess(fullName.trim());

    setTimeout(() => {
      setIsSubmitted(false);
      // Reset form
      setFullName("");
      setPhone("");
      setEmail("");
      setDestinationInterest("");
      setBudget("");
      setNotes("");
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {error && <p role="alert" className="p-4 text-sm text-red-600">{error}</p>}
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#080C14]/80 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                New Front Desk Lead Intake
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Register inquiries for <strong className="text-gray-800 dark:text-gray-200">{settings.name}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner Alert */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-3 bg-emerald-500/10 border-b border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lead Successfully Ingested!</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {fullName} has been added to the CRM pipeline and chronological call logs.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            
            {/* Traveler Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Traveler Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asad Ullah Khan"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    WhatsApp / Phone Number *
                  </label>
                  {returningClient && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50">
                      ★ Returning Client
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label="Country Code"
                    className="w-28 px-2 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono text-xs cursor-pointer"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="300 1234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                </div>
                {returningClient && (
                  <p className="mt-1 text-[11px] text-purple-600 dark:text-purple-400">
                    Matched: <strong>{returningClient.fullName}</strong> ({returningClient.phone})
                  </p>
                )}
              </div>
            </div>

            {/* Email & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    placeholder="client@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Lead Ingestion Source *
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Walk-in" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Walk-in (Branch Visit)</option>
                  <option value="WhatsApp" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">WhatsApp Inbound Ad</option>
                  <option value="Phone Call" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Phone Call / Inbound PBX</option>
                  <option value="Meta Ad" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Meta (Facebook/IG) Campaign</option>
                  <option value="Referral" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Client Referral</option>
                </select>
              </div>
            </div>

            {/* Travel Interest & Specific Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Travel Category Interest *
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as LeadInterestType)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="GROUP_TOUR" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Fixed Group Tour</option>
                  <option value="VISA" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Visa Advisory & Processing</option>
                  <option value="UMRAH" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Executive Umrah Package</option>
                  <option value="CUSTOM_PACKAGE" className="bg-white dark:bg-[#0B0F19] text-gray-900 dark:text-white">Custom Tailored Itinerary</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Destination / Package Target
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Europe, Turkey, Makkah, UK"
                    value={destinationInterest}
                    onChange={(e) => setDestinationInterest(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Group Size & Estimated Budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Number of Passengers (Pax)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={groupSize}
                    onChange={(e) => setGroupSize(Number(e.target.value))}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Budget
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FileText className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    type="number"
                    placeholder="e.g. 1200000"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Follow-up Date & Assigned Staff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled Callback / Follow-up *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Front Desk Rep
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  disabled={isLoadingReps || frontDeskReps.length === 0}
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500"
                >
                  {isLoadingReps && <option value="">Loading Front Desk staff...</option>}
                  {!isLoadingReps && frontDeskReps.length === 0 && <option value="">No active Front Desk staff available</option>}
                  {frontDeskReps.map((rep) => <option key={rep.id} value={rep.full_name}>{rep.full_name} (Front Desk)</option>)}
                </select>
              </div>
            </div>

            {/* Discussion Notes */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Initial Discussion Notes & Client Preferences
              </label>
              <textarea
                rows={3}
                placeholder="Details on travel dates, family room requirements, hotel star rating, visa status..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 placeholder-gray-400"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Tenant: <strong className="text-gray-700 dark:text-gray-300">{settings.name}</strong>
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Save Inbound Lead</span>
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

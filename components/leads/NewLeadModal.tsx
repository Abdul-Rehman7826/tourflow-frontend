"use client";

import { useAgencySettings } from "@/context/ThemeContext";
import React, { useEffect, useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/lib/api-client";
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
  AlertCircle,
  Plus,
  Minus,
} from "lucide-react";

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadName: string) => void;
}

interface FrontDeskAssignee {
  id: string;
  full_name: string;
  role: string;
}

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
  const { addLead, clients, employees } = useData();
  const { user } = useAuth();
  const { settings } = useAgencySettings();

  // Form State
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [interestType, setInterestType] = useState<LeadInterestType>("GROUP_TOUR");
  const [destinationInterest, setDestinationInterest] = useState("");
  const [groupSize, setGroupSize] = useState<string>("1"); // Strict 1 default
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [assignedTo, setAssignedTo] = useState("");
  const [frontDeskReps, setFrontDeskReps] = useState<FrontDeskAssignee[]>([]);
  const [isLoadingReps, setIsLoadingReps] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Validation State Tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Numerical passenger count
  const paxCount = useMemo(() => {
    const parsed = parseInt(groupSize, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : Math.min(100, parsed);
  }, [groupSize]);

  // Returning client detection
  const returningClient = useMemo(() => {
    if (!phone || phone.trim().length < 6) return null;
    const digits = phone.replace(/\D+/g, "");
    if (!clients || !Array.isArray(clients)) return null;
    return (
      clients.find((c) => {
        const cDigits = (c.phone || "").replace(/\D+/g, "");
        return cDigits.length >= 6 && (cDigits.endsWith(digits) || digits.endsWith(cDigits));
      }) || null
    );
  }, [phone, clients]);

  // Fetch front desk staff and default to logged in user
  useEffect(() => {
    if (!isOpen) {
      setIsSubmitted(false);
      setSubmitError("");
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (active) setIsLoadingReps(true);
    });
    apiClient
      .get<FrontDeskAssignee[]>("/hr/lead-assignees")
      .then((reps) => {
        if (!active) return;
        setFrontDeskReps(reps);

        // Auto-match currently logged in staff member
        const matchedSelf = reps.find((rep) => {
          if (!user) return false;
          const uName = (user.name || "").trim().toLowerCase();
          const uFullName = (user.full_name || "").trim().toLowerCase();
          const repName = rep.full_name.trim().toLowerCase();
          if (uName && repName === uName) return true;
          if (uFullName && repName === uFullName) return true;

          const emp = employees.find(
            (e) =>
              e.userId === user.id ||
              e.id === user.id ||
              (user.email && e.email?.toLowerCase() === user.email.toLowerCase()) ||
              (uName && e.fullName.toLowerCase() === uName) ||
              (uFullName && e.fullName.toLowerCase() === uFullName)
          );
          if (emp && emp.id === rep.id) return true;
          return false;
        });

        const defaultRep = matchedSelf?.full_name || reps[0]?.full_name || "";
        setAssignedTo(defaultRep);
      })
      .catch(() => {
        if (active) {
          setFrontDeskReps([]);
          setAssignedTo("");
        }
      })
      .finally(() => {
        if (active) setIsLoadingReps(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, user, employees]);

  // Reactive Form Validation: recalculates synchronously whenever inputs change
  const formErrors = useMemo(() => {
    const errs: Record<string, string> = {};

    // 1. Traveler Full Name
    if (!fullName.trim()) {
      errs.fullName = "Traveler full name is required";
    } else if (fullName.trim().length < 2) {
      errs.fullName = "Full name must be at least 2 characters";
    } else if (!/[a-zA-Z]/.test(fullName)) {
      errs.fullName = "Full name must contain alphabetical characters";
    }

    // 2. WhatsApp / Phone
    const digits = phone.replace(/\D/g, "");
    if (!digits) {
      errs.phone = "Phone / WhatsApp contact number is required";
    } else if (digits.length < 7) {
      errs.phone = "Valid contact number must have at least 7 digits";
    }

    // 3. Email (optional, but validated if present)
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address (e.g. name@example.com)";
    }

    // 4. Destination Interest
    if (!destinationInterest.trim()) {
      errs.destinationInterest = "Destination or target location is required";
    } else if (destinationInterest.trim().length < 2) {
      errs.destinationInterest = "Please enter at least 2 characters for destination";
    }

    // 5. Group Size (Pax)
    const parsedPax = parseInt(groupSize, 10);
    if (!groupSize || isNaN(parsedPax) || parsedPax < 1) {
      errs.groupSize = "Pax count must be at least 1";
    } else if (parsedPax > 100) {
      errs.groupSize = "Pax count cannot exceed 100";
    }

    // 6. Follow-up Callback Date
    if (!followUpDate || isNaN(Date.parse(followUpDate))) {
      errs.followUpDate = "Scheduled callback date is required";
    }

    // 7. Assigned Representative
    if (!assignedTo.trim()) {
      errs.assignedTo = "Please select an assigned Front Desk representative";
    }

    return errs;
  }, [fullName, phone, email, destinationInterest, groupSize, followUpDate, assignedTo]);

  // Field Blur Handler
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Group Size / Pax Stepper Handlers
  const handlePaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setGroupSize("");
      return;
    }
    const cleanDigits = raw.replace(/\D/g, "");
    if (!cleanDigits) {
      setGroupSize("");
      return;
    }
    const num = Math.min(100, Math.max(1, parseInt(cleanDigits, 10)));
    setGroupSize(String(num));
  };

  const handlePaxBlur = () => {
    setTouched((prev) => ({ ...prev, groupSize: true }));
    if (!groupSize || parseInt(groupSize, 10) < 1) {
      setGroupSize("1");
    }
  };

  const adjustPax = (delta: number) => {
    const current = parseInt(groupSize, 10) || 1;
    const next = Math.max(1, Math.min(100, current + delta));
    setGroupSize(String(next));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittedAttempt(true);

    if (Object.keys(formErrors).length > 0) {
      setSubmitError("Please resolve the highlighted required fields before saving.");
      return;
    }

    const formattedPhone = `${countryCode} ${phone.trim()}`;
    const finalPax = Math.max(1, parseInt(groupSize, 10) || 1);
    const parsedOffer = offerAmount && !isNaN(Number(offerAmount)) ? Number(offerAmount) : undefined;
    const selectedRep = frontDeskReps.find(
      (r) => r.full_name === assignedTo || r.id === assignedTo
    );

    try {
      addLead({
        fullName: fullName.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        source,
        interestType,
        destinationInterest: destinationInterest.trim(),
        groupSize: finalPax,
        budget: parsedOffer,
        notes: notes.trim() || `Inquiry intake via ${source}`,
        followUpDate: followUpDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        assignedTo: selectedRep?.full_name || assignedTo,
        assignedEmployeeId: selectedRep?.id,
        initialChannel: source === "WhatsApp" ? "WhatsApp" : source === "Walk-in" ? "Walk-in" : "Phone Call",
      });
    } catch (err) {
      setSubmitError((err as Error).message);
      return;
    }

    setSubmitError("");
    setIsSubmitted(true);
    if (onSuccess) onSuccess(fullName.trim());

    setTimeout(() => {
      setIsSubmitted(false);
      // Reset form
      setFullName("");
      setPhone("");
      setEmail("");
      setDestinationInterest("");
      setGroupSize("1");
      setOfferAmount("");
      setNotes("");
      setTouched({});
      setIsSubmittedAttempt(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">

        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-[#080C14]/80 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1B7167]/10 border border-[#1B7167]/20 text-[#1B7167] dark:text-[#2DD4BF] flex items-center justify-center">
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

        {/* Global Error Banner */}
        {submitError && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Success Banner Alert */}
        {isSubmitted ? (
          <div className="p-8 text-center space-y-3 bg-emerald-500/10 border-b border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-[#1B7167] dark:text-[#2DD4BF] mx-auto animate-bounce" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Lead Successfully Ingested!</h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {fullName} (1 Lead • {paxCount} Pax) has been registered into the CRM pipeline.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 text-xs">

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
                    onBlur={() => handleBlur("fullName")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      formErrors.fullName && (touched.fullName || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {formErrors.fullName && (touched.fullName || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.fullName}</span>
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    WhatsApp / Phone Number *
                  </label>
                  {returningClient && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#1B7167] dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      ★ Returning Client
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    aria-label="Country Code"
                    className="w-28 px-2 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] font-mono text-xs cursor-pointer"
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
                      onBlur={() => handleBlur("phone")}
                      className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none font-mono transition-colors ${
                        formErrors.phone && (touched.phone || isSubmittedAttempt)
                          ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                          : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                      }`}
                    />
                  </div>
                </div>
                {formErrors.phone && (touched.phone || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.phone}</span>
                  </p>
                )}
                {returningClient && (
                  <p className="mt-1 text-[11px] text-[#1B7167] dark:text-[#2DD4BF]">
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
                    onBlur={() => handleBlur("email")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      formErrors.email && (touched.email || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {formErrors.email && (touched.email || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.email}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Lead Ingestion Source *
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as LeadSource)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] cursor-pointer"
                >
                  <option value="Walk-in">Walk-in (Branch Visit)</option>
                  <option value="WhatsApp">WhatsApp Inbound Ad</option>
                  <option value="Phone Call">Phone Call / Inbound PBX</option>
                  <option value="Meta Ad">Meta (Facebook/IG) Campaign</option>
                  <option value="Referral">Client Referral</option>
                </select>
              </div>
            </div>

            {/* Travel Category Interest & Destination Description Field */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Travel Category Interest *
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as LeadInterestType)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] cursor-pointer"
                >
                  <option value="GROUP_TOUR">Fixed Group Tour</option>
                  <option value="UMRAH">Executive Umrah Package</option>
                  <option value="VISA">Visa Advisory & Processing</option>
                  <option value="CUSTOM_PACKAGE">Custom Tailored Itinerary</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Destination / Target Location *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <MapPin className="w-4 h-4 text-[#1B7167] dark:text-[#2DD4BF]" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Europe, Turkey, Makkah & Madinah, UK"
                    value={destinationInterest}
                    onChange={(e) => setDestinationInterest(e.target.value)}
                    onBlur={() => handleBlur("destinationInterest")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      formErrors.destinationInterest && (touched.destinationInterest || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {formErrors.destinationInterest && (touched.destinationInterest || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.destinationInterest}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Group Size (Pax) & Offer Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Number of Passengers (Pax) *
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => adjustPax(-1)}
                    disabled={paxCount <= 1}
                    className="px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-l-lg border border-r-0 border-gray-200 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold cursor-pointer"
                    title="Decrease Pax"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Users className="w-4 h-4 text-[#1B7167] dark:text-[#2DD4BF]" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={groupSize}
                      onChange={handlePaxChange}
                      onBlur={handlePaxBlur}
                      placeholder="1"
                      className={`w-full pl-9 pr-3 py-2 text-center font-mono font-bold bg-white dark:bg-[#030712] border-y text-gray-900 dark:text-white focus:outline-none transition-colors ${
                        formErrors.groupSize && (touched.groupSize || isSubmittedAttempt)
                          ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                          : "border-gray-200 dark:border-white/10 focus:border-[#1B7167]"
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustPax(1)}
                    disabled={paxCount >= 100}
                    className="px-3 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 rounded-r-lg border border-l-0 border-gray-200 dark:border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold cursor-pointer"
                    title="Increase Pax"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {formErrors.groupSize && (touched.groupSize || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.groupSize}</span>
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Default 1 passenger pax per inquiry. Stepper buttons or typing allowed.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Offer (PKR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FileText className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    type="number"
                    placeholder="e.g. 850000"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] font-mono"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  What we offer them for this category and passenger count.
                </p>
              </div>
            </div>

            {/* Follow-up Date & Assigned Staff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled Callback / Follow-up *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#1B7167] dark:text-[#2DD4BF]">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    onBlur={() => handleBlur("followUpDate")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none font-mono transition-colors ${
                      formErrors.followUpDate && (touched.followUpDate || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {formErrors.followUpDate && (touched.followUpDate || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.followUpDate}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Front Desk Rep *
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  onBlur={() => handleBlur("assignedTo")}
                  disabled={isLoadingReps || frontDeskReps.length === 0}
                  required
                  className={`w-full px-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors cursor-pointer ${
                    formErrors.assignedTo && (touched.assignedTo || isSubmittedAttempt)
                      ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                      : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                  }`}
                >
                  {isLoadingReps && <option value="">Loading Front Desk staff...</option>}
                  {!isLoadingReps && frontDeskReps.length === 0 && (
                    <option value="">No active Front Desk staff available</option>
                  )}
                  {frontDeskReps.map((rep) => (
                    <option key={rep.id} value={rep.full_name}>
                      {rep.full_name} ({rep.role || "Front Desk"})
                    </option>
                  ))}
                </select>
                {formErrors.assignedTo && (touched.assignedTo || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.assignedTo}</span>
                  </p>
                )}
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
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] placeholder-gray-400"
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
                  className="px-5 py-2 rounded-lg bg-[#1B7167] hover:bg-[#155b53] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
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

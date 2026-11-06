"use client";

import React, { useState, useMemo } from "react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
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
  Lock,
  BadgeCheck,
} from "lucide-react";

interface NewLeadIntakeProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (leadName: string) => void;
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

export function NewLeadIntake({ isOpen, onClose, onSuccess }: NewLeadIntakeProps) {
  const { addLead, clients, employees } = useData();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { settings } = useAgencySettings();

  // Form State
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [interestType, setInterestType] = useState<LeadInterestType>("GROUP_TOUR");
  const [destinationInterest, setDestinationInterest] = useState("");
  const [groupSize, setGroupSize] = useState<string>("1");
  const [offerAmount, setOfferAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState(
    () => new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Validation State Tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Authenticated Front Desk Representative Identification
  const staffDisplayName = useMemo(() => {
    return user?.full_name || user?.name || "Front Desk Representative";
  }, [user]);

  const currentEmployee = useMemo(() => {
    if (!user) return null;
    const uName = (user.name || "").trim().toLowerCase();
    const uFullName = (user.full_name || "").trim().toLowerCase();
    return (
      employees.find(
        (e) =>
          e.userId === user.id ||
          e.id === user.id ||
          (user.email && e.email?.toLowerCase() === user.email.toLowerCase()) ||
          (uName && e.fullName.toLowerCase() === uName) ||
          (uFullName && e.fullName.toLowerCase() === uFullName)
      ) || null
    );
  }, [user, employees]);

  const staffInitials = useMemo(() => {
    const parts = staffDisplayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "FD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [staffDisplayName]);

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

  // Reactive Form Validation
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

    return errs;
  }, [fullName, phone, email, destinationInterest, groupSize, followUpDate]);

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
    const finalAssignedName = currentEmployee?.fullName || staffDisplayName;
    const finalAssignedId = currentEmployee?.id || user?.id;

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
        notes: notes.trim() || `Inquiry intake via ${source} (handled by ${finalAssignedName})`,
        followUpDate: followUpDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
        assignedTo: finalAssignedName,
        assignedEmployeeId: finalAssignedId,
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
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-[#1B7167] dark:text-teal-400 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                New Front Desk Lead Intake
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Register inquiries for {tenant?.name || settings.name || "World Class Holidays"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Banner */}
        {isSubmitted ? (
          <div className="p-10 text-center space-y-3 animate-in fade-in duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Inquiry Registered Successfully!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Lead for <strong className="text-gray-900 dark:text-white">{fullName}</strong> has been saved and routed directly to your Active Sales queue.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs" noValidate>
            {/* Server / Validation General Error */}
            {submitError && (
              <div
                role="alert"
                className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in duration-150"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Returning Client Alert */}
            {returningClient && (
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-[#1B7167] dark:text-teal-400 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Returning Client Recognized:{" "}
                  <strong>{returningClient.fullName}</strong> ({returningClient.phone})
                </span>
              </div>
            )}

            {/* Full Name & Phone Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Traveler Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onBlur={() => handleBlur("fullName")}
                    placeholder="e.g. Asad Ullah Khan"
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors ${
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
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  WhatsApp / Phone Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-28 px-2 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] transition-colors cursor-pointer shrink-0 font-mono text-[11px]"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      onBlur={() => handleBlur("phone")}
                      placeholder="300 1234567"
                      className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors font-mono ${
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
              </div>
            </div>

            {/* Email & Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    placeholder="client@gmail.com"
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors ${
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
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] transition-colors cursor-pointer"
                >
                  <option value="Walk-in">Walk-in (Branch Visit)</option>
                  <option value="WhatsApp">WhatsApp Inquiry</option>
                  <option value="Phone">Incoming Phone Call</option>
                  <option value="Meta Ads">Meta / Social Ad</option>
                  <option value="Referral">Referral / Word of Mouth</option>
                </select>
              </div>
            </div>

            {/* Interest & Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Travel Category Interest *
                </label>
                <select
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as LeadInterestType)}
                  className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] transition-colors cursor-pointer"
                >
                  <option value="GROUP_TOUR">Fixed Group Tour</option>
                  <option value="CUSTOM_PACKAGE">Custom Package</option>
                  <option value="UMRAH">Umrah Package</option>
                  <option value="VISA">Visa Consultation</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Destination / Target Location *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={destinationInterest}
                    onChange={(e) => setDestinationInterest(e.target.value)}
                    onBlur={() => handleBlur("destinationInterest")}
                    placeholder="e.g. Europe, Turkey, Makkah & Madinah"
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none transition-colors ${
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

            {/* Passenger Count Stepper & Offer Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Number of Passengers (Pax) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustPax(-1)}
                    disabled={paxCount <= 1}
                    className="w-10 h-9 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                    aria-label="Decrease passenger count"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="relative flex-1">
                    <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={groupSize}
                      onChange={handlePaxChange}
                      onBlur={handlePaxBlur}
                      aria-label="Number of passengers"
                      className={`w-full pl-9 pr-3 py-2 text-center bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white font-mono font-semibold focus:outline-none transition-colors ${
                        formErrors.groupSize && (touched.groupSize || isSubmittedAttempt)
                          ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                          : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustPax(1)}
                    disabled={paxCount >= 100}
                    className="w-10 h-9 rounded-lg border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                    aria-label="Increase passenger count"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Default 1 passenger pax per inquiry. Stepper buttons or typing allowed.
                </p>
                {formErrors.groupSize && (touched.groupSize || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{formErrors.groupSize}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Offer (PKR)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="e.g. 850000"
                    min="0"
                    step="500"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 font-mono focus:outline-none focus:border-[#1B7167] transition-colors"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  What we offer them for this category and passenger count.
                </p>
              </div>
            </div>

            {/* Follow-up Date & Locked Assigned Front Desk Rep */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled Callback / Follow-up *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    onBlur={() => handleBlur("followUpDate")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
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

              {/* Locked Assigned Front Desk Representative Card */}
              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Front Desk Rep *
                </label>
                <div className="p-2.5 rounded-xl border border-teal-200 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-950/20 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1B7167] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {staffInitials}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
                        <span className="truncate">{staffDisplayName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-100 dark:bg-teal-900/50 text-[#1B7167] dark:text-teal-300 font-semibold shrink-0">
                          Front Desk
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        Assigned to You (Personal Queue)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md shrink-0 ml-2">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Locked</span>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Inquiries registered from your workstation are automatically routed to your Active Sales queue.
                </p>
              </div>
            </div>

            {/* Discussion Notes */}
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Initial Discussion Notes & Client Preferences
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details on travel dates, family room requirements, hotel star rating, visa status..."
                rows={3}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#1B7167] transition-colors resize-none"
              />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-gray-400 font-mono">
                Tenant: <strong>{tenant?.name || settings.name || "World Class Holidays"}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-200 dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] px-4 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  <UserPlus className="w-3.5 h-3.5 text-white" />
                  <span className="text-white">Save Inbound Lead</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

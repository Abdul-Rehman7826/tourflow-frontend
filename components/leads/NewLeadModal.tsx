"use client";

import { useAgencySettings } from "@/context/ThemeContext";
import React, { useEffect, useState, useMemo, useCallback } from "react";
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
  AlertCircle,
  Sparkles,
  Plus,
  Minus,
  Tag,
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

export interface AgencyOffer {
  id: string;
  title: string;
  category: LeadInterestType;
  pricePerPax: number;
  duration?: string;
  badge?: string;
  highlights: string;
}

export const STATIC_AGENCY_OFFERS: Record<LeadInterestType, AgencyOffer[]> = {
  GROUP_TOUR: [
    {
      id: "off-eur-15",
      title: "Europe 5-Country Grand Tour (15 Days)",
      category: "GROUP_TOUR",
      pricePerPax: 850000,
      duration: "15 Days",
      badge: "Flagship Group Tour",
      highlights: "France, Switzerland, Italy, Austria, Germany with return flights & 4-star stays",
    },
    {
      id: "off-turk-9",
      title: "Autumn Turkey Highlights (9 Days)",
      category: "GROUP_TOUR",
      pricePerPax: 420000,
      duration: "9 Days",
      badge: "Popular Autumn Departure",
      highlights: "Istanbul, Bosphorus Cruise, Cappadocia Hot Air Balloon & cave hotels",
    },
    {
      id: "off-nordic-11",
      title: "Nordic Aurora & Fjords Expedition (11 Days)",
      category: "GROUP_TOUR",
      pricePerPax: 980000,
      duration: "11 Days",
      badge: "Winter Special",
      highlights: "Norway, Tromso Northern Lights, Fjord cruise & husky sledding",
    },
    {
      id: "off-silicon-12",
      title: "Executive Silicon Valley & West Coast Tour (12 Days)",
      category: "GROUP_TOUR",
      pricePerPax: 1250000,
      duration: "12 Days",
      badge: "Executive Tech Tour",
      highlights: "San Francisco, Silicon Valley tech headquarters, Los Angeles & Las Vegas",
    },
  ],
  UMRAH: [
    {
      id: "off-umrah-prem",
      title: "Premium 5-Star Umrah Package (14 Days)",
      category: "UMRAH",
      pricePerPax: 460000,
      duration: "14 Days",
      badge: "5-Star Haram Front",
      highlights: "Makkah Pullman Zamzam & Madinah Anwar Al Madinah, direct Saudia flights, VIP private transfers",
    },
    {
      id: "off-umrah-vip",
      title: "Executive VIP Umrah (Clock Tower & Oberoi) (10 Days)",
      category: "UMRAH",
      pricePerPax: 650000,
      duration: "10 Days",
      badge: "VIP Luxury",
      highlights: "Makkah Clock Tower Fairmont & Oberoi Madinah, Haramain High-Speed Train, GMC Yukon private chauffeur",
    },
    {
      id: "off-umrah-econ",
      title: "Economy Family Umrah Group (15 Days)",
      category: "UMRAH",
      pricePerPax: 320000,
      duration: "15 Days",
      badge: "Value Group",
      highlights: "3-Star hotel 450m from Haram, complete visa, insurance, and guided Ziyarat of Makkah & Madinah",
    },
  ],
  VISA: [
    {
      id: "off-visa-uk",
      title: "UK Standard Visitor Visa (Advisory & Slot Prep)",
      category: "VISA",
      pricePerPax: 95000,
      badge: "High Approval Rate",
      highlights: "Comprehensive financial vetting, cover letter drafting, document audit & biometric slot booking",
    },
    {
      id: "off-visa-schengen",
      title: "Schengen Tourist Visa (France / Italy / Spain)",
      category: "VISA",
      pricePerPax: 85000,
      badge: "Schengen Specialist",
      highlights: "Travel itinerary creation, confirmed flight/hotel bookings, insurance & VFS appointment guidance",
    },
    {
      id: "off-visa-usa",
      title: "USA B1/B2 Tourist Visa (File & Mock Interview)",
      category: "VISA",
      pricePerPax: 110000,
      badge: "Interview Prep",
      highlights: "DS-160 filing, expedite slot guidance, mock interview preparation with senior consultant",
    },
    {
      id: "off-visa-canada",
      title: "Canada Visitor Visa (Express Online Filing)",
      category: "VISA",
      pricePerPax: 90000,
      badge: "Portal Submission",
      highlights: "GCKey portal profile, statement of purpose drafting, financial proof organization",
    },
    {
      id: "off-visa-uae",
      title: "UAE 30-Day Express Tourist Visa & Medical",
      category: "VISA",
      pricePerPax: 38000,
      badge: "24-48hr Issuance",
      highlights: "Guaranteed entry permit issuance with mandatory Covid-compliant medical travel insurance",
    },
  ],
  CUSTOM_PACKAGE: [
    {
      id: "off-cust-europe",
      title: "Bespoke Europe Honeymoon (Switzerland & Italy - 10 Days)",
      category: "CUSTOM_PACKAGE",
      pricePerPax: 1150000,
      duration: "10 Days",
      badge: "Curated Luxury",
      highlights: "Private transfers, 5-star boutique hotels, Lake Como private boat & Swiss scenic rail",
    },
    {
      id: "off-cust-maldives",
      title: "Maldives Luxury Overwater Villa Resort (5 Nights)",
      category: "CUSTOM_PACKAGE",
      pricePerPax: 850000,
      duration: "6 Days",
      badge: "All-Inclusive Resort",
      highlights: "Speedboat / Seaplane transfers, full board dining, sunset dolphin cruise & snorkeling",
    },
    {
      id: "off-cust-dubai",
      title: "Dubai & Abu Dhabi Private Family Tour (7 Days)",
      category: "CUSTOM_PACKAGE",
      pricePerPax: 420000,
      duration: "7 Days",
      badge: "Family Favorite",
      highlights: "Desert safari VIP majlis, Burj Khalifa 124th floor, Ferrari World & yacht cruise",
    },
    {
      id: "off-cust-baku",
      title: "Baku & Georgia Twin City Explorer (8 Days)",
      category: "CUSTOM_PACKAGE",
      pricePerPax: 350000,
      duration: "8 Days",
      badge: "Cultural Explorer",
      highlights: "Old Baku city walking tour, Gabala cable car, Tbilisi cable car & Kazbegi mountains",
    },
  ],
};

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
  const { addLead, clients, tours } = useData();
  const { settings } = useAgencySettings();

  // Form State
  const [fullName, setFullName] = useState("");
  const [countryCode, setCountryCode] = useState("+92");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("Walk-in");
  const [interestType, setInterestType] = useState<LeadInterestType>("GROUP_TOUR");
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [destinationInterest, setDestinationInterest] = useState("");
  const [groupSize, setGroupSize] = useState<string>("1"); // Strict 1 default
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

  // Validation Tracking
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmittedAttempt, setIsSubmittedAttempt] = useState(false);

  // Available agency offers based on category + live ERP tours
  const categoryOffers = useMemo<AgencyOffer[]>(() => {
    const staticList = STATIC_AGENCY_OFFERS[interestType] || [];
    if (interestType === "GROUP_TOUR" && tours && tours.length > 0) {
      const liveTours: AgencyOffer[] = tours
        .filter((t) => t.status === "OPEN" || t.status === "FILLING_FAST" || t.status === "GUARANTEED" || t.status === "PLANNING" || !t.status)
        .map((t) => ({
          id: t.id,
          title: t.title,
          category: "GROUP_TOUR" as LeadInterestType,
          pricePerPax: t.pricePerPerson || 0,
          duration: t.durationDays ? `${t.durationDays} Days` : undefined,
          badge: t.status === "FILLING_FAST" ? "Filling Fast" : "Active Group Departure",
          highlights: t.inclusions?.[0] || (Array.isArray(t.destinations) ? t.destinations.join(" • ") : "Group Tour"),
        }));
      const liveTitles = new Set(liveTours.map((lt) => lt.title.toLowerCase()));
      const remainingStatic = staticList.filter((s) => !liveTitles.has(s.title.toLowerCase()));
      return [...liveTours, ...remainingStatic];
    }
    return staticList;
  }, [interestType, tours]);

  // When category changes, pre-select first offer if available
  useEffect(() => {
    if (categoryOffers.length > 0) {
      const defaultOffer = categoryOffers[0];
      setSelectedOfferId(defaultOffer.id);
      setDestinationInterest(defaultOffer.title);
      // Auto prefill budget if empty
      const parsedPax = Math.max(1, parseInt(groupSize, 10) || 1);
      if (!budget || budget === "0") {
        setBudget(String(defaultOffer.pricePerPax * parsedPax));
      }
    } else {
      setSelectedOfferId("custom");
      setDestinationInterest("");
    }
  }, [interestType, categoryOffers]);

  // Active Offer resolution
  const activeOffer = useMemo(() => {
    if (!selectedOfferId || selectedOfferId === "custom") {
      return categoryOffers.find((o) => o.title.toLowerCase() === destinationInterest.trim().toLowerCase()) || null;
    }
    return categoryOffers.find((o) => o.id === selectedOfferId) || null;
  }, [selectedOfferId, destinationInterest, categoryOffers]);

  // Numerical passenger count
  const paxCount = useMemo(() => {
    const parsed = parseInt(groupSize, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : Math.min(100, parsed);
  }, [groupSize]);

  // Offer calculation
  const calculatedOfferTotal = useMemo(() => {
    if (!activeOffer || !activeOffer.pricePerPax) return null;
    return activeOffer.pricePerPax * paxCount;
  }, [activeOffer, paxCount]);

  // Returning client detection
  const returningClient = useMemo(() => {
    if (!phone || phone.trim().length < 6) return null;
    const digits = phone.replace(/\D+/g, "");
    if (!clients || !Array.isArray(clients)) return null;
    return clients.find((c) => {
      const cDigits = (c.phone || "").replace(/\D+/g, "");
      return cDigits.length >= 6 && (cDigits.endsWith(digits) || digits.endsWith(cDigits));
    }) || null;
  }, [phone, clients]);

  // Fetch front desk staff
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setIsLoadingReps(true);
    });
    apiClient
      .get<FrontDeskAssignee[]>("/hr/lead-assignees")
      .then((reps) => {
        if (!active) return;
        setFrontDeskReps(reps);
        setAssignedTo((current) =>
          reps.some((rep) => rep.full_name === current) ? current : reps[0]?.full_name || ""
        );
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
  }, [isOpen]);

  // Field validation rules
  const validateField = useCallback((field: string, val?: string): string => {
    switch (field) {
      case "fullName": {
        const v = val !== undefined ? val : fullName;
        if (!v.trim()) return "Traveler full name is required";
        if (v.trim().length < 2) return "Full name must be at least 2 characters";
        if (!/[a-zA-Z]/.test(v)) return "Full name must contain alphabetical characters";
        return "";
      }
      case "phone": {
        const v = val !== undefined ? val : phone;
        const digits = v.replace(/\D/g, "");
        if (!digits) return "Phone / WhatsApp contact number is required";
        if (digits.length < 7) return "Valid contact number must have at least 7 digits";
        return "";
      }
      case "email": {
        const v = val !== undefined ? val : email;
        if (v.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) {
          return "Please enter a valid email address (e.g. name@example.com)";
        }
        return "";
      }
      case "destinationInterest": {
        const v = val !== undefined ? val : destinationInterest;
        if (!v.trim()) return "Destination or package offer is required";
        if (v.trim().length < 2) return "Please specify a destination or package";
        return "";
      }
      case "groupSize": {
        const v = val !== undefined ? val : groupSize;
        const parsed = parseInt(v, 10);
        if (!v || isNaN(parsed) || parsed < 1) return "Pax count must be at least 1";
        if (parsed > 100) return "Pax count cannot exceed 100";
        return "";
      }
      case "followUpDate": {
        const v = val !== undefined ? val : followUpDate;
        if (!v || isNaN(Date.parse(v))) return "Scheduled callback date is required";
        return "";
      }
      case "assignedTo": {
        const v = val !== undefined ? val : assignedTo;
        if (!v.trim()) return "Please select an assigned Front Desk representative";
        return "";
      }
      default:
        return "";
    }
  }, [fullName, phone, email, destinationInterest, groupSize, followUpDate, assignedTo]);

  // Re-run validation on change for touched fields
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field);
    setErrors((prev) => ({ ...prev, [field]: err }));
  };

  const handleChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (touched[field] || isSubmittedAttempt) {
      const err = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: err }));
    }
  };

  // Group Size / Pax Stepper Handlers
  const handlePaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setGroupSize("");
      if (touched.groupSize || isSubmittedAttempt) {
        setErrors((prev) => ({ ...prev, groupSize: "Pax count must be at least 1" }));
      }
      return;
    }
    const cleanDigits = raw.replace(/\D/g, "");
    if (!cleanDigits) {
      setGroupSize("");
      return;
    }
    const num = Math.min(100, Math.max(1, parseInt(cleanDigits, 10)));
    setGroupSize(String(num));
    if (touched.groupSize || isSubmittedAttempt) {
      setErrors((prev) => ({ ...prev, groupSize: "" }));
    }
  };

  const handlePaxBlur = () => {
    setTouched((prev) => ({ ...prev, groupSize: true }));
    if (!groupSize || parseInt(groupSize, 10) < 1) {
      setGroupSize("1");
      setErrors((prev) => ({ ...prev, groupSize: "" }));
    }
  };

  const adjustPax = (delta: number) => {
    const current = parseInt(groupSize, 10) || 1;
    const next = Math.max(1, Math.min(100, current + delta));
    setGroupSize(String(next));
    if (touched.groupSize || isSubmittedAttempt) {
      setErrors((prev) => ({ ...prev, groupSize: "" }));
    }
  };

  // Offer Selection Handler
  const handleOfferSelect = (offerId: string) => {
    setSelectedOfferId(offerId);
    if (offerId === "custom") {
      setDestinationInterest("");
      return;
    }
    const found = categoryOffers.find((o) => o.id === offerId);
    if (found) {
      setDestinationInterest(found.title);
      // Auto-update target budget if empty or matches previous calculated total
      const total = found.pricePerPax * paxCount;
      if (!budget || budget === "0" || budget === String(calculatedOfferTotal)) {
        setBudget(String(total));
      }
      if (touched.destinationInterest || isSubmittedAttempt) {
        setErrors((prev) => ({ ...prev, destinationInterest: "" }));
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittedAttempt(true);

    // Validate all fields
    const allErrors: Record<string, string> = {
      fullName: validateField("fullName"),
      phone: validateField("phone"),
      email: validateField("email"),
      destinationInterest: validateField("destinationInterest"),
      groupSize: validateField("groupSize"),
      followUpDate: validateField("followUpDate"),
      assignedTo: validateField("assignedTo"),
    };

    // Filter empty
    const activeErrors: Record<string, string> = {};
    Object.entries(allErrors).forEach(([key, val]) => {
      if (val) activeErrors[key] = val;
    });

    setErrors(activeErrors);

    if (Object.keys(activeErrors).length > 0) {
      setError("Please complete all required fields correctly before saving.");
      return;
    }

    const formattedPhone = `${countryCode} ${phone.trim()}`;
    const finalPax = Math.max(1, parseInt(groupSize, 10) || 1);
    const finalBudget = budget && !isNaN(Number(budget)) ? Number(budget) : undefined;

    try {
      addLead({
        fullName: fullName.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        source,
        interestType,
        destinationInterest: destinationInterest.trim(),
        groupSize: finalPax,
        budget: finalBudget,
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
        pax_count: finalPax,
        budget_target: finalBudget,
        notes: notes.trim() || `Inquiry intake via ${source}`,
        scheduled_callback: followUpDate,
      }).catch(() => {});
    } catch (err) {
      setError((err as Error).message);
      return;
    }

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
      setGroupSize("1");
      setBudget("");
      setNotes("");
      setTouched({});
      setErrors({});
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
        {error && (
          <div role="alert" className="mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
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
                    onChange={(e) => handleChange("fullName", e.target.value, setFullName)}
                    onBlur={() => handleBlur("fullName")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      errors.fullName && (touched.fullName || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {errors.fullName && (touched.fullName || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.fullName}</span>
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
                      onChange={(e) => handleChange("phone", e.target.value, setPhone)}
                      onBlur={() => handleBlur("phone")}
                      className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none font-mono transition-colors ${
                        errors.phone && (touched.phone || isSubmittedAttempt)
                          ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                          : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                      }`}
                    />
                  </div>
                </div>
                {errors.phone && (touched.phone || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.phone}</span>
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
                    onChange={(e) => handleChange("email", e.target.value, setEmail)}
                    onBlur={() => handleBlur("email")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      errors.email && (touched.email || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {errors.email && (touched.email || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.email}</span>
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

            {/* Travel Category Interest & Agency Offer Selection */}
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300">
                    Target Package / Destination *
                  </label>
                  <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-[#1B7167]" /> Active Offers Available
                  </span>
                </div>

                {/* Offer Picker Dropdown */}
                <select
                  value={selectedOfferId}
                  onChange={(e) => handleOfferSelect(e.target.value)}
                  className="w-full mb-1.5 px-3 py-2 bg-gray-50 dark:bg-[#080C14] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] text-xs cursor-pointer font-medium"
                >
                  {categoryOffers.map((offer) => (
                    <option key={offer.id} value={offer.id}>
                      {offer.title} — PKR {offer.pricePerPax.toLocaleString()} / pax
                    </option>
                  ))}
                  <option value="custom">✏️ Other / Custom Destination Target...</option>
                </select>

                {/* Direct destination text field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <MapPin className="w-4 h-4 text-[#1B7167] dark:text-[#2DD4BF]" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Europe 5-Country, Turkey, Makkah & Madinah"
                    value={destinationInterest}
                    onChange={(e) => {
                      handleChange("destinationInterest", e.target.value, setDestinationInterest);
                      // Check if matches an offer
                      const matching = categoryOffers.find(
                        (o) => o.title.toLowerCase() === e.target.value.trim().toLowerCase()
                      );
                      setSelectedOfferId(matching ? matching.id : "custom");
                    }}
                    onBlur={() => handleBlur("destinationInterest")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors ${
                      errors.destinationInterest && (touched.destinationInterest || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {errors.destinationInterest && (touched.destinationInterest || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.destinationInterest}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Group Size & Estimated Budget Row */}
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
                        errors.groupSize && (touched.groupSize || isSubmittedAttempt)
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
                {errors.groupSize && (touched.groupSize || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.groupSize}</span>
                  </p>
                )}
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Default 1 passenger pax per inquiry. Stepper buttons or typing allowed.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Budget (PKR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <FileText className="w-4 h-4 text-amber-500" />
                  </div>
                  <input
                    type="number"
                    placeholder={calculatedOfferTotal ? `e.g. ${calculatedOfferTotal}` : "e.g. 850000"}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] font-mono"
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                  Client&apos;s expected target or synced agency offer total.
                </p>
              </div>
            </div>

            {/* Active Agency Offer Pitch Card */}
            {activeOffer && (
              <div className="p-3.5 rounded-lg border border-[#1B7167]/30 bg-[#1B7167]/5 dark:bg-[#1B7167]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1B7167] text-white">
                      <Sparkles className="w-3 h-3" /> Agency Offer
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-xs">
                      {activeOffer.title}
                    </span>
                    {activeOffer.badge && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium">
                        {activeOffer.badge}
                      </span>
                    )}
                  </div>

                  {/* Real-time offer pricing based on Pax */}
                  <div className="text-[11px] text-gray-700 dark:text-gray-200">
                    Rate: <strong className="font-mono text-gray-900 dark:text-white">PKR {activeOffer.pricePerPax.toLocaleString()}</strong> / pax
                    {" × "}
                    <strong className="text-gray-900 dark:text-white">{paxCount} {paxCount === 1 ? "Pax" : "Pax"}</strong>
                    {" = "}
                    <span className="text-[#1B7167] dark:text-[#2DD4BF] font-mono font-bold text-xs">
                      Total Offer: PKR {(activeOffer.pricePerPax * paxCount).toLocaleString()}
                    </span>
                  </div>

                  {activeOffer.highlights && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                      Inclusions: {activeOffer.highlights}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setBudget(String(activeOffer.pricePerPax * paxCount))}
                  className="self-start sm:self-center px-2.5 py-1.5 text-[11px] font-medium text-[#1B7167] dark:text-[#2DD4BF] bg-white dark:bg-slate-900 border border-[#1B7167]/30 rounded-lg hover:bg-[#1B7167]/10 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                >
                  Set as Budget (PKR {(activeOffer.pricePerPax * paxCount).toLocaleString()})
                </button>
              </div>
            )}

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
                    onChange={(e) => handleChange("followUpDate", e.target.value, setFollowUpDate)}
                    onBlur={() => handleBlur("followUpDate")}
                    className={`w-full pl-9 pr-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none font-mono transition-colors ${
                      errors.followUpDate && (touched.followUpDate || isSubmittedAttempt)
                        ? "border-red-500 ring-1 ring-red-500/20 bg-red-50/10"
                        : "border-gray-200 dark:border-white/10 focus:border-[#1B7167] focus:ring-1 focus:ring-[#1B7167]"
                    }`}
                  />
                </div>
                {errors.followUpDate && (touched.followUpDate || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.followUpDate}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Assigned Front Desk Rep *
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => handleChange("assignedTo", e.target.value, setAssignedTo)}
                  onBlur={() => handleBlur("assignedTo")}
                  disabled={isLoadingReps || frontDeskReps.length === 0}
                  required
                  className={`w-full px-3 py-2 bg-white dark:bg-[#030712] border rounded-lg text-gray-900 dark:text-white focus:outline-none transition-colors cursor-pointer ${
                    errors.assignedTo && (touched.assignedTo || isSubmittedAttempt)
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
                {errors.assignedTo && (touched.assignedTo || isSubmittedAttempt) && (
                  <p role="alert" className="mt-1 flex items-center gap-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{errors.assignedTo}</span>
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

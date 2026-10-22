"use client";

import React, { useState, useMemo, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { ClientPickerSection } from "./ClientPickerSection";
import { ServiceSelector } from "./ServiceSelector";
import { MilestonePreview } from "./MilestonePreview";
import { localDay, type Conversion } from "@/lib/lead-operations";
import { rebookClient } from "@/lib/bookings-api";
import type { PaymentMethod, ServiceType } from "@/types/erp";
import {
  X,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  LoaderCircle,
  UserCheck,
} from "lucide-react";

interface GlobalBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedClientId?: string;
}

const subscribeToHydration = () => () => {};

export function GlobalBookingModal({
  isOpen,
  onClose,
  preselectedClientId,
}: GlobalBookingModalProps) {
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      {toast && (
        <div
          role="status"
          className="fixed right-6 top-20 z-[10000] rounded-xl border border-emerald-500 bg-white p-4 text-sm text-emerald-700 shadow-2xl dark:bg-[#030712] dark:text-emerald-400 animate-bounce"
        >
          {toast}
        </div>
      )}
      <GlobalBookingWizard
        onClose={onClose}
        preselectedClientId={preselectedClientId}
        onSuccess={(msg) => setToast(msg)}
      />
    </>,
    document.body
  );
}

function GlobalBookingWizard({
  onClose,
  preselectedClientId,
  onSuccess,
}: {
  onClose: () => void;
  preselectedClientId?: string;
  onSuccess: (message: string) => void;
}) {
  const router = useRouter();
  const { clients, tours: tourPackages, createBookingForExistingClient } = useData();
  const { user } = useAuth();
  const { formatMoney } = useAgencySettings();

  const [wizardStep, setWizardStep] = useState<"SELECT_CLIENT" | "CONFIGURE_SERVICE">(
    preselectedClientId ? "CONFIGURE_SERVICE" : "SELECT_CLIENT"
  );
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId || "");

  // Service Configuration State
  const [serviceType, setServiceType] = useState<ServiceType>("GROUP_TOUR");

  // Group Tour state
  const availableTours = useMemo(() => {
    return tourPackages.filter((t) => ["OPEN", "FILLING_FAST", "GUARANTEED"].includes(t.status));
  }, [tourPackages]);

  const [selectedTourId, setSelectedTourId] = useState<string>(() => availableTours[0]?.id || "");
  const [paxCount, setPaxCount] = useState<number>(1);
  const [pricePerPax, setPricePerPax] = useState<number>(
    () => availableTours[0]?.pricePerPerson || 385000
  );

  // Visa State
  const [visaCountry, setVisaCountry] = useState("United Kingdom");
  const [visaCategory, setVisaCategory] = useState("Standard Visitor / Tourist");
  const [visaServiceFee, setVisaServiceFee] = useState(45000);
  const [embassyCharges, setEmbassyCharges] = useState(38000);

  // Custom Package State
  const [customDescription, setCustomDescription] = useState(
    "15-Day Luxury Umrah & Dubai Combination Package"
  );
  const [customPackagePrice, setCustomPackagePrice] = useState(650000);

  // Commercial & Payment State
  const [initialDeposit, setInitialDeposit] = useState<number>(50000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Selected client record
  const client = clients.find((c) => c.id === selectedClientId);
  const selectedTour = availableTours.find((t) => t.id === selectedTourId) || availableTours[0];

  // Calculated Commercial Total
  const totalAgreedAmount = useMemo(() => {
    if (serviceType === "GROUP_TOUR") {
      return pricePerPax * paxCount;
    }
    if (serviceType === "VISA_CONSULTANCY") {
      return visaServiceFee + embassyCharges;
    }
    return customPackagePrice;
  }, [serviceType, pricePerPax, paxCount, visaServiceFee, embassyCharges, customPackagePrice]);

  // Keyboard shortcut listener for Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!client) {
      setError("Please select an existing client to proceed.");
      return;
    }

    if (totalAgreedAmount <= 0) {
      setError("Total commercial amount must be greater than zero.");
      return;
    }

    if (serviceType === "GROUP_TOUR") {
      if (!selectedTour) {
        setError("Please select a valid tour departure.");
        return;
      }
      const available = selectedTour.maxCapacity - selectedTour.bookedSeats;
      if (paxCount > available) {
        setError(`Requested ${paxCount} seats, but only ${available} seats remain on this departure.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const today = localDay();
      const departureDate =
        serviceType === "GROUP_TOUR" && selectedTour ? selectedTour.departureDate : today;

      const safeDeposit = Math.max(0, Math.min(initialDeposit, totalAgreedAmount));
      const remaining = Math.max(0, totalAgreedAmount - safeDeposit);
      const mid = Math.round((remaining * 0.5) * 100) / 100;

      const milestones = [
        { name: "Initial Token Deposit", amount: safeDeposit, dueDate: today },
        { name: "Mid-term Installment", amount: mid, dueDate: departureDate },
        {
          name: "Pre-Departure Balance",
          amount: Math.round((remaining - mid) * 100) / 100,
          dueDate: departureDate,
        },
      ];

      // Conversion schema format for DataContext
      const conversion: Conversion =
        serviceType === "GROUP_TOUR"
          ? {
              kind: "GROUP_TOUR",
              tourId: selectedTourId,
              pax: paxCount,
              pricePerPerson: pricePerPax,
              deposit: safeDeposit,
            }
          : serviceType === "VISA_CONSULTANCY"
          ? {
              kind: "VISA",
              country: visaCountry,
              category: visaCategory,
              serviceFee: visaServiceFee,
              embassyCharges: embassyCharges,
            }
          : {
              kind: "CUSTOM_PACKAGE",
              description: customDescription,
              rate: customPackagePrice,
            };

      const paymentInput =
        safeDeposit > 0 && user?.role === "AGENCY_ADMIN"
          ? {
              amount: safeDeposit,
              method: paymentMethod,
              paymentDate: new Date().toISOString(),
              reference: paymentReference || undefined,
            }
          : undefined;

      // 1. Central DataContext mutation
      const created = createBookingForExistingClient(
        client.id,
        {
          assignedRep: user?.name || "Staff",
          conversion,
          milestones: milestones.map((m) => ({
            name: m.name,
            amount: m.amount,
            dueDate: m.dueDate,
          })),
        },
        paymentInput
      );

      // 2. Synchronize with Backend API (idempotent)
      try {
        await rebookClient({
          clientId: client.id,
          serviceType,
          packageId: serviceType === "GROUP_TOUR" ? selectedTourId : undefined,
          packageTitle: serviceType === "GROUP_TOUR" ? selectedTour?.title : undefined,
          paxCount: serviceType === "GROUP_TOUR" ? paxCount : 1,
          agreedPricePerPax: serviceType === "GROUP_TOUR" ? pricePerPax : totalAgreedAmount,
          totalAgreedAmount,
          initialDeposit: safeDeposit,
          paymentMethod,
          paymentReference,
          milestones,
        });
      } catch (apiErr) {
        console.warn("Backend API rebook synchronization note:", apiErr);
      }

      onSuccess(`Booking ${created.bookingNumber} confirmed for ${client.fullName}!`);
      onClose();
      router.push(`/invoices/${created.invoiceId || created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white dark:bg-[#030712] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[92vh] text-gray-900 dark:text-white"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-white/10 flex items-center justify-between bg-gray-50/60 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1B7167]/10 text-[#1B7167] dark:bg-teal-950/60 dark:text-teal-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white font-sans">
                Global Re-Booking &amp; Client Wizard
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Step {wizardStep === "SELECT_CLIENT" ? "1 of 2: Select Client" : "2 of 2: Configure Booking"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Tabs */}
        <div className="grid grid-cols-2 border-b border-gray-100 dark:border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setWizardStep("SELECT_CLIENT")}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-colors border-b-2 ${
              wizardStep === "SELECT_CLIENT"
                ? "border-[#1B7167] text-[#1B7167] dark:text-teal-400 bg-teal-50/20 dark:bg-teal-950/20"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-teal-500/10 text-[#1B7167] dark:text-teal-400 flex items-center justify-center text-[10px] font-mono font-bold">
              1
            </span>
            <span>Client Selection</span>
          </button>

          <button
            type="button"
            disabled={!selectedClientId}
            onClick={() => selectedClientId && setWizardStep("CONFIGURE_SERVICE")}
            className={`py-3 px-4 flex items-center justify-center gap-2 transition-colors border-b-2 ${
              wizardStep === "CONFIGURE_SERVICE"
                ? "border-[#1B7167] text-[#1B7167] dark:text-teal-400 bg-teal-50/20 dark:bg-teal-950/20"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-40"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-teal-500/10 text-[#1B7167] dark:text-teal-400 flex items-center justify-center text-[10px] font-mono font-bold">
              2
            </span>
            <span>Service &amp; Commercial Terms</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form id="global-booking-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}

          {wizardStep === "SELECT_CLIENT" && (
            <ClientPickerSection
              selectedClientId={selectedClientId}
              onSelectClient={(id) => {
                setSelectedClientId(id);
                if (id) {
                  setWizardStep("CONFIGURE_SERVICE");
                }
              }}
            />
          )}

          {wizardStep === "CONFIGURE_SERVICE" && (
            <div className="space-y-6">
              {/* Selected Client Summary Header */}
              {client && (
                <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-500/20 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#1B7167]" />
                    <span className="font-semibold text-gray-900 dark:text-white font-sans">
                      Booking for: <strong>{client.fullName}</strong> ({client.phone})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWizardStep("SELECT_CLIENT")}
                    className="text-[11px] font-semibold text-[#1B7167] dark:text-teal-400 hover:underline"
                  >
                    Change Client
                  </button>
                </div>
              )}

              {/* Service Selection */}
              <ServiceSelector
                serviceType={serviceType}
                onSelectServiceType={setServiceType}
                selectedTourId={selectedTourId}
                onSelectTourId={setSelectedTourId}
                paxCount={paxCount}
                onChangePaxCount={setPaxCount}
                pricePerPax={pricePerPax}
                onChangePricePerPax={setPricePerPax}
                visaCountry={visaCountry}
                onChangeVisaCountry={setVisaCountry}
                visaCategory={visaCategory}
                onChangeVisaCategory={setVisaCategory}
                visaServiceFee={visaServiceFee}
                onChangeVisaServiceFee={setVisaServiceFee}
                embassyCharges={embassyCharges}
                onChangeEmbassyCharges={setEmbassyCharges}
                customDescription={customDescription}
                onChangeCustomDescription={setCustomDescription}
                customPackagePrice={customPackagePrice}
                onChangeCustomPackagePrice={setCustomPackagePrice}
              />

              {/* Milestone Installment Preview */}
              <MilestonePreview
                totalAmount={totalAgreedAmount}
                initialDeposit={initialDeposit}
                onChangeInitialDeposit={setInitialDeposit}
                paymentMethod={paymentMethod}
                onChangePaymentMethod={setPaymentMethod}
                paymentReference={paymentReference}
                onChangePaymentReference={setPaymentReference}
                departureDate={
                  serviceType === "GROUP_TOUR" && selectedTour
                    ? selectedTour.departureDate
                    : undefined
                }
              />
            </div>
          )}
        </form>

        {/* Footer Controls */}
        <div className="p-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-3 bg-gray-50/80 dark:bg-white/[0.02]">
          {wizardStep === "CONFIGURE_SERVICE" ? (
            <button
              type="button"
              onClick={() => setWizardStep("SELECT_CLIENT")}
              className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Clients</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center gap-2.5">
            {wizardStep === "SELECT_CLIENT" ? (
              <button
                type="button"
                disabled={!selectedClientId}
                onClick={() => setWizardStep("CONFIGURE_SERVICE")}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-40"
              >
                <span>Next: Configure Service</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                form="global-booking-form"
                disabled={isSubmitting || totalAgreedAmount <= 0}
                className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-40"
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>Confirming Booking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm &amp; Issue Booking ({formatMoney(totalAgreedAmount)})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

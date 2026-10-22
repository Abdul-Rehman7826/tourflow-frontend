"use client";
import { useRef, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import type { Lead, LeadInterestType, PaymentMethod } from "@/types/erp";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import type { Conversion } from "@/lib/lead-operations";
import { createQuotation as createQuotationApi, confirmBooking as confirmBookingApi } from "@/lib/booking-api";
import {
  LeadDialog,
  leadInput as baseInput,
  leadButton,
} from "@/components/leads/LeadDialog";

const money = (value: number) =>
  `PKR ${value.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const leadInput = baseInput.replace("py-2.5", "py-1.5");
const units = (value: string) => Math.round(Number(value || 0) * 100);
function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ConvertLeadModal({
  lead,
  onClose,
  onConverted,
}: {
  lead: Lead;
  onClose: () => void;
  onConverted?: (message: string) => void;
}) {
  const { tours, bookings, saveDraftBooking, confirmBookingTransaction } =
    useData();
  const { user } = useAuth();
  const quote = bookings.find(
    (b) => b.leadId === lead.id && b.status === "DRAFT" && !b.clientId,
  );
  const saved = quote?.quoteConversion;
  const [kind, setKind] = useState<LeadInterestType>(
    saved?.kind ?? lead.interestType,
  );
  const [tourId, setTourId] = useState(
    saved?.kind === "GROUP_TOUR" ? saved.tourId : "",
  );
  const [price, setPrice] = useState(
    saved?.kind === "GROUP_TOUR" ? String(saved.pricePerPerson) : "",
  );
  const [pax, setPax] = useState(
    String(saved?.kind === "GROUP_TOUR" ? saved.pax : lead.groupSize || 1),
  );
  const [serviceFee, setServiceFee] = useState(
    saved?.kind === "VISA" ? String(saved.serviceFee) : "",
  );
  const [embassyCharges, setEmbassyCharges] = useState(
    saved?.kind === "VISA" ? String(saved.embassyCharges) : "",
  );
  const [rate, setRate] = useState(
    saved && "rate" in saved ? String(saved.rate) : "",
  );
  // A quotation is not evidence of receipt. Reopening always starts payment capture at zero.
  const [token, setToken] = useState("0");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const [today] = useState(localDate);
  const [midAmount, setMidAmount] = useState(
    String(quote?.milestones[1]?.amount ?? 0),
  );
  const [midDate, setMidDate] = useState(
    quote?.milestones[1]?.dueDate ?? today,
  );
  const [finalDate, setFinalDate] = useState(
    quote?.milestones.at(-1)?.dueDate ?? today,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const totalUnits =
    kind === "GROUP_TOUR"
      ? units(price) * Number(pax)
      : kind === "VISA"
        ? units(serviceFee) + units(embassyCharges)
        : units(rate);
  const tokenUnits = units(token);
  const remaining = totalUnits - tokenUnits;
  const finalUnits = remaining - units(midAmount);
  const tour = tours.find((t) => t.id === tourId);
  const available = tour ? Math.max(0, tour.maxCapacity - tour.bookedSeats) : 0;
  const insufficient =
    kind === "GROUP_TOUR" &&
    !!tour &&
    (Number(pax) > available ||
      !["OPEN", "FILLING_FAST"].includes(tour.status));
  const invalid =
    !Number.isSafeInteger(totalUnits) ||
    !Number.isSafeInteger(tokenUnits) ||
    !Number.isSafeInteger(units(midAmount)) ||
    totalUnits < 0 ||
    tokenUnits < 0 ||
    remaining < 0 ||
    finalUnits < 0;
  const status =
    totalUnits === 0 || tokenUnits === totalUnits
      ? "PAID"
      : tokenUnits > 0
        ? "PARTIALLY_PAID"
        : "UNPAID";

  const amount = (
    label: string,
    value: string,
    set: (value: string) => void,
  ) => (
    <label className="block space-y-1 text-sm">
      {label}
      <input
        type="number"
        min="0"
        max="1000000000000"
        step="0.01"
        required
        value={value}
        onChange={(e) => set(e.target.value)}
        className={leadInput}
      />
    </label>
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving.current) return;
    const draftOnly =
      (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "draft";
    const data = new FormData(e.currentTarget);
    const text = (name: string) => String(data.get(name) || "").trim();
    const conversion: Conversion =
      kind === "GROUP_TOUR"
        ? {
            kind,
            tourId,
            pricePerPerson: Number(price),
            pax: Number(pax),
            deposit: 0,
          }
        : kind === "VISA"
          ? {
              kind,
              country: text("country"),
              category: text("category"),
              serviceFee: Number(serviceFee),
              embassyCharges: Number(embassyCharges),
            }
          : { kind, description: text("description"), rate: Number(rate) };
    if (invalid || (!draftOnly && insufficient)) {
      setError("Check the amounts and available seats before saving.");
      return;
    }
    const milestones = [
      {
        name: "Initial Token Deposit",
        amount: tokenUnits / 100,
        dueDate: today,
      },
      {
        name: "Mid-term Installment",
        amount: units(midAmount) / 100,
        dueDate: midDate,
      },
      {
        name: "Pre-Departure Balance",
        amount: finalUnits / 100,
        dueDate: finalDate,
      },
    ];
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      let bookingNumber = "";

      if (draftOnly) {
        try {
          const apiQuote = await createQuotationApi({
            leadId: lead.id,
            serviceType: kind === "VISA" ? "VISA_CONSULTANCY" : kind,
            packageId: tourId || undefined,
            packageTitle: tour?.title,
            paxCount: Number(pax) || 1,
            agreedPricePerPax: Number(price) || undefined,
            totalAgreedAmount: totalUnits / 100,
            milestones,
            quoteConversion: conversion as Record<string, unknown>,
          });
          bookingNumber = apiQuote.bookingNumber || "";
        } catch (apiErr) {
          console.warn("Live quotation API fallback to local storage:", apiErr);
        }

        const localBooking = saveDraftBooking(lead.id, conversion, milestones);
        if (!bookingNumber) bookingNumber = localBooking.bookingNumber;

        onConverted?.("Draft quote saved successfully in Draft Bookings.");
      } else {
        try {
          const apiResponse = await confirmBookingApi({
            leadId: lead.id,
            serviceType: kind === "VISA" ? "VISA_CONSULTANCY" : kind,
            packageId: tourId || undefined,
            packageTitle: tour?.title,
            paxCount: Number(pax) || 1,
            agreedPricePerPax: Number(price) || undefined,
            totalAgreedAmount: totalUnits / 100,
            initialDeposit: tokenUnits > 0 ? tokenUnits / 100 : undefined,
            paymentMethod: method,
            paymentReference: reference,
            milestones,
            quoteConversion: conversion as Record<string, unknown>,
          });
          if (apiResponse?.booking?.bookingNumber) {
            bookingNumber = apiResponse.booking.bookingNumber;
          }
        } catch (apiErr) {
          console.warn("Live booking confirmation API fallback to local storage:", apiErr);
        }

        const localBooking = confirmBookingTransaction(
          lead.id,
          conversion,
          milestones,
          tokenUnits > 0
            ? {
                amount: tokenUnits / 100,
                method,
                reference,
                paymentDate: today,
              }
            : undefined
        );
        if (!bookingNumber) bookingNumber = localBooking.bookingNumber;

        onConverted?.(`Booking ${bookingNumber} confirmed and Invoice generated!`);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save booking.");
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <LeadDialog
      wide
      title={`Convert: ${lead.fullName}`}
      subtitle={
        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 dark:bg-white/5 px-2 py-0.5">
            {lead.source || "Inquiry"}
          </span>
          <span className="rounded-full bg-gray-100 dark:bg-white/5 px-2 py-0.5">
            {lead.phone}
          </span>
        </div>
      }
      onClose={() => {
        if (!saving.current) onClose();
      }}
    >
      <form
        onSubmit={submit}
        aria-busy={busy}
        className="flex max-h-[calc(90dvh-8rem)] min-h-0 flex-col justify-between"
      >
        <fieldset
          disabled={busy}
          className="min-h-0 min-w-0 overflow-y-auto overscroll-contain"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="min-w-0 space-y-3">
              <h3 className="text-sm font-semibold">
                Service &amp; Pricing Setup
              </h3>
              <label className="block space-y-1 text-sm">
                Conversion path
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as LeadInterestType)}
                  className={leadInput}
                >
                  <option value="GROUP_TOUR">Group Tour Package</option>
                  <option value="VISA">Visa Consultancy</option>
                  <option value="UMRAH">Umrah</option>
                  <option value="CUSTOM_PACKAGE">Custom Package</option>
                </select>
              </label>
              {kind === "GROUP_TOUR" ? (
                <>
                  <label className="block space-y-1 text-sm">
                    Tour package
                    <select
                      required
                      value={tourId}
                      onChange={(e) => setTourId(e.target.value)}
                      className={leadInput}
                    >
                      <option value="" disabled>
                        Select a pre-created tour
                      </option>
                      {tours
                        .filter(
                          (t) =>
                            ["OPEN", "FILLING_FAST"].includes(t.status) ||
                            t.id === tourId,
                        )
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                    </select>
                  </label>
                  {tour && (
                    <div className="space-y-1 text-xs" aria-live="polite">
                      <p>
                        Available: {available} / {tour.maxCapacity} seats
                      </p>
                      <progress
                        aria-label="Available seats"
                        value={available}
                        max={tour.maxCapacity || 1}
                        className="h-1.5 w-full accent-purple-600"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {amount("Closing price per pax", price, setPrice)}
                    <label className="block space-y-1 text-sm">
                      Pax count
                      <input
                        type="number"
                        min="1"
                        max="1000"
                        step="1"
                        required
                        value={pax}
                        onChange={(e) => setPax(e.target.value)}
                        className={leadInput}
                      />
                    </label>
                  </div>
                  {insufficient && (
                    <div
                      role="alert"
                      className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium"
                    >
                      <span>⚠️ Not enough available seats: Only {available} seats remaining on this departure ({tour?.title || "selected tour"}). Confirmation is disabled.</span>
                    </div>
                  )}
                </>
              ) : kind === "VISA" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1 text-sm">
                      Destination country
                      <input
                        name="country"
                        required
                        defaultValue={
                          saved?.kind === "VISA"
                            ? saved.country
                            : lead.destinationInterest || ""
                        }
                        className={leadInput}
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      Visa category
                      <select
                        name="category"
                        defaultValue={
                          saved?.kind === "VISA" ? saved.category : "Tourist"
                        }
                        className={leadInput}
                      >
                        {[
                          "Tourist",
                          "Business",
                          "Student",
                          "Family Visit",
                          "Work",
                          "Transit",
                        ].map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {amount("Agency service fee", serviceFee, setServiceFee)}
                    {amount(
                      "Official embassy charges",
                      embassyCharges,
                      setEmbassyCharges,
                    )}
                  </div>
                </>
              ) : (
                <>
                  <label className="block space-y-1 text-sm">
                    Package title
                    <input
                      name="description"
                      required
                      maxLength={4000}
                      defaultValue={
                        saved && "description" in saved ? saved.description : ""
                      }
                      className={leadInput}
                    />
                  </label>
                  {amount("Total agreed contract price", rate, setRate)}
                </>
              )}
              <div
                aria-live="polite"
                className="rounded-xl p-3 bg-purple-500/10 border border-purple-500/20"
              >
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Agreed
                </p>
                <strong className="text-xl">{money(totalUnits / 100)}</strong>
              </div>
            </section>
            <section className="min-w-0 space-y-3">
              <h3 className="text-sm font-semibold">
                Payment Capture &amp; Milestones
              </h3>
              <div className="space-y-2 rounded-xl border border-gray-200 dark:border-white/10 p-3 dark:bg-white/[0.02]">
                {user?.role === 'AGENCY_ADMIN' ? amount("Token / Deposit Received Today", token, setToken) : <p className="text-sm text-purple-500">Submit proof on the invoice after booking. Payments require admin verification.</p>}
                {tokenUnits > 0 && (
                  <>
                    <fieldset className="flex flex-wrap gap-2">
                      <legend className="sr-only">Payment method</legend>
                      {(
                        [
                          ["Cash", "Cash"],
                          ["Bank Transfer", "Bank Wire"],
                          ["Credit Card", "Credit Card"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={`cursor-pointer rounded-full border px-2 py-1 text-xs focus-within:outline-2 focus-within:outline-purple-500 ${method === value ? "border-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300" : "border-gray-200 dark:border-white/10"}`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value={value}
                            checked={method === value}
                            onChange={() => setMethod(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                    <label className="block space-y-1 text-xs">
                      Reference / Cheque #
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        maxLength={200}
                        className={leadInput}
                      />
                    </label>
                  </>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Drafts do not record payments or reserve seats.
                </p>
              </div>
              <section className="space-y-2 text-xs">
                <h4 className="font-semibold">Installment schedule</h4>
                <div className="flex items-center justify-between gap-2">
                  <span>1. Initial Deposit</span>
                  <span>
                    {money(tokenUnits / 100)}{" "}
                    <span className="text-gray-500">/ {today}</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {amount("2. Mid-term Installment", midAmount, setMidAmount)}
                  <label className="block space-y-1 text-sm">
                    Mid-term due date
                    <input
                      type="date"
                      required
                      min={today}
                      value={midDate}
                      onChange={(e) => setMidDate(e.target.value)}
                      className={leadInput}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 items-end gap-2">
                  <div className="space-y-1">
                    <p>3. Pre-Departure Final Balance</p>
                    <p className="py-1.5 font-semibold">
                      {money(finalUnits / 100)}
                    </p>
                  </div>
                  <label className="block space-y-1 text-sm">
                    Final balance due date
                    <input
                      type="date"
                      required
                      min={midDate}
                      value={finalDate}
                      onChange={(e) => setFinalDate(e.target.value)}
                      className={leadInput}
                    />
                  </label>
                </div>
              </section>
              <div
                aria-live="polite"
                className="space-y-1 rounded-xl bg-gray-50 dark:bg-white/5 p-2 text-xs"
              >
                <p>
                  Paid Today: <strong>{money(tokenUnits / 100)}</strong> /
                  Remaining Due: <strong>{money(remaining / 100)}</strong>
                </p>
                <p>
                  Invoice Status to be issued: <strong>{status}</strong>
                </p>
                {!invalid && (
                  <p className="text-emerald-700 dark:text-emerald-400">
                    Milestones equal the agreed total.
                  </p>
                )}
              </div>
            </section>
          </div>
        </fieldset>
        <footer className="mt-3 shrink-0 border-t border-gray-200 dark:border-white/10 pt-3">
          {invalid && (
            <p
              role="alert"
              className="mb-2 text-xs text-red-600 dark:text-red-400"
            >
              Token and installments cannot exceed the agreed total.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="mb-2 text-xs text-red-600 dark:text-red-400"
            >
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="text-sm text-gray-500 disabled:opacity-40"
            >
              Cancel / Close
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                value="draft"
                disabled={busy || invalid}
                className="rounded-xl border border-gray-300 dark:border-white/20 px-3 py-2.5 text-sm font-medium disabled:opacity-40"
              >
                Save as Draft Quote
              </button>
              <button
                type="submit"
                value="confirm"
                disabled={
                  busy ||
                  invalid ||
                  insufficient ||
                  (kind === "GROUP_TOUR" && !tour)
                }
                className={`${leadButton} flex items-center justify-center gap-2`}
              >
                {busy && (
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                )}
                Confirm Booking &amp; Issue Invoice
              </button>
            </div>
          </div>
        </footer>
      </form>
    </LeadDialog>
  );
}

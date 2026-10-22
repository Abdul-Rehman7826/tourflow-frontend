"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  User,
  Phone,
  CreditCard,
  Users,
  ShieldAlert,
  Clock,
  FileText,
  AlertTriangle,
  Sparkles,
  Ban,
} from "lucide-react";
import { Booking } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { cancelBooking as cancelBookingApi } from "@/lib/booking-api";

interface BookingDetailDrawerProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDraft?: (booking: Booking) => void;
  onRefresh?: () => void;
}

export function BookingDetailDrawer({
  booking,
  isOpen,
  onClose,
  onConfirmDraft,
  onRefresh,
}: BookingDetailDrawerProps) {
  const { formatMoney } = useAgencySettings();
  const { user } = useAuth();
  const { cancelBooking, invoices } = useData();

  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "MILESTONES" | "MANIFEST">("OVERVIEW");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState<
    "CLIENT_REQUEST" | "VISA_REJECTION" | "MEDICAL_EMERGENCY" | "TOUR_POSTPONED" | "OTHER"
  >("CLIENT_REQUEST");
  const [retentionFee, setRetentionFee] = useState("0");
  const [refundMethod, setRefundMethod] = useState<"CASH" | "BANK_WIRE" | "ORIGINAL_PAYMENT">("CASH");
  const [refundRef, setRefundRef] = useState("");
  const [cancelNotes, setCancelNotes] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const isAdmin = user?.role === "AGENCY_ADMIN";

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCancelModal) {
          setShowCancelModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalStyle;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, showCancelModal, onClose]);

  if (!isOpen || !booking) return null;

  const linkedInvoice = invoices.find(
    (inv) => inv.bookingId === booking.id || inv.bookingRef === booking.bookingNumber
  );

  const totalAmount = booking.totalAgreedAmount || booking.total_agreed_amount || 0;
  const paxCount = booking.paxCount || booking.pax_count || 1;
  const bookingNum = booking.bookingNumber || booking.booking_number || "WCH-BK-000000";
  const clientName = booking.clientName || booking.client_name || "Valued Client";
  const clientPhone = booking.clientPhone || booking.client_phone || "—";
  const packageTitle = booking.packageTitle || booking.package_title || booking.tourTitle || booking.tour_title || "Custom Service";
  const isDraft = booking.status === "DRAFT" || booking.status === "DRAFT_QUOTATION";
  const isCancelled = booking.status === "CANCELLED";
  const isConfirmed = booking.status === "CONFIRMED";

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setCancelError("Only Agency Administrators can cancel bookings.");
      return;
    }
    setIsCancelling(true);
    setCancelError("");

    try {
      const fee = parseFloat(retentionFee) || 0;
      // 1. Live API cancellation sync
      try {
        await cancelBookingApi(
          booking.id,
          cancelReason,
          fee,
          refundMethod,
          cancelNotes
        );
      } catch (apiErr) {
        console.warn("Live API cancel sync fallback to local state:", apiErr);
      }

      // 2. Local transactional commit
      cancelBooking(booking.id, {
        cancellationFeeRetained: fee,
        refundMethod,
        refundReference: refundRef,
        reasonCategory: cancelReason,
        notes: cancelNotes,
      });

      setShowCancelModal(false);
      onRefresh?.();
      onClose();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-white dark:bg-[#030712] border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold tracking-tight text-[#1B7167] dark:text-emerald-400">
                    {bookingNum}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${
                      isDraft
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50"
                        : isConfirmed
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/50"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700/50"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <h2 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                  {packageTitle}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Assigned Consultant:{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {booking.assignedRep || booking.assigned_rep || "Unassigned"}
                  </span>
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 mt-6 border-b border-gray-200 dark:border-white/10 -mb-6">
              <button
                onClick={() => setActiveTab("OVERVIEW")}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === "OVERVIEW"
                    ? "border-[#1B7167] text-[#1B7167] dark:text-emerald-400 dark:border-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab("MILESTONES")}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === "MILESTONES"
                    ? "border-[#1B7167] text-[#1B7167] dark:text-emerald-400 dark:border-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Milestones ({booking.milestones?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("MANIFEST")}
                className={`pb-3 px-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
                  activeTab === "MANIFEST"
                    ? "border-[#1B7167] text-[#1B7167] dark:text-emerald-400 dark:border-emerald-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                <Users className="w-4 h-4" />
                Manifest Slots ({paxCount})
              </button>
            </div>
          </div>

          {/* Drawer Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "OVERVIEW" && (
              <div className="space-y-6">
                {/* Client Profile Card */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Client &amp; Contact
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-[#1B7167]/10 text-[#1B7167] dark:text-emerald-400">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Primary Traveler</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {clientName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Phone Number</p>
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-white">
                          {clientPhone}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Card */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1B7167] dark:text-emerald-400">
                      Commercial Summary
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {paxCount} {paxCount === 1 ? "Passenger" : "Passengers"}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                        {formatMoney(totalAmount)}
                      </p>
                      {booking.agreedPricePerPax && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                          {formatMoney(booking.agreedPricePerPax)} / passenger
                        </p>
                      )}
                    </div>
                    {linkedInvoice && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Paid Amount</p>
                        <p className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(linkedInvoice.paidAmount || 0)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cancellation Audit (if cancelled) */}
                {isCancelled && (
                  <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                      <ShieldAlert className="w-5 h-5" />
                      <h4 className="font-semibold text-sm">Booking Cancelled</h4>
                    </div>
                    <p className="text-xs text-rose-800 dark:text-rose-300">
                      Reason: <span className="font-medium">{booking.cancellationReason || "Administrative decision"}</span>
                    </p>
                    {booking.retentionFee !== undefined && (
                      <p className="text-xs text-rose-800 dark:text-rose-300 font-mono">
                        Retention Fee: {formatMoney(booking.retentionFee)} | Refund Issued:{" "}
                        {formatMoney(booking.refundAmount || 0)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "MILESTONES" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Schedule Breakdown</span>
                  <span>Total: {formatMoney(totalAmount)}</span>
                </div>
                {(!booking.milestones || booking.milestones.length === 0) ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    No installment milestones defined.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {booking.milestones.map((ms, index) => (
                      <div
                        key={ms.id || index}
                        className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {ms.name || ms.title || `Milestone ${index + 1}`}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Due: {ms.dueDate || ms.due_date || "Immediate"}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                            {formatMoney(ms.amount)}
                          </p>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mt-1 ${
                              ms.status === "PAID" || ms.isPaid
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {ms.status === "PAID" || ms.isPaid ? "Paid" : "Pending"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "MANIFEST" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Passenger Allocation Grid</span>
                  <span>{paxCount} Allocated Seats</span>
                </div>
                {(!booking.travelers || booking.travelers.length === 0) ? (
                  <p className="text-sm text-gray-400 py-4 text-center">
                    No passenger manifest slots generated.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {booking.travelers.map((t, index) => (
                      <div
                        key={t.id || index}
                        className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-[#1B7167]/10 text-[#1B7167] dark:text-emerald-400 text-xs font-bold flex items-center justify-center font-mono">
                              {t.slotNumber || t.slot_number || index + 1}
                            </span>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              {t.fullName || t.full_name || "Unassigned Passenger"}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              t.isComplete || t.is_complete
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                            }`}
                          >
                            {t.isComplete || t.is_complete ? "Complete" : "Incomplete Info"}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="text-gray-400">Passport: </span>
                            <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                              {t.passportNo || t.passport_no || t.passportNumber || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Room: </span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {t.roomPreference || t.room_preference || "DOUBLE"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50/80 dark:bg-[#0B0F19]/80 backdrop-blur flex items-center justify-between gap-3">
            {isDraft && onConfirmDraft ? (
              <button
                onClick={() => {
                  onConfirmDraft(booking);
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#1B7167] to-[#13534C] hover:from-[#13534C] hover:to-[#0E3E39] text-white font-medium shadow-lg shadow-[#1B7167]/20 flex items-center justify-center gap-2 transition [&>svg]:text-white [&>span]:text-white"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white">Fast-Track Confirm Booking</span>
              </button>
            ) : isConfirmed && isAdmin ? (
              <div className="w-full flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  Administrative Operational Actions
                </span>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="py-2 px-4 rounded-xl border border-rose-300 dark:border-rose-800/60 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-sm font-semibold flex items-center gap-2 transition"
                >
                  <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  Cancel Booking
                </button>
              </div>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                Close Inspection
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cancellation Modal (AGENCY_ADMIN Only) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/10">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  Confirm Booking Cancellation
                </h3>
                <p className="text-xs text-gray-500">
                  Booking #{bookingNum} • {clientName}
                </p>
              </div>
            </div>

            {cancelError && (
              <p className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
                {cancelError}
              </p>
            )}

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Reason Category
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) =>
                    setCancelReason(
                      e.target.value as
                        | "CLIENT_REQUEST"
                        | "VISA_REJECTION"
                        | "MEDICAL_EMERGENCY"
                        | "TOUR_POSTPONED"
                        | "OTHER"
                    )
                  }
                  className="w-full rounded-lg border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  <option value="CLIENT_REQUEST">Client Cancellation Request</option>
                  <option value="VISA_REJECTION">Visa Rejection</option>
                  <option value="MEDICAL_EMERGENCY">Medical Emergency</option>
                  <option value="TOUR_POSTPONED">Tour Postponed / Cancelled</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Retention Fee
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={retentionFee}
                    onChange={(e) => setRetentionFee(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Refund Method
                  </label>
                  <select
                    value={refundMethod}
                    onChange={(e) =>
                      setRefundMethod(
                        e.target.value as
                          | "CASH"
                          | "BANK_WIRE"
                          | "ORIGINAL_PAYMENT"
                      )
                    }
                    className="w-full rounded-lg border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_WIRE">Bank Wire</option>
                    <option value="ORIGINAL_PAYMENT">Original Payment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Refund Reference / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. REF-2026-091"
                  value={refundRef}
                  onChange={(e) => setRefundRef(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm font-mono text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Audit Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context for cancellation..."
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 dark:border-white/15 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => setShowCancelModal(false)}
                  className="py-2 px-4 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium shadow-md shadow-rose-600/20"
                >
                  {isCancelling ? "Processing..." : "Confirm & Release Seats"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

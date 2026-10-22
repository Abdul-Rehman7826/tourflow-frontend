"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import type { PaymentMethod } from "@/types/erp";
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Maximize2,
  X,
  CreditCard,
  Building2,
  Calendar,
  Clock,
  User,
  FileText,
} from "lucide-react";

interface VerifyPaymentModalProps {
  claimId: string;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const REJECTION_QUICK_CHIPS = [
  "Reference not found in bank statement",
  "Transferred amount mismatch",
  "Illegible or incomplete slip screenshot",
  "Duplicate payment proof submission",
];

export function VerifyPaymentModal({
  claimId,
  onClose,
  onSuccess,
}: VerifyPaymentModalProps) {
  const { user } = useAuth();
  const { formatMoney } = useAgencySettings();
  const { paymentProofClaims, invoices, approvePaymentClaim, rejectPaymentClaim } =
    useData();

  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Bank Transfer");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  const claim = paymentProofClaims.find((c) => c.id === claimId);
  const invoice = invoices.find((i) => i.id === claim?.invoiceId);

  const isAdmin = user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN";

  if (!claim || !invoice) return null;

  const pending = claim.status === "PENDING_VERIFICATION";
  const receipt = invoice.installments.find(
    (p) => p.reference === claim.bankReference
  );

  const handleCopyReference = () => {
    if (!claim.bankReference) return;
    navigator.clipboard.writeText(claim.bankReference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleApprove = async () => {
    if (!isAdmin) {
      setError("Only an Agency Administrator can verify and settle payment claims.");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      approvePaymentClaim(claim.id, method);
      onSuccess?.("Payment verified. Realized revenue recorded.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!isAdmin) {
      setError("Only an Agency Administrator can reject payment claims.");
      return;
    }
    if (!reason.trim()) {
      setError("Please provide a mandatory rejection reason.");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      rejectPaymentClaim(claim.id, reason.trim());
      onSuccess?.("Payment proof rejected. Returned to sales recovery queue.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejection failed.");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  let allocated = 0;
  const projectedPaid = Math.round(
    (invoice.paidAmount + (pending ? claim.amount : 0)) * 100
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
          {/* Modal Header */}
          <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Admin Verification Desk
                </span>
                <span className="text-gray-400 font-mono text-xs">
                  Claim ID: {claim.id}
                </span>
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                Verify Payment Claim — {invoice.clientName || "Client"}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                Invoice #{invoice.invoiceNumber} &bull; Total Balance:{" "}
                <strong className="text-amber-600 dark:text-amber-400">
                  {formatMoney(invoice.dueAmount)}
                </strong>
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
            {/* Front-Desk Privacy Shield Banner */}
            {!isAdmin && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-xs">Front-Desk Privacy Shield Active</p>
                  <p className="text-[11px] leading-relaxed">
                    You can view the payment proof details and milestone breakdown. Official cash settlement approval, ledger entries, and milestone clearing are strictly restricted to Agency Administrators.
                  </p>
                </div>
              </div>
            )}

            {/* Claim Evidence Summary Grid (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Bank Transaction Evidence */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/[0.04] dark:bg-emerald-950/10 border border-emerald-500/20 space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block mb-1">
                      Transferred Amount (PKR)
                    </span>
                    <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {formatMoney(claim.amount)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/10">
                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                        Destination Bank:
                      </span>
                      <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <span>Meezan Bank Operations</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                        Payment Date:
                      </span>
                      <p className="font-mono text-gray-900 dark:text-white flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{claim.createdAt?.slice(0, 10) || "Today"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Bank Reference with 1-Click Copy */}
                  <div className="pt-2 border-t border-emerald-500/10">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block mb-1">
                      Bank / Raast Reference / Txn ID:
                    </span>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10">
                      <span className="font-mono font-black text-gray-900 dark:text-white text-xs tracking-tight break-all">
                        {claim.bankReference}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyReference}
                        className="ml-2 px-2 py-1 rounded bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-[10px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                        title="Copy Txn Reference ID"
                      >
                        {copiedRef ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Copied!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-gray-500" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Staff Intake Meta */}
                  <div className="pt-2 border-t border-emerald-500/10 flex items-center justify-between text-[11px] text-gray-500">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Submitted By: <strong className="text-gray-800 dark:text-gray-200">{claim.staffName || "Staff Member"}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {claim.createdAt ? new Date(claim.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                    </span>
                  </div>
                </div>

                {/* Front Desk Notes Callout */}
                {claim.notes && (
                  <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">
                      Front Desk Intake Notes
                    </span>
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {claim.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Column 2: Bank Slip / Screenshot Viewer */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Customer Payment Slip Attachment</span>
                  </span>
                  {claim.screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setIsLightboxOpen(true)}
                      className="text-[11px] text-[#1B7167] dark:text-teal-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Expand View</span>
                    </button>
                  )}
                </div>

                {claim.screenshotUrl &&
                /^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(
                  claim.screenshotUrl
                ) ? (
                  <div
                    onClick={() => setIsLightboxOpen(true)}
                    className="group relative rounded-xl border border-gray-200 dark:border-white/10 bg-black/5 dark:bg-white/5 overflow-hidden cursor-pointer hover:border-[#1B7167] transition-all flex items-center justify-center min-h-[220px] max-h-[260px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={claim.screenshotUrl}
                      alt="Submitted customer payment proof"
                      className="max-h-[260px] w-full object-contain p-2"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white font-bold text-xs">
                      <Maximize2 className="w-4 h-4" />
                      <span>Click to Enlarge</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 rounded-xl bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/10 text-center text-gray-400 space-y-1">
                    <AlertCircle className="w-6 h-6 mx-auto text-gray-400" />
                    <p className="font-semibold text-xs">No screenshot attached</p>
                    <p className="text-[10px]">Proof was recorded via manual reference ID only.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Milestone Impact Preview (FIFO Sequential Settlement) */}
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#1B7167] dark:text-teal-400" />
                    <span>Milestone Settlement Impact Preview (FIFO Sequence)</span>
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Applying {formatMoney(claim.amount)} will sequentially settle oldest pending milestones.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Balance After Approval:</span>
                  <span className="font-mono font-bold text-xs text-[#1B7167] dark:text-emerald-400">
                    {formatMoney(Math.max(0, invoice.dueAmount - (pending ? claim.amount : 0)))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {invoice.milestones
                  ?.slice()
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
                  .map((m) => {
                    allocated += Math.round(m.amount * 100);
                    const isSettled = allocated <= projectedPaid;
                    return (
                      <div
                        key={m.id}
                        className={`rounded-xl border p-3 flex flex-col justify-between space-y-2 transition-all ${
                          isSettled
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                            : "bg-white dark:bg-[#0B0F19] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs truncate">
                              {m.title || m.name || "Milestone"}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isSettled
                                  ? "bg-emerald-500 text-white"
                                  : "bg-gray-100 dark:bg-white/10 text-gray-500"
                              }`}
                            >
                              {isSettled ? "✓ Settled / PAID" : m.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 font-mono">
                            Due: {m.dueDate}
                          </p>
                        </div>
                        <p className="font-mono font-black text-sm">
                          {formatMoney(m.amount)}
                        </p>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Verified Settlement Method Selector */}
            {pending && isAdmin && !isRejecting && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] space-y-2">
                <label className="block space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#1B7167]" />
                    Verified Settlement Payment Method:
                  </span>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167] cursor-pointer"
                  >
                    {[
                      "Bank Transfer",
                      "Cash",
                      "Credit Card",
                      "Cheque",
                      "Online Portal",
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Rejection Reason Form (Conditional Animated Expansion) */}
            {pending && isAdmin && isRejecting && (
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] dark:bg-rose-950/20 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-rose-700 dark:text-rose-400 block text-xs">
                    Rejection Reason (Required) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRejecting(false)}
                    className="text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel Rejection
                  </button>
                </div>

                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {REJECTION_QUICK_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setReason(chip)}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#0B0F19] border border-rose-300/60 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[10px] text-gray-700 dark:text-gray-300 font-medium transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Transaction reference not found on bank statement..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-rose-300 dark:border-rose-500/30 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            {/* Completed Review Status Banner */}
            {!pending && (
              <div
                className={`p-4 rounded-xl border space-y-2 ${
                  claim.status === "VERIFIED_APPROVED"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  {claim.status === "VERIFIED_APPROVED" ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Payment Verified &amp; Milestones Cleared</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Claim Rejected: {claim.rejectionReason}</span>
                    </>
                  )}
                </div>
                {receipt?.receiptNo && (
                  <p className="font-mono text-[11px]">
                    Official Receipt Generated: <strong>{receipt.receiptNo}</strong>
                  </p>
                )}
                {claim.verifiedAt && (
                  <p className="text-[10px] text-gray-500">
                    Reviewed by Admin {claim.verifiedByAdminId || ""} at{" "}
                    {claim.verifiedAt}
                  </p>
                )}
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="text-xs text-[#1B7167] dark:text-emerald-400 font-semibold underline block pt-1"
                >
                  Open Invoice Document &amp; Official Receipts &rarr;
                </Link>
              </div>
            )}

            {error && (
              <p role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {error}
              </p>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-xs text-gray-700 dark:text-gray-300 font-semibold transition-colors cursor-pointer"
            >
              Close / Cancel
            </button>

            {pending && isAdmin && (
              <>
                {!isRejecting ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setIsRejecting(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer [&>svg]:text-white [&>span]:text-white"
                  >
                    ✕ Reject Proof
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={saving || !reason.trim()}
                    onClick={handleReject}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-xl text-sm disabled:opacity-40 transition-colors cursor-pointer [&>svg]:text-white [&>span]:text-white"
                  >
                    Confirm Rejection
                  </button>
                )}

                <button
                  type="button"
                  disabled={
                    saving ||
                    invoice.status === "CANCELLED" ||
                    claim.amount > invoice.dueAmount
                  }
                  onClick={handleApprove}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-40 [&>svg]:text-white [&>span]:text-white"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span className="text-white font-medium">
                    {saving ? "Settling..." : "✓ Approve & Settle Cash"}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Full View */}
      {isLightboxOpen && claim.screenshotUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={claim.screenshotUrl}
              alt="Bank slip proof full view"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAgencySettings } from "@/context/ThemeContext";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import { BookingCancellation } from "@/components/invoices/BookingCancellation";
import { PaymentRecoveryActions } from "@/components/invoices/PaymentRecoveryActions";
import { VerifyPaymentModal } from "@/components/invoices/VerifyPaymentModal";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import type {
  PaymentMethod,
  InvoiceMilestone,
  InvoiceLineItem,
} from "@/types/erp";
import {
  ArrowLeft,
  Printer,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Receipt,
  Check,
  ChevronRight,
  ShieldCheck,
  X,
  FileCheck2,
  PhoneCall,
  Image as ImageIcon,
} from "lucide-react";

const SIMULATION_DATE = "2026-09-15";

export default function InvoiceDetailPage() {
  const { user } = useAuth();
  const { settings, formatMoney } = useAgencySettings();
  const params = useParams();
  const invoiceId = (params?.id as string) || "";

  const { invoices, paymentProofClaims, recoveryCallLogs, recordPayment } = useData();
  // Modal States
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedClaimIdForReview, setSelectedClaimIdForReview] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Find invoice
  const invoice = useMemo(() => {
    return invoices.find((inv) => inv.id === invoiceId);
  }, [invoices, invoiceId]);

  // Associated Claims & Calls
  const invoiceClaims = useMemo(() => {
    return paymentProofClaims.filter((c) => c.invoiceId === invoiceId);
  }, [paymentProofClaims, invoiceId]);

  const pendingClaims = useMemo(() => {
    return invoiceClaims.filter((c) => c.status === "PENDING_VERIFICATION");
  }, [invoiceClaims]);

  const invoiceCalls = useMemo(() => {
    return recoveryCallLogs
      .filter((c) => c.invoiceId === invoiceId)
      .sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  }, [recoveryCallLogs, invoiceId]);

  // Pre-fill payment amount when modal opens
  const openPaymentModal = () => {
    if (invoice) {
      const outstanding = invoice.dueAmount ?? invoice.outstandingAmount ?? 0;
      setPaymentAmount(outstanding > 0 ? outstanding : 0);
      setPaymentReference(`FT-${Math.floor(100000 + Math.random() * 900000)}`);
    }
    setIsRecordPaymentOpen(true);
  };

  // Handle Record Payment Form Submit
  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    const outstanding = invoice.dueAmount ?? invoice.outstandingAmount ?? 0;
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > outstanding) {
      alert("Enter a positive payment no greater than the remaining balance.");
      return;
    }

    try {
      recordPayment(invoice.id, paymentAmount, paymentMethod, paymentReference);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Payment could not be saved. Please try again.");
      return;
    }
    setIsRecordPaymentOpen(false);
    showToast(`Payment of ${formatMoney(paymentAmount)} recorded successfully!`);
  };

  if (!invoice) {
    return (
      <div className="p-8 text-center space-y-4">
        <Receipt className="w-12 h-12 text-slate-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Invoice Not Found</h2>
        <p className="text-slate-400 text-xs">
          The requested invoice ID <code className="text-purple-400 font-mono">&quot;{invoiceId}&quot;</code> does not exist for {settings.name}.
        </p>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices &amp; AR Desk
        </Link>
      </div>
    );
  }

  const outstanding = invoice.dueAmount ?? invoice.outstandingAmount ?? 0;
  const paidPercent = invoice.totalAmount > 0 ? Math.min(100, Math.round((invoice.paidAmount / invoice.totalAmount) * 100)) : 0;
  const isOverdue =
    invoice.status === "OVERDUE" ||
    (outstanding > 0 && new Date(invoice.dueDate) < new Date(SIMULATION_DATE));

  // Default Line Items if not populated
  const displayLineItems: InvoiceLineItem[] =
    invoice.lineItems && invoice.lineItems.length > 0
      ? invoice.lineItems
      : [
          {
            id: "item-1",
            description: invoice.packageTitle || invoice.serviceDescription || "Group Tour Package & Travel Services",
            category: "Tour Package",
            quantity: 1,
            unitPrice: invoice.totalAmount,
            totalPrice: invoice.totalAmount,
          },
        ];

  // Default 3-Milestone Schedule if not populated
  const displayMilestones: InvoiceMilestone[] =
    invoice.milestones && invoice.milestones.length > 0
      ? invoice.milestones.map((ms) => ({
          ...ms,
          name: ms.name || ms.title || "Installment Milestone",
          title: ms.title || ms.name || "Installment Milestone",
        }))
      : [
          {
            id: "ms-1",
            name: "Initial Booking Deposit / Token",
            title: "Milestone 1: Initial Booking Deposit / Token",
            percentage: 30,
            amount: Math.round(invoice.totalAmount * 0.3),
            dueDate: invoice.createdAt,
            status: invoice.paidAmount >= invoice.totalAmount * 0.3 ? "PAID" : "PENDING",
            paidAmount: Math.min(invoice.paidAmount, Math.round(invoice.totalAmount * 0.3)),
            paidAt: invoice.installments[0]?.paymentDate,
            receiptNo: invoice.installments[0]?.receiptNo,
          },
          {
            id: "ms-2",
            name: "Mid-term Installment",
            title: "Milestone 2: Mid-term Installment",
            percentage: 40,
            amount: Math.round(invoice.totalAmount * 0.4),
            dueDate: invoice.dueDate,
            status: invoice.paidAmount >= invoice.totalAmount * 0.7 ? "PAID" : "PENDING",
            paidAmount: Math.max(0, Math.min(invoice.paidAmount - Math.round(invoice.totalAmount * 0.3), Math.round(invoice.totalAmount * 0.4))),
          },
          {
            id: "ms-3",
            name: "Pre-Departure Balance Clearance",
            title: "Milestone 3: Pre-Departure Balance Clearance",
            percentage: 30,
            amount: Math.round(invoice.totalAmount * 0.3),
            dueDate: invoice.dueDate,
            status: outstanding === 0 ? "PAID" : isOverdue ? "OVERDUE" : "PENDING",
            paidAmount: Math.max(0, invoice.paidAmount - Math.round(invoice.totalAmount * 0.7)),
          },
        ];

  return (
    <div className="space-y-6">
      {/* TOAST MESSAGE */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-2xl shadow-emerald-950/80 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* TOP HEADER & ACTION CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Link
              href="/invoices"
              className="hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Invoices &amp; AR Desk</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600" />
            <span className="text-gray-900 dark:text-white font-mono">{invoice.invoiceNumber}</span>
            {invoice.bookingRef && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                <span className="text-purple-600 dark:text-purple-400 font-mono font-semibold">
                  {invoice.bookingRef}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Invoice #{invoice.invoiceNumber}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider ${
                invoice.status === "PAID"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : invoice.status === "PARTIALLY_PAID"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                  : invoice.status === "CANCELLED"
                  ? "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              }`}
            >
              {invoice.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <BookingCancellation invoice={invoice} />
          <PaymentRecoveryActions invoice={invoice} />

          {user?.role === "AGENCY_ADMIN" && outstanding > 0 && invoice.status !== "CANCELLED" && (
            <button
              onClick={openPaymentModal}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Record Direct Payment</span>
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-white dark:bg-[#0B0F19] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-gray-200 font-semibold text-xs flex items-center gap-1.5 border border-gray-200 dark:border-white/10 shadow-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Print Tax Invoice</span>
          </button>

          <a
            href={`https://wa.me/${(invoice.clientPhone || "").replace(/\D/g, "")}?text=${encodeURIComponent(
              invoice.status === "CANCELLED"
                ? `Dear ${invoice.clientName}, your booking linked to invoice #${invoice.invoiceNumber} has been cancelled. Refund recorded: ${formatMoney(invoice.refund?.refundAmountIssued ?? 0)}. No further payment is due.`
                : `Dear ${invoice.clientName}, your travel invoice #${invoice.invoiceNumber} from ${settings.name} has an outstanding balance of ${formatMoney(outstanding)}. Due Date: ${invoice.dueDate}. Please let us know once transferred so we can clear your milestones. Thank you!`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1.5 border border-emerald-500/20 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-emerald-500" />
            <span>WhatsApp Client</span>
          </a>
        </div>
      </div>

      {/* CANCELLATION AUDIT NOTICE IF APPLICABLE */}
      {invoice.refund && (
        <section className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs space-y-1">
          <h2 className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>Cancellation &amp; Refund Audit Record</span>
          </h2>
          <p className="text-gray-700 dark:text-gray-300">
            Paid before cancellation: {formatMoney(invoice.refund.totalPaidBeforeCancellation)} | Retained fee: {formatMoney(invoice.refund.cancellationFeeRetained)} | Refund issued: {formatMoney(invoice.refund.refundAmountIssued)}
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Reason: {invoice.refund.reasonCategory.replaceAll("_", " ")} | Method: {invoice.refund.refundMethod.replaceAll("_", " ")} | Ref: {invoice.refund.refundReference || "N/A"}
          </p>
          <p className="text-gray-500 text-[11px]">
            Processed by {invoice.refund.processedBy} on {invoice.refund.processedAt}. Receivables are permanently waived.
          </p>
        </section>
      )}

      {/* TWO-STEP FINANCIAL CLEARANCE GATE BANNER */}
      {pendingClaims.length > 0 && (
        <section className="rounded-xl border border-[#1B7167]/30 bg-[#1B7167]/[0.08] dark:bg-[#1B7167]/10 p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1B7167] text-white flex items-center justify-center shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Two-Step Financial Clearance Gate</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    Pending Clearance
                  </span>
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Payment claim submitted by Front Desk. Admin verification is required to officially settle milestones and issue the receipt.
                </p>
              </div>
            </div>

            {user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN" ? (
              <button
                onClick={() => setSelectedClaimIdForReview(pendingClaims[0].id)}
                className="px-4 py-2 rounded-xl bg-[#1B7167] hover:bg-[#155A52] text-white font-bold text-xs shadow-md shadow-[#1B7167]/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Verify &amp; Settle Claim</span>
              </button>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 text-xs font-medium">
                Awaiting Managing Director / Admin Approval
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#1B7167]/20 text-xs">
            <div className="p-3 rounded-lg bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Claimed Amount:</span>
              <p className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatMoney(pendingClaims[0].amount)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Bank / Raast Reference:</span>
              <p className="font-mono font-bold text-gray-900 dark:text-white">
                {pendingClaims[0].bankReference}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Submitted By &amp; Time:</span>
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                {pendingClaims[0].staffName} • {new Date(pendingClaims[0].createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Screenshot / Proof Preview button */}
          {pendingClaims[0].screenshotUrl && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <button
                onClick={() => setPreviewImageUrl(pendingClaims[0].screenshotUrl)}
                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>View Bank Slip / Screenshot</span>
              </button>
            </div>
          )}
        </section>
      )}

      {/* SUMMARY KPI STRIP */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Total Billed */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Total Invoiced Amount</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-gray-900 dark:text-white">{formatMoney(invoice.totalAmount)}</p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Subtotal &amp; Service Fees Incl.</span>
          </div>
        </div>

        {/* Amount Paid */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Amount Realized</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatMoney(invoice.paidAmount)}
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {paidPercent}% of Total Cleared
            </span>
          </div>
        </div>

        {/* Balance Due */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Outstanding Balance</span>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                outstanding > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-gray-100 dark:bg-white/5 text-gray-400"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p
              className={`text-2xl font-black font-mono ${
                outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {formatMoney(outstanding)}
            </p>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              {outstanding === 0 ? "Account Succeeded & Cleared" : `Final Due: ${invoice.dueDate || invoice.finalDueDate}`}
            </span>
          </div>
        </div>

        {/* Milestone State */}
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] p-5 shadow-sm transition-all duration-200 hover:border-purple-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">Collection Progress</span>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {outstanding === 0 ? "100% Realized" : `${paidPercent}% Realized`}
            </p>
            <div className="w-full bg-gray-100 dark:bg-[#030712] h-2 rounded-full overflow-hidden mt-2 border border-gray-200/60 dark:border-white/5">
              <div
                className={`h-full ${paidPercent >= 100 ? "bg-emerald-500" : "bg-purple-600"}`}
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 1: MILESTONE INSTALLMENT SCHEDULE (3 MILESTONES) */}
      {/* ==================================================================== */}
      <div className="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] space-y-5 print:hidden shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 dark:border-white/10 pb-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Milestone Installment Schedule</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Automated milestone payment plan linking booking deposit, mid-term installment, and pre-departure clearance.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            {paidPercent}% Total Realized
          </span>
        </div>

        {/* Milestone Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayMilestones.map((ms, idx) => {
            const isPaid =
              ms.status === "PAID" || ms.status === "Paid";
            const isPendingVerification =
              ms.status === "PENDING_VERIFICATION" ||
              (pendingClaims.length > 0 && !isPaid && idx === 1); // If pending claim applies
            const isMsOverdue =
              invoice.status !== "CANCELLED" &&
              !isPaid &&
              (ms.status === "OVERDUE" || ms.status === "Overdue" || new Date(ms.dueDate) < new Date(SIMULATION_DATE));

            return (
              <div
                key={ms.id || idx}
                className={`p-4 rounded-xl border transition-all relative overflow-hidden ${
                  isPaid
                    ? "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/30"
                    : isPendingVerification
                    ? "bg-purple-500/[0.05] dark:bg-purple-950/20 border-purple-500/40"
                    : isMsOverdue
                    ? "bg-rose-500/[0.04] dark:bg-rose-950/20 border-rose-500/40"
                    : "bg-gray-50 dark:bg-[#080C14] border-gray-200 dark:border-white/10"
                }`}
              >
                {/* Step Indicator Pill */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase tracking-wider bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                    Step 0{idx + 1}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border flex items-center gap-1 ${
                      isPaid
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : isPendingVerification
                        ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 animate-pulse"
                        : isMsOverdue
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {invoice.status === "CANCELLED" && !isPaid ? (
                      <span>Waived</span>
                    ) : isPaid ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Paid</span>
                      </>
                    ) : isPendingVerification ? (
                      <>
                        <ShieldCheck className="w-3 h-3 text-purple-500" />
                        <span>Verifying Proof</span>
                      </>
                    ) : isMsOverdue ? (
                      <>
                        <AlertTriangle className="w-3 h-3 text-rose-500" />
                        <span>Overdue</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Pending</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Milestone Title */}
                <h3 className="font-bold text-gray-900 dark:text-white text-xs mb-1">
                  {ms.name || ms.title}
                </h3>

                {/* Amount */}
                <p className="text-lg font-black font-mono text-gray-900 dark:text-white">
                  {formatMoney(ms.amount)}
                </p>

                {/* Due Date & Receipt Info */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Maturity Due Date:</span>
                    <strong className="font-mono text-gray-800 dark:text-gray-200">{ms.dueDate}</strong>
                  </div>
                  {isPaid && ms.receiptNo && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Official Receipt:</span>
                      <span className="font-mono font-bold text-[10px]">{ms.receiptNo}</span>
                    </div>
                  )}
                  {isPaid && ms.paidAt && (
                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
                      <span>Cleared on:</span>
                      <span>{ms.paidAt}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* SECTION 2: PAYMENT RECOVERY CALL LOGS & TIMELINE */}
      {/* ==================================================================== */}
      {invoiceCalls.length > 0 && (
        <div className="p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] space-y-4 print:hidden shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Receivables Recovery Call History ({invoiceCalls.length})</span>
            </h2>
            <span className="text-xs text-gray-500">Reverse Chronological Audit Log</span>
          </div>

          <div className="space-y-3">
            {invoiceCalls.map((call) => (
              <div
                key={call.id}
                className="p-3 rounded-lg bg-gray-50 dark:bg-[#080C14] border border-gray-100 dark:border-white/5 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {call.outcome.replaceAll("_", " ")}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {call.timestamp ? new Date(call.timestamp).toLocaleString() : ""}
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-200">{call.notes}</p>
                <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1">
                  <span>Logged by {call.staffName}</span>
                  {call.callbackDate && (
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      Callback Scheduled: {call.callbackDate}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: PRINTABLE / PDF TAX INVOICE PREVIEW */}
      {/* ==================================================================== */}
      <InvoiceDocument
        invoice={{ ...invoice, lineItems: displayLineItems, milestones: displayMilestones }}
        settings={settings}
      />

      {/* ==================================================================== */}
      {/* MODAL: DIRECT RECORD PAYMENT */}
      {/* ==================================================================== */}
      {user?.role === "AGENCY_ADMIN" && isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  Record Milestone Payment
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Post collection against Invoice #{invoice.invoiceNumber}
                </p>
              </div>
              <button
                onClick={() => setIsRecordPaymentOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 text-xs">
              {/* Payment Amount Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-gray-700 dark:text-gray-300 font-semibold block">
                    Payment Amount *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(outstanding)}
                    className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-medium"
                  >
                    Set Full Due ({formatMoney(outstanding)})
                  </button>
                </div>
                <input
                  type="number"
                  required
                  min={0.01}
                  step={0.01}
                  max={outstanding}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-mono text-base font-bold focus:outline-none focus:border-purple-500"
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 block">
                  Remaining balance after this payment:{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-mono">
                    {formatMoney(Math.max(0, outstanding - paymentAmount))}
                  </strong>
                </span>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-gray-700 dark:text-gray-300 font-semibold block">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="Bank Transfer">Bank Transfer / Raast / Wire (IBFT)</option>
                  <option value="Cash">Cash at Counter</option>
                  <option value="Credit Card">Credit Card / POS Terminal</option>
                  <option value="Cheque">Bank Cheque / Pay Order</option>
                  <option value="Online Portal">Online Portal Gateway</option>
                </select>
              </div>

              {/* Transaction Reference */}
              <div className="space-y-1">
                <label className="text-gray-700 dark:text-gray-300 font-semibold block">
                  Transaction / Cheque Reference #
                </label>
                <input
                  type="text"
                  placeholder="e.g. HBL-FT-991820 or CHQ-448102"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white font-mono focus:outline-none focus:border-purple-500 uppercase"
                />
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMAGE SLIP PREVIEW */}
      {previewImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-3">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-purple-600" />
                <span>Customer Payment Slip Proof</span>
              </h3>
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt="Bank slip proof"
                className="max-h-96 w-auto rounded-xl border border-gray-200 dark:border-white/10 object-contain"
              />
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-white/5">
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERIFY PAYMENT CLAIM */}
      {selectedClaimIdForReview && (
        <VerifyPaymentModal
          claimId={selectedClaimIdForReview}
          onClose={() => setSelectedClaimIdForReview(null)}
          onSuccess={(msg) => showToast(msg)}
        />
      )}
    </div>
  );
}

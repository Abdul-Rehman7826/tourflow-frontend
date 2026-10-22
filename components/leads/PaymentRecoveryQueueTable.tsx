"use client";

import React from "react";
import Link from "next/link";
import { Invoice } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { getWhatsAppLink } from "@/lib/leads-api";
import {
  FileText,
  User,
  Phone,
  Calendar,
  Clock,
  MessageSquare,
  ChevronRight,
  Receipt,
  UploadCloud,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Scale,
} from "lucide-react";

interface PaymentRecoveryQueueTableProps {
  invoices: Invoice[];
  todayStr: string;
  onOpenProofModal?: (invoice: Invoice) => void;
  onOpenCallLogModal?: (invoice: Invoice) => void;
  onOpenVerifyModal?: (claimId: string) => void;
}

export function PaymentRecoveryQueueTable({
  invoices,
  todayStr,
  onOpenProofModal,
  onOpenCallLogModal,
  onOpenVerifyModal,
}: PaymentRecoveryQueueTableProps) {
  const { formatMoney } = useAgencySettings();
  const { user } = useAuth();
  const { paymentProofClaims, recoveryCallLogs } = useData();

  const isAdmin = user?.role === "AGENCY_ADMIN" || user?.role === "SUPER_ADMIN";

  // Calculate days overdue
  const getDaysOverdue = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    const due = new Date(dueDateStr).getTime();
    const today = new Date(todayStr || new Date().toISOString().slice(0, 10)).getTime();
    const diff = today - due;
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  };

  if (invoices.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
          <Receipt className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">
          All Receivables Fully Settled
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          No overdue invoice balances or pending recovery installments require follow-up calls right now.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0B0F19] overflow-hidden overflow-x-auto shadow-sm">
      <table className="w-full table-fixed text-left border-collapse">
        <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">
          <tr>
            <th className="w-[18%] px-4 py-3">Invoice / Ref</th>
            <th className="w-[18%] px-4 py-3">Client Contact</th>
            <th className="w-[16%] px-4 py-3">Overdue Balance</th>
            <th className="w-[15%] px-4 py-3">Aging / Due Date</th>
            <th className="w-[15%] px-4 py-3">Proof Status</th>
            <th className="w-[18%] px-4 py-3 text-right">Recovery Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-xs">
          {invoices.map((invoice) => {
            const daysOverdue = getDaysOverdue(invoice.dueDate);
            const waLink = getWhatsAppLink(
              invoice.clientPhone || "",
              invoice.clientName || undefined
            );

            // Find most relevant payment proof claim
            const claim = paymentProofClaims.find((c) => c.invoiceId === invoice.id);
            // Count call logs
            const callCount = recoveryCallLogs.filter((c) => c.invoiceId === invoice.id).length;

            return (
              <tr
                key={invoice.id}
                className="group transition-colors hover:bg-rose-50/20 dark:hover:bg-rose-950/10"
              >
                {/* Invoice Reference & Booking Code */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="font-bold text-gray-900 dark:text-white font-mono hover:text-[#1B7167] dark:hover:text-teal-400 transition-colors flex items-center gap-1.5 truncate"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{invoice.invoiceNumber}</span>
                    </Link>
                    {(invoice.bookingRef || invoice.booking_number) && (
                      <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate">
                        Ref: {invoice.bookingRef || invoice.booking_number}
                      </p>
                    )}
                  </div>
                </td>

                {/* Client Contact Info */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white truncate">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{invoice.clientName || "Unnamed Client"}</span>
                    </div>
                    {invoice.clientPhone && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono flex items-center gap-1 truncate">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{invoice.clientPhone}</span>
                      </p>
                    )}
                  </div>
                </td>

                {/* Overdue Balance in PKR */}
                <td className="px-4 py-3.5 font-mono truncate">
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                      {formatMoney(invoice.dueAmount)}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      Total: {formatMoney(invoice.totalAmount)}
                    </p>
                  </div>
                </td>

                {/* Aging & Due Date */}
                <td className="px-4 py-3.5 truncate">
                  <div className="space-y-1 truncate">
                    {daysOverdue > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                        <Clock className="w-3 h-3 shrink-0" />
                        {daysOverdue}d Overdue
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        Due Today
                      </span>
                    )}
                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1 truncate">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {invoice.dueDate || "Immediate"}
                    </p>
                  </div>
                </td>

                {/* Payment Proof Status Badge */}
                <td className="px-4 py-3.5 truncate">
                  {claim?.status === "PENDING_VERIFICATION" && (
                    <span
                      title={`Txn Ref: ${claim.bankReference} | Claimed: ${formatMoney(claim.amount)}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    >
                      <Clock className="w-3 h-3 shrink-0 animate-spin" />
                      Pending Audit
                    </span>
                  )}
                  {claim?.status === "VERIFIED_APPROVED" && (
                    <span
                      title={`Verified by Admin on ${claim.verifiedAt || "Recent"}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      Verified
                    </span>
                  )}
                  {claim?.status === "REJECTED" && (
                    <span
                      title={`Rejection: ${claim.rejectionReason || "Invalid bank reference"}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                    >
                      <XCircle className="w-3 h-3 shrink-0" />
                      Rejected
                    </span>
                  )}
                  {!claim && (
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      Awaiting Proof
                    </span>
                  )}
                </td>

                {/* Recovery Actions Column */}
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* WhatsApp Reminder */}
                    {invoice.clientPhone && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors shrink-0"
                        title="Send WhatsApp payment reminder"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </a>
                    )}

                    {/* Log Call / History Button */}
                    <button
                      type="button"
                      onClick={() => onOpenCallLogModal?.(invoice)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors flex items-center gap-1 text-[11px] shrink-0 cursor-pointer"
                      title="View & Log Follow-up Calls"
                    >
                      <PhoneCall className="w-3 h-3 text-[#1B7167] dark:text-teal-400" />
                      <span>Calls {callCount > 0 && `(${callCount})`}</span>
                    </button>

                    {/* Submit Payment Proof Button */}
                    <button
                      type="button"
                      onClick={() => onOpenProofModal?.(invoice)}
                      className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] px-2.5 py-1.5 rounded-lg shadow-xs text-xs flex items-center gap-1 transition-all active:scale-95 shrink-0 cursor-pointer [&>svg]:text-white [&>span]:text-white"
                      title="Submit bank payment slip for admin audit"
                    >
                      <UploadCloud className="w-3 h-3 text-white" />
                      <span className="text-white">+ Proof</span>
                    </button>

                    {/* Admin 1-Click Verify Payment Button when Claim is Pending */}
                    {isAdmin && claim?.status === "PENDING_VERIFICATION" && (
                      <button
                        type="button"
                        onClick={() => onOpenVerifyModal?.(claim.id)}
                        className="bg-amber-600 hover:bg-amber-500 text-white font-medium px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer [&>svg]:text-white [&>span]:text-white"
                        title="Verify Payment Slip & Settle Milestones"
                      >
                        <Scale className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">Verify Payment</span>
                      </button>
                    )}

                    {/* Admin Direct Settle / Details Button */}
                    {isAdmin && (!claim || claim.status !== "PENDING_VERIFICATION") && (
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors shrink-0"
                        title="Admin Invoice Ledger Details"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

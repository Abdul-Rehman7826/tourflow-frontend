"use client";

import React, { useEffect } from "react";
import {
  CalendarDays,
  Download,
  Printer,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useTenant } from "@/context/TenantContext";
import type { PersonalPayslipRecord } from "@/types/erp";

export interface PersonalPayslipModalProps {
  payslip: PersonalPayslipRecord;
  onClose: () => void;
}

export function PersonalPayslipModal({ payslip, onClose }: PersonalPayslipModalProps) {
  const { formatMoney, settings } = useAgencySettings();
  const { tenant } = useTenant();
  const { item } = payslip;
  const deductions =
    item.lateArrivalDeduction +
    item.unpaidLeaveDeduction +
    item.salaryAdvancesDeduction;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    document.body.classList.add("payroll-print-mode");
    const cleanup = () => document.body.classList.remove("payroll-print-mode");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  const downloadStatement = () => {
    const rows = [
      [tenant.name || settings.name || "World Class Holidays (Pvt) Ltd.", "Confidential Salary Statement"],
      ["Pay Period", payslip.monthString],
      ["Employee Name", item.employeeName],
      ["Employee Code", item.employeeCode],
      ["Designation", item.designation],
      ["Department", item.department],
      ["Basic Salary (PKR)", item.basicSalary],
      ["Allowances (PKR)", item.allowances],
      ["Bonus / Incentive (PKR)", item.bonusesOrIncentives],
      ["Gross Earnings (PKR)", item.grossPay + item.bonusesOrIncentives],
      ["Late Arrival Deduction (PKR)", item.lateArrivalDeduction],
      ["Unpaid Leave Deduction (PKR)", item.unpaidLeaveDeduction],
      ["Salary Advance Deduction (PKR)", item.salaryAdvancesDeduction],
      ["Total Deductions (PKR)", deductions],
      ["Net Disbursed Salary (PKR)", item.netPayableSalary],
      ["Bank Name", item.bankName || "Meezan Bank Ltd"],
      ["IBAN / Account Number", item.bankIban || item.bankAccountNumber || "Not provided"],
      ["Payment Method", item.paymentMethod],
      ["Payment Status", item.paymentStatus],
      ["Verification Date", payslip.disbursedAt || payslip.generatedAt],
    ];
    const csvContent = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item.employeeCode}-${payslip.monthCode}-salary-voucher.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payslip-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F19] text-gray-900 dark:text-white print:border-none print:shadow-none print:max-w-none print:rounded-none">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-gray-200 p-6 dark:border-white/10 print:hidden bg-gradient-to-r from-gray-50 to-white dark:from-white/[0.02] dark:to-transparent">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF] font-bold text-[10px] tracking-wider uppercase border border-[#1B7167]/20">
                Confidential Salary Voucher
              </span>
              <span className="font-mono text-xs text-gray-400">SRS §4.9.9</span>
            </div>
            <h2 id="payslip-modal-title" className="text-xl font-black text-gray-950 dark:text-white">
              {item.employeeName}
            </h2>
            <p className="font-mono text-xs text-gray-500">
              {item.employeeCode} · {payslip.monthString}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payslip modal"
            className="rounded-xl p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Printable Voucher Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6 sm:p-8 print:max-h-none print:overflow-visible print:p-8 space-y-6">
          <article className="payroll-payslip space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-white/10 dark:bg-[#030712] print:border-none print:p-0">
            {/* Voucher Header */}
            <div className="flex items-start justify-between border-b border-gray-200 pb-5 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B7167] dark:text-[#2DD4BF]">
                  {tenant.name || settings.name || "World Class Holidays (Pvt) Ltd."}
                </p>
                <h3 className="mt-1 text-2xl font-black text-gray-950 dark:text-white tracking-tight">
                  Confidential Employee Salary Voucher
                </h3>
                <p className="mt-1 text-xs text-gray-500">
                  Payroll Cycle: <strong className="text-gray-800 dark:text-gray-200">{payslip.monthString}</strong> ({payslip.monthCode})
                </p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono text-xs font-bold uppercase">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {payslip.payrollStatus}
                </span>
                <p className="mt-1 font-mono text-[10px] text-gray-400">
                  REF: {item.paymentReference || `VCHR-${payslip.monthCode}-${item.employeeCode}`}
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Employee</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-white truncate">{item.employeeName}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Employee Code</p>
                <p className="mt-1 font-mono font-bold text-[#1B7167] dark:text-[#2DD4BF]">{item.employeeCode}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Department</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-white truncate">{item.department.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Designation</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-white truncate">{item.designation}</p>
              </div>
            </div>

            {/* Two-Column Itemized Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Gross Earnings */}
              <section className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-white/10">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Gross Earnings
                  </h4>
                  <span className="text-[10px] text-gray-400 font-mono">PKR</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-400">Basic Monthly Pay</span>
                    <span className="font-mono font-semibold">{formatMoney(item.basicSalary)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-400">Allowances & Subsidies</span>
                    <span className="font-mono font-semibold">{formatMoney(item.allowances)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-400">Incentives & Performance Bonus</span>
                    <span className="font-mono font-semibold">{formatMoney(item.bonusesOrIncentives)}</span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.03] font-bold">
                    <span className="text-gray-900 dark:text-white">Total Gross Earnings</span>
                    <span className="font-mono font-black text-gray-900 dark:text-white">
                      {formatMoney(item.grossPay + item.bonusesOrIncentives)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Right Column: Deductions */}
              <section className="space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200 dark:border-white/10">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Policy Deductions
                  </h4>
                  <span className="text-[10px] text-gray-400 font-mono">PKR</span>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-400">
                      Late Arrival Penalties ({item.totalLateArrivals} late)
                    </span>
                    <span className="font-mono font-semibold text-rose-500">
                      - {formatMoney(item.lateArrivalDeduction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-400">
                      Unexcused Absence / Unpaid Days ({item.unexcusedAbsences}d)
                    </span>
                    <span className="font-mono font-semibold text-rose-500">
                      - {formatMoney(item.unpaidLeaveDeduction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2 border-b border-gray-100 dark:border-white/5">
                    <span className="text-gray-600 dark:text-gray-400">Salary Advance Recovery</span>
                    <span className="font-mono font-semibold text-rose-500">
                      - {formatMoney(item.salaryAdvancesDeduction)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 dark:bg-white/[0.03] font-bold">
                    <span className="text-gray-900 dark:text-white">Total Deductions</span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                      - {formatMoney(deductions)}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {/* Bottom Banner: Net Disbursed Salary */}
            <div className="rounded-2xl border border-[#1B7167]/30 bg-[#1B7167]/10 p-5 dark:border-[#2DD4BF]/30 dark:bg-[#1B7167]/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">
                    Net Disbursed Take-Home Salary
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Transferred securely to employee designated bank account.
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-mono text-3xl font-black text-[#1B7167] dark:text-[#2DD4BF] tracking-tight">
                    {formatMoney(item.netPayableSalary)}
                  </p>
                </div>
              </div>
            </div>

            {/* Banking & Settlement Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Settlement Bank</p>
                <p className="mt-1 font-bold text-gray-900 dark:text-white">{item.bankName || "Meezan Bank Ltd"}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">IBAN / Account Number</p>
                <p className="mt-1 font-mono font-bold text-gray-900 dark:text-white truncate">
                  {item.bankIban || item.bankAccountNumber || "Not provided"}
                </p>
              </div>
            </div>

            {/* System Verification Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-gray-200 pt-4 text-[10px] text-gray-500 dark:border-white/10 gap-2">
              <span className="flex items-center gap-1.5 font-mono">
                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
                Verified: {new Intl.DateTimeFormat("en-PK", { dateStyle: "long" }).format(new Date(payslip.generatedAt))}
              </span>
              <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
                Official TourFlow Cryptographic Salary Record
              </span>
            </div>
          </article>
        </div>

        {/* Footer Actions (Hidden during print) */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712] print:hidden">
          <button
            type="button"
            onClick={downloadStatement}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-[#1B7167] hover:text-[#1B7167] dark:border-white/10 dark:text-gray-300 dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF] transition cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] hover:bg-[#155A52] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition cursor-pointer [&>svg]:text-white [&>span]:text-white"
          >
            <Printer className="h-4 w-4 text-white" />
            <span className="text-white font-medium">Print / Save as PDF</span>
          </button>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .payroll-payslip,
          .payroll-payslip * {
            visibility: visible;
          }
          .payroll-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Download, Printer, ShieldCheck, X } from "lucide-react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useTenant } from "@/context/TenantContext";
import type { PersonalPayslipRecord } from "@/types/erp";

export function PersonalPayslipModal({ payslip, onClose }: { payslip: PersonalPayslipRecord; onClose: () => void }) {
  const { formatMoney, settings } = useAgencySettings();
  const { tenant } = useTenant();
  const { item } = payslip;
  const deductions = item.lateArrivalDeduction + item.unpaidLeaveDeduction + item.salaryAdvancesDeduction;

  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const printPayslip = () => {
    document.body.classList.add("payroll-print-mode");
    const cleanup = () => document.body.classList.remove("payroll-print-mode");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  };

  const downloadStatement = () => {
    const rows = [
      [tenant.name || settings.name, "Confidential Salary Statement"],
      ["Pay Period", payslip.monthString],
      ["Employee", item.employeeName],
      ["Employee Code", item.employeeCode],
      ["Basic Salary", item.basicSalary],
      ["Allowances", item.allowances],
      ["Bonus / Incentive", item.bonusesOrIncentives],
      ["Late Arrival Deduction", item.lateArrivalDeduction],
      ["Unpaid Leave Deduction", item.unpaidLeaveDeduction],
      ["Salary Advance Deduction", item.salaryAdvancesDeduction],
      ["Net Disbursed Salary", item.netPayableSalary],
      ["Payment Method", item.paymentMethod],
      ["Payment Status", item.paymentStatus],
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${item.employeeCode}-${payslip.monthCode}-salary-statement.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/55 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="personal-payslip-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <aside className="fixed inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 dark:border-white/10 dark:bg-[#0B0F19]">
        <header className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-white/10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1B7167] dark:text-[#2DD4BF]">
              Private employee document
            </p>
            <h2 id="personal-payslip-title" className="mt-1 text-lg font-black text-gray-950 dark:text-white">
              {payslip.monthString} Payslip
            </h2>
            <p className="text-xs text-gray-500">{item.employeeCode} / {item.paymentStatus}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close payslip" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <article className="payroll-payslip mx-auto space-y-5 rounded-2xl border border-gray-200 bg-white p-5 text-gray-950 shadow-sm dark:border-white/10 dark:bg-[#030712] dark:text-white sm:p-7">
            <div className="border-b border-gray-200 pb-5 dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B7167] dark:text-[#2DD4BF]">
                {tenant.name || settings.name}
              </p>
              <h3 className="mt-1 text-xl font-black">Confidential Salary Payslip</h3>
              <p className="mt-1 text-xs text-gray-500">Salary period: {payslip.monthString}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Employee" value={item.employeeName} />
              <Info label="Employee Code" value={item.employeeCode} mono />
              <Info label="Designation" value={item.designation} />
              <Info label="Department" value={item.department.replaceAll("_", " ")} />
            </div>
            <Statement title="Earnings">
              <Money label="Basic Salary" value={formatMoney(item.basicSalary)} />
              <Money label="Allowances" value={formatMoney(item.allowances)} />
              <Money label="Bonus / Incentive" value={formatMoney(item.bonusesOrIncentives)} />
              <Money label="Gross Earnings" value={formatMoney(item.grossPay + item.bonusesOrIncentives)} strong />
            </Statement>
            <Statement title="Deductions">
              <Money label={`${item.totalLateArrivals} late arrival${item.totalLateArrivals === 1 ? "" : "s"}`} value={`- ${formatMoney(item.lateArrivalDeduction)}`} />
              <Money label={`${item.unexcusedAbsences} unexcused absence${item.unexcusedAbsences === 1 ? "" : "s"}`} value={`- ${formatMoney(item.unpaidLeaveDeduction)}`} />
              <Money label="Salary advance recovery" value={`- ${formatMoney(item.salaryAdvancesDeduction)}`} />
              <Money label="Total Deductions" value={`- ${formatMoney(deductions)}`} strong />
            </Statement>
            <div className="rounded-2xl border border-[#1B7167]/20 bg-[#1B7167]/10 p-5">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">Net Disbursed Salary</p>
              <p className="mt-1 font-mono text-2xl font-black text-[#1B7167] dark:text-[#2DD4BF]">{formatMoney(item.netPayableSalary)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Info label="Payment Method" value={item.paymentMethod.replaceAll("_", " ")} />
              <Info label="Account" value={maskAccount(item.bankIban || item.bankAccountNumber)} />
            </div>
            <footer className="flex items-center gap-2 border-t border-gray-200 pt-4 text-[10px] text-gray-500 dark:border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-[#1B7167] dark:text-[#2DD4BF]" /> Official payroll snapshot / {payslip.payrollStatus}
            </footer>
          </article>
        </div>
        <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712]">
          <button
            type="button"
            onClick={downloadStatement}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-700 hover:border-[#1B7167] hover:text-[#1B7167] dark:border-white/10 dark:text-gray-300 dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF]"
          >
            <Download className="h-4 w-4" /> Download Statement
          </button>
          <button
            type="button"
            onClick={printPayslip}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] [&>svg]:text-white [&>span]:text-white"
          >
            <Printer className="h-4 w-4 text-white" />
            <span className="text-white font-medium">Print / Save PDF</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}

function maskAccount(value: string) {
  const compact = value.replaceAll(" ", "");
  return compact ? `**** ${compact.slice(-4)}` : "Not provided";
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 text-xs dark:bg-white/[0.04]">
      <p className="text-[9px] font-black uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 font-semibold ${mono ? "font-mono text-[#1B7167] dark:text-[#2DD4BF]" : ""}`}>{value}</p>
    </div>
  );
}

function Statement({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">{title}</h4>
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">{children}</div>
    </section>
  );
}

function Money({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-gray-100 px-4 py-2.5 text-xs last:border-b-0 dark:border-white/5 ${strong ? "bg-gray-50 font-black dark:bg-white/[0.03]" : ""}`}>
      <span className={strong ? "" : "text-gray-500"}>{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

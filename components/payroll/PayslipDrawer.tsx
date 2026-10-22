"use client";

import { useEffect } from "react";
import { Banknote, CalendarDays, Printer, ShieldCheck, X } from "lucide-react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useTenant } from "@/context/TenantContext";
import type { EmployeePayrollItem, MonthlyPayrollRun } from "@/types/erp";

interface PayslipDrawerProps {
  run: MonthlyPayrollRun;
  item: EmployeePayrollItem;
  onClose: () => void;
}

export function PayslipDrawer({ run, item, onClose }: PayslipDrawerProps) {
  const { settings, formatMoney } = useAgencySettings();
  const { tenant } = useTenant();

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
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

  const deductions = item.lateArrivalDeduction + item.unpaidLeaveDeduction + item.salaryAdvancesDeduction;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[3px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="payslip-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <aside className="fixed inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-gray-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 dark:border-white/10 dark:bg-[#0B0F19]">
        <header className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-white/10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#1B7167] dark:text-[#2DD4BF]">
              Employee payslip vault
            </p>
            <h2 id="payslip-title" className="mt-1 text-lg font-black text-gray-950 dark:text-white">
              {item.employeeName}
            </h2>
            <p className="text-xs text-gray-500">{item.employeeCode} / {run.monthString}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close payslip" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <article className="payroll-payslip mx-auto space-y-5 rounded-2xl border border-gray-200 bg-white p-5 text-gray-950 shadow-sm dark:border-white/10 dark:bg-[#030712] dark:text-white sm:p-7">
            <div className="flex items-start justify-between border-b border-gray-200 pb-5 dark:border-white/10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1B7167] dark:text-[#2DD4BF]">
                  {tenant.name || settings.name}
                </p>
                <h3 className="mt-1 text-2xl font-black">Salary Payslip</h3>
                <p className="mt-1 text-xs text-gray-500">Payroll period: {run.monthString}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1B7167] text-white">
                <Banknote className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Info label="Employee" value={item.employeeName} />
              <Info label="Employee Code" value={item.employeeCode} mono />
              <Info label="Designation" value={item.designation} />
              <Info label="Department" value={item.department.replaceAll("_", " ")} />
              <Info label="Payment Method" value={item.paymentMethod.replaceAll("_", " ")} />
              <Info label="Payment Status" value={item.paymentStatus} />
            </div>

            <section>
              <h4 className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">Earnings</h4>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                <MoneyRow label="Basic Salary" value={formatMoney(item.basicSalary)} />
                <MoneyRow label="Allowances" value={formatMoney(item.allowances)} />
                <MoneyRow label="Bonus / Incentive" value={formatMoney(item.bonusesOrIncentives)} />
                <MoneyRow label="Gross Earnings" value={formatMoney(item.grossPay + item.bonusesOrIncentives)} strong />
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500">Attendance & Deductions</h4>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                <MoneyRow label={`${item.totalLateArrivals} late arrival${item.totalLateArrivals === 1 ? "" : "s"}`} value={`- ${formatMoney(item.lateArrivalDeduction)}`} />
                <MoneyRow label={`${item.unexcusedAbsences} unexcused absence${item.unexcusedAbsences === 1 ? "" : "s"}`} value={`- ${formatMoney(item.unpaidLeaveDeduction)}`} />
                <MoneyRow label="Salary advance recovery" value={`- ${formatMoney(item.salaryAdvancesDeduction)}`} />
                <MoneyRow label="Total Deductions" value={`- ${formatMoney(deductions)}`} strong />
              </div>
            </section>

            <div className="rounded-2xl border border-[#1B7167]/20 bg-[#1B7167]/10 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">Net Payable Salary</p>
                  <p className="mt-1 text-xs text-gray-500">After attendance penalties, advance recoveries, and bonuses</p>
                </div>
                <p className="font-mono text-2xl font-black text-[#1B7167] dark:text-[#2DD4BF]">{formatMoney(item.netPayableSalary)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <Info label="Bank" value={item.bankName || "Cash payment"} />
              <Info label="IBAN / Account" value={item.bankIban || item.bankAccountNumber || "Not provided"} mono />
            </div>

            <footer className="flex items-center justify-between border-t border-gray-200 pt-5 text-[10px] text-gray-500 dark:border-white/10">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Generated {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(run.generatedAt))}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> {run.status}
              </span>
            </footer>
          </article>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10">
            Close
          </button>
          <button
            type="button"
            onClick={printPayslip}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] [&>svg]:text-white [&>span]:text-white"
          >
            <Printer className="h-4 w-4 text-white" />
            <span className="text-white font-medium">Print Payslip</span>
          </button>
        </footer>
      </aside>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
      <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 font-semibold ${mono ? "font-mono text-[11px] text-[#1B7167] dark:text-[#2DD4BF]" : ""}`}>{value}</p>
    </div>
  );
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between border-b border-gray-100 px-4 py-2.5 last:border-b-0 dark:border-white/5 ${strong ? "bg-gray-50 dark:bg-white/[0.03]" : ""}`}>
      <span className={strong ? "font-bold" : "text-gray-500"}>{label}</span>
      <span className={`font-mono ${strong ? "font-black" : "font-semibold"}`}>{value}</span>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Banknote,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  ClockAlert,
  Landmark,
  LockKeyhole,
  Plus,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  WalletCards,
  X,
} from "lucide-react";
import { PayslipDrawer } from "@/components/payroll/PayslipDrawer";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useTenant } from "@/context/TenantContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { localDateKey } from "@/lib/attendance-operations";
import { useMounted } from "@/lib/use-mounted";
import type { EmployeePayrollItem, SalaryAdvance } from "@/types/erp";

const currentMonth = localDateKey().slice(0, 7);

const statusClass = {
  DRAFT: "border-gray-500/20 bg-gray-500/10 text-gray-600 dark:text-gray-300",
  CALCULATED: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DISBURSED: "border-[#1B7167]/20 bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF]",
  LOCKED: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

export default function PayrollPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { formatMoney } = useAgencySettings();
  const {
    employees,
    attendanceRecords,
    payrollRuns,
    salaryAdvances,
    calculateMonthlyPayroll,
    updatePayrollEmployee,
    approvePayrollRun,
    disbursePayrollRun,
    createSalaryAdvance,
    reviewSalaryAdvance,
  } = useData();

  const mounted = useMounted();
  const [monthCode, setMonthCode] = useState(currentMonth);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [payslipEmployeeId, setPayslipEmployeeId] = useState<string | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [disbursementOpen, setDisbursementOpen] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [advanceForm, setAdvanceForm] = useState({ employeeId: "", amount: 0, reason: "" });

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1B7167] border-t-transparent" />
      </div>
    );
  }

  // Front-Desk Privacy Shield: Strictly restrict compensation views from Front Desk staff
  if (!user || !["AGENCY_ADMIN", "HR_MANAGER"].includes(user.role) || user.tenantId !== tenant.id) {
    return (
      <main className="mx-auto mt-12 max-w-xl p-4">
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-6 text-center shadow-lg dark:bg-[#121C18]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
            Front-Desk Privacy Shield
          </p>
          <h1 className="mt-1 text-xl font-black text-gray-950 dark:text-white">Compensation Access Restricted</h1>
          <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            Executive payroll records and company-wide salaries are confidential to Agency Administrators and HR Managers.
            You can access your personal salary voucher at the Employee Payslip Portal.
          </p>
          <a
            href="/payslips"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] [&>svg]:text-white [&>span]:text-white"
          >
            <WalletCards className="h-4 w-4 text-white" />
            <span className="text-white font-medium">Open Personal Payslips</span>
          </a>
        </div>
      </main>
    );
  }

  const run = payrollRuns.find((entry) => entry.monthCode === monthCode && entry.tenantId === tenant.id);
  const selectedPayslip = run?.items.find((item) => item.employeeId === payslipEmployeeId);
  const monthAttendance = attendanceRecords.filter((record) => record.attendanceDate.startsWith(monthCode));
  const monthAdvances = salaryAdvances.filter((advance) => advance.payrollMonth === monthCode && advance.tenantId === tenant.id);

  const totalLateDeductions = run?.items.reduce((sum, item) => sum + item.lateArrivalDeduction, 0) ?? 0;
  const totalAdvanceDeductions = run?.items.reduce((sum, item) => sum + item.salaryAdvancesDeduction, 0) ?? 0;

  const perform = (action: () => string) => {
    setError("");
    try {
      setNotice(action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to complete the payroll action.");
    }
  };

  const calculate = () => perform(() => {
    const result = calculateMonthlyPayroll(monthCode);
    return `${result.monthString} payroll calculated for ${result.items.length} employees.`;
  });

  const approve = () => {
    if (!run) return;
    perform(() => {
      approvePayrollRun(run.id);
      return `${run.monthString} payroll approved and locked from recalculation.`;
    });
  };

  const disburse = () => {
    if (!run) return;
    perform(() => {
      disbursePayrollRun(run.id, paymentReference);
      setDisbursementOpen(false);
      setPaymentReference("");
      return `${run.monthString} payroll marked disbursed. Payslips are now finalized.`;
    });
  };

  const saveAdvance = () => perform(() => {
    const advance = createSalaryAdvance({ ...advanceForm, payrollMonth: monthCode });
    setAdvanceOpen(false);
    setAdvanceForm({ employeeId: "", amount: 0, reason: "" });
    return `Salary advance request created for ${advance.employeeName}.`;
  });

  const metrics = [
    {
      label: "Total Gross Liability",
      value: run ? formatMoney(run.totalGrossLiability) : "Not calculated",
      icon: CircleDollarSign,
      color: "text-[#1B7167] bg-[#1B7167]/10 dark:text-[#2DD4BF]",
    },
    {
      label: "Late Penalties Deducted",
      value: run ? formatMoney(totalLateDeductions) : "--",
      icon: ClockAlert,
      color: "text-amber-500 bg-amber-500/10",
    },
    {
      label: "Advances Deducted",
      value: run ? formatMoney(totalAdvanceDeductions) : "--",
      icon: TrendingDown,
      color: "text-rose-500 bg-rose-500/10",
    },
    {
      label: "Net Total Payable",
      value: run ? formatMoney(run.totalNetDisbursement) : "--",
      icon: Landmark,
      color: "text-emerald-500 bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-[#1B7167]/20 bg-[#1B7167]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin compensation vault
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white lg:text-3xl">
            Monthly Payroll Engine
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {tenant.name} / Attendance-linked salary calculation, penalty ledger, and payslip disbursement
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            aria-label="Payroll month"
            type="month"
            value={monthCode}
            onChange={(event) => {
              setMonthCode(event.target.value);
              setNotice("");
              setError("");
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#0B0F19]"
          />
          <button
            type="button"
            onClick={() => setAdvanceOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:border-[#1B7167] hover:text-[#1B7167] dark:border-white/10 dark:bg-[#0B0F19] dark:text-gray-200 dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF]"
          >
            <Plus className="h-4 w-4" /> Salary Advance
          </button>
          <button
            type="button"
            onClick={calculate}
            disabled={Boolean(run && ["APPROVED", "DISBURSED", "LOCKED"].includes(run.status))}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B7167] px-4 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:text-white [&>span]:text-white"
          >
            <Calculator className="h-4 w-4 text-white" />
            <span className="text-white font-medium">{run ? "Recalculate Payroll" : "Calculate Payroll"}</span>
          </button>
        </div>
      </header>

      {notice && (
        <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {/* Top Metric Ribbon */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0B0F19]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{label}</span>
              <span className={`rounded-lg p-2 ${color}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 font-mono text-xl font-black text-gray-950 dark:text-white">{value}</p>
          </article>
        ))}
      </section>

      {/* Itemized Payroll Register Table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-gray-950 dark:text-white">Itemized Payroll Register</h2>
              {run && (
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusClass[run.status]}`}>
                  {run.status}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-gray-500">
              {monthAttendance.length} attendance logs processed · 3-late arrival penalty rule applied
            </p>
          </div>
          {run && (
            <div className="flex gap-2">
              {run.status === "CALCULATED" && (
                <button
                  type="button"
                  onClick={approve}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 [&>svg]:text-white [&>span]:text-white"
                >
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span className="text-white font-medium">Lock & Approve Payroll</span>
                </button>
              )}
              {run.status === "APPROVED" && (
                <button
                  type="button"
                  onClick={() => setDisbursementOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#155A52] [&>svg]:text-white [&>span]:text-white"
                >
                  <Banknote className="h-4 w-4 text-white" />
                  <span className="text-white font-medium">Record Disbursement</span>
                </button>
              )}
              {["DISBURSED", "LOCKED"].includes(run.status) && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[#1B7167]/20 bg-[#1B7167]/10 px-3 py-1.5 text-xs font-bold text-[#1B7167] dark:text-[#2DD4BF]">
                  <LockKeyhole className="h-3.5 w-3.5" /> Disbursed & Finalized
                </span>
              )}
            </div>
          )}
        </div>

        {!run ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF]">
              <Calculator className="h-7 w-7" />
            </div>
            <h3 className="mt-4 text-base font-black text-gray-950 dark:text-white">No payroll run calculated for {monthCode}</h3>
            <p className="mt-2 max-w-md text-xs leading-5 text-gray-500">
              Calculate payroll to aggregate attendance, approved salary advances, absence deductions, and late penalties across all active employees.
            </p>
            <button
              type="button"
              onClick={calculate}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] [&>svg]:text-white [&>span]:text-white"
            >
              <Calculator className="h-4 w-4 text-white" />
              <span className="text-white font-medium">Calculate {monthCode}</span>
            </button>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 dark:bg-white/[0.02]">
                <tr>
                  <th className="w-[24%] px-4 py-3">Employee</th>
                  <th className="w-[14%] px-4 py-3">Base Pay</th>
                  <th className="w-[10%] px-4 py-3">Allowances</th>
                  <th className="w-[12%] px-4 py-3">Late Punches</th>
                  <th className="w-[16%] px-4 py-3">Deductions</th>
                  <th className="w-[14%] px-4 py-3">Net Payable</th>
                  <th className="w-[10%] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {run.items.map((item) => (
                  <PayrollRow
                    key={item.id}
                    item={item}
                    locked={run.status !== "CALCULATED"}
                    formatMoney={formatMoney}
                    onUpdate={(updates) =>
                      perform(() => {
                        updatePayrollEmployee(run.id, item.employeeId, updates);
                        return `${item.employeeName}'s payroll adjustments were updated.`;
                      })
                    }
                    onPayslip={() => setPayslipEmployeeId(item.employeeId)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Salary Advance Queue */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/10">
          <div>
            <h2 className="text-sm font-black text-gray-950 dark:text-white">Salary Advance Queue</h2>
            <p className="text-[11px] text-gray-500">Approved advances are automatically deducted from the targeted payroll month.</p>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            {monthAdvances.filter((advance) => advance.status === "PENDING").length} Pending
          </span>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {monthAdvances.length ? (
            monthAdvances.map((advance) => (
              <AdvanceRow
                key={advance.id}
                advance={advance}
                formatMoney={formatMoney}
                onReview={(decision) =>
                  perform(() => {
                    reviewSalaryAdvance(advance.id, decision);
                    return `${advance.employeeName}'s advance was ${decision === "APPROVE" ? "approved" : "rejected"}. Recalculate payroll to apply changes.`;
                  })
                }
              />
            ))
          ) : (
            <p className="p-6 text-center text-xs text-gray-500">No salary advance requests logged for {monthCode}.</p>
          )}
        </div>
      </section>

      {/* Printable Payslip Drawer */}
      {run && selectedPayslip && (
        <PayslipDrawer
          run={run}
          item={selectedPayslip}
          onClose={() => setPayslipEmployeeId(null)}
        />
      )}

      {/* Salary Advance Request Modal */}
      {advanceOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[3px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="advance-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setAdvanceOpen(false); }}
        >
          <aside className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl animate-in slide-in-from-right duration-200 dark:border-white/10 dark:bg-[#0B0F19]">
            <header className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-white/10">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">Compensation request</p>
                <h2 id="advance-title" className="text-lg font-black text-gray-950 dark:text-white">New Salary Advance</h2>
                <p className="text-xs text-gray-500">Deduction target: {monthCode}</p>
              </div>
              <button type="button" onClick={() => setAdvanceOpen(false)} aria-label="Close advance drawer" className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Employee</span>
                <select
                  value={advanceForm.employeeId}
                  onChange={(event) => setAdvanceForm((current) => ({ ...current, employeeId: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712]"
                >
                  <option value="">Select employee</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>{employee.employeeCode} - {employee.fullName}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Advance Amount (PKR)</span>
                <input
                  type="number"
                  min="1"
                  value={advanceForm.amount || ""}
                  onChange={(event) => setAdvanceForm((current) => ({ ...current, amount: Number(event.target.value) }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Reason</span>
                <textarea
                  rows={4}
                  value={advanceForm.reason}
                  onChange={(event) => setAdvanceForm((current) => ({ ...current, reason: event.target.value }))}
                  placeholder="State the reason and recovery agreement..."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712]"
                />
              </label>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-700 dark:text-amber-300">
                This request enters a pending state. It is factored into payroll calculations only after administrator approval.
              </div>
            </div>
            <footer className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712]">
              <button
                type="button"
                onClick={() => setAdvanceOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveAdvance}
                disabled={!advanceForm.employeeId || advanceForm.amount <= 0 || !advanceForm.reason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:text-white [&>span]:text-white"
              >
                <span className="text-white font-medium">Create Advance Request</span>
              </button>
            </footer>
          </aside>
        </div>
      )}

      {/* Record Disbursement Modal */}
      {disbursementOpen && run && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="disbursement-title"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDisbursementOpen(false); }}
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#0B0F19]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1B7167] dark:text-[#2DD4BF]">Final payroll action</p>
                <h2 id="disbursement-title" className="text-lg font-black text-gray-950 dark:text-white">Record Disbursement</h2>
              </div>
              <button type="button" onClick={() => setDisbursementOpen(false)} aria-label="Close disbursement dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-gray-500">
              This action marks all {run.items.length} employee payouts as processed and marks approved advances as deducted.
            </p>
            <label className="mt-4 block space-y-1.5">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100">Bank Batch / Payment Reference</span>
              <input
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="e.g. HBL-WCH-SEP26-BATCH-001"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-mono text-sm outline-none focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712]"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDisbursementOpen(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={disburse}
                disabled={!paymentReference.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-[#1B7167]/20 transition hover:bg-[#155A52] disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:text-white [&>span]:text-white"
              >
                <Banknote className="h-4 w-4 text-white" />
                <span className="text-white font-medium">Confirm Disbursement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PayrollRow({
  item,
  locked: _locked,
  formatMoney,
  onUpdate: _onUpdate,
  onPayslip,
}: {
  item: EmployeePayrollItem;
  locked: boolean;
  formatMoney: (value: number) => string;
  onUpdate: (updates: Pick<EmployeePayrollItem, "bonusesOrIncentives" | "paymentMethod">) => void;
  onPayslip: () => void;
}) {
  return (
    <tr className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02]">
      <td className="truncate px-4 py-3">
        <p className="truncate font-bold text-gray-950 dark:text-white">{item.employeeName}</p>
        <p className="font-mono text-[10px] text-[#1B7167] dark:text-[#2DD4BF]">{item.employeeCode} / {item.designation}</p>
      </td>
      <td className="px-4 py-3 font-mono font-semibold">{formatMoney(item.basicSalary)}</td>
      <td className="px-4 py-3 font-mono text-gray-600 dark:text-gray-400">{formatMoney(item.allowances)}</td>
      <td className="px-4 py-3">
        <span className="inline-block rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
          {item.totalLateArrivals} late{item.totalLateArrivals === 1 ? "" : "s"}
        </span>
      </td>
      <td className="px-4 py-3 font-mono text-[10px] text-rose-600 dark:text-rose-400">
        <p>Late: {formatMoney(item.lateArrivalDeduction)}</p>
        <p>Adv: {formatMoney(item.salaryAdvancesDeduction)}</p>
      </td>
      <td className="px-4 py-3 font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
        {formatMoney(item.netPayableSalary)}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onPayslip}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:border-[#1B7167] hover:text-[#1B7167] dark:border-white/10 dark:text-gray-300 dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF]"
        >
          <ReceiptText className="h-3.5 w-3.5" /> Slip
        </button>
      </td>
    </tr>
  );
}

function AdvanceRow({
  advance,
  formatMoney,
  onReview,
}: {
  advance: SalaryAdvance;
  formatMoney: (value: number) => string;
  onReview: (decision: "APPROVE" | "REJECT") => void;
}) {
  const styles =
    advance.status === "APPROVED"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : advance.status === "REJECTED"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : advance.status === "DEDUCTED"
      ? "bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF]"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400";

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-gray-950 dark:text-white">{advance.employeeName}</p>
          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${styles}`}>{advance.status}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">{advance.reason}</p>
        <p className="mt-1 font-mono text-xs font-black text-gray-900 dark:text-gray-100">{formatMoney(advance.amount)}</p>
      </div>
      {advance.status === "PENDING" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onReview("REJECT")}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-rose-500 hover:text-rose-600 dark:border-white/10 dark:text-gray-300"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => onReview("APPROVE")}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700 [&>svg]:text-white [&>span]:text-white"
          >
            <span className="text-white font-medium">Approve</span>
          </button>
        </div>
      )}
    </div>
  );
}

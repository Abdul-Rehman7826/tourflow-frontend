"use client";

import React, { useState, useEffect } from "react";
import {
  Banknote,
  CalendarCheck,
  Clock3,
  Coins,
  FileText,
  Plus,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { PersonalPayslipModal } from "@/components/portal/PersonalPayslipModal";
import { RequestAdvanceModal } from "@/components/portal/RequestAdvanceModal";
import { useData } from "@/context/DataContext";
import { useTenant } from "@/context/TenantContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { localDateKey } from "@/lib/attendance-operations";
import { useMounted } from "@/lib/use-mounted";
import {
  getPersonalPayslips,
  getPersonalAdvances,
  requestAdvance as requestAdvanceApi,
} from "@/lib/portal-api";
import type { PersonalPayslipRecord, SalaryAdvance } from "@/types/erp";

const currentMonth = localDateKey().slice(0, 7);

export default function EmployeePayslipsPage() {
  const { tenant } = useTenant();
  const { formatMoney } = useAgencySettings();
  const {
    currentEmployeeProfile,
    personalAttendanceRecords,
    personalSalaryAdvances,
    personalPayslips: contextPayslips,
    requestPersonalSalaryAdvance,
    shifts,
  } = useData();

  const mounted = useMounted();
  const [selectedPayslip, setSelectedPayslip] = useState<PersonalPayslipRecord | null>(null);
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Live backend synced state fallbacks
  const [apiPayslips, setApiPayslips] = useState<PersonalPayslipRecord[]>([]);
  const [apiAdvances, setApiAdvances] = useState<SalaryAdvance[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPortalData() {
      try {
        const [payslipsData, advancesData] = await Promise.all([
          getPersonalPayslips(),
          getPersonalAdvances(),
        ]);
        if (!cancelled) {
          if (payslipsData.length) setApiPayslips(payslipsData);
          if (advancesData.length) setApiAdvances(advancesData);
        }
      } catch {
        // Fallback to DataContext state
      }
    }
    loadPortalData();
    return () => {
      cancelled = true;
    };
  }, []);

  const payslipsList = apiPayslips.length ? apiPayslips : contextPayslips;
  const advancesList = apiAdvances.length ? apiAdvances : personalSalaryAdvances;

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  };

  if (!mounted) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--agency-action)] border-t-transparent" />
      </div>
    );
  }

  if (!currentEmployeeProfile) {
    return (
      <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-amber-500/20 bg-white p-8 text-center shadow-lg dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-black text-gray-950 dark:text-white">Employee Profile Not Linked</h1>
        <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
          Your authenticated user account is not connected to an active employee record in <strong className="text-gray-800 dark:text-gray-200">{tenant.name}</strong>.
          Please contact your agency HR administrator to link your staff profile.
        </p>
      </div>
    );
  }

  const employee = currentEmployeeProfile;
  const shift = shifts.find((entry) => entry.id === employee.shiftId);
  const latestPayslip = payslipsList[0];

  const monthAttendance = personalAttendanceRecords.filter((record) =>
    record.attendanceDate.startsWith(currentMonth)
  );
  const daysPresent = monthAttendance.reduce(
    (total, record) =>
      total + (["PRESENT", "LATE"].includes(record.status) ? 1 : record.status === "HALF_DAY" ? 0.5 : 0),
    0
  );
  const lateCount = monthAttendance.filter((record) => record.status === "LATE").length;
  const activeAdvanceBalance = advancesList
    .filter((advance) => ["PENDING", "APPROVED"].includes(advance.status))
    .reduce((sum, advance) => sum + advance.amount, 0);

  const initials = employee.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleAdvanceSubmit = async (data: {
    amount: number;
    payrollMonth: string;
    reason: string;
    acknowledged: boolean;
  }) => {
    // 1. Context local state update
    requestPersonalSalaryAdvance({
      amount: data.amount,
      payrollMonth: data.payrollMonth,
      reason: data.reason,
    });

    // 2. Async FastAPI backend synchronization
    try {
      await requestAdvanceApi({
        amount: data.amount,
        target_month: data.payrollMonth,
        reason: data.reason,
        acknowledged: data.acknowledged,
      });
    } catch {
      // Offline-resilient fallback
    }

    showToast("Salary advance request submitted successfully for Administrator review.");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl bg-emerald-600 text-white font-medium flex items-center gap-3 border border-emerald-500/30 animate-in slide-in-from-top-3 duration-200 [&>svg]:text-white [&>span]:text-white">
          <Sparkles className="w-5 h-5 text-white" />
          <span className="text-xs">{notice}</span>
        </div>
      )}

      {/* 3.1 Employee Profile Ribbon */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="h-1.5 bg-[var(--agency-action)]" />
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Avatar/Initials, Full Name, Code, Designation, Department */}
          <div className="flex min-w-0 items-center gap-4">
            {employee.avatarUrl ? (
              <div
                className="h-16 w-16 shrink-0 rounded-2xl bg-cover bg-center ring-4 ring-[var(--agency-accent)]/20"
                style={{ backgroundImage: `url(${employee.avatarUrl})` }}
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--agency-action)] text-lg font-black text-[var(--agency-on-accent)] shadow-lg">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded border border-[var(--agency-accent)]/25 bg-[var(--agency-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--agency-action)] dark:text-[var(--agency-accent)]">
                  Employee Self-Service Vault
                </span>
                <span className="text-xs font-mono text-gray-400">SRS §4.9.9</span>
              </div>
              <h1 className="truncate text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                {employee.fullName}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-bold text-gray-700 dark:text-gray-300">{employee.designation}</span>
                <span>·</span>
                <span className="rounded-md bg-gray-100 dark:bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                  {employee.department.replaceAll("_", " ")}
                </span>
                <span>·</span>
                <span className="font-mono font-bold text-[var(--agency-action)] dark:text-[var(--agency-accent)]">
                  {employee.employeeCode}
                </span>
              </div>
            </div>
          </div>

          {/* Work shift and employee action */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Shift Pill */}
            <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-2 text-xs font-semibold text-gray-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-300">
              <CalendarCheck className="h-4 w-4 text-[var(--agency-action)] dark:text-[var(--agency-accent)]" />
              <span>
                {employee.shiftName || "Regular Day Shift"}
                {shift ? ` (${shift.startTime} - ${shift.endTime} • 15m Grace)` : " (09:00 - 18:00 • 15m Grace)"}
              </span>
            </span>

            {/* Action Button: Request Advance */}
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--agency-action)] px-4 py-2 text-xs font-medium text-[var(--agency-on-accent)] shadow-lg transition hover:opacity-90 [&>svg]:text-[var(--agency-on-accent)] [&>span]:text-[var(--agency-on-accent)]"
            >
              <Plus className="h-4 w-4 text-white" />
              <span className="text-white font-medium">Request Salary Advance</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3.2 Personal KPI Ribbon (4 Metric Cards) */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Latest Net Disbursed */}
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0B0F19] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Latest Net Disbursed
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Banknote className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-gray-950 dark:text-white tracking-tight">
            {latestPayslip ? formatMoney(latestPayslip.item.netPayableSalary) : "PKR 0"}
          </div>
          <div className="pt-1 flex items-center justify-between">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                latestPayslip?.payrollStatus === "DISBURSED" || latestPayslip?.item.paymentStatus === "PROCESSED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {latestPayslip?.payrollStatus === "DISBURSED" || latestPayslip?.item.paymentStatus === "PROCESSED"
                ? "PAID"
                : "PROCESSING"}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              {latestPayslip?.monthString || "No cycle"}
            </span>
          </div>
        </article>

        {/* 2. Current Month Attendance */}
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0B0F19] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Current Month Attendance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF]">
              <CalendarCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-gray-950 dark:text-white tracking-tight">
            {daysPresent} / {latestPayslip?.item.workingDaysInMonth || 26} Days
          </div>
          <div className="pt-1 flex items-center justify-between">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                daysPresent >= 20
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              {daysPresent >= 20 ? "🟢 Good Standing" : "⚠️ Review Needed"}
            </span>
            <span className="text-[10px] text-gray-400">
              {monthAttendance.length} logs
            </span>
          </div>
        </article>

        {/* 3. Lateness / Penalty Tracker */}
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0B0F19] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Lateness & Penalties
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock3 className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {lateCount} Late Punch{lateCount === 1 ? "" : "es"}
          </div>
          <p className="pt-1 text-[10px] text-gray-400 leading-tight">
            3 late punches past 15m grace deduct 1 gross daily wage
          </p>
        </article>

        {/* 4. Active Advance Balance */}
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/10 dark:bg-[#0B0F19] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Active Advance Balance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <WalletCards className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="font-mono text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
            {formatMoney(activeAdvanceBalance)}
          </div>
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              {advancesList.filter((a) => a.status === "PENDING").length} Pending approval
            </span>
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(true)}
              className="text-[10px] font-bold text-[#1B7167] dark:text-[#2DD4BF] hover:underline cursor-pointer"
            >
              + Request
            </button>
          </div>
        </article>
      </section>

      {/* 4. Personal Payslip Vault Archive Table (w-full table-fixed) */}
      <section className="rounded-3xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0B0F19] overflow-hidden">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 p-6 dark:border-white/10 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#1B7167] dark:text-[#2DD4BF]" />
              <h2 className="text-lg font-black text-gray-950 dark:text-white">
                Personal Payslip Vault
              </h2>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Itemized historical compensation records, statutory attendance deductions, and bank disbursement receipts.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF] text-xs font-mono font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Ledger
          </span>
        </header>

        {payslipsList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
              No finalized salary payslips found
            </h3>
            <p className="mx-auto max-w-md text-xs text-gray-500">
              Your official salary voucher will appear here once agency management executes and disburses the monthly payroll run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-xs divide-y divide-gray-200 dark:divide-white/5">
              <thead className="bg-gray-50/80 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:bg-white/[0.02] dark:text-gray-400">
                <tr>
                  <th className="w-[15%] px-4 py-3.5">Pay Period</th>
                  <th className="w-[11%] px-3 py-3.5">Issue Date</th>
                  <th className="w-[13%] px-3 py-3.5 text-right">Gross Earnings</th>
                  <th className="w-[12%] px-3 py-3.5 text-right">Deductions</th>
                  <th className="w-[14%] px-3 py-3.5 text-right">Net Take-Home</th>
                  <th className="w-[14%] px-3 py-3.5">Payment & Bank</th>
                  <th className="w-[10%] px-3 py-3.5 text-center">Status</th>
                  <th className="w-[11%] px-4 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {payslipsList.map((payslip) => {
                  const item = payslip.item;
                  const deductions =
                    item.lateArrivalDeduction +
                    item.unpaidLeaveDeduction +
                    item.salaryAdvancesDeduction;
                  const isPaid =
                    payslip.payrollStatus === "DISBURSED" ||
                    item.paymentStatus === "PROCESSED";

                  return (
                    <tr
                      key={payslip.runId}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* 1. Pay Period */}
                      <td className="px-4 py-4 font-bold text-gray-950 dark:text-white">
                        <div className="font-bold truncate">{payslip.monthString}</div>
                        <div className="font-mono text-[10px] text-gray-400">{payslip.monthCode}</div>
                      </td>

                      {/* 2. Issue Date */}
                      <td className="px-3 py-4 font-mono text-gray-500 text-xs">
                        {payslip.disbursedAt
                          ? new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(payslip.disbursedAt))
                          : new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(new Date(payslip.generatedAt))}
                      </td>

                      {/* 3. Gross Earnings */}
                      <td className="px-3 py-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        {formatMoney(item.grossPay + item.bonusesOrIncentives)}
                      </td>

                      {/* 4. Policy Deductions */}
                      <td className="px-3 py-4 text-right font-mono font-semibold text-rose-500">
                        - {formatMoney(deductions)}
                      </td>

                      {/* 5. Net Take-Home Salary */}
                      <td className="px-3 py-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatMoney(item.netPayableSalary)}
                      </td>

                      {/* 6. Payment Method & Bank */}
                      <td className="px-3 py-4">
                        <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                          {item.paymentMethod.replaceAll("_", " ")}
                        </p>
                        <p className="font-mono text-[10px] text-gray-500 truncate">
                          {item.bankName || "Meezan Bank Ltd"}
                        </p>
                      </td>

                      {/* 7. Status Badge */}
                      <td className="px-3 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            isPaid
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          {isPaid ? "PAID" : "PROCESSING"}
                        </span>
                      </td>

                      {/* 8. Action Button */}
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayslip(payslip)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-2.5 py-1.5 text-xs font-bold text-gray-700 hover:border-[#1B7167] hover:text-[#1B7167] dark:border-white/10 dark:text-gray-300 dark:hover:border-[#2DD4BF] dark:hover:text-[#2DD4BF] transition cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* History Split Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Personal Attendance History */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0B0F19]">
          <header className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[#1B7167]/10 p-2 text-[#1B7167] dark:text-[#2DD4BF]">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-gray-950 dark:text-white">
                  Personal Attendance History
                </h2>
                <p className="text-[10px] text-gray-500">Recent daily check-in and check-out logs</p>
              </div>
            </div>
          </header>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {personalAttendanceRecords.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-500">No attendance records logged yet.</p>
            ) : (
              personalAttendanceRecords
                .slice()
                .sort((a, b) => b.attendanceDate.localeCompare(a.attendanceDate))
                .slice(0, 7)
                .map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 text-xs hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                  >
                    <div>
                      <p className="font-bold text-gray-950 dark:text-white">
                        {new Intl.DateTimeFormat("en-PK", { dateStyle: "medium" }).format(
                          new Date(`${record.attendanceDate}T12:00:00`)
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500">{record.shiftName}</p>
                    </div>
                    <span className="font-mono text-[11px] text-gray-600 dark:text-gray-400">
                      {(record.checkInAt || record.check_in)?.slice(0, 5) || "--:--"} -{" "}
                      {(record.checkOutAt || record.check_out)?.slice(0, 5) || "--:--"}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${
                        record.status === "PRESENT"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : record.status === "LATE"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : "bg-gray-500/10 text-gray-500 border border-gray-500/20"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                ))
            )}
          </div>
        </section>

        {/* Salary Advance Requests */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xs dark:border-white/10 dark:bg-[#0B0F19]">
          <header className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-[#1B7167]/10 p-2 text-[#1B7167] dark:text-[#2DD4BF]">
                <Coins className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-black text-gray-950 dark:text-white">
                  Salary Advance Requests
                </h2>
                <p className="text-[10px] text-gray-500">Personal advances and administrator review history</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(true)}
              className="text-xs font-bold text-[#1B7167] dark:text-[#2DD4BF] hover:underline cursor-pointer"
            >
              + New Request
            </button>
          </header>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {advancesList.length === 0 ? (
              <p className="p-6 text-center text-xs text-gray-500">No salary advance requests submitted.</p>
            ) : (
              advancesList
                .slice()
                .sort((a, b) => b.requestDate.localeCompare(a.requestDate))
                .slice(0, 7)
                .map((advance) => (
                  <div
                    key={advance.id}
                    className="flex items-center justify-between p-4 text-xs hover:bg-gray-50/50 dark:hover:bg-white/[0.02]"
                  >
                    <div>
                      <p className="font-mono font-bold text-gray-950 dark:text-white">
                        {formatMoney(advance.amount)}
                      </p>
                      <p className="text-[10px] text-gray-500 line-clamp-1">{advance.reason}</p>
                    </div>
                    <span className="font-mono text-[10px] text-gray-400">
                      Cycle: {advance.payrollMonth}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-black ${
                        advance.status === "APPROVED"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : advance.status === "PENDING"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          : advance.status === "DEDUCTED"
                          ? "bg-[#1B7167]/10 text-[#1B7167] dark:text-[#2DD4BF] border border-[#1B7167]/20"
                          : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {advance.status}
                    </span>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <PersonalPayslipModal
          payslip={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}

      {/* Salary Advance Request Modal */}
      {advanceModalOpen && (
        <RequestAdvanceModal
          onClose={() => setAdvanceModalOpen(false)}
          onSubmit={handleAdvanceSubmit}
        />
      )}
    </div>
  );
}

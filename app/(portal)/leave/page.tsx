"use client";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  Palmtree,
  ShieldCheck,
} from "lucide-react";
import { useData } from "@/context/DataContext";
import { useMounted } from "@/lib/use-mounted";
import type { LeaveStatus, LeaveType } from "@/types/erp";

const statusStyles: Record<LeaveStatus, string> = {
  PENDING: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  APPROVED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  REJECTED: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  CANCELLED: "border-gray-400/30 bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

const leaveLabels: Record<LeaveType, string> = {
  ANNUAL: "Annual Leave",
  SICK: "Sick Leave",
  CASUAL: "Casual Leave",
  UNPAID: "Unpaid Leave",
};

function dateLabel(date: string) {
  try {
    return new Intl.DateTimeFormat("en-PK", { day: "2-digit", month: "short", year: "numeric" })
      .format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

export default function EmployeeLeavePage() {
  const mounted = useMounted();
  const { currentEmployeeProfile, personalLeaveBalance, personalLeaveRequests } = useData();

  if (!mounted) {
    return <div className="flex min-h-[400px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--agency-action)] border-t-transparent" /></div>;
  }

  if (!currentEmployeeProfile || !personalLeaveBalance) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-8 text-center text-sm text-amber-700 dark:text-amber-300">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-600" />
        <p className="font-bold">No linked employee profile</p>
        <p className="mt-1 text-xs text-amber-600/80">Please contact HR to link your account to an employee profile.</p>
      </div>
    );
  }

  const currentYear = String(new Date().getFullYear());
  const approvedThisYear = personalLeaveRequests
    .filter((request) => request.status === "APPROVED" && request.startDate.startsWith(currentYear))
    .reduce((sum, request) => sum + request.totalDays, 0);
  const metrics = [
    { label: "Annual Remaining", value: `${personalLeaveBalance.annualRemaining} days`, detail: `${personalLeaveBalance.annualUsed} of ${personalLeaveBalance.annualTotal} used`, icon: Palmtree, color: "text-[var(--agency-action)] bg-[var(--agency-accent)]/10" },
    { label: "Sick Remaining", value: `${personalLeaveBalance.sickRemaining} days`, detail: `${personalLeaveBalance.sickUsed} of ${personalLeaveBalance.sickTotal} used`, icon: HeartPulse, color: "text-rose-600 bg-rose-500/10" },
    { label: "Approved This Year", value: `${approvedThisYear} days`, detail: "Recorded by HR or Agency Admin", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-500/10" },
    { label: "Unpaid Days", value: `${personalLeaveBalance.unpaidDaysTaken} days`, detail: "Year to date", icon: CalendarDays, color: "text-amber-600 bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--agency-accent)]/25 bg-[var(--agency-accent)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--agency-action)] dark:text-[var(--agency-accent)]"><ShieldCheck className="h-3.5 w-3.5" /> Employee self-service</span>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-[#030712] dark:text-white lg:text-3xl">My Leave History</h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your approved leave and available entitlement. HR or your Agency Admin records leave for you.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, color }) => <article key={label} className="rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0B0F19]"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p><span className={`rounded-lg p-2 ${color}`}><Icon className="h-4 w-4" /></span></div><p className="mt-3 font-mono text-2xl font-black text-[#030712] dark:text-white">{value}</p><p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{detail}</p></article>)}
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="border-b border-gray-200/80 px-5 py-4 dark:border-white/10"><h2 className="text-sm font-black text-[#030712] dark:text-white">Leave History</h2><p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">This is read-only. Contact HR or your Agency Admin for a leave record or correction.</p></div>
        {personalLeaveRequests.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><span className="rounded-2xl bg-[var(--agency-accent)]/10 p-4 text-[var(--agency-action)] dark:text-[var(--agency-accent)]"><CalendarDays className="h-7 w-7" /></span><h3 className="mt-4 text-sm font-black text-[#030712] dark:text-white">No leave history yet</h3><p className="mt-1 max-w-sm text-xs leading-5 text-gray-500 dark:text-gray-400">Approved leave recorded by HR or your Agency Admin will appear here.</p></div> : <div className="divide-y divide-gray-100 dark:divide-white/5">{personalLeaveRequests.slice().sort((a, b) => b.startDate.localeCompare(a.startDate)).map((request) => <article key={request.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-[#030712] dark:text-white">{leaveLabels[request.leaveType]}</p><span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${statusStyles[request.status]}`}>{request.status}</span></div><p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{request.reason}</p>{request.rejectionReason && <p className="mt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">HR note: {request.rejectionReason}</p>}</div><div><p className="font-mono text-xs font-bold text-[#030712] dark:text-white">{dateLabel(request.startDate)} — {dateLabel(request.endDate)}</p><p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{request.totalDays} scheduled workday(s)</p></div><div className="text-right text-[10px] text-gray-500 dark:text-gray-400">{request.reviewedBy && <><p className="text-[9px] uppercase tracking-wider text-gray-400">Recorded by</p><p className="font-semibold text-gray-700 dark:text-gray-200">{request.reviewedBy}</p></>}</div></article>)}</div>}
      </section>
    </div>
  );
}

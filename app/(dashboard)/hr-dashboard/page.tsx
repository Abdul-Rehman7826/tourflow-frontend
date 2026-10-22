"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useTenant } from "@/context/TenantContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { localDateKey } from "@/lib/attendance-operations";
import {
  activeRoster,
  attendanceLedgerCsv,
  buildHRAuditFeed,
  filterAttendanceLedger,
  officeOccupancy,
  outstandingAdvanceLiability,
  payrollLiabilityCsv,
  resolveActivePayrollRun,
} from "@/lib/hr-dashboard";
import type { AttendanceStatus, Department, PayrollStatus } from "@/types/erp";

const departments: Array<Department | "ALL"> = [
  "ALL",
  "MANAGEMENT",
  "OPERATIONS",
  "SALES_FRONT_DESK",
  "VISA_CONSULTANCY",
  "ACCOUNTS",
];

const attendanceStatuses: Array<AttendanceStatus | "ALL"> = [
  "ALL",
  "PRESENT",
  "LATE",
  "HALF_DAY",
  "ABSENT",
  "ON_LEAVE",
  "WEEKLY_OFF",
];

const controlClass =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold outline-none transition focus:border-purple-500 dark:border-white/10 dark:bg-[#030712] text-gray-900 dark:text-white";

const payrollTone: Record<PayrollStatus, string> = {
  DRAFT: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  CALCULATED: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  APPROVED: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  DISBURSED: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  LOCKED: "border-purple-500/20 bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

function downloadCsv(filename: string, content: string) {
  const blob = new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function timeLabel(value?: string) {
  if (!value) return "--:--";
  return new Intl.DateTimeFormat("en-PK", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(value)
  );
}

function dateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value)
  );
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function HRDashboardPage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const { formatMoney } = useAgencySettings();
  const { employees, attendanceRecords, leaveRequests, salaryAdvances, payrollRuns } = useData();

  const today = localDateKey();
  const currentMonth = today.slice(0, 7);

  const [startDate, setStartDate] = useState(`${currentMonth}-01`);
  const [endDate, setEndDate] = useState(today);
  const [department, setDepartment] = useState<Department | "ALL">("ALL");
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus | "ALL">("ALL");
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const [notice, setNotice] = useState("");

  if (
    !user ||
    !["AGENCY_ADMIN", "HR_MANAGER"].includes(user.role) ||
    user.tenantId !== tenant.id
  ) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="mt-3 text-lg font-black text-gray-900 dark:text-white">Access Restricted</h2>
        <p
          role="alert"
          className="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400"
        >
          The HR Executive Command Center is available only to agency administrators and HR managers.
        </p>
      </div>
    );
  }

  const roster = activeRoster(employees);
  const occupancy = officeOccupancy(employees, attendanceRecords, today);
  const pendingLeave = leaveRequests.filter((request) => request.status === "PENDING");
  const pendingAdvances = salaryAdvances.filter(
    (advance) => advance.payrollMonth === currentMonth && advance.status === "PENDING"
  );
  const advanceLiability = outstandingAdvanceLiability(salaryAdvances, currentMonth);
  const activePayroll = resolveActivePayrollRun(payrollRuns, currentMonth);
  const projectedGross = roster.reduce(
    (sum, employee) => sum + employee.basicSalary + employee.allowances,
    0
  );
  const todayByEmployee = new Map(
    attendanceRecords
      .filter((record) => record.attendanceDate === today)
      .map((record) => [record.employeeId, record])
  );
  const auditFeed = buildHRAuditFeed({
    attendanceRecords,
    employees,
    salaryAdvances,
    leaveRequests,
  }).slice(0, 8);
  const payrollRun = payrollRuns.find((run) => run.monthCode === payrollMonth);
  const attendanceExportRows = filterAttendanceLedger(attendanceRecords, {
    startDate,
    endDate,
    department,
    status: attendanceStatus,
  });

  const exportAttendance = () => {
    if (startDate > endDate) {
      setNotice("Attendance export blocked: the start date must be before the end date.");
      return;
    }
    downloadCsv(
      `attendance-ledger-${startDate}-to-${endDate}.csv`,
      attendanceLedgerCsv(attendanceExportRows)
    );
    setNotice(`${attendanceExportRows.length} attendance records exported with the active filters.`);
  };

  const exportPayroll = () => {
    if (!payrollRun) {
      setNotice(`No payroll run exists for ${payrollMonth}. Calculate it in Payroll before exporting.`);
      return;
    }
    const includeFinancials = user.role === "AGENCY_ADMIN";
    downloadCsv(
      `${includeFinancials ? "master-payroll-summary" : "restricted-payroll-audit"}-${payrollMonth}.csv`,
      payrollLiabilityCsv(payrollRun, includeFinancials)
    );
    setNotice(
      includeFinancials
        ? `${payrollRun.monthString} master payroll summary exported.`
        : `${payrollRun.monthString} audit roster exported without salary or financial columns.`
    );
  };

  const metrics: Array<{
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    tone: string;
    href?: string;
  }> = [
    {
      label: "Office Occupancy Today",
      value: `${occupancy.onDutyCount} / ${occupancy.rosterCount} On Duty (${occupancy.percentage}%)`,
      detail: `${occupancy.onTimeCount} On Time • ${occupancy.lateCount} Late • ${occupancy.onLeaveCount} On Leave`,
      icon: UserCheck,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Pending Leave Queue",
      value: `${pendingLeave.length} Awaiting Review`,
      detail: "Review Queue →",
      icon: CalendarClock,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      href: "/leave/admin",
    },
    {
      label: "Outstanding Salary Advances",
      value: formatMoney(advanceLiability),
      detail: `${pendingAdvances.length} pending recoupment this cycle`,
      icon: Banknote,
      tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    },
    {
      label: "Active Payroll Run",
      value: activePayroll ? activePayroll.status : "DRAFT",
      detail: `${activePayroll?.monthString || currentMonth} • ${formatMoney(activePayroll?.totalGrossLiability ?? projectedGross)} Gross Outflow`,
      icon: FileSpreadsheet,
      tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      href: "/payroll",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            <LayoutDashboard className="h-3.5 w-3.5" /> Executive HR Command
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white lg:text-3xl">
            HR Command Center
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {tenant.name} • Workforce telemetry, real-time floor presence, audit exception logs &amp; compliance exports
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold text-gray-600 shadow-sm dark:border-white/10 dark:bg-[#0B0F19] dark:text-gray-300">
          <ShieldCheck className="h-4 w-4 text-[#1B7167] dark:text-teal-400" />
          <span>
            {user.role === "AGENCY_ADMIN"
              ? "Full Executive Authority (Financial Exports Enabled)"
              : "HR Manager Authority (Protected Salary Views)"}
          </span>
        </div>
      </header>

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-xs font-semibold text-purple-700 dark:text-purple-300"
        >
          {notice}
        </p>
      )}

      {/* Workforce Telemetry Ribbon (FR-HR-020) */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Workforce telemetry">
        {metrics.map(({ label: metricLabel, value, detail, icon: Icon, tone, href }) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{metricLabel}</span>
                <span className={`rounded-lg p-2 ${tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 font-mono text-lg font-black text-gray-950 dark:text-white">{value}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] leading-5 text-gray-500 dark:text-gray-400">
                <span>{detail}</span>
                {href && <ArrowRight className="h-3 w-3 text-[#1B7167] dark:text-teal-400" />}
              </div>
            </>
          );
          return href ? (
            <Link
              key={metricLabel}
              href={href}
              className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-500/40 dark:border-white/10 dark:bg-[#0B0F19]"
            >
              {content}
            </Link>
          ) : (
            <article
              key={metricLabel}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0B0F19]"
            >
              {content}
            </article>
          );
        })}
      </section>

      {/* Two-Column Responsive Layout: Floor Presence vs Audit Feed */}
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
        {/* Left: Floor Presence Grid */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F19]">
          <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-white/10">
            <div>
              <h2 className="text-sm font-black text-gray-900 dark:text-white">Floor Presence &amp; Active Devices</h2>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Live roster status for {today}</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {occupancy.percentage}% On Duty
            </span>
          </div>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {roster.map((employee) => {
              const record = todayByEmployee.get(employee.id);
              const initials = employee.fullName
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("");

              let punchText = "Awaiting punch";
              let punchTone = "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300";

              if (record?.status === "ON_LEAVE") {
                punchText = "Approved Leave";
                punchTone = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20";
              } else if (record?.status === "ABSENT") {
                punchText = "Unexcused Absence";
                punchTone = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20";
              } else if (record?.status === "LATE") {
                punchText = `Checked in ${timeLabel(record.checkInAt)} (+${record.lateMinutes}m late)`;
                punchTone = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
              } else if (record?.checkInAt) {
                punchText = `Checked in ${timeLabel(record.checkInAt)}`;
                punchTone = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
              }

              return (
                <article
                  key={employee.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-white/10 dark:bg-white/[0.02]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1B7167] to-[#7C3AED] text-xs font-black text-white shadow-sm">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-gray-900 dark:text-white">
                            {employee.fullName}
                          </p>
                          <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                            {employee.designation} • {label(employee.department)}
                          </p>
                        </div>
                        <span
                          title={`Device: ${employee.deviceStatus}`}
                          className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                            employee.deviceStatus === "BOUND"
                              ? "bg-emerald-500"
                              : employee.deviceStatus === "REVOKED"
                              ? "bg-rose-500"
                              : "bg-gray-300 dark:bg-gray-600"
                          }`}
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-gray-200/70 px-2 py-0.5 text-[9px] font-bold font-mono text-gray-700 dark:bg-white/10 dark:text-gray-300">
                          {employee.shiftName}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold font-mono ${punchTone}`}>
                          {punchText}
                        </span>
                      </div>

                      <p className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                        <Smartphone className="h-3 w-3" />
                        <span>
                          {employee.deviceStatus === "BOUND"
                            ? `Bound (${employee.deviceModel || "Mobile device"})`
                            : employee.deviceStatus === "REVOKED"
                            ? "Device Revoked"
                            : "Unenrolled Device"}
                        </span>
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Right: Security & Compliance Audit Trail */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F19]">
          <div className="border-b border-gray-200 p-4 dark:border-white/10">
            <h2 className="text-sm font-black text-gray-900 dark:text-white">HR Security &amp; Compliance Audit Trail</h2>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Chronological feed of audited HR control mutations</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {auditFeed.length ? (
              auditFeed.map((event) => {
                const Icon =
                  event.type === "ATTENDANCE_CORRECTION"
                    ? Clock3
                    : event.type === "DEVICE_REVOCATION"
                    ? Smartphone
                    : event.type === "SALARY_ADVANCE"
                    ? Banknote
                    : CheckCircle2;
                return (
                  <article key={event.id} className="flex gap-3 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">{event.title}</p>
                      <p className="mt-1 text-[10px] leading-4 text-gray-500 dark:text-gray-400">{event.detail}</p>
                      <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400 font-mono">
                        {event.actor} • {dateTimeLabel(event.timestamp)}
                      </p>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="mt-3 text-sm font-black text-gray-900 dark:text-white">No recent control exceptions</p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Audited corrections, approvals and device revocations will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Compliance & Audit Export Center (FR-HR-021 & FR-HR-022) */}
      <section className="rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-black text-gray-900 dark:text-white">Compliance &amp; Audit Export Center</h2>
            <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
              Tenant-scoped CSV report generation with strict role-based financial column isolation.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
            <LockKeyhole className="h-3.5 w-3.5" /> Permission Isolated
          </span>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-2">
          {/* Attendance Ledger Export (FR-HR-021) */}
          <article className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-teal-500/10 p-2 text-[#1B7167] dark:text-teal-400">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Attendance Ledger Export</h3>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Punch timestamps, status, minutes worked, and audit notes for the selected slice.
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FilterField title="Start Date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={controlClass}
                />
              </FilterField>
              <FilterField title="End Date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className={controlClass}
                />
              </FilterField>
              <FilterField title="Department">
                <select
                  value={department}
                  onChange={(event) => setDepartment(event.target.value as Department | "ALL")}
                  className={controlClass}
                >
                  {departments.map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </FilterField>
              <FilterField title="Status">
                <select
                  value={attendanceStatus}
                  onChange={(event) => setAttendanceStatus(event.target.value as AttendanceStatus | "ALL")}
                  className={controlClass}
                >
                  {attendanceStatuses.map((value) => (
                    <option key={value} value={value}>
                      {label(value)}
                    </option>
                  ))}
                </select>
              </FilterField>
            </div>
            <button
              type="button"
              onClick={exportAttendance}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B7167] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#155a52] [&>svg]:text-white [&>span]:text-white"
            >
              <Download className="h-4 w-4" />
              <span>Export Attendance CSV ({attendanceExportRows.length})</span>
            </button>
          </article>

          {/* Master Payroll Summary Export (FR-HR-022) */}
          <article className="rounded-xl border border-gray-200 p-4 dark:border-white/10">
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-purple-500/10 p-2 text-[#7C3AED] dark:text-purple-400">
                <Banknote className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-white">Master Payroll Summary Export</h3>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {user.role === "AGENCY_ADMIN"
                    ? "Complete compensation ledger with earnings, deductions, advances, net pay & bank IBAN."
                    : "Salary values are protected. Your export contains operational status columns only."}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <FilterField title="Payroll Month">
                <input
                  type="month"
                  value={payrollMonth}
                  onChange={(event) => setPayrollMonth(event.target.value)}
                  className={controlClass}
                />
              </FilterField>
            </div>
            <div
              className={`mt-4 rounded-xl border p-3 text-[11px] ${
                user.role === "AGENCY_ADMIN"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              }`}
            >
              {user.role === "AGENCY_ADMIN" ? (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Admin authority verified: full financial &amp; bank IBAN columns enabled.
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  HR Manager safeguard active: all salary and financial columns will be stripped.
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={exportPayroll}
              disabled={!payrollRun}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40 [&>svg]:text-white [&>span]:text-white"
            >
              <Download className="h-4 w-4" />
              <span>
                {user.role === "AGENCY_ADMIN"
                  ? "Export Master Payroll Summary CSV"
                  : "Export Restricted Payroll Audit CSV"}
              </span>
            </button>
            {payrollRun && (
              <div className="mt-3 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
                <span>{payrollRun.monthString}</span>
                <span className={`rounded-full border px-2 py-0.5 font-bold font-mono ${payrollTone[payrollRun.status]}`}>
                  {payrollRun.status}
                </span>
              </div>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

function FilterField({ title, children }: { title: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </span>
      {children}
    </label>
  );
}

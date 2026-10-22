"use client";

import React, { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useData } from "@/context/DataContext";
import { ManualAttendanceDrawer } from "@/components/attendance/ManualAttendanceDrawer";
import { FinalizeDayModal } from "@/components/attendance/AttendanceReconciliationModal";
import { AttendanceTerminalManager } from "@/components/attendance/AttendanceTerminalManager";
import { AttendanceAuditLog } from "@/components/attendance/AttendanceAuditLog";
import type { AttendanceRecord, AttendanceStatus, Department } from "@/types/erp";
import {
  CalendarCheck,
  Clock,
  Search,
  Building2,
  CheckCircle2,
  UserX,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Zap,
  FileClock,
  Laptop2,
} from "lucide-react";

const DEPARTMENTS: { label: string; value: Department }[] = [
  { label: "Management & Executive", value: "MANAGEMENT" },
  { label: "Tour Operations", value: "OPERATIONS" },
  { label: "Sales & Front Desk", value: "SALES_FRONT_DESK" },
  { label: "Visa Consultancy", value: "VISA_CONSULTANCY" },
  { label: "Finance & Accounts", value: "ACCOUNTS" },
];

function formatTime(isoOrTime?: string | null): string {
  if (!isoOrTime) return "--:--";
  try {
    if (isoOrTime.includes("T")) {
      const d = new Date(isoOrTime);
      return isNaN(d.getTime())
        ? "--:--"
        : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return isoOrTime.slice(0, 5);
  } catch {
    return isoOrTime || "--:--";
  }
}

export default function AttendancePage() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const {
    attendanceRecords,
    employees,
    shifts,
  } = useData();

  const isAdminOrHR =
    user?.role === "AGENCY_ADMIN" ||
    user?.role === "HR_MANAGER";
  const isAgencyAdmin = user?.role === "AGENCY_ADMIN";

  // Active Date Filter (default to today)
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().slice(0, 10)
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals & Drawers
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
  const [isTerminalManagerOpen, setIsTerminalManagerOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<AttendanceRecord | null>(null);
  const [manualDrawerMode, setManualDrawerMode] = useState<"edit" | "void">("edit");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Compile combined attendance list for the date:
  // Merge recorded attendance records with unpunched employees
  const dailyAttendanceList = useMemo(() => {
    const recordsForDate = attendanceRecords.filter(
      (r) =>
        r.tenantId === tenant.id &&
        (r.attendanceDate === selectedDate || r.date === selectedDate)
    );

    const recordedEmpIds = new Set(recordsForDate.map((r) => r.employeeId));

    // For any employee who has not punched today, synthesize unpunched entry
    const unpunchedEntries: AttendanceRecord[] = employees
      .filter((e) => e.tenantId === tenant.id && !recordedEmpIds.has(e.id))
      .map((e) => {
        const empShift =
          shifts.find((s) => s.id === e.shiftId) || shifts[0];
        return {
          id: `unpunched_${e.id}_${selectedDate}`,
          tenantId: tenant.id,
          employeeId: e.id,
          employeeName: e.fullName || e.full_name || "Employee",
          employeeCode: e.employeeCode || e.employee_code || "EMP-000",
          department:
            typeof e.department === "string"
              ? e.department
              : e.departmentName || "OPERATIONS",
          attendanceDate: selectedDate,
          shiftName: empShift?.name || "Regular Day Shift",
          shiftStartTime: empShift?.startTime || "09:00",
          shiftEndTime: empShift?.endTime || "18:00",
          graceCutoffTime: "09:15",
          checkInAt: undefined,
          checkOutAt: undefined,
          check_in: null,
          check_out: null,
          status: "ABSENT" as AttendanceStatus,
          workedMinutes: 0,
          lateMinutes: 0,
          source: "QR_SCAN" as const,
        };
      });

    return [...recordsForDate, ...unpunchedEntries];
  }, [attendanceRecords, employees, shifts, selectedDate, tenant.id]);

  // KPI Metrics
  const totalHeadcount = employees.filter((e) => e.tenantId === tenant.id).length;
  const presentCount = dailyAttendanceList.filter(
    (r) => r.status === "PRESENT"
  ).length;
  const lateCount = dailyAttendanceList.filter((r) => r.status === "LATE").length;
  const unpunchedCount = dailyAttendanceList.filter(
    (r) => !r.checkInAt && !r.check_in && r.status === "ABSENT"
  ).length;

  // Filtered List
  const filteredList = useMemo(() => {
    return dailyAttendanceList.filter((item) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (item.employeeName || "").toLowerCase();
        const code = (item.employeeCode || "").toLowerCase();
        const dept = (item.department || "").toLowerCase();
        if (!name.includes(q) && !code.includes(q) && !dept.includes(q)) {
          return false;
        }
      }

      // Department Filter
      if (departmentFilter !== "ALL") {
        if (item.department !== departmentFilter) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "UNPUNCHED") {
          if (item.checkInAt || item.check_in) return false;
        } else if (item.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [dailyAttendanceList, searchQuery, departmentFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl bg-emerald-600 text-white font-medium flex items-center gap-3 border border-emerald-500/30 animate-in slide-in-from-top-3 duration-200 [&>svg]:text-white [&>span]:text-white">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/80 dark:border-white/5 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 font-bold text-[10px] tracking-wider uppercase border border-[#1B7167]/20">
              Module 7 • Attendance Engine
            </span>
            <span className="text-xs font-mono text-gray-400">SRS §4.9.2–§4.9.6</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#1B7167] dark:text-teal-400" />
            Daily Attendance Operations Hub
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage shared kiosk punches, attendance corrections, 15m grace enforcement, and daily finalization.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex max-w-full flex-col gap-2.5 xl:items-end">
          {isAgencyAdmin && (
            <p className="text-right text-[11px] text-gray-500 dark:text-gray-400">
              Shared kiosk setup: activate the reception browser, then open Profiles → Shared Attendance Kiosk.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5 xl:justify-end">
            {isAgencyAdmin && (
              <button type="button" onClick={() => setIsTerminalManagerOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-4 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10">
                <Laptop2 className="h-4 w-4" /><span>Manage Terminals</span>
              </button>
            )}
            {isAgencyAdmin && (
              <button type="button" onClick={() => setIsAuditLogOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-violet-300 px-4 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-300 dark:hover:bg-violet-500/10">
                <FileClock className="h-4 w-4" /><span>Attendance Audit Log</span>
              </button>
            )}
            {isAdminOrHR && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRecordForEdit(null);
                  setManualDrawerMode("edit");
                  setIsManualDrawerOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#1B7167] dark:text-teal-400" />
                <span>Add / Correct Attendance</span>
              </button>
            )}

            {/* Finalize Day Attendance (Reconciliation Engine) */}
          {isAdminOrHR && (
            <button
              type="button"
              onClick={() => setIsFinalizeModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer shadow-purple-600/20 [&>svg]:text-white [&>span]:text-white"
            >
              <Zap className="w-4 h-4 text-white" />
              <span>Finalize Day Attendance</span>
            </button>
          )}
          </div>
        </div>
      </div>

      {/* TOP METRIC RIBBON (4 KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Headcount */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Headcount
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-gray-900 dark:text-white">
            {totalHeadcount}
          </div>
          <div className="text-[11px] text-gray-400">
            Registered active roster
          </div>
        </div>

        {/* Present / Punched In */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Present (On-Time)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {presentCount}
          </div>
          <div className="text-[11px] text-gray-400">
            Punched within 15m grace
          </div>
        </div>

        {/* Late Arrivals (>15m Grace) */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Late Arrivals
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
            {lateCount}
          </div>
          <div className="text-[11px] text-gray-400">
            Exceeded shift grace limit
          </div>
        </div>

        {/* Unpunched / Missing */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Unpunched / Missing
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-slate-600 dark:text-slate-400">
            {unpunchedCount}
          </div>
          <div className="text-[11px] text-gray-400">
            No check-in record today
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR & CONTROLS */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date Navigator */}
        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1 text-xs font-mono font-bold bg-transparent text-gray-900 dark:text-white border-0 focus:outline-hidden cursor-pointer"
          />
          <button
            type="button"
            onClick={handleNextDay}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-2.5 py-1 text-[11px] font-bold text-[#1B7167] dark:text-teal-400 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Search Bar & Dropdown Filters */}
        <div className="flex flex-1 flex-wrap items-center gap-2 justify-end">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late Arrivals</option>
            <option value="HALF_DAY">Half-Day</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="UNPUNCHED">Unpunched</option>
          </select>
        </div>
      </div>

      {/* DAILY ATTENDANCE TABLE (w-full table-fixed) */}
      <div className="bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-white/5 text-xs text-left">
            <thead className="bg-gray-50/80 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {/* 1. Staff Member (28%) */}
                <th className="px-4 py-3.5 w-[28%]">Staff Member</th>
                {/* 2. Shift & Grace (18%) */}
                <th className="px-4 py-3.5 w-[18%]">Shift & Grace</th>
                {/* 3. Check-In (14%) */}
                <th className="px-4 py-3.5 w-[14%]">Check-In</th>
                {/* 4. Check-Out (14%) */}
                <th className="px-4 py-3.5 w-[14%]">Check-Out</th>
                {/* 5. Net Worked (12%) */}
                <th className="px-4 py-3.5 w-[12%]">Net Worked</th>
                {/* 6. Status & Actions (14%) */}
                <th className="px-4 py-3.5 w-[14%] text-right">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarCheck className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p className="font-bold text-gray-600 dark:text-gray-300">
                        No attendance records found for {selectedDate}.
                      </p>
                      <p className="text-xs text-gray-400">
                        Try modifying search query or navigating to another date.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const checkInDisplay = formatTime(item.checkInAt || item.check_in);
                  const checkOutDisplay = formatTime(item.checkOutAt || item.check_out);
                  const isLate = item.status === "LATE";
                  const isPresent = item.status === "PRESENT";
                  const isUnpunched = !item.checkInAt && !item.check_in && item.status === "ABSENT";
                  const hasCheckOut = checkOutDisplay !== "--:--";
                  const workedMinutes = hasCheckOut ? item.workedMinutes || item.net_work_minutes || 0 : 0;
                  const workedHours = Math.floor(workedMinutes / 60);
                  const workedMins = workedMinutes % 60;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* 1. Staff Member (28%) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 font-black text-xs flex items-center justify-center shrink-0 border border-[#1B7167]/20">
                            {item.employeeName
                              ?.split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                              <span className="truncate">{item.employeeName}</span>
                              {item.employeeCode && (
                                <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                  {item.employeeCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                              {item.department || "Operations"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Shift & Grace (18%) */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#1B7167] dark:text-teal-400 shrink-0" />
                            <span className="truncate">{item.shiftName || "Regular Shift"}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {item.shiftStartTime || "09:00"} - {item.shiftEndTime || "18:00"} (15m Grace)
                          </div>
                        </div>
                      </td>

                      {/* 3. Check-In (14%) */}
                      <td className="px-4 py-3.5 font-mono">
                        {checkInDisplay !== "--:--" ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-gray-900 dark:text-white text-xs">
                              {checkInDisplay}
                            </span>
                            {isLate && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                +{item.lateMinutes || item.late_minutes || 0}m late
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">--:--</span>
                        )}
                      </td>

                      {/* 4. Check-Out (14%) */}
                      <td className="px-4 py-3.5 font-mono">
                        {checkOutDisplay !== "--:--" ? (
                          <span className="font-bold text-gray-900 dark:text-white text-xs">
                            {checkOutDisplay}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">--:--</span>
                        )}
                      </td>

                      {/* 5. Net Worked (12%) */}
                      <td className="px-4 py-3.5 font-mono text-xs">
                        {hasCheckOut && workedMinutes ? (
                          <span className="font-bold text-gray-800 dark:text-gray-200">
                            {workedHours}h {workedMins}m
                          </span>
                        ) : (
                          <span className="text-gray-400">{hasCheckOut ? "0h 0m" : "Pending checkout"}</span>
                        )}
                      </td>

                      {/* 6. Status & Actions (14%) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                              isPresent
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : isLate
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : isUnpunched
                                ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                : item.status === "ON_LEAVE"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {isUnpunched ? "UNPUNCHED" : item.status}
                          </span>

                          {/* Manual Correction Action (Admin/HR Only) */}
                          {isAdminOrHR && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordForEdit(item);
                                  setManualDrawerMode("edit");
                                  setIsManualDrawerOpen(true);
                                }}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                                title="Create or edit attendance"
                              >
                                <Pencil className="w-3 h-3 text-[#1B7167] dark:text-teal-400" />
                              </button>
                              {!item.id.startsWith("unpunched_") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRecordForEdit(item);
                                    setManualDrawerMode("void");
                                    setIsManualDrawerOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-300 transition-colors cursor-pointer"
                                  title="Void attendance record"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL & DRAWER DIALOGS */}

      {/* 1. Manual Attendance Correction Drawer */}
      <ManualAttendanceDrawer
        isOpen={isManualDrawerOpen}
        onClose={() => {
          setIsManualDrawerOpen(false);
          setSelectedRecordForEdit(null);
          setManualDrawerMode("edit");
        }}
        record={selectedRecordForEdit}
        attendanceDate={selectedDate}
        mode={manualDrawerMode}
        onSuccess={showToast}
      />

      {/* 2. Daily Attendance Finalization & Settlement Modal */}
      <FinalizeDayModal
        isOpen={isFinalizeModalOpen}
        onClose={() => setIsFinalizeModalOpen(false)}
        onFinalized={showToast}
      />
      <AttendanceTerminalManager isOpen={isTerminalManagerOpen} onClose={() => setIsTerminalManagerOpen(false)} />
      <AttendanceAuditLog isOpen={isAuditLogOpen} onClose={() => setIsAuditLogOpen(false)} />
    </div>
  );
}

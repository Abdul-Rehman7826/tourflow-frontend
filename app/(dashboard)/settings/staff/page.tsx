"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { EmployeeProfileDrawer } from "@/components/staff/EmployeeProfileDrawer";
import { ShiftConfigModal } from "@/components/staff/ShiftConfigModal";
import { getEmployeeDetail } from "@/lib/hr-api";
import type {
  EmployeeProfile,
  Department,
  EmploymentStatus,
} from "@/types/erp";
import {
  Users,
  Plus,
  Search,
  Building2,
  Clock,
  Edit2,
  Power,
  CheckCircle2,
} from "lucide-react";

const DEPARTMENTS: { label: string; value: Department }[] = [
  { label: "Management & Executive", value: "MANAGEMENT" },
  { label: "Tour Operations", value: "OPERATIONS" },
  { label: "Sales & Front Desk", value: "SALES_FRONT_DESK" },
  { label: "Visa Consultancy", value: "VISA_CONSULTANCY" },
  { label: "Finance & Accounts", value: "ACCOUNTS" },
];

export default function StaffManagementPage() {
  const { user } = useAuth();
  const { employees, shifts, updateEmployeeRecord } = useData();
  const { formatMoney } = useAgencySettings();

  // Role permissions
  const isAdminOrHR =
    user?.role === "AGENCY_ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "HR_MANAGER";

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modal & Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedEmployeeForEdit, setSelectedEmployeeForEdit] = useState<EmployeeProfile | null>(null);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // KPI Calculations
  const totalHeadcount = employees.length;
  const activeStaff = employees.filter(
    (e) => (e.status || e.employment_status) === "ACTIVE"
  ).length;

  const uniqueDepartments = useMemo(() => {
    const set = new Set(
      employees.map((e) =>
        typeof e.department === "string"
          ? e.department
          : e.departmentName || "OPERATIONS"
      )
    );
    return set.size;
  }, [employees]);

  const authoritativeShift = shifts[0]
    ? `${shifts[0].startTime || shifts[0].start_time} - ${
        shifts[0].endTime || shifts[0].end_time
      } (${shifts[0].gracePeriodMinutes ?? shifts[0].grace_minutes ?? 15}m Grace)`
    : "09:00 - 18:00 (15m Grace)";

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (emp.fullName || emp.full_name || "").toLowerCase();
        const code = (emp.employeeCode || emp.employee_code || "").toLowerCase();
        const email = (emp.email || "").toLowerCase();
        const phone = (emp.phone || "").toLowerCase();
        const cnic = (emp.cnicNumber || emp.cnic || "").toLowerCase();
        const desig = (emp.designation || emp.designationTitle || "").toLowerCase();

        if (
          !name.includes(q) &&
          !code.includes(q) &&
          !email.includes(q) &&
          !phone.includes(q) &&
          !cnic.includes(q) &&
          !desig.includes(q)
        ) {
          return false;
        }
      }

      // Department filter
      if (departmentFilter !== "ALL") {
        const empDept =
          typeof emp.department === "string"
            ? emp.department
            : emp.departmentName;
        if (empDept !== departmentFilter) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        const empStatus = emp.status || emp.employment_status;
        if (empStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [employees, searchQuery, departmentFilter, statusFilter]);

  // Status toggle handler
  const handleToggleStatus = async (emp: EmployeeProfile) => {
    if (!isAdminOrHR) {
      showToast("Only Agency Administrators or HR Managers can modify employee statuses.");
      return;
    }

    const current = emp.status || emp.employment_status || "ACTIVE";
    const nextStatus: EmploymentStatus = current === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

    try {
      if (updateEmployeeRecord) {
        await updateEmployeeRecord(emp.id, {
          status: nextStatus,
          employment_status: nextStatus,
        });
      }
      showToast(`Status for ${emp.fullName || emp.full_name} updated to ${nextStatus}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update employee status.");
    }
  };

  const handleEditEmployee = async (emp: EmployeeProfile) => {
    try {
      // The directory endpoint intentionally excludes CNIC and other sensitive
      // identity fields. Load the protected detail record only for this edit.
      const detailedEmployee = await getEmployeeDetail(emp.id);
      setSelectedEmployeeForEdit(detailedEmployee);
      setIsDrawerOpen(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load the employee profile.");
    }
  };

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
              Module 7 • Staff Core & Shifts
            </span>
            <span className="text-xs font-mono text-gray-400">
              SRS §4.9.1–§4.9.2
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1B7167] dark:text-teal-400" />
            Staff Directory & Workforce Management
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage agency personnel, shift schedules, hardware device binding, and role credentials.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4 text-[#1B7167] dark:text-teal-400" />
            <span>Shift Configurations</span>
          </button>

          {isAdminOrHR && (
            <button
              type="button"
              onClick={() => {
                setSelectedEmployeeForEdit(null);
                setIsDrawerOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer [&>svg]:text-white [&>span]:text-white"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>New Staff Intake</span>
            </button>
          )}
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
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-gray-900 dark:text-white">
            {totalHeadcount}
          </div>
          <div className="text-[11px] text-gray-400">
            Registered agency workforce
          </div>
        </div>

        {/* Active Staff */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Active Staff
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {activeStaff}
          </div>
          <div className="text-[11px] text-gray-400">
            Currently on active duty roster
          </div>
        </div>

        {/* Department Coverage */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Department Coverage
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-gray-900 dark:text-white">
            {uniqueDepartments} / 5
          </div>
          <div className="text-[11px] text-gray-400">
            Operational business units
          </div>
        </div>

        {/* Authoritative Shift */}
        <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Authoritative Shift
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-black font-mono text-gray-900 dark:text-white truncate" title={authoritativeShift}>
            {authoritativeShift}
          </div>
          <div className="text-[11px] text-gray-400">
            Standard office attendance rule
          </div>
        </div>
      </div>

      {/* ACTION TOOLBAR & SEARCH CONTROLS */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Name, Employee Code (WCH-EMP-XXX), Email, or CNIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-black/30 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] cursor-pointer"
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
            className="px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-700 dark:text-gray-300 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Duty</option>
            <option value="PROBATION">Probation</option>
            <option value="ON_LEAVE">On Leave</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="RESIGNED">Resigned</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          {/* Clear Filters */}
          {(searchQuery || departmentFilter !== "ALL" || statusFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setDepartmentFilter("ALL");
                setStatusFilter("ALL");
              }}
              className="text-xs font-bold text-[#1B7167] dark:text-teal-400 hover:underline px-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* STAFF DIRECTORY TABLE (w-full table-fixed) */}
      <div className="bg-white dark:bg-[#0B0F19] border border-gray-200/80 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200 dark:divide-white/5 text-xs text-left">
            <thead className="bg-gray-50/80 dark:bg-white/[0.02] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                {/* 1. Staff Member (28%) */}
                <th className="px-4 py-3.5 w-[28%]">Staff Member</th>
                {/* 2. Department & Role (20%) */}
                <th className="px-4 py-3.5 w-[20%]">Department & Role</th>
                {/* 3. Work Shift (18%) */}
                <th className="px-4 py-3.5 w-[18%]">Work Shift</th>
                {/* 4. Compensation (16%, right-aligned) */}
                <th className="px-4 py-3.5 w-[16%] text-right">Compensation</th>
                {/* 5. Leave Pool (10%, center-aligned) */}
                <th className="px-4 py-3.5 w-[10%] text-center">Leave Pool</th>
                {/* 6. Actions (8%, right-aligned) */}
                <th className="px-4 py-3.5 w-[8%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p className="font-bold text-gray-600 dark:text-gray-300">
                        No staff profiles match your criteria.
                      </p>
                      <p className="text-xs text-gray-400">
                        Try modifying search query or active filter settings.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const empName = emp.fullName || emp.full_name || "Unnamed";
                  const empCode = emp.employeeCode || emp.employee_code || "WCH-EMP-XXX";
                  const empDept =
                    typeof emp.department === "string"
                      ? emp.department
                      : emp.departmentName || "OPERATIONS";
                  const empDesig = emp.designation || emp.designationTitle || "Specialist";
                  const empShift = emp.shiftName || emp.shift_name || "Regular Day Shift";
                  const empSalary = (emp.basicSalary ?? emp.basic_salary ?? 0) + (emp.allowances ?? 0);
                  const empStatus = emp.status || emp.employment_status || "ACTIVE";

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* 1. Staff Member (26%) */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 font-black text-xs flex items-center justify-center shrink-0 border border-[#1B7167]/20">
                            {emp.avatarUrl || emp.avatar_url ? (
                              <Image
                                src={emp.avatarUrl || emp.avatar_url || ""}
                                alt={empName}
                                width={36}
                                height={36}
                                unoptimized
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>
                                {empName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                              <span className="truncate">{empName}</span>
                              <span className="px-1.5 py-0.2 rounded font-mono text-[9px] font-bold bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                {empCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {emp.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department & Role (18%) */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 min-w-0">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 border border-[#1B7167]/20 truncate">
                            {empDept.replace("_", " ")}
                          </span>
                          <div className="text-xs text-gray-700 dark:text-gray-300 truncate font-medium">
                            {empDesig}
                          </div>
                        </div>
                      </td>

                      {/* 3. Work Shift (14%) */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-bold text-gray-800 dark:text-gray-200 truncate flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#1B7167] dark:text-teal-400 shrink-0" />
                            <span className="truncate">{empShift}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            15m grace window
                          </div>
                        </div>
                      </td>

                      {/* 4. Compensation (14%, right-aligned) */}
                      <td className="px-4 py-3.5 text-right font-mono">
                        {isAdminOrHR ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-gray-900 dark:text-white text-xs">
                              {formatMoney(empSalary)}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Gross Monthly
                            </div>
                          </div>
                        ) : (
                          <span
                            className="font-mono text-xs font-bold text-gray-400 tracking-widest"
                            title="Front-Desk Privacy Shield Active"
                          >
                            ••••••••
                          </span>
                        )}
                      </td>

                      {/* 5. Leave Pool (10%, center-aligned) */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="font-mono text-xs space-y-0.5">
                          <div className="text-gray-800 dark:text-gray-200 font-bold">
                            {emp.annualLeaveAllowance ?? emp.annual_leave_allowance ?? 14}d / {emp.sickLeaveAllowance ?? emp.sick_leave_allowance ?? 8}d
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Annual | Sick
                          </div>
                        </div>
                      </td>

                      {/* 6. Actions (8%, right-aligned) */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Profile Action (Admins only) */}
                          {isAdminOrHR && (
                            <button
                              type="button"
                              onClick={() => { void handleEditEmployee(emp); }}
                              className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                              title="Edit Employee Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-gray-700 dark:text-gray-300" />
                            </button>
                          )}

                          {/* Status Toggle Action */}
                          {isAdminOrHR && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp)}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                empStatus === "ACTIVE"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/30"
                                  : "border-gray-200 dark:border-white/10 text-gray-400 hover:text-emerald-500 hover:border-emerald-500/30"
                              }`}
                              title={
                                empStatus === "ACTIVE"
                                  ? "Active (Click to Suspend)"
                                  : "Suspended (Click to Activate)"
                              }
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
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

      {/* MODAL & DRAWER COMPONENTS */}

      {/* 1. Three-Stage Slide-Over Intake / Edit Drawer */}
      <EmployeeProfileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        employee={selectedEmployeeForEdit}
        onSuccess={showToast}
      />

      {/* 2. Operational Shift Configurations Modal */}
      <ShiftConfigModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSuccess={showToast}
      />
    </div>
  );
}

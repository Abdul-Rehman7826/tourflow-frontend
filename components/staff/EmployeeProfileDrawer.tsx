"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import type { UserRole } from "@/context/RoleContext";
import { defaultScreenAccess } from "@/lib/screen-access";
import { fetchDepartments, fetchDesignations } from "@/lib/hr-api";
import type { Department as DepartmentRecord, Designation as DesignationRecord } from "@/lib/hr-api";
import type {
  EmployeeProfile,
  ScreenAccessRules,
  ScreenAccessLevel,
  Department,
  EmploymentStatus,
} from "@/types/erp";
import {
  X,
  User,
  Shield,
  Briefcase,
  Clock,
  Landmark,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  ImagePlus,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface EmployeeProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  employee?: EmployeeProfile | null;
  onSuccess?: (msg: string) => void;
}

const ACCESS_KEYS: { key: keyof ScreenAccessRules; label: string; desc: string }[] = [
  { key: "leads", label: "Leads & Inquiries", desc: "Access walk-ins, phone inquiries & CRM funnel" },
  { key: "bookings", label: "Bookings & Passengers", desc: "Manage tour packages, vouchers & seat inventory" },
  { key: "clients", label: "Client Directory", desc: "View permanent client profiles & emergency contacts" },
  { key: "tours", label: "Group Tours", desc: "View group departures, dates & operations" },
  { key: "visaPipeline", label: "Visa Consultancy", desc: "Track embassy applications, vaults & checklists" },
  { key: "invoices", label: "Invoicing & Receivables", desc: "Generate invoices, payment proof & A/R aging" },
  { key: "hrAndPayroll", label: "HR & Attendance", desc: "Manage staff directory, payroll runs & shifts" },
];

const ROLES: { label: string; value: UserRole }[] = [
  { label: "Front Desk Officer", value: "FRONT_DESK" },
  { label: "Tour Operations Manager", value: "TOUR_MANAGER" },
  { label: "Visa Consultant", value: "VISA_CONSULTANT" },
  { label: "Agency Administrator", value: "AGENCY_ADMIN" },
  { label: "HR Manager", value: "HR_MANAGER" },
];
const AVATAR_COLORS = ["#1B7167", "#2563EB", "#7C3AED", "#D97706", "#DC2626", "#059669"];

function secureRandomInt(maxExclusive: number) {
  const range = 0x1_0000_0000;
  const limit = range - (range % maxExclusive);
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % maxExclusive;
}

export function EmployeeProfileDrawer({
  isOpen,
  onClose,
  employee,
  onSuccess,
}: EmployeeProfileDrawerProps) {
  if (!isOpen) return null;

  return (
    <EmployeeProfileDrawerDialog
      key={employee?.id || "new-employee"}
      onClose={onClose}
      employee={employee}
      onSuccess={onSuccess}
    />
  );
}

function EmployeeProfileDrawerDialog({
  onClose,
  employee,
  onSuccess,
}: {
  onClose: () => void;
  employee?: EmployeeProfile | null;
  onSuccess?: (msg: string) => void;
}) {
  const { user, staffUsers } = useAuth();
  const { shifts, createEmployeeRecord, updateEmployeeRecord } = useData();

  const isEditing = Boolean(employee);
  const isAdmin = user?.role === "AGENCY_ADMIN";

  const linkedAccount = employee
    ? staffUsers.find(
        (u) =>
          u.id === employee.userId ||
          u.email.toLowerCase() === employee.email.toLowerCase()
      )
    : null;

  // 3-step progress bar stage: 1 | 2 | 3
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stage 1: Bio & Identity
  const [fullName, setFullName] = useState<string>(
    () => employee?.fullName || employee?.full_name || ""
  );
  const [email, setEmail] = useState<string>(() => employee?.email || "");
  const [phone, setPhone] = useState<string>(() => employee?.phone || "+92 ");
  const [cnicNumber, setCnicNumber] = useState<string>(
    () => employee?.cnicNumber || employee?.cnic || ""
  );
  const [joiningDate, setJoiningDate] = useState<string>(
    () => employee?.joiningDate || employee?.joining_date || new Date().toISOString().slice(0, 10)
  );
  const [department, setDepartment] = useState<Department>(
    () =>
      ((typeof employee?.department === "string"
        ? employee.department
        : employee?.departmentName) as Department) || "SALES_FRONT_DESK"
  );
  const [departmentId, setDepartmentId] = useState<string>(
    () => employee?.departmentId || employee?.department_id || ""
  );
  const [designation, setDesignation] = useState<string>(
    () => employee?.designation || employee?.designationTitle || ""
  );
  const [designationId, setDesignationId] = useState<string>(
    () => employee?.designationId || employee?.designation_id || ""
  );
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentRecord[]>([]);
  const [designationOptions, setDesignationOptions] = useState<DesignationRecord[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string>(
    () => employee?.avatarUrl || employee?.avatar_url || ""
  );
  const [status, setStatus] = useState<EmploymentStatus>(
    () => employee?.status || employee?.employment_status || "ACTIVE"
  );

  // Stage 2: Shift, Bank & Compensation
  const [shiftId, setShiftId] = useState<string>(
    () => employee?.shiftId || employee?.shift_id || shifts[0]?.id || "shift-regular"
  );
  const [basicSalary, setBasicSalary] = useState<number>(
    () => (employee ? Number(employee.basicSalary ?? employee.basic_salary ?? 0) : 75000)
  );
  const [allowances, setAllowances] = useState<number>(
    () => (employee ? Number(employee.allowances ?? 0) : 15000)
  );
  const [bankName, setBankName] = useState<string>(
    () => employee?.bankName || employee?.bank_name || "Meezan Bank Ltd"
  );
  const [bankAccountNumber, setBankAccountNumber] = useState<string>(
    () => employee?.bankAccountNumber || employee?.bank_account_number || ""
  );
  const [bankIban, setBankIban] = useState<string>(
    () => employee?.bankIban || employee?.bank_iban || "PK"
  );
  const [annualLeaveAllowance, setAnnualLeaveAllowance] = useState<number>(
    () => Number(employee?.annualLeaveAllowance ?? employee?.annual_leave_allowance ?? 14)
  );
  const [sickLeaveAllowance, setSickLeaveAllowance] = useState<number>(
    () => Number(employee?.sickLeaveAllowance ?? employee?.sick_leave_allowance ?? 8)
  );

  // Stage 3: Runtime Credentials & Screen Permissions
  const [grantAccess, setGrantAccess] = useState<boolean>(
    () => (employee ? Boolean(linkedAccount && linkedAccount.status === "Active") : isAdmin)
  );
  const [systemRole, setSystemRole] = useState<UserRole>(
    () => linkedAccount?.role || "FRONT_DESK"
  );
  const [temporaryPassword, setTemporaryPassword] = useState<string>(
    ""
  );
  const [quickPin, setQuickPin] = useState("");
  const [avatarColor, setAvatarColor] = useState("#1B7167");
  const [screenAccess, setScreenAccess] = useState<ScreenAccessRules>(
    () =>
      employee?.screenAccess ||
      employee?.screen_access ||
      linkedAccount?.screenAccess ||
      defaultScreenAccess(linkedAccount?.role || "FRONT_DESK")
  );

  useEffect(() => {
    let active = true;
    fetchDepartments()
      .then((options) => {
        if (!active) return;
        setDepartmentOptions(options);
        const employeeDepartment = employee?.departmentId || employee?.department_id;
        const selected =
          options.find((option) => option.id === employeeDepartment) ||
          options.find((option) => option.code === department || option.name === employee?.departmentName) ||
          options.find((option) => option.code === "SALES_FRONT_DESK") ||
          options[0];
        if (selected) {
          setDepartmentId(selected.id);
          setDepartment((selected.code || selected.name) as Department);
        }
      })
      .catch((error) => {
        if (active) setFormError(error instanceof Error ? error.message : "Failed to load departments.");
      });
    return () => { active = false; };
  }, [department, employee]);

  useEffect(() => {
    if (!departmentId) {
      queueMicrotask(() => setDesignationOptions([]));
      return;
    }
    let active = true;
    fetchDesignations(departmentId)
      .then((options) => {
        if (!active) return;
        setDesignationOptions(options);
        const employeeDesignation = employee?.designationId || employee?.designation_id;
        const selected =
          options.find((option) => option.id === employeeDesignation) ||
          options.find((option) => option.title === (employee?.designation || employee?.designationTitle)) ||
          options[0];
        if (selected) {
          setDesignationId(selected.id);
          setDesignation(selected.title);
        } else {
          setDesignationId("");
          setDesignation("");
        }
      })
      .catch((error) => {
        if (active) setFormError(error instanceof Error ? error.message : "Failed to load designations.");
      });
    return () => { active = false; };
  }, [departmentId, employee]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pass = "TF-";
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(secureRandomInt(chars.length));
    }
    setTemporaryPassword(pass);
  };

  const generatePin = () => {
    setQuickPin(String(1000 + secureRandomInt(9000)));
    setShowQuickPin(true);
  };

  const copyPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const copyPin = () => {
    if (quickPin) {
      navigator.clipboard.writeText(quickPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setSystemRole(newRole);
    setScreenAccess(defaultScreenAccess(newRole));
  };

  const handlePermissionChange = (key: keyof ScreenAccessRules, level: ScreenAccessLevel) => {
    setScreenAccess((prev) => ({
      ...prev,
      [key]: level,
    }));
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setFormError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError("Avatar image must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarUrl(String(reader.result || ""));
      setFormError("");
    };
    reader.onerror = () => setFormError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const validateStage1 = () => {
    if (!fullName.trim()) {
      setFormError("Legal full name is required.");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      setFormError("Valid official email address is required.");
      return false;
    }
    if (!phone.trim()) {
      setFormError("Contact telephone is required.");
      return false;
    }
    if (!cnicNumber.trim()) {
      setFormError("Valid National Identity Card (CNIC) number is required.");
      return false;
    }
    if (!departmentId) {
      setFormError("Please select a department loaded from the server.");
      return false;
    }
    if (!designationId || !designation.trim()) {
      setFormError("Please select a designation loaded from the server.");
      return false;
    }
    setFormError("");
    return true;
  };

  const validateStage2 = () => {
    if (!shiftId) {
      setFormError("Please assign an operational work shift.");
      return false;
    }
    if (isAdmin && basicSalary < 0) {
      setFormError("Basic salary cannot be negative.");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStage1() || !validateStage2()) return;

    setFormError("");
    setIsSubmitting(true);

    const selectedShift = shifts.find((s) => s.id === shiftId) || shifts[0];

    const profileData = {
      tenantId: "tenant-world-class",
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      cnicNumber: cnicNumber.trim(),
      avatarUrl: avatarUrl || undefined,
      department,
      departmentId,
      department_id: departmentId,
      designation: designation.trim(),
      designationId,
      designation_id: designationId,
      status,
      joiningDate,
      shiftId: selectedShift?.id || "shift-regular",
      shiftName: selectedShift?.name || "Regular Day Shift",
      basicSalary: isAdmin ? Number(basicSalary) || 0 : (employee?.basicSalary ?? 0),
      allowances: isAdmin ? Number(allowances) || 0 : (employee?.allowances ?? 0),
      bankName: bankName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankIban: bankIban.trim(),
      annualLeaveAllowance: Number(annualLeaveAllowance) || 14,
      sickLeaveAllowance: Number(sickLeaveAllowance) || 8,
      leavesTaken: employee?.leavesTaken || 0,
      deviceStatus: employee?.deviceStatus || "UNENROLLED",
      screenAccess,
    };

    const authPayload = isAdmin ? {
      accessGranted: grantAccess,
      role: systemRole,
      password: temporaryPassword || undefined,
      screenAccess,
      quickPin: quickPin || undefined,
      avatarColor,
      avatarIcon: "user",
    } : undefined;

    try {
      if (isEditing && employee) {
        if (updateEmployeeRecord) {
          await updateEmployeeRecord(employee.id, profileData, authPayload);
        }
        onSuccess?.(`Employee ${profileData.fullName} updated successfully.`);
      } else {
        if (createEmployeeRecord) {
          await createEmployeeRecord(profileData, authPayload);
        }
        onSuccess?.(`New employee ${profileData.fullName} onboarded successfully.`);
      }
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save employee profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0B0F19] w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-white/10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tracking-wider uppercase border border-emerald-500/20">
                  {isEditing ? "Profile Update" : "3-Step Intake Drawer"}
                </span>
                {employee && (
                  <span className="font-mono text-xs text-gray-400">
                    {employee.employeeCode || employee.employee_code}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {isEditing ? `Edit ${employee?.fullName}` : "New Staff Intake & Onboarding"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 3-Step Progress Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, title: "1. Bio & Identity", icon: User },
              { num: 2, title: "2. Shift & Salary", icon: Briefcase },
              { num: 3, title: "3. System Access", icon: Shield },
            ].map((step) => {
              const Icon = step.icon;
              const isActive = stage === step.num;
              const isPast = stage > step.num;

              return (
                <button
                  type="button"
                  key={step.num}
                  onClick={() => {
                    if (step.num === 1) setStage(1);
                    if (step.num === 2 && validateStage1()) setStage(2);
                    if (step.num === 3 && validateStage1() && validateStage2()) setStage(3);
                  }}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#1B7167]/10 border-[#1B7167] text-[#1B7167] dark:text-teal-400 shadow-xs"
                      : isPast
                      ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-50 dark:bg-white/[0.02] border-gray-200 dark:border-white/5 text-gray-400"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-black truncate">{step.title}</span>
                  </div>
                  <div
                    className={`h-1 w-full rounded-full ${
                      isActive
                        ? "bg-[#1B7167]"
                        : isPast
                        ? "bg-emerald-500"
                        : "bg-gray-200 dark:bg-white/10"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* STAGE 1: Bio & Identity */}
          {stage === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Avatar Upload */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[#1B7167]/30 bg-gray-200 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={fullName || "Avatar"}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-gray-900 dark:text-white block">
                    Employee Photograph
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer shadow-xs">
                    <ImagePlus className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[10px] text-gray-400">PNG, JPG or WebP up to 2 MB</p>
                </div>
              </div>

              {/* Full Name & CNIC */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fatima Noor"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    CNIC / National ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="35201-1234567-1"
                    value={cnicNumber}
                    onChange={(e) => setCnicNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@worldclass.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+92 300 1234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>
              </div>

              {/* Department & Designation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Department *
                  </label>
                  <select
                    value={departmentId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const selected = departmentOptions.find((option) => option.id === nextId);
                      setDepartmentId(nextId);
                      setDepartment((selected?.code || selected?.name || "") as Department);
                      setDesignationId("");
                      setDesignation("");
                    }}
                    disabled={departmentOptions.length === 0}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] disabled:opacity-60"
                  >
                    {departmentOptions.length === 0 && <option value="">Loading departments...</option>}
                    {departmentOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Designation / Title *
                  </label>
                  <select
                    required
                    value={designationId}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      const selected = designationOptions.find((option) => option.id === nextId);
                      setDesignationId(nextId);
                      setDesignation(selected?.title || "");
                    }}
                    disabled={!departmentId || designationOptions.length === 0}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] disabled:opacity-60"
                  >
                    {designationOptions.length === 0 && <option value="">Loading designations...</option>}
                    {designationOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Joining Date & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Joining Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Employment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EmploymentStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  >
                    <option value="ACTIVE">Active Duty</option>
                    <option value="PROBATION">On Probation</option>
                    <option value="ON_LEAVE">On Approved Leave</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="RESIGNED">Resigned</option>
                    <option value="TERMINATED">Terminated</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: Shift, Bank & Compensation */}
          {stage === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Work Shift */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#1B7167] dark:text-teal-400" />
                  Operational Work Shift *
                </label>
                <select
                  value={shiftId}
                  onChange={(e) => setShiftId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime || s.start_time} - {s.endTime || s.end_time}) — {s.gracePeriodMinutes ?? s.grace_minutes ?? 15}m Grace
                    </option>
                  ))}
                </select>
              </div>

              {/* Front-Desk Privacy Shield Warning for non-admins */}
              {!isAdmin ? (
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock className="w-4 h-4" />
                    Front-Desk Privacy Shield Active
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Compensation details and bank account numbers are confidential and managed by Agency Administrators.
                  </p>
                </div>
              ) : (
                <>
                  {/* Compensation (PKR) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Basic Salary (PKR) *
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        required
                        value={basicSalary}
                        onChange={(e) => setBasicSalary(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Monthly Allowances (PKR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={500}
                        value={allowances}
                        onChange={(e) => setAllowances(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                      />
                    </div>

                    <div className="md:col-span-2 pt-2 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-gray-500">Gross Monthly Compensation:</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        PKR {(Number(basicSalary) + Number(allowances)).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Bank Details */}
                  <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                      <Landmark className="w-3.5 h-3.5 text-[#1B7167] dark:text-teal-400" />
                      Disbursement Bank Account
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Meezan Bank Ltd / HBL"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                          Account Number
                        </label>
                        <input
                          type="text"
                          placeholder="01020304050607"
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                          IBAN Number
                        </label>
                        <input
                          type="text"
                          placeholder="PK36MEZN..."
                          value={bankIban}
                          onChange={(e) => setBankIban(e.target.value)}
                          className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Leave Pool Quota */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Annual Leave Pool (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={annualLeaveAllowance}
                    onChange={(e) => setAnnualLeaveAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Sick Leave Pool (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={sickLeaveAllowance}
                    onChange={(e) => setSickLeaveAllowance(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: Runtime Credentials & Screen Permissions */}
          {stage === 3 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Grant ERP Login Switch */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-[#1B7167] dark:text-teal-400" />
                    Grant ERP System Login
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Allow staff member to authenticate with email and role credentials.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={grantAccess}
                    onChange={(e) => setGrantAccess(e.target.checked)}
                    disabled={!isAdmin}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {grantAccess && (
                <>
                  {/* System Role & Password */}
                  <div className="space-y-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Base System Role *
                      </label>
                      <select
                        value={systemRole}
                        onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#121824] text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {isEditing ? "Reset Access Password (Optional)" : "Temporary Password *"}
                        </label>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-[10px] font-bold text-[#1B7167] dark:text-teal-400 hover:underline cursor-pointer"
                        >
                          Generate New Key
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={isEditing ? "Leave blank to keep existing" : "TF@849201"}
                          value={temporaryPassword}
                          onChange={(e) => setTemporaryPassword(e.target.value)}
                          className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-black/30 text-gray-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#1B7167]"
                        />
                        {temporaryPassword && (
                          <button
                            type="button"
                            onClick={copyPassword}
                            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1 cursor-pointer"
                          >
                            {copiedPassword ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-500">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">4-Digit Quick PIN</label>
                        <button type="button" onClick={generatePin} className="text-[10px] font-bold text-[#1B7167] hover:underline dark:text-teal-400">🎲 Generate PIN</button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input type={showQuickPin ? "text" : "password"} inputMode="numeric" maxLength={4} pattern="[0-9]{4}" value={quickPin} onChange={(event) => setQuickPin(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder={isEditing ? "Leave blank to keep current PIN" : "4 digits"} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-10 font-mono text-xs tracking-[0.35em] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-[#1B7167] dark:border-white/10 dark:bg-black/30 dark:text-white" />
                          <button type="button" onClick={() => setShowQuickPin((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500" aria-label={showQuickPin ? "Hide PIN" : "View PIN"}>{showQuickPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        </div>
                        <button type="button" onClick={copyPin} disabled={!quickPin} className="rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">{copiedPin ? "Copied" : "Copy"}</button>
                      </div>
                      <p className="text-[10px] text-gray-400">{isEditing ? "Existing PINs are hash-only. Generate or enter a replacement to reveal and copy it." : "Used only for fast profile switching on an authorized terminal."}</p>
                    </div>
                    <fieldset>
                      <legend className="text-xs font-bold text-gray-700 dark:text-gray-300">Profile avatar color</legend>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {AVATAR_COLORS.map((color) => <label key={color} className="cursor-pointer"><input type="radio" name="avatar-color" value={color} checked={avatarColor === color} onChange={() => setAvatarColor(color)} className="sr-only" /><span className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 ${avatarColor === color ? "border-gray-900 ring-2 ring-[#1B7167]/30 dark:border-white" : "border-transparent"}`} style={{ backgroundColor: color }}>{avatarColor === color && <Check className="h-4 w-4 text-white" />}</span></label>)}
                      </div>
                    </fieldset>
                  </div>

                  {/* Granular Screen Access Matrix */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white">
                        Screen Permission Matrix
                      </h4>
                      <span className="text-[10px] text-gray-400">
                        Preset applied for {systemRole}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {ACCESS_KEYS.map((item) => {
                        const currentVal = screenAccess[item.key] || "NONE";
                        return (
                          <div
                            key={item.key}
                            className="p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                {item.label}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate max-w-[200px]">
                                {item.desc}
                              </div>
                            </div>

                            {/* Radio switches: NONE | READ | FULL */}
                            <div className="flex items-center gap-1 bg-white dark:bg-black/40 p-1 rounded-lg border border-gray-200 dark:border-white/10 text-[10px] font-bold">
                              {(["NONE", "READ", "FULL"] as ScreenAccessLevel[]).map((lvl) => {
                                const isSelected = currentVal === lvl;
                                return (
                                  <button
                                    type="button"
                                    key={lvl}
                                    onClick={() => handlePermissionChange(item.key, lvl)}
                                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                      isSelected
                                        ? lvl === "FULL"
                                          ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                                          : lvl === "READ"
                                          ? "bg-[#1B7167] text-white shadow-xs font-extrabold"
                                          : "bg-gray-400 text-white shadow-xs font-extrabold"
                                        : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                                    }`}
                                  >
                                    {lvl}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </form>

        {/* Drawer Footer Controls */}
        <div className="p-6 border-t border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-[#070A11]">
          {stage > 1 ? (
            <button
              type="button"
              onClick={() => {
                setFormError("");
                setStage((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1));
              }}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}

          {stage === 1 && (
            <button
              type="button"
              onClick={() => {
                if (validateStage1()) setStage(2);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer [&>svg]:text-white [&>span]:text-white"
            >
              <span>Save & Continue to Compensation</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          {stage === 2 && (
            <button
              type="button"
              onClick={() => {
                if (validateStage2()) setStage(3);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm inline-flex items-center gap-2 cursor-pointer [&>svg]:text-white [&>span]:text-white"
            >
              <span>Save & Continue to Credentials</span>
              <ArrowRight className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          {stage === 3 && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 [&>svg]:text-white [&>span]:text-white"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>
                {isSubmitting
                  ? "Processing..."
                  : isEditing
                  ? "Save Profile Changes"
                  : "Complete Staff Onboarding"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

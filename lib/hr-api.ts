/**
 * HR Core & Staff Operations API Client for TourFlow ERP
 * Handles fetching, creating, updating staff directory records, department shifts,
 * and system access against the backend /api/v1/hr routes.
 */

import { apiClient } from "./api-client";
import type { UserRole } from "@/context/RoleContext";
import type {
  EmployeeProfile,
  Shift,
  WorkShift,
  EmploymentStatus,
  ScreenAccessRules,
} from "@/types/erp";
import type {
  DepartmentRecord,
  DesignationRecord,
} from "@/data/hr-source";
import { defaultScreenAccess } from "@/lib/screen-access";

export type Department = DepartmentRecord;
export type Designation = DesignationRecord;

export interface ApiEmployeeResponse {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  user_id?: string;
  userId?: string;
  employee_code?: string;
  employeeCode?: string;
  full_name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  cnic?: string;
  cnic_number?: string;
  cnicNumber?: string;
  avatar_url?: string;
  avatarUrl?: string;
  department_id?: string;
  departmentId?: string;
  department_name?: string;
  departmentName?: string;
  department?: string;
  designation_id?: string;
  designationId?: string;
  designation_title?: string;
  designationTitle?: string;
  designation?: string;
  employment_status?: EmploymentStatus;
  status?: EmploymentStatus;
  joining_date?: string;
  joiningDate?: string;
  shift_id?: string;
  shiftId?: string;
  shift_name?: string;
  shiftName?: string;
  basic_salary?: number;
  basicSalary?: number;
  allowances?: number;
  bank_name?: string;
  bankName?: string;
  bank_account_number?: string;
  bankAccountNumber?: string;
  bank_iban?: string;
  bankIban?: string;
  annual_leave_allowance?: number;
  annualLeaveAllowance?: number;
  annual_leave_quota?: number;
  sick_leave_allowance?: number;
  sickLeaveAllowance?: number;
  sick_leave_quota?: number;
  leaves_taken?: number;
  leavesTaken?: number;
  device_status?: "BOUND" | "UNENROLLED" | "REVOKED";
  deviceStatus?: "BOUND" | "UNENROLLED" | "REVOKED";
  device_model?: string;
  deviceModel?: string;
  device_enrolled_at?: string;
  deviceEnrolledAt?: string;
  device_revoked_at?: string;
  deviceRevokedAt?: string;
  device_revoked_by?: string;
  deviceRevokedBy?: string;
  device_revocation_reason?: string;
  deviceRevocationReason?: string;
  screen_access?: ScreenAccessRules;
  screenAccess?: ScreenAccessRules;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface ApiShiftResponse {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name?: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  grace_minutes?: number;
  gracePeriodMinutes?: number;
  half_day_minutes?: number;
  halfDayMinutes?: number;
  is_active?: boolean;
  working_days?: ("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[];
  workingDays?: ("MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN")[];
}

/**
 * Transforms a backend Employee payload into frontend EmployeeProfile format
 */
export function backendToFrontendEmployee(raw: ApiEmployeeResponse): EmployeeProfile {
  const role: UserRole = "FRONT_DESK";
  const defaultAccess = defaultScreenAccess(role);

  return {
    id: raw.id,
    tenantId: raw.tenantId || raw.tenant_id || "tenant-world-class",
    tenant_id: raw.tenant_id || raw.tenantId || "tenant-world-class",
    userId: raw.userId || raw.user_id,
    user_id: raw.user_id || raw.userId,
    employeeCode: raw.employeeCode || raw.employee_code || "WCH-EMP-000",
    employee_code: raw.employee_code || raw.employeeCode || "WCH-EMP-000",
    fullName: raw.fullName || raw.full_name || "Unnamed Employee",
    full_name: raw.full_name || raw.fullName || "Unnamed Employee",
    avatarUrl: raw.avatarUrl || raw.avatar_url,
    avatar_url: raw.avatar_url || raw.avatarUrl,
    email: raw.email || "",
    phone: raw.phone || "",
    cnicNumber: raw.cnicNumber || raw.cnic_number || raw.cnic || "",
    cnic: raw.cnic || raw.cnicNumber || raw.cnic_number || "",
    department: raw.department || raw.departmentName || raw.department_name || "OPERATIONS",
    departmentId: raw.departmentId || raw.department_id,
    department_id: raw.department_id || raw.departmentId,
    departmentName: raw.departmentName || raw.department_name || raw.department,
    department_name: raw.department_name || raw.departmentName || raw.department,
    designation: raw.designation || raw.designationTitle || raw.designation_title || "Associate",
    designationId: raw.designationId || raw.designation_id,
    designation_id: raw.designation_id || raw.designationId,
    designationTitle: raw.designationTitle || raw.designation_title || raw.designation,
    designation_title: raw.designation_title || raw.designationTitle || raw.designation,
    status: raw.status || raw.employment_status || "ACTIVE",
    employment_status: raw.employment_status || raw.status || "ACTIVE",
    joiningDate: raw.joiningDate || raw.joining_date || new Date().toISOString().slice(0, 10),
    joining_date: raw.joining_date || raw.joiningDate || new Date().toISOString().slice(0, 10),
    shiftId: raw.shiftId || raw.shift_id || "shift-regular",
    shift_id: raw.shift_id || raw.shiftId || "shift-regular",
    shiftName: raw.shiftName || raw.shift_name || "Regular Day Shift",
    shift_name: raw.shift_name || raw.shiftName || "Regular Day Shift",
    basicSalary: Number(raw.basicSalary ?? raw.basic_salary ?? 0),
    basic_salary: Number(raw.basic_salary ?? raw.basicSalary ?? 0),
    allowances: Number(raw.allowances ?? 0),
    bankName: raw.bankName || raw.bank_name || "Meezan Bank Ltd",
    bank_name: raw.bank_name || raw.bankName || "Meezan Bank Ltd",
    bankAccountNumber: raw.bankAccountNumber || raw.bank_account_number || "",
    bank_account_number: raw.bank_account_number || raw.bankAccountNumber || "",
    bankIban: raw.bankIban || raw.bank_iban || "",
    bank_iban: raw.bank_iban || raw.bankIban || "",
    annualLeaveAllowance: Number(raw.annualLeaveAllowance ?? raw.annual_leave_allowance ?? raw.annual_leave_quota ?? 14),
    annual_leave_allowance: Number(raw.annual_leave_allowance ?? raw.annualLeaveAllowance ?? raw.annual_leave_quota ?? 14),
    sickLeaveAllowance: Number(raw.sickLeaveAllowance ?? raw.sick_leave_allowance ?? raw.sick_leave_quota ?? 8),
    sick_leave_allowance: Number(raw.sick_leave_allowance ?? raw.sickLeaveAllowance ?? raw.sick_leave_quota ?? 8),
    leavesTaken: Number(raw.leavesTaken ?? raw.leaves_taken ?? 0),
    leaves_taken: Number(raw.leaves_taken ?? raw.leavesTaken ?? 0),
    deviceStatus: raw.deviceStatus || raw.device_status || "UNENROLLED",
    device_status: raw.device_status || raw.deviceStatus || "UNENROLLED",
    deviceModel: raw.deviceModel || raw.device_model,
    device_model: raw.device_model || raw.deviceModel,
    deviceEnrolledAt: raw.deviceEnrolledAt || raw.device_enrolled_at,
    deviceRevokedAt: raw.deviceRevokedAt || raw.device_revoked_at,
    deviceRevokedBy: raw.deviceRevokedBy || raw.device_revoked_by,
    deviceRevocationReason: raw.deviceRevocationReason || raw.device_revocation_reason,
    screenAccess: raw.screenAccess || raw.screen_access || defaultAccess,
    screen_access: raw.screen_access || raw.screenAccess || defaultAccess,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    created_at: raw.created_at || raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    updated_at: raw.updated_at || raw.updatedAt || new Date().toISOString(),
  };
}

/**
 * Transforms a backend Shift payload into frontend WorkShift format
 */
export function backendToFrontendShift(raw: ApiShiftResponse): WorkShift {
  return {
    id: raw.id,
    name: raw.name || "Standard Shift",
    startTime: raw.startTime || raw.start_time || "09:00",
    start_time: raw.start_time || raw.startTime || "09:00",
    endTime: raw.endTime || raw.end_time || "18:00",
    end_time: raw.end_time || raw.endTime || "18:00",
    gracePeriodMinutes: raw.gracePeriodMinutes ?? raw.grace_minutes ?? 15,
    grace_minutes: raw.grace_minutes ?? raw.gracePeriodMinutes ?? 15,
    halfDayMinutes: raw.halfDayMinutes ?? raw.half_day_minutes ?? 240,
    half_day_minutes: raw.half_day_minutes ?? raw.halfDayMinutes ?? 240,
    is_active: raw.is_active ?? true,
    workingDays: raw.workingDays || raw.working_days || ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  };
}

/**
 * Fetch all departments
 */
export async function fetchDepartments(): Promise<DepartmentRecord[]> {
  const data = await apiClient.get<DepartmentRecord[]>("/hr/departments");
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch all designations, optionally filtered by department
 */
export async function fetchDesignations(departmentId?: string): Promise<DesignationRecord[]> {
  const data = await apiClient.get<DesignationRecord[]>("/hr/designations", {
    params: departmentId ? { department_id: departmentId } : undefined,
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Fetch all employee profiles visible to the authenticated tenant.
 */
export async function fetchEmployees(
  params?: { q?: string; department_id?: string; status?: string } | string
): Promise<EmployeeProfile[]> {
  const queryParams = typeof params === "string" ? undefined : params;
  try {
    const data = await apiClient.get<ApiEmployeeResponse[]>("/hr/employees", {
      params: queryParams,
    });

    return Array.isArray(data) ? data.map(backendToFrontendEmployee) : [];
  } catch (error) {
    throw error;
  }
}

/**
 * Get detailed profile for a single employee
 */
export async function getEmployeeDetail(employeeId: string): Promise<EmployeeProfile> {
  try {
    const data = await apiClient.get<ApiEmployeeResponse>(`/hr/employees/${employeeId}`);
    return backendToFrontendEmployee(data);
  } catch (error) {
    throw error;
  }
}

/**
 * Create a new employee profile and provision system credentials
 */
export async function createEmployee(
  payload: Partial<EmployeeProfile>,
  authData?: {
    role?: UserRole;
    password?: string;
    accessGranted?: boolean;
    screenAccess?: ScreenAccessRules;
    quickPin?: string;
    avatarColor?: string;
    avatarIcon?: string;
  }
): Promise<EmployeeProfile> {
  const backendPayload = {
    tenant_id: payload.tenantId || payload.tenant_id || "tenant-world-class",
    full_name: payload.fullName || payload.full_name,
    email: payload.email,
    phone: payload.phone,
    cnic: payload.cnicNumber || payload.cnic,
    avatar_url: payload.avatarUrl || payload.avatar_url,
    department_id: payload.departmentId || payload.department_id,
    department: payload.department,
    designation_id: payload.designationId || payload.designation_id,
    designation: payload.designation,
    employment_status: payload.status || payload.employment_status || "ACTIVE",
    joining_date: payload.joiningDate || payload.joining_date,
    shift_id: payload.shiftId || payload.shift_id,
    shift_name: payload.shiftName || payload.shift_name,
    basic_salary: payload.basicSalary ?? payload.basic_salary,
    allowances: payload.allowances ?? 0,
    bank_name: payload.bankName || payload.bank_name,
    bank_account_number: payload.bankAccountNumber || payload.bank_account_number,
    bank_iban: payload.bankIban || payload.bank_iban,
    annual_leave_quota: payload.annualLeaveAllowance ?? payload.annual_leave_allowance ?? 14,
    sick_leave_quota: payload.sickLeaveAllowance ?? payload.sick_leave_allowance ?? 8,
    access_granted: authData?.accessGranted ?? false,
    role: authData?.role ?? "FRONT_DESK",
    temporary_password: authData?.password,
    quick_pin: authData?.quickPin,
    avatar_color: authData?.avatarColor,
    avatar_icon: authData?.avatarIcon,
    screen_access: authData?.screenAccess || payload.screenAccess,
  };

  const data = await apiClient.post<ApiEmployeeResponse>("/hr/employees", backendPayload);
  return backendToFrontendEmployee(data);
}

/**
 * Update an existing employee profile
 */
export async function updateEmployee(
  employeeId: string,
  payload: Partial<EmployeeProfile>,
  authData?: {
    role?: UserRole;
    password?: string;
    accessGranted?: boolean;
    screenAccess?: ScreenAccessRules;
    quickPin?: string;
    avatarColor?: string;
    avatarIcon?: string;
  }
): Promise<EmployeeProfile> {
  const backendPayload = {
    full_name: payload.fullName || payload.full_name,
    email: payload.email,
    phone: payload.phone,
    cnic: payload.cnicNumber || payload.cnic,
    avatar_url: payload.avatarUrl || payload.avatar_url,
    department_id: payload.departmentId || payload.department_id,
    department: payload.department,
    designation_id: payload.designationId || payload.designation_id,
    designation: payload.designation,
    employment_status: payload.status || payload.employment_status,
    joining_date: payload.joiningDate || payload.joining_date,
    shift_id: payload.shiftId || payload.shift_id,
    shift_name: payload.shiftName || payload.shift_name,
    basic_salary: payload.basicSalary ?? payload.basic_salary,
    allowances: payload.allowances,
    bank_name: payload.bankName || payload.bank_name,
    bank_account_number: payload.bankAccountNumber || payload.bank_account_number,
    bank_iban: payload.bankIban || payload.bank_iban,
    annual_leave_quota: payload.annualLeaveAllowance ?? payload.annual_leave_allowance,
    sick_leave_quota: payload.sickLeaveAllowance ?? payload.sick_leave_allowance,
    leaves_taken: payload.leavesTaken ?? payload.leaves_taken,
    device_status: payload.deviceStatus || payload.device_status,
    access_granted: authData?.accessGranted,
    role: authData?.role,
    temporary_password: authData?.password,
    quick_pin: authData?.quickPin,
    avatar_color: authData?.avatarColor,
    avatar_icon: authData?.avatarIcon,
    screen_access: authData?.screenAccess || payload.screenAccess,
  };

  const data = await apiClient.put<ApiEmployeeResponse>(`/hr/employees/${employeeId}`, backendPayload);
  return backendToFrontendEmployee(data);
}

/**
 * Toggle an employee's employment status (Active / Suspended)
 */
export async function toggleEmployeeStatus(
  employeeId: string,
  nextStatus: EmploymentStatus
): Promise<EmployeeProfile> {
  try {
    const data = await apiClient.patch<ApiEmployeeResponse>(`/hr/employees/${employeeId}/status`, {
      status: nextStatus,
    });
    return backendToFrontendEmployee(data);
  } catch {
    return updateEmployee(employeeId, { status: nextStatus, employment_status: nextStatus });
  }
}

/**
 * Fetch all department work shifts
 */
export async function fetchShifts(): Promise<WorkShift[]> {
  const data = await apiClient.get<ApiShiftResponse[]>("/hr/shifts");
  return Array.isArray(data) ? data.map(backendToFrontendShift) : [];
}

/**
 * Create a new operational work shift
 */
export async function createShift(payload: Partial<Shift>): Promise<WorkShift> {
  const backendPayload = {
    name: payload.name,
    start_time: payload.startTime || payload.start_time,
    end_time: payload.endTime || payload.end_time,
    grace_minutes: payload.gracePeriodMinutes ?? payload.grace_minutes ?? 15,
    half_day_minutes: payload.halfDayMinutes ?? payload.half_day_minutes ?? 240,
    working_days: payload.workingDays,
  };

  const data = await apiClient.post<ApiShiftResponse>("/hr/shifts", backendPayload);
  return backendToFrontendShift(data);
}

/**
 * Update an existing work shift
 */
export async function updateShift(shiftId: string, payload: Partial<Shift>): Promise<WorkShift> {
  const backendPayload = {
    name: payload.name,
    start_time: payload.startTime || payload.start_time,
    end_time: payload.endTime || payload.end_time,
    grace_minutes: payload.gracePeriodMinutes ?? payload.grace_minutes,
    half_day_minutes: payload.halfDayMinutes ?? payload.half_day_minutes,
    working_days: payload.workingDays,
  };

  const data = await apiClient.put<ApiShiftResponse>(`/hr/shifts/${shiftId}`, backendPayload);
  return backendToFrontendShift(data);
}

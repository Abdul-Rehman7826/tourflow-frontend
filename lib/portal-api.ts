/**
 * TourFlow ERP - Employee Self-Service Portal API Service
 * Connects frontend portal, personal attendance metrics, salary advances,
 * and confidential payslips to live FastAPI endpoints (/api/v1/portal).
 */

import { apiClient } from "@/lib/api-client";
import { backendToFrontendPayrollItem } from "@/lib/payroll-api";
import type {
  EmployeeSelfServiceProfile,
  PersonalPayslipRecord,
  SalaryAdvance,
  AttendanceRecord,
} from "@/types/erp";

export interface PortalAttendanceSummary {
  month: string;
  working_days: number;
  days_present: number;
  days_late: number;
  unexcused_absences: number;
  standing: "GOOD_STANDING" | "REVIEW_NEEDED";
  recent_records: AttendanceRecord[];
}

export interface PortalAdvanceRequestPayload {
  amount: number;
  target_month: string;
  reason: string;
  acknowledged: boolean;
}

/**
 * 1. Fetch authenticated employee's portal profile
 */
export async function getPortalProfile(): Promise<EmployeeSelfServiceProfile> {
  const response = await apiClient.get<Record<string, unknown>>("/portal/me");
  return {
    id: (response.id as string) || "",
    tenantId: (response.tenant_id || response.tenantId || "") as string,
    employeeCode: (response.employee_code || response.employeeCode || "") as string,
    fullName: (response.full_name || response.fullName || "Staff Member") as string,
    avatarUrl: (response.avatar_url || response.avatarUrl) as string | undefined,
    email: (response.email || "") as string,
    phone: (response.phone || "") as string,
    department: (response.department || "OPERATIONS") as EmployeeSelfServiceProfile["department"],
    designation: (response.designation || "Staff") as string,
    status: (response.status || "ACTIVE") as EmployeeSelfServiceProfile["status"],
    shiftId: (response.shift_id || response.shiftId || "") as string,
    shiftName: (response.shift_name || response.shiftName || "Regular Day Shift") as string,
    deviceStatus: (response.device_status || response.deviceStatus || "UNENROLLED") as EmployeeSelfServiceProfile["deviceStatus"],
    deviceModel: (response.device_model || response.deviceModel) as string | undefined,
  };
}

/**
 * 2. Fetch authenticated staff member's personal payslips
 */
export async function getPersonalPayslips(): Promise<PersonalPayslipRecord[]> {
  try {
    const response = await apiClient.get<Record<string, unknown>[]>("/portal/payslips");
    if (Array.isArray(response)) {
      return response.map((item: Record<string, unknown>) => ({
        runId: (item.run_id || item.runId || item.id || "") as string,
        run_id: (item.run_id || item.runId || item.id || "") as string,
        tenantId: (item.tenant_id || item.tenantId || "") as string,
        tenant_id: (item.tenant_id || item.tenantId || "") as string,
        monthString: (item.month_string || item.monthString || "") as string,
        month_string: (item.month_string || item.monthString || "") as string,
        monthCode: (item.month_code || item.monthCode || "") as string,
        month_code: (item.month_code || item.monthCode || "") as string,
        payrollStatus: (item.payroll_status || item.payrollStatus || "DISBURSED") as PersonalPayslipRecord["payrollStatus"],
        payroll_status: (item.payroll_status || item.payrollStatus || "DISBURSED") as PersonalPayslipRecord["payrollStatus"],
        generatedAt: (item.generated_at || item.generatedAt || new Date().toISOString()) as string,
        generated_at: (item.generated_at || item.generatedAt || new Date().toISOString()) as string,
        approvedAt: (item.approved_at || item.approvedAt) as string | undefined,
        approved_at: (item.approved_at || item.approvedAt) as string | undefined,
        disbursedAt: (item.disbursed_at || item.disbursedAt) as string | undefined,
        disbursed_at: (item.disbursed_at || item.disbursedAt) as string | undefined,
        item: backendToFrontendPayrollItem((item.item || item) as Record<string, unknown>),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 3. Fetch specific payslip detail
 */
export async function getPayslipDetail(id: string): Promise<PersonalPayslipRecord> {
  const item = await apiClient.get<Record<string, unknown>>(`/portal/payslips/${id}`);
  return {
    runId: (item.run_id || item.runId || item.id || id) as string,
    run_id: (item.run_id || item.runId || item.id || id) as string,
    tenantId: (item.tenant_id || item.tenantId || "") as string,
    tenant_id: (item.tenant_id || item.tenantId || "") as string,
    monthString: (item.month_string || item.monthString || "") as string,
    month_string: (item.month_string || item.monthString || "") as string,
    monthCode: (item.month_code || item.monthCode || "") as string,
    month_code: (item.month_code || item.monthCode || "") as string,
    payrollStatus: (item.payroll_status || item.payrollStatus || "DISBURSED") as PersonalPayslipRecord["payrollStatus"],
    payroll_status: (item.payroll_status || item.payrollStatus || "DISBURSED") as PersonalPayslipRecord["payrollStatus"],
    generatedAt: (item.generated_at || item.generatedAt || new Date().toISOString()) as string,
    generated_at: (item.generated_at || item.generatedAt || new Date().toISOString()) as string,
    approvedAt: (item.approved_at || item.approvedAt) as string | undefined,
    approved_at: (item.approved_at || item.approvedAt) as string | undefined,
    disbursedAt: (item.disbursed_at || item.disbursedAt) as string | undefined,
    disbursed_at: (item.disbursed_at || item.disbursedAt) as string | undefined,
    item: backendToFrontendPayrollItem((item.item || item) as Record<string, unknown>),
  };
}

/**
 * 4. Fetch current month's attendance telemetry summary
 */
export async function getAttendanceSummary(): Promise<PortalAttendanceSummary> {
  try {
    const response = await apiClient.get<Record<string, unknown>>("/portal/attendance-summary");
    return {
      month: (response.month || new Date().toISOString().slice(0, 7)) as string,
      working_days: Number(response.working_days ?? 26),
      days_present: Number(response.days_present ?? 0),
      days_late: Number(response.days_late ?? 0),
      unexcused_absences: Number(response.unexcused_absences ?? 0),
      standing: ((response.standing as string) || "GOOD_STANDING") as "GOOD_STANDING" | "REVIEW_NEEDED",
      recent_records: Array.isArray(response.recent_records) ? (response.recent_records as AttendanceRecord[]) : [],
    };
  } catch {
    return {
      month: new Date().toISOString().slice(0, 7),
      working_days: 26,
      days_present: 0,
      days_late: 0,
      unexcused_absences: 0,
      standing: "GOOD_STANDING",
      recent_records: [],
    };
  }
}

/**
 * 5. Fetch personal salary advance requests
 */
export async function getPersonalAdvances(): Promise<SalaryAdvance[]> {
  try {
    const response = await apiClient.get<Record<string, unknown>[]>("/portal/advances");
    if (Array.isArray(response)) {
      return response.map((raw: Record<string, unknown>) => ({
        id: (raw.id as string) || `adv_${crypto.randomUUID()}`,
        tenantId: (raw.tenant_id || raw.tenantId || "") as string,
        tenant_id: (raw.tenant_id || raw.tenantId || "") as string,
        employeeId: (raw.employee_id || raw.employeeId || "") as string,
        employee_id: (raw.employee_id || raw.employeeId || "") as string,
        employeeName: (raw.employee_name || raw.employeeName || "Staff Member") as string,
        employee_name: (raw.employee_name || raw.employeeName || "Staff Member") as string,
        requestDate: (raw.request_date || raw.requestDate || new Date().toISOString().slice(0, 10)) as string,
        request_date: (raw.request_date || raw.requestDate || new Date().toISOString().slice(0, 10)) as string,
        amount: Number(raw.amount ?? 0),
        reason: (raw.reason || "") as string,
        status: (raw.status || "PENDING") as SalaryAdvance["status"],
        approvedByAdmin: (raw.approved_by_admin || raw.approvedByAdmin) as string | undefined,
        approved_by_admin: (raw.approved_by_admin || raw.approvedByAdmin) as string | undefined,
        reviewedAt: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
        reviewed_at: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
        payrollMonth: (raw.payroll_month || raw.payrollMonth || new Date().toISOString().slice(0, 7)) as string,
        payroll_month: (raw.payroll_month || raw.payrollMonth || new Date().toISOString().slice(0, 7)) as string,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 6. Submit a salary advance request
 */
export async function requestAdvance(data: PortalAdvanceRequestPayload): Promise<SalaryAdvance> {
  const raw = await apiClient.post<Record<string, unknown>>("/portal/advances", data);
  return {
    id: (raw.id as string) || `adv_${crypto.randomUUID()}`,
    tenantId: (raw.tenant_id || raw.tenantId || "") as string,
    tenant_id: (raw.tenant_id || raw.tenantId || "") as string,
    employeeId: (raw.employee_id || raw.employeeId || "") as string,
    employee_id: (raw.employee_id || raw.employeeId || "") as string,
    employeeName: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    employee_name: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    requestDate: (raw.request_date || raw.requestDate || new Date().toISOString().slice(0, 10)) as string,
    request_date: (raw.request_date || raw.requestDate || new Date().toISOString().slice(0, 10)) as string,
    amount: Number(raw.amount ?? data.amount),
    reason: (raw.reason || data.reason) as string,
    status: (raw.status || "PENDING") as SalaryAdvance["status"],
    approvedByAdmin: (raw.approved_by_admin || raw.approvedByAdmin) as string | undefined,
    approved_by_admin: (raw.approved_by_admin || raw.approvedByAdmin) as string | undefined,
    reviewedAt: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
    reviewed_at: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
    payrollMonth: (raw.payroll_month || raw.payrollMonth || data.target_month) as string,
    payroll_month: (raw.payroll_month || raw.payrollMonth || data.target_month) as string,
  };
}

/**
 * TourFlow ERP - Central Leave Management API Service
 * Connects frontend leave operations to the live PHP API (/api/v1/leave).
 */

import { apiClient } from "@/lib/api-client";
import type {
  LeaveBalanceSummary,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from "@/types/erp";

export interface RecordLeavePayload {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason: string;
  employee_id: string;
}

export interface VoidLeavePayload {
  reason: string;
}

export interface ReviewLeavePayload {
  decision: "APPROVE" | "REJECT";
  rejection_reason?: string;
  reviewed_by?: string;
}

export interface UpdateEntitlementPayload {
  annual_allowance: number;
  sick_allowance: number;
}

/**
 * Normalizes backend snake_case LeaveRequest into dual-compatible frontend model
 */
export function backendToFrontendLeaveRequest(raw: Record<string, unknown>): LeaveRequest {
  const startDate = (raw.start_date || raw.startDate || new Date().toISOString().slice(0, 10)) as string;
  const endDate = (raw.end_date || raw.endDate || startDate) as string;
  const leaveType: LeaveType = (raw.leave_type || raw.leaveType || "ANNUAL") as LeaveType;
  const status: LeaveStatus = (raw.status || "PENDING") as LeaveStatus;
  const totalDays = typeof raw.total_days === "number" ? raw.total_days : typeof raw.totalDays === "number" ? raw.totalDays : 1;
  const appliedAt = (raw.applied_at || raw.appliedAt || new Date().toISOString()) as string;

  return {
    ...(raw as unknown as LeaveRequest),
    id: (raw.id as string) || `leave_${crypto.randomUUID()}`,
    tenantId: (raw.tenant_id || raw.tenantId || "") as string,
    tenant_id: (raw.tenant_id || raw.tenantId || "") as string,
    employeeId: (raw.employee_id || raw.employeeId || "") as string,
    employee_id: (raw.employee_id || raw.employeeId || "") as string,
    employeeCode: (raw.employee_code || raw.employeeCode || "") as string,
    employee_code: (raw.employee_code || raw.employeeCode || "") as string,
    employeeName: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    employee_name: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    department: (raw.department || "OPERATIONS") as string,
    leaveType,
    leave_type: leaveType,
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    totalDays,
    total_days: totalDays,
    reason: (raw.reason || "") as string,
    status,
    appliedAt,
    applied_at: appliedAt,
    reviewedBy: (raw.reviewed_by || raw.reviewedBy) as string | undefined,
    reviewed_by: (raw.reviewed_by || raw.reviewedBy) as string | undefined,
    reviewedAt: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
    reviewed_at: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
    rejectionReason: (raw.rejection_reason || raw.rejectionReason) as string | undefined,
    rejection_reason: (raw.rejection_reason || raw.rejectionReason) as string | undefined,
  };
}

/**
 * Normalizes backend snake_case LeaveBalance into frontend model
 */
export function backendToFrontendLeaveBalance(raw: Record<string, unknown>): LeaveBalanceSummary {
  const annualTotal = Number(raw.annual_total ?? raw.annualTotal ?? 14);
  const annualUsed = Number(raw.annual_used ?? raw.annualUsed ?? 0);
  const annualRemaining = Number(raw.annual_remaining ?? raw.annualRemaining ?? Math.max(0, annualTotal - annualUsed));
  const sickTotal = Number(raw.sick_total ?? raw.sickTotal ?? 8);
  const sickUsed = Number(raw.sick_used ?? raw.sickUsed ?? 0);
  const sickRemaining = Number(raw.sick_remaining ?? raw.sickRemaining ?? Math.max(0, sickTotal - sickUsed));
  const unpaidDaysTaken = Number(raw.unpaid_days_taken ?? raw.unpaidDaysTaken ?? 0);

  return {
    employeeId: (raw.employee_id || raw.employeeId || "") as string,
    employee_id: (raw.employee_id || raw.employeeId || "") as string,
    annualTotal,
    annual_total: annualTotal,
    annualUsed,
    annual_used: annualUsed,
    annualRemaining,
    annual_remaining: annualRemaining,
    sickTotal,
    sick_total: sickTotal,
    sickUsed,
    sick_used: sickUsed,
    sickRemaining,
    sick_remaining: sickRemaining,
    unpaidDaysTaken,
    unpaid_days_taken: unpaidDaysTaken,
  };
}

/**
 * Fetch the signed-in employee's read-only leave history.
 */
export async function fetchLeaveHistoryApi(): Promise<LeaveRequest[]> {
  const res = await apiClient.get<Record<string, unknown>>("/leave/history");
  const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? (res.data as Record<string, unknown>[]) : Array.isArray(res?.requests) ? (res.requests as Record<string, unknown>[]) : [];
  return items.map(backendToFrontendLeaveRequest);
}

/**
 * Fetch the agency leave register. The PHP API limits this to HR/Admin roles.
 */
export async function fetchLeaveRecordsApi(): Promise<LeaveRequest[]> {
  const res = await apiClient.get<Record<string, unknown>>("/leave/records");
  const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? (res.data as Record<string, unknown>[]) : Array.isArray(res?.records) ? (res.records as Record<string, unknown>[]) : [];
  return items.map(backendToFrontendLeaveRequest);
}

/**
 * Record a confirmed leave entry. This is intentionally manager-only.
 */
export async function recordLeaveApi(payload: RecordLeavePayload): Promise<LeaveRequest> {
  const res = await apiClient.post<Record<string, unknown>>("/leave/records", payload);
  return backendToFrontendLeaveRequest((res?.data || res) as Record<string, unknown>);
}

/**
 * Void a confirmed leave entry. The backend requires an administrative reason.
 */
export async function voidLeaveApi(id: string, payload: VoidLeavePayload): Promise<LeaveRequest> {
  const res = await apiClient.post<Record<string, unknown>>(`/leave/records/${id}/void`, payload);
  return backendToFrontendLeaveRequest((res?.data || res) as Record<string, unknown>);
}

/** Existing pre-HR-register pending requests may be resolved once by a manager. */
export async function reviewLegacyLeaveRequestApi(id: string, payload: ReviewLeavePayload): Promise<LeaveRequest> {
  const res = await apiClient.post<Record<string, unknown>>(`/leave/legacy-requests/${id}/review`, payload);
  return backendToFrontendLeaveRequest((res?.data || res) as Record<string, unknown>);
}

/**
 * Fetch leave balance summaries
 */
export async function fetchLeaveBalancesApi(): Promise<LeaveBalanceSummary[]> {
  try {
    const res = await apiClient.get<Record<string, unknown>>("/leave/balances");
    const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? (res.data as Record<string, unknown>[]) : Array.isArray(res?.balances) ? (res.balances as Record<string, unknown>[]) : [];
    return items.map(backendToFrontendLeaveBalance);
  } catch {
    return [];
  }
}

/**
 * Update employee annual and sick leave entitlements
 */
export async function updateLeaveEntitlementApi(
  employeeId: string,
  payload: UpdateEntitlementPayload,
): Promise<boolean> {
  try {
    await apiClient.patch(`/leave/entitlements/${employeeId}`, payload);
    return true;
  } catch {
    return false;
  }
}

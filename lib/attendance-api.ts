/**
 * TourFlow ERP - Central Attendance API Service
 * Connects frontend attendance operations to the live PHP backend (/api/v1/attendance).
 */

import { apiClient } from "@/lib/api-client";
import type {
  AttendanceRecord,
  AttendanceStatus,
  DailyAttendanceSummary,
  PunchResult,
} from "@/types/erp";

const ATTENDANCE_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const KIOSK_TERMINAL_TOKEN_STORAGE_KEY = "tourflow_attendance_terminal_token";
export const KIOSK_TERMINAL_ID_STORAGE_KEY = "tourflow_attendance_terminal_id";

export interface AttendanceTerminal {
  id: string;
  office_id: string;
  office_name: string;
  name: string;
  status: "ACTIVE" | "REVOKED";
  activated_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
}

export interface AttendanceAuditEvent {
  id: string;
  record_id: string | null;
  employee_id: string | null;
  employee_code: string | null;
  employee_name: string | null;
  terminal_id: string | null;
  terminal_name: string | null;
  action: string;
  source: string;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  reason: string;
  actor_name: string | null;
  created_at: string;
}

export interface AttendancePunchPayload {
  employee_id: string;
  qr_token: string;
  device_id?: string;
  timestamp?: string;
}

export interface AttendanceCorrectionPayload {
  attendance_date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  correction_reason: string;
}

export interface AttendanceFinalizePayload {
  target_date: string;
  cutoff_time: string;
  executed_by: string;
}

/**
 * Normalizes backend snake_case AttendanceRecord into dual-compatible frontend model
 */
export function backendToFrontendAttendanceRecord(raw: Record<string, unknown>): AttendanceRecord {
  const attendanceDate = (raw.date || raw.attendance_date || raw.attendanceDate || new Date().toISOString().slice(0, 10)) as string;
  const checkIn = (raw.check_in || raw.checkInAt || raw.checkIn || null) as string | null;
  const checkOut = (raw.check_out || raw.checkOutAt || raw.checkOut || null) as string | null;
  const shiftStartTime = (raw.shift_start || raw.shift_start_time || raw.shiftStartTime || "09:00") as string;
  const shiftEndTime = (raw.shift_end || raw.shift_end_time || raw.shiftEndTime || "18:00") as string;
  const lateMinutes = typeof raw.late_minutes === "number" ? raw.late_minutes : typeof raw.lateMinutes === "number" ? raw.lateMinutes : 0;
  const workedMinutes = typeof raw.net_work_minutes === "number" ? raw.net_work_minutes : typeof raw.workedMinutes === "number" ? raw.workedMinutes : 0;

  return {
    ...(raw as unknown as AttendanceRecord),
    id: (raw.id as string) || `att_${crypto.randomUUID()}`,
    tenantId: (raw.tenant_id || raw.tenantId || "") as string,
    employeeId: (raw.employee_id || raw.employeeId || "") as string,
    employeeCode: (raw.employee_code || raw.employeeCode || "") as string,
    employeeName: (raw.employee_name || raw.employeeName || raw.full_name || "Staff Member") as string,
    department: (raw.department_name || raw.department || "Operations") as string,
    attendanceDate,
    shiftName: (raw.shift_name || raw.shiftName || "Regular Shift") as string,
    shiftStartTime,
    shiftEndTime,
    graceCutoffTime: (raw.grace_cutoff_time || raw.graceCutoffTime || "09:15") as string,
    checkInAt: checkIn || undefined,
    checkOutAt: checkOut || undefined,
    check_in: checkIn,
    check_out: checkOut,
    status: (raw.status || "ABSENT") as AttendanceStatus,
    workedMinutes,
    net_work_minutes: workedMinutes,
    lateMinutes,
    late_minutes: lateMinutes,
    source: (raw.source || "QR_SCAN") as AttendanceRecord["source"],
    notes: raw.notes as string | undefined,
    correctionReason: (raw.correction_reason || raw.correctionReason) as string | undefined,
    adjustedByStaff: (raw.adjusted_by_staff || raw.adjustedByStaff) as string | undefined,
    adjustedAt: (raw.adjusted_at || raw.adjustedAt) as string | undefined,
    deviceId: (raw.device_id || raw.deviceId) as string | undefined,
    finalizedAt: (raw.finalized_at || raw.finalizedAt) as string | undefined,
    finalizedBy: (raw.finalized_by || raw.finalizedBy) as string | undefined,
  };
}

/**
 * 1. Fetch Daily Attendance Records for a date
 */
export async function fetchDailyAttendance(params?: {
  date?: string;
  tenant_id?: string;
}): Promise<AttendanceRecord[]> {
  const response = await apiClient.get<Record<string, unknown>[]>("/attendance", { params });
  return Array.isArray(response) ? response.map(backendToFrontendAttendanceRecord) : [];
}

/**
 * 2. Fetch Daily Attendance Summary (KPI statistics)
 */
export async function fetchAttendanceSummary(params?: {
  date?: string;
  tenant_id?: string;
}): Promise<DailyAttendanceSummary | null> {
  try {
    const response = await apiClient.get<Record<string, unknown>>("/attendance/summary", { params });
    if (response) {
      return {
        date: (response.date || params?.date || new Date().toISOString().slice(0, 10)) as string,
        total_headcount: (response.total_headcount || response.totalHeadcount || 0) as number,
        present_count: (response.present_count || response.presentCount || 0) as number,
        late_count: (response.late_count || response.lateCount || 0) as number,
        absent_count: (response.absent_count || response.absentCount || 0) as number,
        leave_count: (response.leave_count || response.leaveCount || 0) as number,
        unpunched_count: (response.unpunched_count || response.unpunchedCount || 0) as number,
        records: Array.isArray(response.records) ? response.records.map((r) => backendToFrontendAttendanceRecord(r as Record<string, unknown>)) : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get Today's Attendance summary and records
 */
export async function getTodayAttendance(): Promise<DailyAttendanceSummary> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const response = await apiClient.get<DailyAttendanceSummary>("/attendance/today");
    if (response) {
      return {
        date: response.date || today,
        total_headcount: response.total_headcount ?? 0,
        present_count: response.present_count ?? 0,
        late_count: response.late_count ?? 0,
        unpunched_count: response.unpunched_count ?? 0,
        records: Array.isArray(response.records)
          ? response.records.map((r) => backendToFrontendAttendanceRecord(r as unknown as Record<string, unknown>))
          : [],
      };
    }
  } catch {
    // Fallback to query
  }
  const summary = await fetchAttendanceSummary({ date: today });
  if (summary) return summary;
  return {
    date: today,
    total_headcount: 0,
    present_count: 0,
    late_count: 0,
    unpunched_count: 0,
    records: [],
  };
}

/**
 * Request dynamic 30-second rotating office QR token
 */
export async function getOfficeRotatingQR(): Promise<{
  qr_token: string;
  expires_at: string;
  office_label: string;
}> {
  const response = await apiClient.post<{
    qr_token?: string;
    qrToken?: string;
    expires_at?: string;
    expiresAt?: string;
    office_label?: string;
    officeLabel?: string;
  }>("/attendance/qr/office-token", {});
  return {
    qr_token: response.qr_token || response.qrToken || "",
    expires_at: response.expires_at || response.expiresAt || "",
    office_label: response.office_label || response.officeLabel || "Main Office",
  };
}

/**
 * Submit punch payload via QR scan
 */
export async function submitPunch(payload: {
  qr_token?: string;
  device_token?: string;
  employee_id?: string;
  device_id?: string;
  timestamp?: string;
}): Promise<PunchResult> {
  try {
    const response = await apiClient.post<Record<string, unknown>>("/attendance/punch", {
      qr_token: payload.qr_token,
      device_token: payload.device_token,
      employee_id: payload.employee_id,
      device_id: payload.device_id,
      timestamp: payload.timestamp || new Date().toISOString(),
    });

    const isCheckOut = Boolean(
      response.action === "CHECK_OUT_RECORDED" ||
      response.action === "CHECK_OUT" ||
      response.check_out
    );

    return {
      success: true,
      action: isCheckOut ? "CHECK_OUT_RECORDED" : "CHECK_IN_RECORDED",
      message: (response.message as string) || (isCheckOut ? "Check-out punch verified." : "Check-in punch verified."),
      time: (response.time || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })) as string,
      status: response.status as "PRESENT" | "LATE" | undefined,
      lateMinutes: (response.late_minutes || response.lateMinutes) as number | undefined,
      workedMinutes: (response.net_work_minutes || response.workedMinutes) as number | undefined,
      record: response.record ? backendToFrontendAttendanceRecord(response.record as Record<string, unknown>) : undefined,
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Revoke hardware device authorization
 */
export async function revokeDevice(employeeId: string, reason?: string): Promise<void> {
  await apiClient.patch(`/attendance/devices/${employeeId}/revocation`, {
    reason: reason?.trim() || undefined,
  });
}

/**
 * Issue single-use enrollment QR token for device pairing
 */
export async function issueEnrollmentToken(employeeId: string): Promise<{
  enrollment_token: string;
  qr_payload: string;
  expires_at: string;
}> {
  const response = await apiClient.post<{
    enrollment_token?: string;
    enrollmentToken?: string;
    qr_payload?: string;
    qrPayload?: string;
    expires_at?: string;
    expiresAt?: string;
  }>("/attendance/devices/enroll", { employee_id: employeeId });
  return {
    enrollment_token: response.enrollment_token || response.enrollmentToken || "",
    qr_payload: response.qr_payload || response.qrPayload || "",
    expires_at: response.expires_at || response.expiresAt || "",
  };
}

export async function enrollAttendanceDevice(payload: {
  enrollment_token: string;
  device_token: string;
  device_model?: string;
}): Promise<void> {
  await apiClient.post("/attendance/devices/enroll", payload);
}

/**
 * 3. Record Live Attendance QR Punch (Legacy alias)
 */
export const recordAttendancePunch = submitPunch;

/**
 * 4. Submit Audited Manual Attendance Correction (Admin Only)
 */
export async function correctAttendanceRecord(
  recordId: string,
  payload: AttendanceCorrectionPayload
): Promise<AttendanceRecord> {
  const response = await apiClient.patch<Record<string, unknown>>(`/attendance/${recordId}`, payload);
  return backendToFrontendAttendanceRecord(response);
}

export async function createManualAttendance(payload: {
  employee_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  check_in?: string | null;
  check_out?: string | null;
  correction_reason: string;
}): Promise<AttendanceRecord> {
  const response = await apiClient.post<Record<string, unknown>>("/attendance/manual", payload);
  return backendToFrontendAttendanceRecord(response);
}

export async function voidAttendanceRecord(
  recordId: string,
  reason: string,
): Promise<{ id: string; voided: true }> {
  return apiClient.patch(`/attendance/${recordId}/void`, { reason });
}

export async function fetchAttendanceTerminals(): Promise<AttendanceTerminal[]> {
  const response = await apiClient.get<AttendanceTerminal[]>("/attendance/terminals");
  return Array.isArray(response) ? response : [];
}

export async function activateAttendanceTerminal(name: string): Promise<{
  terminal: AttendanceTerminal;
  terminal_token: string;
}> {
  return apiClient.post("/attendance/terminals", { name });
}

export async function revokeAttendanceTerminal(id: string, reason: string): Promise<void> {
  await apiClient.patch(`/attendance/terminals/${id}/revocation`, { reason });
}

export async function fetchAttendanceAuditLog(): Promise<AttendanceAuditEvent[]> {
  const response = await apiClient.get<AttendanceAuditEvent[]>("/attendance/audit");
  return Array.isArray(response) ? response : [];
}

async function kioskRequest<T>(endpoint: string, terminalToken: string, body?: unknown): Promise<T> {
  const response = await fetch(
    `${ATTENDANCE_API_BASE_URL.replace(/\/+$/, "")}/${endpoint.replace(/^\/+/, "")}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Attendance-Terminal-Token": terminalToken,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Attendance terminal request failed.");
  }
  return data as T;
}

export async function getKioskStatus(terminalToken: string): Promise<{
  paired: true;
  terminal: AttendanceTerminal;
}> {
  return kioskRequest("/attendance/kiosk/status", terminalToken);
}

export async function submitKioskPunch(
  terminalToken: string,
  payload: { employee_code: string; pin: string },
): Promise<{
  action: "CHECK_IN_RECORDED" | "CHECK_OUT_RECORDED";
  message: string;
  time: string;
  status: "PRESENT" | "LATE";
  late_minutes: number;
  net_work_minutes: number;
}> {
  return kioskRequest("/attendance/kiosk/punch", terminalToken, payload);
}

/**
 * 5. Finalize Daily Attendance (Cutoff reconciliation)
 */
export async function finalizeAttendanceApi(payload: AttendanceFinalizePayload): Promise<Record<string, unknown>> {
  const response = await apiClient.post<Record<string, unknown>>("/attendance/finalize", payload);
  return response;
}

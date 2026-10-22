import type {
  AttendanceStatus,
  AttendanceSource,
  AttendanceRecord,
  DailyAttendanceSummary,
  PunchResult,
} from "./erp";

export type {
  AttendanceStatus,
  AttendanceSource,
  AttendanceRecord,
  DailyAttendanceSummary,
  PunchResult,
};

export interface RotatingOfficeQRResponse {
  qr_token: string;
  expires_at: string;
  office_label: string;
}

export interface DeviceEnrollmentResponse {
  enrollment_token: string;
  qr_payload: string;
  expires_at: string;
}

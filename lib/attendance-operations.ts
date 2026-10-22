import type {
  AttendanceFinalizationSummary,
  AttendanceRecord,
  AttendanceSource,
  AttendanceStatus,
  EmployeeProfile,
  LeaveRequest,
  RegisteredDevice,
  WorkShift,
} from '@/types/erp';

export const ATTENDANCE_STORAGE_PREFIX = 'tourflow_attendance_records_';
export const REGISTERED_DEVICE_STORAGE_PREFIX = 'tourflow_attendance_devices_';
export const CLIENT_DEVICE_TOKEN_PREFIX = 'tourflow_device_token_';
export const OFFICE_QR_WINDOW_MS = 30_000;
export const DEFAULT_ATTENDANCE_CUTOFF = '19:00';
export const ATTENDANCE_CUTOFF_STORAGE_PREFIX = 'tourflow_attendance_cutoff_';
export const MISSING_CHECKOUT_NOTE = 'MISSING_CHECKOUT: Pending HR review';

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function pakistanDateTime(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${value('year')}-${value('month')}-${value('day')}`,
    time: `${value('hour')}:${value('minute')}`,
  };
}

export function canFinalizeAttendanceDate(
  targetDate: string,
  cutoffTime = DEFAULT_ATTENDANCE_CUTOFF,
  now = new Date(),
) {
  const pakistanNow = pakistanDateTime(now);
  if (targetDate > pakistanNow.date) return false;
  return targetDate < pakistanNow.date || pakistanNow.time >= cutoffTime;
}

interface FinalizeAttendanceInput {
  tenantId: string;
  targetDate: string;
  cutoffTime?: string;
  executedByStaff: string;
  employees: EmployeeProfile[];
  shifts: WorkShift[];
  leaveRequests: LeaveRequest[];
  attendanceRecords: AttendanceRecord[];
  now?: Date;
  createId?: () => string;
  enforceCutoff?: boolean;
}

export function finalizeAttendanceRecords({
  tenantId,
  targetDate,
  cutoffTime = DEFAULT_ATTENDANCE_CUTOFF,
  executedByStaff,
  employees,
  shifts,
  leaveRequests,
  attendanceRecords,
  now = new Date(),
  createId = () => crypto.randomUUID(),
  enforceCutoff = true,
}: FinalizeAttendanceInput): { records: AttendanceRecord[]; summary: AttendanceFinalizationSummary } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) throw new Error('Select a valid attendance date.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime)) throw new Error('Configure a valid daily cutoff time.');
  if (!executedByStaff.trim()) throw new Error('The finalization audit requires an executing staff member.');
  if (enforceCutoff && !canFinalizeAttendanceDate(targetDate, cutoffTime, now)) {
    throw new Error(`Attendance can be finalized after ${cutoffTime} PKT, or for an earlier date.`);
  }

  const finalizedAt = now.toISOString();
  const records = [...attendanceRecords];
  const summary: AttendanceFinalizationSummary = {
    targetDate,
    cutoffTime,
    absentEmployeeIds: [],
    leaveEmployeeIds: [],
    missingCheckoutEmployeeIds: [],
    unchangedEmployeeIds: [],
    finalizedAt,
    finalizedBy: executedByStaff.trim(),
    executedByStaff: executedByStaff.trim(),
  };

  employees
    .filter((employee) => employee.tenantId === tenantId && employee.status === 'ACTIVE')
    .forEach((employee) => {
      const existingIndex = records.findIndex((record) =>
        record.tenantId === tenantId &&
        record.employeeId === employee.id &&
        record.attendanceDate === targetDate);
      const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
      const approvedLeave = leaveRequests.find((leave) =>
        leave.tenantId === tenantId &&
        leave.employeeId === employee.id &&
        leave.status === 'APPROVED' &&
        targetDate >= leave.startDate &&
        targetDate <= leave.endDate);

      if (existing?.checkInAt) {
        if (!existing.checkOutAt) {
          const notes = existing.notes?.includes(MISSING_CHECKOUT_NOTE)
            ? existing.notes
            : [existing.notes, MISSING_CHECKOUT_NOTE].filter(Boolean).join(' | ');
          records[existingIndex] = {
            ...existing,
            notes,
            finalizedAt,
            finalizedBy: executedByStaff.trim(),
            finalizedByStaff: executedByStaff.trim(),
            cutoffStatus: 'MISSING_CHECKOUT',
            reconciliationMetadata: {
              resolution: 'MISSING_CHECKOUT',
              cutoffTime,
            },
          };
          summary.missingCheckoutEmployeeIds.push(employee.id);
        } else {
          summary.unchangedEmployeeIds.push(employee.id);
        }
        return;
      }

      const shift = shifts.find((item) => item.id === employee.shiftId) ?? shifts[0];
      const isSunday = new Date(`${targetDate}T12:00:00Z`).getUTCDay() === 0;
      const status: AttendanceStatus = approvedLeave ? 'ON_LEAVE' : isSunday ? 'WEEKLY_OFF' : 'ABSENT';
      const source: AttendanceSource = approvedLeave ? 'MANUAL_HR' : 'AUTO_FINALIZER';
      const notes = approvedLeave
        ? `Auto-resolved from approved ${approvedLeave.leaveType} leave`
        : isSunday
          ? 'Scheduled weekly day off'
          : 'Unexcused absence logged by Daily Finalization Engine';

      const baseRecord: AttendanceRecord = {
        id: existing?.id ?? `att_${createId().slice(0, 8)}`,
        tenantId,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        department: employee.department,
        attendanceDate: targetDate,
        shiftName: shift?.name ?? employee.shiftName,
        shiftStartTime: shift?.startTime ?? '09:00',
        shiftEndTime: shift?.endTime ?? '18:00',
        graceCutoffTime: shift ? addMinutes(shift.startTime, shift.gracePeriodMinutes) : '09:15',
        status,
        workedMinutes: 0,
        lateMinutes: 0,
        source,
        notes,
        finalizedAt,
        finalizedBy: executedByStaff.trim(),
        finalizedByStaff: executedByStaff.trim(),
        leaveRequestId: approvedLeave?.id,
        leaveType: approvedLeave?.leaveType,
        isPaidLeave: approvedLeave ? approvedLeave.leaveType !== 'UNPAID' : undefined,
        cutoffStatus: 'FINALIZED',
        reconciliationMetadata: {
          resolution: approvedLeave ? 'ON_LEAVE' : isSunday ? 'WEEKLY_OFF' : 'ABSENT',
          cutoffTime,
          leaveRequestId: approvedLeave?.id,
          leaveType: approvedLeave?.leaveType,
          isPaidLeave: approvedLeave ? approvedLeave.leaveType !== 'UNPAID' : undefined,
        },
      };

      if (existingIndex >= 0) records[existingIndex] = { ...existing, ...baseRecord };
      else records.push(baseRecord);

      if (approvedLeave) summary.leaveEmployeeIds.push(employee.id);
      else if (status === 'ABSENT') summary.absentEmployeeIds.push(employee.id);
      else summary.unchangedEmployeeIds.push(employee.id);
    });

  return { records, summary };
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function calculateAttendanceStatus(checkInAt: string, shift: WorkShift): Pick<AttendanceRecord, 'status' | 'lateMinutes'> {
  const checkIn = new Date(checkInAt);
  const [hours, minutes] = shift.startTime.split(':').map(Number);
  const shiftStart = hours * 60 + minutes;
  const graceCutoff = shiftStart + shift.gracePeriodMinutes;
  const arrival = minutesSinceMidnight(checkIn);
  return arrival > graceCutoff
    ? { status: 'LATE', lateMinutes: Math.max(0, arrival - graceCutoff) }
    : { status: 'PRESENT', lateMinutes: 0 };
}

export function createAttendanceRecord(
  employee: EmployeeProfile,
  shift: WorkShift,
  checkInAt: string,
  source: AttendanceRecord['source'] = 'QR_SCAN',
): AttendanceRecord {
  const timing = calculateAttendanceStatus(checkInAt, shift);
  return {
    id: `attendance-${employee.id}-${localDateKey(new Date(checkInAt))}`,
    tenantId: employee.tenantId,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.fullName,
    department: employee.department,
    attendanceDate: localDateKey(new Date(checkInAt)),
    shiftName: shift.name,
    shiftStartTime: shift.startTime,
    shiftEndTime: shift.endTime,
    graceCutoffTime: addMinutes(shift.startTime, shift.gracePeriodMinutes),
    checkInAt,
    status: timing.status,
    workedMinutes: 0,
    lateMinutes: timing.lateMinutes,
    source,
  };
}

export function detectDeviceModel(userAgent: string) {
  if (/iPhone/i.test(userAgent)) return 'Apple iPhone';
  if (/iPad/i.test(userAgent)) return 'Apple iPad';
  const androidModel = userAgent.match(/Android[^;]*;\s*([^;)]+?)(?:\s+Build\/|;|\))/i)?.[1]?.trim();
  if (androidModel) return androidModel;
  if (/Android/i.test(userAgent)) return 'Android device';
  if (/Windows/i.test(userAgent)) return 'Windows device';
  if (/Macintosh/i.test(userAgent)) return 'Mac device';
  return 'Mobile browser';
}

export type DeviceAttendanceResult =
  | { success: true; action: 'CHECK_IN'; isNewEnrollment: boolean; deviceToken: string; time: string; status: AttendanceStatus; lateMinutes: number; records: AttendanceRecord[]; devices: RegisteredDevice[] }
  | { success: true; action: 'CHECK_OUT'; isNewEnrollment: false; deviceToken: string; time: string; workedMinutes: number; records: AttendanceRecord[]; devices: RegisteredDevice[] }
  | { success: false; error: 'DEVICE_MISMATCH' | 'UNAUTHORIZED_DEVICE' | 'ALREADY_COMPLETED'; message: string };

interface ProcessDeviceAttendanceInput {
  tenantId: string;
  employee: EmployeeProfile;
  shift: WorkShift;
  clientDeviceToken: string | null;
  userAgent: string;
  attendanceRecords: AttendanceRecord[];
  registeredDevices: RegisteredDevice[];
  now?: Date;
  createId?: () => string;
}

export function processDeviceAttendance({
  tenantId,
  employee,
  shift,
  clientDeviceToken,
  userAgent,
  attendanceRecords,
  registeredDevices,
  now = new Date(),
  createId = () => crypto.randomUUID(),
}: ProcessDeviceAttendanceInput): DeviceAttendanceResult {
  const activeDevice = registeredDevices.find((device) =>
    device.tenantId === tenantId && device.employeeId === employee.id && device.status === 'ACTIVE');
  let deviceToken = clientDeviceToken;
  let isNewEnrollment = false;
  let devices = registeredDevices;

  if (!deviceToken) {
    if (activeDevice) {
      return { success: false, error: 'DEVICE_MISMATCH', message: 'You already have another device registered. Contact HR to reset it.' };
    }
    deviceToken = `dev_${createId()}`;
    isNewEnrollment = true;
    devices = [...registeredDevices, {
      id: createId(),
      tenantId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      deviceToken,
      deviceModel: detectDeviceModel(userAgent),
      status: 'ACTIVE',
      enrolledAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
    }];
  } else if (!activeDevice || activeDevice.deviceToken !== deviceToken) {
    return { success: false, error: 'UNAUTHORIZED_DEVICE', message: 'Unregistered phone. Please scan the onboarding code or contact HR.' };
  } else {
    devices = registeredDevices.map((device) => device.id === activeDevice.id
      ? { ...device, lastUsedAt: now.toISOString() }
      : device);
  }

  const today = localDateKey(now);
  const activeRecord = attendanceRecords.find((record) =>
    record.tenantId === tenantId && record.employeeId === employee.id && record.attendanceDate === today);

  if (!activeRecord?.checkInAt) {
    const registeredDevice = devices.find((device) => device.deviceToken === deviceToken);
    const record = {
      ...createAttendanceRecord(employee, shift, now.toISOString()),
      deviceId: registeredDevice?.id,
    };
    const records = activeRecord
      ? attendanceRecords.map((item) => item.id === activeRecord.id ? record : item)
      : [record, ...attendanceRecords];
    return {
      success: true,
      action: 'CHECK_IN',
      isNewEnrollment,
      deviceToken,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: record.status,
      lateMinutes: record.lateMinutes,
      records,
      devices,
    };
  }

  if (!activeRecord.checkOutAt) {
    const workedMinutes = Math.max(0, Math.floor((now.getTime() - new Date(activeRecord.checkInAt).getTime()) / 60_000));
    const records = attendanceRecords.map((record) => record.id === activeRecord.id
      ? { ...record, checkOutAt: now.toISOString(), workedMinutes }
      : record);
    return {
      success: true,
      action: 'CHECK_OUT',
      isNewEnrollment: false,
      deviceToken,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      workedMinutes,
      records,
      devices,
    };
  }

  return { success: false, error: 'ALREADY_COMPLETED', message: 'You have already finalized your shift for today.' };
}

export function officeQrToken(tenantId: string, timestamp = Date.now()) {
  const windowId = Math.floor(timestamp / OFFICE_QR_WINDOW_MS);
  return `${tenantId}.${windowId.toString(36)}`;
}

export function isOfficeQrTokenValid(token: string, tenantId: string, timestamp = Date.now()) {
  return token === officeQrToken(tenantId, timestamp) || token === officeQrToken(tenantId, timestamp - OFFICE_QR_WINDOW_MS);
}

export function seedTodayAttendance(employees: EmployeeProfile[], shifts: WorkShift[], now = new Date()): AttendanceRecord[] {
  const date = localDateKey(now);
  const statusByIndex: AttendanceStatus[] = ['PRESENT', 'LATE', 'PRESENT', 'ON_LEAVE', 'ABSENT'];
  return employees.map((employee, index) => {
    const shift = shifts.find((item) => item.id === employee.shiftId) ?? shifts[0];
    const status = statusByIndex[index] ?? 'ABSENT';
    const checkInTime = status === 'PRESENT' ? '08:58' : status === 'LATE' ? '09:23' : null;
    const checkInAt = checkInTime ? `${date}T${checkInTime}:00` : undefined;
    return {
      id: `attendance-${employee.id}-${date}`,
      tenantId: employee.tenantId,
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.fullName,
      department: employee.department,
      attendanceDate: date,
      shiftName: shift.name,
      shiftStartTime: shift.startTime,
      shiftEndTime: shift.endTime,
      graceCutoffTime: addMinutes(shift.startTime, shift.gracePeriodMinutes),
      checkInAt,
      status,
      workedMinutes: status === 'PRESENT' || status === 'LATE' ? 480 : 0,
      lateMinutes: status === 'LATE' ? 8 : 0,
      source: 'BIOMETRIC_IMPORT' as const,
      notes: status === 'ON_LEAVE' ? 'Approved annual leave' : undefined,
    };
  });
}

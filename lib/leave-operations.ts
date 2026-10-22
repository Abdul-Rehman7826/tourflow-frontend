import type {
  AttendanceRecord,
  EmployeeProfile,
  LeaveBalanceSummary,
  LeaveRequest,
  LeaveType,
  WorkShift,
} from '@/types/erp';

export const LEAVE_STORAGE_PREFIX = 'tourflow_leave_requests_';

interface BuildLeaveRequestInput {
  employee: EmployeeProfile;
  shift: WorkShift;
  requests: LeaveRequest[];
  input: Pick<LeaveRequest, 'leaveType' | 'startDate' | 'endDate' | 'reason'>;
  now?: Date;
  createId?: () => string;
}

const WEEKDAYS: WorkShift['workingDays'] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

export function enumerateDates(startDate: string, endDate: string) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];
  const dates: string[] = [];
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

export function leaveWorkingDates(startDate: string, endDate: string, shift: WorkShift) {
  return enumerateDates(startDate, endDate).filter((date) => shift.workingDays.includes(WEEKDAYS[parseDate(date).getDay()]));
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}

function accruedAllowance(employee: EmployeeProfile, allowance: number, asOf: Date) {
  const joined = parseDate(employee.joiningDate);
  if (joined.getFullYear() < asOf.getFullYear()) return allowance;
  if (joined.getFullYear() > asOf.getFullYear()) return 0;
  const eligibleMonths = Math.max(0, asOf.getMonth() - joined.getMonth() + 1);
  return Math.min(allowance, Math.round((allowance * eligibleMonths / 12) * 100) / 100);
}

export function calculateLeaveBalance(
  employee: EmployeeProfile,
  requests: LeaveRequest[],
  asOf = new Date(),
): LeaveBalanceSummary {
  const approved = requests.filter((request) =>
    request.tenantId === employee.tenantId &&
    request.employeeId === employee.id &&
    request.status === 'APPROVED' &&
    parseDate(request.startDate).getFullYear() === asOf.getFullYear());
  const used = (type: LeaveType) => approved
    .filter((request) => request.leaveType === type)
    .reduce((sum, request) => sum + request.totalDays, 0);
  const annualTotal = accruedAllowance(employee, employee.annualLeaveAllowance, asOf);
  const sickTotal = accruedAllowance(employee, employee.sickLeaveAllowance, asOf);
  const annualUsed = used('ANNUAL');
  const sickUsed = used('SICK');
  return {
    employeeId: employee.id,
    annualTotal,
    annualUsed,
    annualRemaining: Math.max(0, annualTotal - annualUsed),
    sickTotal,
    sickUsed,
    sickRemaining: Math.max(0, sickTotal - sickUsed),
    unpaidDaysTaken: used('UNPAID'),
  };
}

export function validateLeaveRequest(
  request: Pick<LeaveRequest, 'employeeId' | 'leaveType' | 'startDate' | 'endDate' | 'totalDays'>,
  employee: EmployeeProfile,
  requests: LeaveRequest[],
  balance = calculateLeaveBalance(employee, requests),
) {
  if (!request.startDate || !request.endDate || request.endDate < request.startDate) {
    throw new Error('Select a valid leave date range.');
  }
  if (request.totalDays <= 0) throw new Error('The selected range has no working days for this shift.');
  const overlap = requests.some((existing) =>
    existing.employeeId === request.employeeId &&
    ['PENDING', 'APPROVED'].includes(existing.status) &&
    rangesOverlap(request.startDate, request.endDate, existing.startDate, existing.endDate));
  if (overlap) throw new Error('This employee already has a pending or approved request in the selected dates.');
  if (request.leaveType === 'ANNUAL' && request.totalDays > balance.annualRemaining) {
    throw new Error(`Only ${balance.annualRemaining} annual leave day(s) remain.`);
  }
  if (request.leaveType === 'SICK' && request.totalDays > balance.sickRemaining) {
    throw new Error(`Only ${balance.sickRemaining} sick leave day(s) remain.`);
  }
}

export function buildLeaveRequest({
  employee,
  shift,
  requests,
  input,
  now = new Date(),
  createId = () => crypto.randomUUID(),
}: BuildLeaveRequestInput): LeaveRequest {
  if (!input.reason.trim()) throw new Error('Please provide a reason for this leave request.');
  const totalDays = leaveWorkingDates(input.startDate, input.endDate, shift).length;
  validateLeaveRequest({ ...input, employeeId: employee.id, totalDays }, employee, requests);
  return {
    id: `leave_${createId()}`,
    tenantId: employee.tenantId,
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: employee.fullName,
    department: employee.department,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    totalDays,
    reason: input.reason.trim(),
    status: 'PENDING',
    appliedAt: now.toISOString(),
  };
}

export function reviewLeaveRequestRecord(
  request: LeaveRequest,
  decision: 'APPROVE' | 'REJECT',
  reviewedBy: string,
  rejectionReason?: string,
  now = new Date(),
): LeaveRequest {
  if (request.status !== 'PENDING') throw new Error('This leave request has already been reviewed.');
  if (decision === 'REJECT' && !rejectionReason?.trim()) throw new Error('A rejection reason is required.');
  return {
    ...request,
    status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    reviewedBy: reviewedBy.trim(),
    reviewedAt: now.toISOString(),
    rejectionReason: decision === 'REJECT' ? rejectionReason?.trim() : undefined,
  };
}
export function syncApprovedLeaveAttendance(
  records: AttendanceRecord[],
  request: LeaveRequest,
  employee: EmployeeProfile,
  shift: WorkShift,
) {
  const leaveDates = leaveWorkingDates(request.startDate, request.endDate, shift);
  const replacements = new Map(leaveDates.map((date) => [date, {
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
    graceCutoffTime: shift.startTime,
    status: 'ON_LEAVE' as const,
    workedMinutes: 0,
    lateMinutes: 0,
    source: 'MANUAL_HR' as const,
    notes: `${request.leaveType.replaceAll('_', ' ')} leave approved: ${request.reason}`,
    adjustedByStaff: request.reviewedBy,
    adjustedAt: request.reviewedAt,
    leaveRequestId: request.id,
    leaveType: request.leaveType,
    isPaidLeave: request.leaveType !== 'UNPAID',
  }]));
  const existingDates = new Set(records
    .filter((record) => record.employeeId === employee.id)
    .map((record) => record.attendanceDate));
  const next = records.map((record) => {
    if (record.employeeId !== employee.id) return record;
    const replacement = replacements.get(record.attendanceDate);
    if (!replacement) return record;
    return replacement;
  });
  const missing = leaveDates
    .filter((date) => !existingDates.has(date))
    .map((date) => replacements.get(date)!);
  return [...missing, ...next];
}

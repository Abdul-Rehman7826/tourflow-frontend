import type {
  AttendanceRecord,
  AttendanceStatus,
  Department,
  EmployeeProfile,
  LeaveRequest,
  MonthlyPayrollRun,
  SalaryAdvance,
} from '@/types/erp';

export interface AttendanceExportFilters {
  startDate: string;
  endDate: string;
  department: Department | 'ALL';
  status: AttendanceStatus | 'ALL';
}

export interface HRAuditEvent {
  id: string;
  type: 'ATTENDANCE_CORRECTION' | 'DEVICE_REVOCATION' | 'SALARY_ADVANCE' | 'LEAVE_APPROVAL';
  title: string;
  detail: string;
  actor: string;
  timestamp: string;
}

export function activeRoster(employees: EmployeeProfile[]) {
  return employees.filter((employee) => employee.status === 'ACTIVE');
}

export function officeOccupancy(employees: EmployeeProfile[], records: AttendanceRecord[], date: string) {
  const roster = activeRoster(employees);
  const rosterIds = new Set(roster.map((employee) => employee.id));
  const todayRecords = records.filter((record) => record.attendanceDate === date && rosterIds.has(record.employeeId));
  const onDutyStatuses: AttendanceStatus[] = ['PRESENT', 'LATE', 'HALF_DAY'];
  const onDuty = todayRecords.filter((record) => onDutyStatuses.includes(record.status));
  const late = onDuty.filter((record) => record.status === 'LATE');
  const onLeave = todayRecords.filter((record) => record.status === 'ON_LEAVE');
  return {
    rosterCount: roster.length,
    onDutyCount: onDuty.length,
    onTimeCount: onDuty.length - late.length,
    lateCount: late.length,
    onLeaveCount: onLeave.length,
    percentage: roster.length ? Math.round((onDuty.length / roster.length) * 100) : 0,
  };
}

export function outstandingAdvanceLiability(advances: SalaryAdvance[], monthCode: string) {
  return advances
    .filter((advance) => advance.payrollMonth === monthCode && advance.status === 'APPROVED')
    .reduce((sum, advance) => sum + advance.amount, 0);
}

export function resolveActivePayrollRun(runs: MonthlyPayrollRun[], monthCode: string) {
  return runs.find((run) => run.monthCode === monthCode)
    ?? [...runs].sort((left, right) => right.monthCode.localeCompare(left.monthCode))[0];
}

export function filterAttendanceLedger(records: AttendanceRecord[], filters: AttendanceExportFilters) {
  return records
    .filter((record) => record.attendanceDate >= filters.startDate && record.attendanceDate <= filters.endDate)
    .filter((record) => filters.department === 'ALL' || record.department === filters.department)
    .filter((record) => filters.status === 'ALL' || record.status === filters.status)
    .sort((left, right) => `${left.attendanceDate}${left.employeeName}`.localeCompare(`${right.attendanceDate}${right.employeeName}`));
}

function csvCell(value: string | number | undefined) {
  const text = value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csv(headers: string[], rows: Array<Array<string | number | undefined>>) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function attendanceLedgerCsv(records: AttendanceRecord[]) {
  return csv(
    ['Employee Code', 'Name', 'Department', 'Date', 'Status', 'Check In', 'Check Out', 'Minutes Worked', 'Late Minutes', 'Source', 'Notes'],
    records.map((record) => [
      record.employeeCode,
      record.employeeName,
      record.department,
      record.attendanceDate,
      record.status,
      record.checkInAt,
      record.checkOutAt,
      record.workedMinutes,
      record.lateMinutes,
      record.source,
      record.notes || record.correctionReason || '',
    ]),
  );
}

export function payrollLiabilityCsv(run: MonthlyPayrollRun, includeFinancials: boolean) {
  if (!includeFinancials) {
    return csv(
      ['Employee Code', 'Name', 'Department', 'Designation', 'Payroll Status', 'Payment Status'],
      run.items.map((item) => [item.employeeCode, item.employeeName, item.department, item.designation, run.status, item.paymentStatus]),
    );
  }
  return csv(
    ['Employee Code', 'Full Name', 'Department', 'Designation', 'Basic Salary', 'Allowances', 'Gross Pay', 'Late Deductions', 'Absence Deductions', 'Advance Deductions', 'Total Deductions', 'Net Payable', 'Payment Status', 'Bank IBAN'],
    run.items.map((item) => {
      const deductions = item.lateArrivalDeduction + item.unpaidLeaveDeduction + item.salaryAdvancesDeduction;
      return [
        item.employeeCode,
        item.employeeName,
        item.department,
        item.designation,
        item.basicSalary,
        item.allowances,
        item.grossPay,
        item.lateArrivalDeduction,
        item.unpaidLeaveDeduction,
        item.salaryAdvancesDeduction,
        deductions,
        item.netPayableSalary,
        item.paymentStatus,
        item.bankIban || '',
      ];
    }),
  );
}

export function buildHRAuditFeed(input: {
  attendanceRecords: AttendanceRecord[];
  employees: EmployeeProfile[];
  salaryAdvances: SalaryAdvance[];
  leaveRequests: LeaveRequest[];
}) {
  const attendanceEvents: HRAuditEvent[] = input.attendanceRecords
    .filter((record) => record.source === 'CORRECTION' && record.adjustedAt)
    .map((record) => ({
      id: `attendance-${record.id}`,
      type: 'ATTENDANCE_CORRECTION',
      title: `Attendance corrected for ${record.employeeName}`,
      detail: record.correctionReason || record.notes || 'Manual attendance adjustment',
      actor: record.adjustedByStaff || 'HR administrator',
      timestamp: record.adjustedAt!,
    }));
  const deviceEvents: HRAuditEvent[] = input.employees
    .filter((employee) => employee.deviceStatus === 'REVOKED' && employee.deviceRevokedAt)
    .map((employee) => ({
      id: `device-${employee.id}-${employee.deviceRevokedAt}`,
      type: 'DEVICE_REVOCATION',
      title: `Attendance device revoked for ${employee.fullName}`,
      detail: employee.deviceRevocationReason || 'Device access revoked',
      actor: employee.deviceRevokedBy || 'HR administrator',
      timestamp: employee.deviceRevokedAt!,
    }));
  const advanceEvents: HRAuditEvent[] = input.salaryAdvances
    .filter((advance) => advance.status === 'APPROVED' && advance.reviewedAt)
    .map((advance) => ({
      id: `advance-${advance.id}`,
      type: 'SALARY_ADVANCE',
      title: `Salary advance approved for ${advance.employeeName}`,
      detail: `PKR ${advance.amount.toLocaleString('en-PK')} scheduled for ${advance.payrollMonth}`,
      actor: advance.approvedByAdmin || 'Payroll administrator',
      timestamp: advance.reviewedAt!,
    }));
  const leaveEvents: HRAuditEvent[] = input.leaveRequests
    .filter((request) => request.status === 'APPROVED' && request.reviewedAt)
    .map((request) => ({
      id: `leave-${request.id}`,
      type: 'LEAVE_APPROVAL',
      title: `${request.leaveType.replaceAll('_', ' ')} leave approved for ${request.employeeName}`,
      detail: `${request.totalDays} day${request.totalDays === 1 ? '' : 's'} from ${request.startDate} to ${request.endDate}`,
      actor: request.reviewedBy || 'HR administrator',
      timestamp: request.reviewedAt!,
    }));
  return [...attendanceEvents, ...deviceEvents, ...advanceEvents, ...leaveEvents]
    .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

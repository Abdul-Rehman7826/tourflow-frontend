const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

const moduleExports = {};
new Function(
  'exports',
  'require',
  ts.transpileModule(fs.readFileSync('lib/leave-operations.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(moduleExports, () => { throw new Error('Unexpected runtime dependency'); });

const {
  calculateLeaveBalance,
  leaveWorkingDates,
  syncApprovedLeaveAttendance,
  validateLeaveRequest,
} = moduleExports;

const shift = {
  id: 'regular', name: 'Regular Day Shift', startTime: '09:00', endTime: '18:00',
  gracePeriodMinutes: 15, workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
};
const employee = {
  id: 'emp-1', tenantId: 'tenant-world-class', employeeCode: 'WCH-EMP-001', fullName: 'Fatima Noor',
  department: 'SALES_FRONT_DESK', joiningDate: '2024-01-01', annualLeaveAllowance: 14, sickLeaveAllowance: 8,
};
const request = {
  id: 'leave-1', tenantId: employee.tenantId, employeeId: employee.id, employeeCode: employee.employeeCode,
  employeeName: employee.fullName, department: employee.department, leaveType: 'ANNUAL', startDate: '2026-09-14',
  endDate: '2026-09-16', totalDays: 3, reason: 'Family event', status: 'APPROVED', appliedAt: '2026-09-01T00:00:00Z',
  reviewedBy: 'HR Manager',
};

test('working day calculation respects the assigned shift schedule', () => {
  assert.deepEqual(leaveWorkingDates('2026-09-12', '2026-09-14', shift), ['2026-09-12', '2026-09-14']);
});

test('approved requests reduce the matching entitlement only', () => {
  const balance = calculateLeaveBalance(employee, [request], new Date('2026-09-30T12:00:00'));
  assert.equal(balance.annualRemaining, 11);
  assert.equal(balance.sickRemaining, 8);
  assert.equal(balance.unpaidDaysTaken, 0);
});

test('overlapping pending or approved requests are rejected', () => {
  assert.throws(() => validateLeaveRequest({ employeeId: employee.id, leaveType: 'SICK', startDate: '2026-09-16', endDate: '2026-09-17', totalDays: 2 }, employee, [request]), /already has/i);
});

test('approval replaces absence placeholders with audited on-leave records', () => {
  const records = [{ id: 'old', tenantId: employee.tenantId, employeeId: employee.id, attendanceDate: '2026-09-14', status: 'ABSENT' }];
  const synchronized = syncApprovedLeaveAttendance(records, request, employee, shift);
  assert.equal(synchronized.length, 3);
  assert.equal(synchronized.find((record) => record.attendanceDate === '2026-09-14').status, 'ON_LEAVE');
  assert.equal(synchronized.find((record) => record.attendanceDate === '2026-09-14').leaveRequestId, request.id);
  assert.equal(synchronized.every((record) => record.isPaidLeave), true);
});

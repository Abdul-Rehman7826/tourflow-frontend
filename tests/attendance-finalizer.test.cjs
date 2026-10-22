const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

const moduleExports = {};
new Function(
  'exports',
  'require',
  ts.transpileModule(fs.readFileSync('lib/attendance-operations.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(moduleExports, () => { throw new Error('Unexpected runtime dependency'); });

const {
  finalizeAttendanceRecords,
  previewDailyAttendance,
} = moduleExports;

const shift = {
  id: 'shift-regular',
  name: 'Regular Day Shift',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
};

const activeEmployee1 = {
  id: 'emp-1',
  tenantId: 'tenant-world-class',
  employeeCode: 'WCH-EMP-001',
  fullName: 'Tariq Mehmood',
  department: 'OPERATIONS',
  status: 'ACTIVE',
  shiftId: 'shift-regular',
};

const activeEmployee2 = {
  id: 'emp-2',
  tenantId: 'tenant-world-class',
  employeeCode: 'WCH-EMP-002',
  fullName: 'Sara Khan',
  department: 'SALES_FRONT_DESK',
  status: 'ACTIVE',
  shiftId: 'shift-regular',
};

const activeEmployee3 = {
  id: 'emp-3',
  tenantId: 'tenant-world-class',
  employeeCode: 'WCH-EMP-003',
  fullName: 'Ali Raza',
  department: 'MANAGEMENT',
  status: 'ACTIVE',
  shiftId: 'shift-regular',
};

const inactiveEmployee = {
  id: 'emp-inactive',
  tenantId: 'tenant-world-class',
  employeeCode: 'WCH-EMP-099',
  fullName: 'Terminated Staff',
  department: 'OPERATIONS',
  status: 'INACTIVE',
  shiftId: 'shift-regular',
};

const employees = [activeEmployee1, activeEmployee2, activeEmployee3, inactiveEmployee];
const shifts = [shift];
const tenantId = 'tenant-world-class';

test('1. Active unpunched employee resolves to ABSENT with source AUTO_FINALIZER', () => {
  // Tuesday target date (not Sunday)
  const targetDate = '2026-09-15';
  const attendanceRecords = [];
  const leaveRequests = [];

  const { records, summary } = finalizeAttendanceRecords({
    tenantId,
    targetDate,
    employees,
    shifts,
    attendanceRecords,
    leaveRequests,
    executedByStaff: 'HR Manager',
    enforceCutoff: false,
  });

  // Check that only active employees are processed
  assert.equal(summary.absentEmployeeIds.includes('emp-1'), true);
  assert.equal(summary.absentEmployeeIds.includes('emp-2'), true);
  assert.equal(summary.absentEmployeeIds.includes('emp-3'), true);
  assert.equal(summary.absentEmployeeIds.includes('emp-inactive'), false);

  const emp1Record = records.find((r) => r.employeeId === 'emp-1');
  assert.ok(emp1Record, 'Record should exist for emp-1');
  assert.equal(emp1Record.status, 'ABSENT');
  assert.equal(emp1Record.source, 'AUTO_FINALIZER');
  assert.equal(emp1Record.workedMinutes, 0);
  assert.equal(emp1Record.lateMinutes, 0);
  assert.equal(emp1Record.checkInAt, undefined);
  assert.equal(emp1Record.checkOutAt, undefined);
  assert.equal(emp1Record.notes, 'Unexcused absence logged by Daily Finalization Engine');
});

test('2. Employee with approved leave resolves to ON_LEAVE, not ABSENT', () => {
  const targetDate = '2026-09-15';
  const attendanceRecords = [];
  const leaveRequests = [
    {
      id: 'leave-1',
      tenantId: 'tenant-world-class',
      employeeId: 'emp-2',
      employeeName: 'Sara Khan',
      leaveType: 'CASUAL',
      startDate: '2026-09-14',
      endDate: '2026-09-16',
      status: 'APPROVED',
      totalDays: 3,
      reason: 'Personal matters',
      appliedAt: '2026-09-10T10:00:00Z',
    },
  ];

  const { records, summary } = finalizeAttendanceRecords({
    tenantId,
    targetDate,
    employees,
    shifts,
    attendanceRecords,
    leaveRequests,
    executedByStaff: 'HR Manager',
    enforceCutoff: false,
  });

  assert.equal(summary.leaveEmployeeIds.includes('emp-2'), true);
  assert.equal(summary.absentEmployeeIds.includes('emp-2'), false);

  const emp2Record = records.find((r) => r.employeeId === 'emp-2');
  assert.ok(emp2Record, 'Record should exist for emp-2');
  assert.equal(emp2Record.status, 'ON_LEAVE');
  assert.equal(emp2Record.source, 'MANUAL_HR');
  assert.equal(emp2Record.workedMinutes, 0);
  assert.equal(emp2Record.lateMinutes, 0);
  assert.equal(emp2Record.notes, 'Auto-resolved from approved CASUAL leave');
});

test('3. Active check-in without check-out is flagged MISSING_CHECKOUT and checkOutAt remains undefined', () => {
  const targetDate = '2026-09-15';
  const attendanceRecords = [
    {
      id: 'attendance-emp-3-2026-09-15',
      tenantId: 'tenant-world-class',
      employeeId: 'emp-3',
      employeeName: 'Ali Raza',
      employeeCode: 'WCH-EMP-003',
      department: 'MANAGEMENT',
      attendanceDate: '2026-09-15',
      shiftName: 'Regular Day Shift',
      shiftStartTime: '09:00',
      shiftEndTime: '18:00',
      graceCutoffTime: '09:15',
      checkInAt: '2026-09-15T09:05:00',
      checkOutAt: undefined,
      status: 'PRESENT',
      workedMinutes: 0,
      lateMinutes: 0,
      source: 'QR_SCAN',
      notes: 'Initial biometric scan',
    },
  ];
  const leaveRequests = [];

  const { records, summary } = finalizeAttendanceRecords({
    tenantId,
    targetDate,
    employees,
    shifts,
    attendanceRecords,
    leaveRequests,
    executedByStaff: 'HR Director',
    enforceCutoff: false,
  });

  assert.equal(summary.missingCheckoutEmployeeIds.includes('emp-3'), true);

  const emp3Record = records.find((r) => r.employeeId === 'emp-3');
  assert.ok(emp3Record, 'Record should exist for emp-3');
  // Check that checkOutAt was never fabricated
  assert.equal(emp3Record.checkOutAt, undefined);
  assert.equal(emp3Record.checkInAt, '2026-09-15T09:05:00');
  // Check that notes contain the flag
  assert.match(emp3Record.notes || '', /MISSING_CHECKOUT: Pending HR review/);
});

test('4. Idempotent re-run does not create duplicate entries for the same employee on the same date', () => {
  const targetDate = '2026-09-15';
  const leaveRequests = [];

  // Run 1: Start with empty records
  const run1 = finalizeAttendanceRecords({
    tenantId,
    targetDate,
    employees,
    shifts,
    attendanceRecords: [],
    leaveRequests,
    executedByStaff: 'HR Manager',
    enforceCutoff: false,
  });

  const countAfterRun1 = run1.records.length;
  // All 3 active employees resolved
  assert.equal(countAfterRun1, 3);

  // Run 2: Re-run with run 1's records as existing records
  const run2 = finalizeAttendanceRecords({
    tenantId,
    targetDate,
    employees,
    shifts,
    attendanceRecords: run1.records,
    leaveRequests,
    executedByStaff: 'HR Manager',
    enforceCutoff: false,
  });

  const countAfterRun2 = run2.records.length;
  assert.equal(countAfterRun2, countAfterRun1, 'Record count must remain identical after re-run');

  // Verify unique records per employee
  const employeeIds = run2.records.map((r) => r.employeeId);
  const uniqueEmployeeIds = new Set(employeeIds);
  assert.equal(uniqueEmployeeIds.size, employeeIds.length, 'No duplicate records per employee');
});

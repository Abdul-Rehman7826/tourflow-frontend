/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

function loadTypeScriptModule(path) {
  const moduleExports = {};
  new Function(
    'exports',
    'require',
    ts.transpileModule(fs.readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
  )(moduleExports, () => { throw new Error(`Unexpected runtime dependency in ${path}`); });
  return moduleExports;
}

const {
  buildLeaveRequest,
  reviewLeaveRequestRecord,
  calculateLeaveBalance,
  syncApprovedLeaveAttendance,
} = loadTypeScriptModule('lib/leave-operations.ts');
const { finalizeAttendanceRecords } = loadTypeScriptModule('lib/attendance-operations.ts');
const { calculatePayrollRun } = loadTypeScriptModule('lib/payroll-operations.ts');

const tenantId = 'tenant-world-class';
const otherTenantId = 'tenant-other-agency';

const shift = {
  id: 'shift-regular',
  name: 'Regular Day Shift',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
};

function employee(id, name, tId = tenantId) {
  return {
    id,
    tenantId: tId,
    employeeCode: `WCH-${id}`,
    fullName: name,
    department: 'SALES_FRONT_DESK',
    designation: 'Front Desk Officer',
    status: 'ACTIVE',
    joiningDate: '2024-01-01',
    shiftId: shift.id,
    shiftName: shift.name,
    annualLeaveAllowance: 14,
    sickLeaveAllowance: 8,
    basicSalary: 85000,
    allowances: 15000,
    bankName: 'HBL',
    bankAccountNumber: '1234',
    bankIban: 'PK00HABB1234',
  };
}

test('submitting a leave request sets status to PENDING and validates working days', () => {
  const emp = employee('EMP-001', 'Fatima Noor');
  const pending = buildLeaveRequest({
    employee: emp,
    shift,
    requests: [],
    input: {
      leaveType: 'ANNUAL',
      startDate: '2026-09-15',
      endDate: '2026-09-16',
      reason: 'Family event',
    },
    now: new Date('2026-09-01T09:00:00.000Z'),
    createId: () => 'req-001',
  });
  assert.equal(pending.status, 'PENDING');
  assert.equal(pending.totalDays, 2);
  assert.equal(pending.employeeId, emp.id);
  assert.equal(pending.leaveType, 'ANNUAL');
});

test('admin approval transitions request to APPROVED and decrements available balance', () => {
  const emp = employee('EMP-001', 'Fatima Noor');
  const initialBalance = calculateLeaveBalance(emp, [], new Date('2026-09-01'));
  assert.equal(initialBalance.annualRemaining, 14);

  const pending = buildLeaveRequest({
    employee: emp,
    shift,
    requests: [],
    input: {
      leaveType: 'ANNUAL',
      startDate: '2026-09-15',
      endDate: '2026-09-16',
      reason: 'Family event',
    },
    now: new Date('2026-09-01T09:00:00.000Z'),
    createId: () => 'req-001',
  });

  const approved = reviewLeaveRequestRecord(
    pending,
    'APPROVE',
    'Nadeem Akhtar (Admin)',
    undefined,
    new Date('2026-09-02T09:00:00.000Z'),
  );
  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.reviewedBy, 'Nadeem Akhtar (Admin)');

  const updatedBalance = calculateLeaveBalance(emp, [approved], new Date('2026-09-02'));
  assert.equal(updatedBalance.annualUsed, 2);
  assert.equal(updatedBalance.annualRemaining, 12);
});

test('daily attendance cutoff on approved leave date marks employee as ON_LEAVE and sets leaveRequestId, not ABSENT', () => {
  const approvedEmp = employee('EMP-001', 'Fatima Noor');
  const absentEmp = employee('EMP-002', 'Bilal Ahmed');

  const approvedLeave = {
    id: 'leave-001',
    tenantId,
    employeeId: approvedEmp.id,
    employeeCode: approvedEmp.employeeCode,
    employeeName: approvedEmp.fullName,
    department: approvedEmp.department,
    leaveType: 'ANNUAL',
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    totalDays: 1,
    reason: 'Medical checkup',
    status: 'APPROVED',
    appliedAt: '2026-09-01T09:00:00.000Z',
    reviewedBy: 'Admin',
    reviewedAt: '2026-09-02T09:00:00.000Z',
  };

  const finalized = finalizeAttendanceRecords({
    tenantId,
    targetDate: '2026-09-15',
    cutoffTime: '19:00',
    executedByStaff: 'Admin',
    employees: [approvedEmp, absentEmp],
    shifts: [shift],
    leaveRequests: [approvedLeave],
    attendanceRecords: [],
    now: new Date('2026-09-15T14:30:00.000Z'),
    createId: () => 'att-001',
  });

  const leaveRecord = finalized.records.find((r) => r.employeeId === approvedEmp.id);
  const absentRecord = finalized.records.find((r) => r.employeeId === absentEmp.id);

  assert.equal(leaveRecord.status, 'ON_LEAVE');
  assert.equal(leaveRecord.leaveRequestId, 'leave-001');
  assert.equal(leaveRecord.leaveType, 'ANNUAL');
  assert.equal(leaveRecord.isPaidLeave, true);
  assert.equal(leaveRecord.workedMinutes, 0);
  assert.equal(leaveRecord.lateMinutes, 0);

  assert.equal(absentRecord.status, 'ABSENT');
  assert.equal(absentRecord.workedMinutes, 0);
  assert.equal(absentRecord.lateMinutes, 0);
});

test('monthly payroll run applies zero penalty for approved paid leave days while unexcused absences deduct daily wage', () => {
  const approvedEmp = employee('EMP-001', 'Fatima Noor');
  const absentEmp = employee('EMP-002', 'Bilal Ahmed');
  const unpaidEmp = employee('EMP-003', 'Zainab Bibi');

  const records = [
    {
      id: 'att-1',
      tenantId,
      employeeId: approvedEmp.id,
      attendanceDate: '2026-09-15',
      status: 'ON_LEAVE',
      leaveType: 'ANNUAL',
      isPaidLeave: true,
      workedMinutes: 0,
      lateMinutes: 0,
      source: 'MANUAL_HR',
    },
    {
      id: 'att-2',
      tenantId,
      employeeId: absentEmp.id,
      attendanceDate: '2026-09-15',
      status: 'ABSENT',
      workedMinutes: 0,
      lateMinutes: 0,
      source: 'AUTO_FINALIZER',
    },
    {
      id: 'att-3',
      tenantId,
      employeeId: unpaidEmp.id,
      attendanceDate: '2026-09-15',
      status: 'ON_LEAVE',
      leaveType: 'UNPAID',
      isPaidLeave: false,
      workedMinutes: 0,
      lateMinutes: 0,
      source: 'MANUAL_HR',
    },
  ];

  const payroll = calculatePayrollRun({
    tenantId,
    monthCode: '2026-09',
    employees: [approvedEmp, absentEmp, unpaidEmp],
    attendanceRecords: records,
    salaryAdvances: [],
    generatedAt: '2026-09-30T00:00:00.000Z',
    createId: () => 'payroll-001',
  });

  const protectedItem = payroll.items.find((i) => i.employeeId === approvedEmp.id);
  const absentItem = payroll.items.find((i) => i.employeeId === absentEmp.id);
  const unpaidItem = payroll.items.find((i) => i.employeeId === unpaidEmp.id);

  // Paid leave: 0 penalty
  assert.equal(protectedItem.unexcusedAbsences, 0);
  assert.equal(protectedItem.unpaidLeaveDeduction, 0);
  assert.equal(protectedItem.netPayableSalary, 100000);

  // Unexcused absence: 1 daily wage deduction (100,000 / 26)
  assert.equal(absentItem.unexcusedAbsences, 1);
  assert.equal(absentItem.unpaidLeaveDeduction, 100000 / 26);
  assert.equal(absentItem.netPayableSalary, 100000 - (100000 / 26));

  // Unpaid leave: 1 daily wage deduction (100,000 / 26)
  assert.equal(unpaidItem.unpaidLeaveDays, 1);
  assert.equal(unpaidItem.unpaidLeaveDeduction, 100000 / 26);
  assert.equal(unpaidItem.netPayableSalary, 100000 - (100000 / 26));
});

test('three late arrival infractions deduct one daily wage from gross pay', () => {
  const lateEmp = employee('EMP-004', 'Tariq Mehmood');
  const records = [
    { id: 'att-l1', tenantId, employeeId: lateEmp.id, attendanceDate: '2026-09-01', status: 'LATE', lateMinutes: 20, workedMinutes: 480, source: 'QR_SCAN' },
    { id: 'att-l2', tenantId, employeeId: lateEmp.id, attendanceDate: '2026-09-02', status: 'LATE', lateMinutes: 35, workedMinutes: 480, source: 'QR_SCAN' },
    { id: 'att-l3', tenantId, employeeId: lateEmp.id, attendanceDate: '2026-09-03', status: 'LATE', lateMinutes: 15, workedMinutes: 480, source: 'QR_SCAN' },
  ];

  const payroll = calculatePayrollRun({
    tenantId,
    monthCode: '2026-09',
    employees: [lateEmp],
    attendanceRecords: records,
    salaryAdvances: [],
    generatedAt: '2026-09-30T00:00:00.000Z',
    createId: () => 'payroll-late',
  });

  const item = payroll.items.find((i) => i.employeeId === lateEmp.id);
  assert.equal(item.totalLateArrivals, 3);
  assert.equal(item.lateArrivalDeduction, 100000 / 26);
  assert.equal(item.netPayableSalary, 100000 - (100000 / 26));
});

test('multi-tenant scoping isolates leave and attendance finalization between tenants', () => {
  const tenantEmp = employee('EMP-001', 'Fatima Noor', tenantId);
  const foreignEmp = employee('EMP-999', 'Foreign Staff', otherTenantId);

  const foreignLeave = {
    id: 'leave-foreign',
    tenantId: otherTenantId,
    employeeId: foreignEmp.id,
    employeeCode: foreignEmp.employeeCode,
    employeeName: foreignEmp.fullName,
    department: foreignEmp.department,
    leaveType: 'ANNUAL',
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    totalDays: 1,
    reason: 'Foreign leave',
    status: 'APPROVED',
    appliedAt: '2026-09-01T09:00:00.000Z',
  };

  const finalized = finalizeAttendanceRecords({
    tenantId,
    targetDate: '2026-09-15',
    cutoffTime: '19:00',
    executedByStaff: 'Admin',
    employees: [tenantEmp, foreignEmp],
    shifts: [shift],
    leaveRequests: [foreignLeave],
    attendanceRecords: [],
    now: new Date('2026-09-15T14:30:00.000Z'),
    createId: () => 'att-scoped',
  });

  // Only tenantEmp should be processed in this tenant's sweep
  assert.equal(finalized.records.length, 1);
  assert.equal(finalized.records[0].tenantId, tenantId);
  assert.equal(finalized.records[0].employeeId, tenantEmp.id);
  assert.equal(finalized.records[0].status, 'ABSENT');
});

/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

const moduleExports = {};
new Function(
  'exports',
  'require',
  ts.transpileModule(fs.readFileSync('lib/hr-dashboard.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
  }).outputText,
)(moduleExports, () => { throw new Error('Unexpected runtime dependency'); });

const {
  activeRoster,
  attendanceLedgerCsv,
  buildHRAuditFeed,
  filterAttendanceLedger,
  officeOccupancy,
  outstandingAdvanceLiability,
  payrollLiabilityCsv,
  resolveActivePayrollRun,
} = moduleExports;

const employees = [
  { id: 'emp-1', status: 'ACTIVE', fullName: 'Ahmed Khan', department: 'OPERATIONS', designation: 'Operations Lead' },
  { id: 'emp-2', status: 'ACTIVE', fullName: 'Fatima Noor', department: 'SALES_FRONT_DESK', designation: 'Front Desk Officer' },
  { id: 'emp-3', status: 'ACTIVE', fullName: 'Zainab Bibi', department: 'VISA_CONSULTANCY', designation: 'Visa Consultant' },
  { id: 'emp-4', status: 'SUSPENDED', fullName: 'Inactive User', department: 'OPERATIONS', designation: 'Officer' },
];

test('office occupancy counts present, late, and on-leave active staff without suspended employees', () => {
  const result = officeOccupancy(employees, [
    { employeeId: 'emp-1', attendanceDate: '2026-09-16', status: 'PRESENT' },
    { employeeId: 'emp-2', attendanceDate: '2026-09-16', status: 'LATE' },
    { employeeId: 'emp-3', attendanceDate: '2026-09-16', status: 'ON_LEAVE' },
    { employeeId: 'emp-4', attendanceDate: '2026-09-16', status: 'PRESENT' },
  ], '2026-09-16');
  assert.deepEqual(result, {
    rosterCount: 3,
    onDutyCount: 2,
    onTimeCount: 1,
    lateCount: 1,
    onLeaveCount: 1,
    percentage: 67,
  });
});

test('attendance filters apply date, department and status together', () => {
  const rows = [
    { employeeName: 'B', attendanceDate: '2026-09-11', department: 'OPERATIONS', status: 'LATE' },
    { employeeName: 'A', attendanceDate: '2026-09-10', department: 'OPERATIONS', status: 'PRESENT' },
    { employeeName: 'C', attendanceDate: '2026-09-12', department: 'ACCOUNTS', status: 'LATE' },
  ];
  const result = filterAttendanceLedger(rows, { startDate: '2026-09-10', endDate: '2026-09-11', department: 'OPERATIONS', status: 'LATE' });
  assert.equal(result.length, 1);
  assert.equal(result[0].employeeName, 'B');
});

test('attendance CSV includes notes and quotes names containing commas', () => {
  const content = attendanceLedgerCsv([{
    employeeCode: 'WCH-EMP-001', employeeName: 'Ahmed, Khan', department: 'OPERATIONS', attendanceDate: '2026-09-16',
    checkInAt: '2026-09-16T04:00:00.000Z', checkOutAt: '2026-09-16T13:00:00.000Z', workedMinutes: 540,
    lateMinutes: 0, status: 'PRESENT', source: 'QR_SCAN', notes: 'Checked in on time',
  }]);
  assert.match(content, /"Ahmed, Khan"/);
  assert.match(content, /Minutes Worked/);
  assert.match(content, /Notes/);
  assert.match(content, /Checked in on time/);
});

test('non-admin payroll CSV strips every compensation column while admin export retains full breakdown and IBAN', () => {
  const run = {
    status: 'APPROVED',
    items: [{
      employeeCode: 'WCH-EMP-001', employeeName: 'Fatima Noor', department: 'SALES_FRONT_DESK', designation: 'Specialist',
      basicSalary: 85000, allowances: 15000, grossPay: 100000, lateArrivalDeduction: 0, unpaidLeaveDeduction: 0,
      salaryAdvancesDeduction: 10000, netPayableSalary: 90000, paymentStatus: 'UNPAID', bankIban: 'PK36HABB00001234567890',
    }],
  };
  const restricted = payrollLiabilityCsv(run, false);
  assert.doesNotMatch(restricted, /Basic Salary|Gross Pay|Net Pay|85000|90000|PK36HABB/);
  assert.match(restricted, /Payroll Status,Payment Status/);
  const admin = payrollLiabilityCsv(run, true);
  assert.match(admin, /Basic Salary/);
  assert.match(admin, /Gross Pay/);
  assert.match(admin, /Bank IBAN/);
  assert.match(admin, /90000/);
  assert.match(admin, /PK36HABB00001234567890/);
});

test('advance liability includes only approved advances in the active month', () => {
  const result = outstandingAdvanceLiability([
    { payrollMonth: '2026-09', status: 'APPROVED', amount: 20000 },
    { payrollMonth: '2026-09', status: 'PENDING', amount: 5000 },
    { payrollMonth: '2026-08', status: 'APPROVED', amount: 10000 },
  ], '2026-09');
  assert.equal(result, 20000);
});

test('resolveActivePayrollRun falls back to latest run when active month is uncalculated', () => {
  const runs = [
    { monthCode: '2026-08', monthString: 'August 2026', status: 'DISBURSED', totalGrossLiability: 500000, items: [] },
    { monthCode: '2026-07', monthString: 'July 2026', status: 'LOCKED', totalGrossLiability: 480000, items: [] },
  ];
  const active = resolveActivePayrollRun(runs, '2026-09');
  assert.equal(active.monthCode, '2026-08');
  assert.equal(active.status, 'DISBURSED');
});

test('audit feed is chronological across HR mutation sources including leave and advances', () => {
  const result = buildHRAuditFeed({
    attendanceRecords: [{ id: 'att-1', source: 'CORRECTION', employeeName: 'Fatima', adjustedAt: '2026-09-16T10:00:00.000Z', adjustedByStaff: 'Admin', notes: 'Fingerprint scanner error' }],
    employees: [{ id: 'emp-1', fullName: 'Bilal', deviceStatus: 'REVOKED', deviceRevokedAt: '2026-09-16T11:00:00.000Z', deviceRevokedBy: 'HR' }],
    salaryAdvances: [{ id: 'adv-1', employeeName: 'Zainab', amount: 15000, payrollMonth: '2026-09', status: 'APPROVED', reviewedAt: '2026-09-16T09:00:00.000Z', approvedByAdmin: 'Director' }],
    leaveRequests: [{ id: 'lv-1', employeeName: 'Ahmed', leaveType: 'ANNUAL', totalDays: 3, startDate: '2026-09-20', endDate: '2026-09-22', status: 'APPROVED', reviewedAt: '2026-09-16T12:00:00.000Z', reviewedBy: 'HR Lead' }],
  });
  assert.equal(result.length, 4);
  assert.equal(result[0].type, 'LEAVE_APPROVAL');
  assert.equal(result[1].type, 'DEVICE_REVOCATION');
  assert.equal(result[2].type, 'ATTENDANCE_CORRECTION');
  assert.equal(result[3].type, 'SALARY_ADVANCE');
});

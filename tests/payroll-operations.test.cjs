const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');

const moduleExports = {};
new Function(
  'exports',
  'require',
  ts.transpileModule(fs.readFileSync('lib/payroll-operations.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText,
)(moduleExports, () => { throw new Error('Unexpected runtime dependency'); });

const { calculatePayrollRun, payrollMonthLabel, updatePayrollItem } = moduleExports;
const employee = {
  id: 'emp-1', tenantId: 'tenant-world-class', employeeCode: 'WCH-EMP-001', fullName: 'Fatima Noor',
  department: 'SALES_FRONT_DESK', designation: 'Front Desk Officer', status: 'ACTIVE', basicSalary: 85000,
  allowances: 15000, bankName: 'HBL', bankAccountNumber: '1234', bankIban: 'PK00HABB1234',
};
const record = (day, status) => ({ tenantId: employee.tenantId, employeeId: employee.id, attendanceDate: `2026-09-${day}`, status });

test('payroll month label is stable and locale-readable', () => {
  assert.equal(payrollMonthLabel('2026-09'), 'September 2026');
});

test('every three late arrivals deduct one gross daily wage', () => {
  const run = calculatePayrollRun({
    tenantId: employee.tenantId,
    monthCode: '2026-09',
    employees: [employee],
    attendanceRecords: [record('01', 'LATE'), record('02', 'LATE'), record('03', 'LATE'), record('04', 'LATE')],
    salaryAdvances: [],
    generatedAt: '2026-09-30T00:00:00.000Z',
    createId: () => 'fixed',
  });
  assert.equal(run.items[0].lateArrivalDeduction, 100000 / 26);
  assert.equal(run.items[0].totalLateArrivals, 4);
});

test('approved advances and absences reduce net pay while pending advances do not', () => {
  const run = calculatePayrollRun({
    tenantId: employee.tenantId,
    monthCode: '2026-09',
    employees: [employee],
    attendanceRecords: [record('01', 'ABSENT')],
    salaryAdvances: [
      { tenantId: employee.tenantId, employeeId: employee.id, payrollMonth: '2026-09', status: 'APPROVED', amount: 10000 },
      { tenantId: employee.tenantId, employeeId: employee.id, payrollMonth: '2026-09', status: 'PENDING', amount: 5000 },
    ],
    createId: () => 'fixed',
  });
  assert.equal(run.items[0].salaryAdvancesDeduction, 10000);
  assert.equal(run.items[0].unpaidLeaveDeduction, 100000 / 26);
  assert.equal(run.items[0].netPayableSalary, 100000 - 10000 - (100000 / 26));
});

test('paid leave is protected while approved unpaid leave is deducted without becoming an unexcused absence', () => {
  const run = calculatePayrollRun({
    tenantId: employee.tenantId,
    monthCode: '2026-09',
    employees: [employee],
    attendanceRecords: [
      { ...record('01', 'ON_LEAVE'), leaveType: 'ANNUAL', isPaidLeave: true },
      { ...record('02', 'ON_LEAVE'), leaveType: 'UNPAID', isPaidLeave: false },
    ],
    salaryAdvances: [],
    createId: () => 'fixed',
  });
  assert.equal(run.items[0].unexcusedAbsences, 0);
  assert.equal(run.items[0].unpaidLeaveDays, 1);
  assert.equal(run.items[0].unpaidLeaveDeduction, 100000 / 26);
});

test('approved payroll cannot be recalculated or edited', () => {
  const calculated = calculatePayrollRun({ tenantId: employee.tenantId, monthCode: '2026-09', employees: [employee], attendanceRecords: [], salaryAdvances: [], createId: () => 'fixed' });
  const approved = { ...calculated, status: 'APPROVED' };
  assert.throws(() => calculatePayrollRun({ tenantId: employee.tenantId, monthCode: '2026-09', employees: [employee], attendanceRecords: [], salaryAdvances: [], existingRun: approved }), /cannot be recalculated/i);
  assert.throws(() => updatePayrollItem(approved, employee.id, { bonusesOrIncentives: 1000, paymentMethod: 'CASH' }), /cannot be edited/i);
});

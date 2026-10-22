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
  OFFICE_QR_WINDOW_MS,
  calculateAttendanceStatus,
  createAttendanceRecord,
  canFinalizeAttendanceDate,
  finalizeAttendanceRecords,
  isOfficeQrTokenValid,
  officeQrToken,
  processDeviceAttendance,
} = moduleExports;

const shift = {
  id: 'regular',
  name: 'Regular Day Shift',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMinutes: 15,
  workingDays: ['MON'],
};

const employee = {
  id: 'employee-1',
  tenantId: 'tenant-world-class',
  employeeCode: 'WCH-EMP-001',
  fullName: 'Nadeem Akhtar',
  department: 'MANAGEMENT',
  status: 'ACTIVE',
  shiftId: 'regular',
  shiftName: 'Regular Day Shift',
};

test('grace cutoff is inclusive and late minutes begin after the grace period', () => {
  assert.deepEqual(calculateAttendanceStatus('2026-09-15T09:15:00', shift), { status: 'PRESENT', lateMinutes: 0 });
  assert.deepEqual(calculateAttendanceStatus('2026-09-15T09:23:00', shift), { status: 'LATE', lateMinutes: 8 });
});

test('attendance record captures employee and assigned shift audit fields', () => {
  const record = createAttendanceRecord(employee, shift, '2026-09-15T09:23:00');
  assert.equal(record.id, 'attendance-employee-1-2026-09-15');
  assert.equal(record.status, 'LATE');
  assert.equal(record.graceCutoffTime, '09:15');
  assert.equal(record.source, 'QR_SCAN');
});

test('office QR accepts current and immediately previous rotation only', () => {
  const now = OFFICE_QR_WINDOW_MS * 100;
  assert.equal(isOfficeQrTokenValid(officeQrToken(employee.tenantId, now), employee.tenantId, now), true);
  assert.equal(isOfficeQrTokenValid(officeQrToken(employee.tenantId, now - OFFICE_QR_WINDOW_MS), employee.tenantId, now), true);
  assert.equal(isOfficeQrTokenValid(officeQrToken(employee.tenantId, now - OFFICE_QR_WINDOW_MS * 2), employee.tenantId, now), false);
  assert.equal(isOfficeQrTokenValid(officeQrToken('another-tenant', now), employee.tenantId, now), false);
});

test('first scan enrolls the device and replaces an empty attendance placeholder', () => {
  const placeholder = {
    ...createAttendanceRecord(employee, shift, '2026-09-15T09:00:00'),
    checkInAt: undefined,
    status: 'ABSENT',
  };
  let sequence = 0;
  const result = processDeviceAttendance({
    tenantId: employee.tenantId,
    employee,
    shift,
    clientDeviceToken: null,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/AP1A)',
    attendanceRecords: [placeholder],
    registeredDevices: [],
    now: new Date('2026-09-15T09:12:00'),
    createId: () => `uuid-${++sequence}`,
  });

  assert.equal(result.success, true);
  assert.equal(result.action, 'CHECK_IN');
  assert.equal(result.isNewEnrollment, true);
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].status, 'PRESENT');
  assert.equal(result.devices[0].deviceModel, 'Pixel 8 Pro');
});

test('registered employee rejects a missing or mismatched device token', () => {
  const device = {
    id: 'device-1', tenantId: employee.tenantId, employeeId: employee.id,
    deviceToken: 'dev-approved', deviceModel: 'Apple iPhone', status: 'ACTIVE',
    enrolledAt: '2026-09-14T09:00:00.000Z', lastUsedAt: '2026-09-14T09:00:00.000Z',
  };
  const base = { tenantId: employee.tenantId, employee, shift, userAgent: 'iPhone', attendanceRecords: [], registeredDevices: [device] };
  assert.equal(processDeviceAttendance({ ...base, clientDeviceToken: null }).error, 'DEVICE_MISMATCH');
  assert.equal(processDeviceAttendance({ ...base, clientDeviceToken: 'dev-other' }).error, 'UNAUTHORIZED_DEVICE');
});

test('second scan checks out and a third scan is blocked', () => {
  const device = {
    id: 'device-1', tenantId: employee.tenantId, employeeId: employee.id,
    deviceToken: 'dev-approved', deviceModel: 'Apple iPhone', status: 'ACTIVE',
    enrolledAt: '2026-09-15T09:00:00.000Z', lastUsedAt: '2026-09-15T09:00:00.000Z',
  };
  const checkedIn = createAttendanceRecord(employee, shift, '2026-09-15T09:00:00');
  const checkout = processDeviceAttendance({
    tenantId: employee.tenantId, employee, shift, clientDeviceToken: device.deviceToken,
    userAgent: 'iPhone', attendanceRecords: [checkedIn], registeredDevices: [device],
    now: new Date('2026-09-15T17:30:00'),
  });
  assert.equal(checkout.success, true);
  assert.equal(checkout.action, 'CHECK_OUT');
  assert.equal(checkout.workedMinutes, 510);

  const third = processDeviceAttendance({
    tenantId: employee.tenantId, employee, shift, clientDeviceToken: device.deviceToken,
    userAgent: 'iPhone', attendanceRecords: checkout.records, registeredDevices: checkout.devices,
    now: new Date('2026-09-15T17:31:00'),
  });
  assert.equal(third.success, false);
  assert.equal(third.error, 'ALREADY_COMPLETED');
});

test('daily finalization creates an absence after the PKT cutoff', () => {
  const result = finalizeAttendanceRecords({
    tenantId: employee.tenantId,
    targetDate: '2026-09-15',
    cutoffTime: '19:00',
    executedByStaff: 'Nadeem Akhtar',
    employees: [employee],
    shifts: [shift],
    leaveRequests: [],
    attendanceRecords: [],
    now: new Date('2026-09-15T14:00:00.000Z'),
    createId: () => 'absence-uuid',
  });

  assert.equal(result.records[0].status, 'ABSENT');
  assert.equal(result.records[0].workedMinutes, 0);
  assert.equal(result.records[0].shiftStartTime, shift.startTime);
  assert.deepEqual(result.summary.absentEmployeeIds, [employee.id]);
});

test('daily finalization resolves an approved leave instead of an absence', () => {
  const result = finalizeAttendanceRecords({
    tenantId: employee.tenantId,
    targetDate: '2026-09-15',
    executedByStaff: 'Nadeem Akhtar',
    employees: [employee],
    shifts: [shift],
    leaveRequests: [{
      id: 'leave-1', tenantId: employee.tenantId, employeeId: employee.id,
      employeeCode: employee.employeeCode, employeeName: employee.fullName,
      department: employee.department, leaveType: 'ANNUAL', startDate: '2026-09-14',
      endDate: '2026-09-16', totalDays: 3, reason: 'Family travel', status: 'APPROVED',
      appliedAt: '2026-09-01T09:00:00.000Z',
    }],
    attendanceRecords: [],
    now: new Date('2026-09-15T14:01:00.000Z'),
  });

  assert.equal(result.records[0].status, 'ON_LEAVE');
  assert.equal(result.records[0].source, 'MANUAL_HR');
  assert.deepEqual(result.summary.leaveEmployeeIds, [employee.id]);
});

test('missing checkout is flagged without fabricating a timestamp and remains idempotent', () => {
  const checkedIn = createAttendanceRecord(employee, shift, '2026-09-15T09:00:00');
  const input = {
    tenantId: employee.tenantId,
    targetDate: '2026-09-15',
    executedByStaff: 'Nadeem Akhtar',
    employees: [employee],
    shifts: [shift],
    leaveRequests: [],
    now: new Date('2026-09-15T14:01:00.000Z'),
  };
  const first = finalizeAttendanceRecords({ ...input, attendanceRecords: [checkedIn] });
  const second = finalizeAttendanceRecords({ ...input, attendanceRecords: first.records });

  assert.equal(first.records[0].checkOutAt, undefined);
  assert.match(first.records[0].notes, /MISSING_CHECKOUT/);
  assert.equal(second.records[0].notes.match(/MISSING_CHECKOUT/g).length, 1);
  assert.equal(second.records.length, 1);
});

test('today cannot be finalized before the configured PKT cutoff', () => {
  const beforeCutoff = new Date('2026-09-15T13:59:00.000Z');
  assert.equal(canFinalizeAttendanceDate('2026-09-15', '19:00', beforeCutoff), false);
  assert.throws(() => finalizeAttendanceRecords({
    tenantId: employee.tenantId,
    targetDate: '2026-09-15',
    cutoffTime: '19:00',
    executedByStaff: 'Nadeem Akhtar',
    employees: [employee],
    shifts: [shift],
    leaveRequests: [],
    attendanceRecords: [],
    now: beforeCutoff,
  }), /after 19:00 PKT/i);
});

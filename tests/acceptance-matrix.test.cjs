/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadTypeScript(file, dependencies = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(
    (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected runtime dependency ${name} in ${file}`);
    },
    module,
    module.exports,
  );
  return module.exports;
}

const leadOps = loadTypeScript("lib/lead-operations.ts");
const bookingOps = loadTypeScript("lib/booking-operations.ts", {
  "@/lib/lead-operations": leadOps,
});
const paymentOps = loadTypeScript("lib/payment-recovery.ts", {
  "@/lib/booking-operations": bookingOps,
});
const attendanceOps = loadTypeScript("lib/attendance-operations.ts");
const leaveOps = loadTypeScript("lib/leave-operations.ts");
const payrollOps = loadTypeScript("lib/payroll-operations.ts");
const visaOps = loadTypeScript("lib/visa-operations.ts");
const analytics = loadTypeScript("lib/analytics-governance.ts");
const settingsOps = loadTypeScript("lib/agency-settings.ts");

const tenantId = "tenant-world-class";
const now = "2026-09-15T09:00:00.000Z";

function ids(prefix = "id") {
  let sequence = 0;
  return () => `${prefix}-${++sequence}`;
}

function erpFixture({ maxCapacity = 5, bookedSeats = 0 } = {}) {
  return {
    clients: [{
      id: "client-1",
      tenantId,
      leadId: "lead-1",
      fullName: "Tariq Mehmood",
      phone: "923001234567",
      conversion: { kind: "GROUP_TOUR", tourId: "tour-1", pax: 2, pricePerPerson: 100, deposit: 0 },
    }],
    leads: [{ id: "lead-1", tenantId, fullName: "Tariq Mehmood", phone: "923001234567", status: "QUOTE_SENT" }],
    duplicates: [],
    bookings: [],
    invoices: [],
    passengers: [],
    visaCases: [],
    expenses: [],
    tours: [{
      id: "tour-1",
      tenantId,
      title: "Europe Departure",
      status: "OPEN",
      maxCapacity,
      bookedSeats,
      allocatedOverheads: 0,
    }],
  };
}

function bookingInput(pax = 2) {
  return {
    clientId: "client-1",
    assignedRep: "Fatima",
    conversion: { kind: "GROUP_TOUR", tourId: "tour-1", pax, pricePerPerson: 100, deposit: 0 },
    milestones: [{ name: "Balance", amount: pax * 100, dueDate: "2026-10-01" }],
  };
}

function confirmBooking(state = erpFixture(), pax = 2, payment) {
  const createId = ids("booking-flow");
  const draft = bookingOps.createBookingDraft(state, tenantId, bookingInput(pax), now, createId);
  return bookingOps.confirmBookingTransaction(
    draft.state,
    tenantId,
    draft.booking.id,
    "Fatima",
    now,
    createId,
    payment,
  );
}

const shift = {
  id: "shift-regular",
  name: "Regular Day Shift",
  startTime: "09:00",
  endTime: "18:00",
  gracePeriodMinutes: 15,
  workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
};

function employee(id = "employee-1", name = "Fatima Noor") {
  return {
    id,
    tenantId,
    employeeCode: `WCH-${id}`,
    fullName: name,
    department: "SALES_FRONT_DESK",
    designation: "Front Desk Officer",
    status: "ACTIVE",
    joiningDate: "2024-01-01",
    shiftId: shift.id,
    shiftName: shift.name,
    annualLeaveAllowance: 14,
    sickLeaveAllowance: 8,
    basicSalary: 85000,
    allowances: 15000,
    bankName: "HBL",
    bankAccountNumber: "1234",
    bankIban: "PK00HABB1234",
  };
}

function attendanceRecord(day, status, extra = {}) {
  return {
    id: `attendance-${day}-${status}`,
    tenantId,
    employeeId: "employee-1",
    attendanceDate: `2026-09-${day}`,
    status,
    ...extra,
  };
}

test("TC-01 Lead Deduplication flags an existing normalized phone", () => {
  const row = {
    fullName: "Returning Tariq",
    phone: "0300-1234567",
    email: "tariq@example.com",
    interestType: "GROUP_TOUR",
    source: "WhatsApp",
    groupSize: 2,
    budget: 300000,
  };
  const state = {
    leads: [{ id: "existing", tenantId, fullName: "Tariq", phone: "923001234567" }],
    clients: [],
    duplicates: [],
  };
  const next = leadOps.importCRM(state, tenantId, [row], [], now, ids("lead"));
  assert.equal(next.leads.length, 1);
  assert.equal(next.duplicates.length, 1);
});

test("TC-02 Atomic Booking Conversion allocates seats, booking number, and invoice", () => {
  const next = confirmBooking();
  assert.match(next.bookings[0].bookingNumber, /^WCH-BK-\d{6}$/);
  assert.equal(next.bookings[0].status, "CONFIRMED");
  assert.equal(next.tours[0].bookedSeats, 2);
  assert.equal(next.invoices.length, 1);
  assert.equal(next.bookings[0].invoiceId, next.invoices[0].id);
});

test("TC-03 Inventory Concurrency rejects an oversell without mutating inventory", () => {
  const state = erpFixture({ maxCapacity: 3, bookedSeats: 2 });
  const snapshot = JSON.stringify(state);
  assert.throws(() => confirmBooking(state, 2), /seats/i);
  assert.equal(JSON.stringify(state), snapshot);
});

test("TC-04 Six-Month Passport Rule persistently flags an expiring passport", () => {
  assert.equal(settingsOps.passportNeedsAlert("2027-02-01", "2026-10-01", 6), true);
  assert.equal(settingsOps.passportNeedsAlert("2027-05-01", "2026-10-01", 6), false);
});

test("TC-05 Two-Step Payment Verification leaves cash untouched until Admin approval", () => {
  const initial = confirmBooking();
  const invoice = initial.invoices[0];
  const rep = { id: "rep-1", name: "Fatima", role: "FRONT_DESK", tenantId };
  const admin = { id: "admin-1", name: "Nadeem", role: "AGENCY_ADMIN", tenantId };
  const pending = paymentOps.submitProof(initial, rep, {
    invoiceId: invoice.id,
    amount: 50,
    bankReference: "BANK-001",
    screenshotUrl: "data:image/png;base64,aGVsbG8=",
  }, now, "claim-1");
  assert.equal(pending.paymentProofClaims[0].status, "PENDING_VERIFICATION");
  assert.equal(pending.invoices[0].paidAmount, 0);
  const approved = paymentOps.reviewProof(pending, admin, "claim-1", "APPROVE", "", "Bank Transfer", now, ids("receipt"));
  assert.equal(approved.paymentProofClaims[0].status, "VERIFIED_APPROVED");
  assert.equal(approved.invoices[0].paidAmount, 50);
});

test("TC-06 Cancellation releases inventory and preserves refund audit records", () => {
  const confirmed = confirmBooking(erpFixture(), 2, {
    amount: 100,
    method: "Cash",
    paymentDate: "2026-09-15",
  });
  const next = bookingOps.cancelBookingTransaction(
    confirmed,
    tenantId,
    confirmed.bookings[0].id,
    { cancellationFeeRetained: 10, refundMethod: "ORIGINAL_PAYMENT", reasonCategory: "CLIENT_REQUEST" },
    { id: "admin-1", role: "AGENCY_ADMIN", tenantId },
    now,
    () => "refund-1",
  );
  assert.equal(next.tours[0].bookedSeats, 0);
  assert.equal(next.bookings[0].status, "CANCELLED");
  assert.equal(next.bookings[0].refund.refundAmountIssued, 90);
  assert.equal(next.invoices[0].refund.id, "refund-1");
});

test("TC-07 Device-Bound QR Enrollment rejects a secondary phone token", () => {
  const staff = employee();
  const enrolled = attendanceOps.processDeviceAttendance({
    tenantId,
    employee: staff,
    shift,
    clientDeviceToken: null,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro)",
    attendanceRecords: [],
    registeredDevices: [],
    now: new Date("2026-09-15T09:00:00"),
    createId: ids("device"),
  });
  assert.equal(enrolled.success, true);
  assert.equal(enrolled.isNewEnrollment, true);
  const spoof = attendanceOps.processDeviceAttendance({
    tenantId,
    employee: staff,
    shift,
    clientDeviceToken: "dev_secondary-phone",
    userAgent: "Secondary Phone",
    attendanceRecords: enrolled.records,
    registeredDevices: enrolled.devices,
    now: new Date("2026-09-15T10:00:00"),
  });
  assert.equal(spoof.success, false);
  assert.equal(spoof.error, "UNAUTHORIZED_DEVICE");
});

test("TC-08 Dual-Scan Attendance Lifecycle checks in, checks out, then rejects", () => {
  const staff = employee();
  const first = attendanceOps.processDeviceAttendance({
    tenantId, employee: staff, shift, clientDeviceToken: null, userAgent: "iPhone",
    attendanceRecords: [], registeredDevices: [], now: new Date("2026-09-15T09:00:00"), createId: ids("scan"),
  });
  assert.equal(first.action, "CHECK_IN");
  const second = attendanceOps.processDeviceAttendance({
    tenantId, employee: staff, shift, clientDeviceToken: first.deviceToken, userAgent: "iPhone",
    attendanceRecords: first.records, registeredDevices: first.devices, now: new Date("2026-09-15T18:00:00"),
  });
  assert.equal(second.action, "CHECK_OUT");
  const third = attendanceOps.processDeviceAttendance({
    tenantId, employee: staff, shift, clientDeviceToken: first.deviceToken, userAgent: "iPhone",
    attendanceRecords: second.records, registeredDevices: second.devices, now: new Date("2026-09-15T18:01:00"),
  });
  assert.equal(third.error, "ALREADY_COMPLETED");
});

test("TC-09 Attendance Shift Grace Period calculates minutes after 09:15", () => {
  assert.deepEqual(attendanceOps.calculateAttendanceStatus("2026-09-15T09:23:00", shift), {
    status: "LATE",
    lateMinutes: 8,
  });
});

test("TC-10 Cutoff Sweep resolves an unpunched employee without leave to ABSENT", () => {
  const result = attendanceOps.finalizeAttendanceRecords({
    tenantId,
    targetDate: "2026-09-15",
    cutoffTime: "19:00",
    executedByStaff: "Nadeem Akhtar",
    employees: [employee()],
    shifts: [shift],
    leaveRequests: [],
    attendanceRecords: [],
    now: new Date("2026-09-15T14:01:00.000Z"),
    createId: () => "absence-1",
  });
  assert.equal(result.records[0].status, "ABSENT");
  assert.equal(result.records[0].workedMinutes, 0);
});

test("TC-11 Leave Payroll Protection resolves paid leave with zero absence deduction", () => {
  const staff = employee();
  const pending = leaveOps.buildLeaveRequest({
    employee: staff,
    shift,
    requests: [],
    input: { leaveType: "ANNUAL", startDate: "2026-09-15", endDate: "2026-09-15", reason: "Family commitment" },
    now: new Date("2026-09-01T09:00:00.000Z"),
    createId: () => "leave-1",
  });
  const approved = leaveOps.reviewLeaveRequestRecord(pending, "APPROVE", "Nadeem", undefined, new Date(now));
  const finalized = attendanceOps.finalizeAttendanceRecords({
    tenantId, targetDate: "2026-09-15", cutoffTime: "19:00", executedByStaff: "Nadeem",
    employees: [staff], shifts: [shift], leaveRequests: [approved], attendanceRecords: [],
    now: new Date("2026-09-15T14:01:00.000Z"),
  });
  const run = payrollOps.calculatePayrollRun({
    tenantId, monthCode: "2026-09", employees: [staff], attendanceRecords: finalized.records,
    salaryAdvances: [], generatedAt: now, createId: ids("payroll"),
  });
  assert.equal(finalized.records[0].status, "ON_LEAVE");
  assert.equal(run.items[0].unexcusedAbsences, 0);
  assert.equal(run.items[0].unpaidLeaveDeduction, 0);
});

test("TC-12 Three-Late Rule deducts exactly one gross daily wage", () => {
  const run = payrollOps.calculatePayrollRun({
    tenantId,
    monthCode: "2026-09",
    employees: [employee()],
    attendanceRecords: [attendanceRecord("01", "LATE"), attendanceRecord("02", "LATE"), attendanceRecord("03", "LATE")],
    salaryAdvances: [],
    createId: ids("payroll"),
  });
  assert.equal(run.items[0].lateArrivalDeduction, 100000 / 26);
});

test("TC-13 Approved Salary Advance reduces net payable in the active run", () => {
  const run = payrollOps.calculatePayrollRun({
    tenantId,
    monthCode: "2026-09",
    employees: [employee()],
    attendanceRecords: [],
    salaryAdvances: [{ tenantId, employeeId: "employee-1", payrollMonth: "2026-09", status: "APPROVED", amount: 12000 }],
    createId: ids("payroll"),
  });
  assert.equal(run.items[0].salaryAdvancesDeduction, 12000);
  assert.equal(run.items[0].netPayableSalary, 88000);
});

test("TC-14 Front-Desk Privacy Shield blocks cost and executive analytics access", () => {
  for (const role of ["FRONT_DESK", "VISA_CONSULTANT", "EMPLOYEE"]) {
    assert.equal(analytics.canViewTourCosts(role), false);
    assert.equal(analytics.canViewExecutiveAnalytics(role), false);
  }
  assert.equal(analytics.canViewTourCosts("AGENCY_ADMIN"), true);
  assert.equal(analytics.canViewExecutiveAnalytics("AGENCY_ADMIN"), true);
});

test("TC-15 Visa Safe-Custody Transfer appends immutable actor history", () => {
  const actor = { id: "admin-1", name: "Nadeem Akhtar", role: "AGENCY_ADMIN", tenantId };
  const state = {
    clients: [{ id: "client-1", tenantId, fullName: "Haris", phone: "03001234567" }],
    bookings: [], visaCases: [], invoices: [], leads: [], duplicates: [], tours: [], passengers: [], expenses: [],
  };
  const input = {
    clientId: "client-1", applicantName: "Haris", applicantPhone: "03001234567", country: "UK",
    visaType: "Visitor", stage: "DOCUMENTS_PENDING", decision: "PENDING", assignedStaffId: actor.id,
    assignedStaffName: actor.name, passportNumber: "PK123", passportCustody: "CLIENT_HOLDING",
    consultancyFee: 50000, embassyFeePaid: 20000, documentChecklist: [],
  };
  const createId = ids("visa");
  let next = visaOps.saveVisaCase(state, actor, null, input, now, createId);
  const caseId = next.visaCases[0].id;
  const originalHistory = visaOps.normalizeVisaCase(next.visaCases[0], next).custodyHistory;
  next = visaOps.saveVisaCase(next, actor, caseId, {
    passportCustody: "OFFICE_SAFE",
    custodySafeLockerId: "Safe A - Locker 04",
  }, now, createId);
  const normalized = visaOps.normalizeVisaCase(next.visaCases[0], next);
  assert.equal(normalized.custodyHistory.length, originalHistory.length + 1);
  assert.equal(normalized.custodyHistory[0].fromLocation, "CLIENT_HOLDING");
  assert.equal(normalized.custodyHistory[0].toLocation, "OFFICE_SAFE");
  assert.equal(normalized.custodyHistory[0].transferredByStaff, actor.name);
  assert.deepEqual(normalized.custodyHistory.slice(1), originalHistory);
});

test("TC-16 Division-by-Zero Margin Guard returns finite zero ROI", () => {
  const tour = erpFixture().tours[0];
  const summary = analytics.calculateTourFinancials(tenantId, tour, [], [], []);
  assert.equal(summary.roiPercent, 0);
  assert.equal(Number.isFinite(summary.roiPercent), true);
});

test("TC-17 Multi-Tenant Isolation excludes foreign financial records", () => {
  const localTour = erpFixture().tours[0];
  const foreignTour = { ...localTour, id: "tour-b", tenantId: "tenant-b" };
  const invoices = [
    { id: "invoice-a", tenantId, totalAmount: 100, paidAmount: 40, dueAmount: 60, dueDate: "2026-09-20", status: "PARTIALLY_PAID" },
    { id: "invoice-b", tenantId: "tenant-b", totalAmount: 900, paidAmount: 900, dueAmount: 0, dueDate: "2026-09-20", status: "PAID" },
  ];
  const result = analytics.calculateExecutiveAnalytics(tenantId, invoices, [localTour, foreignTour], [], [], "2026-09-15");
  assert.equal(result.grossBilled, 100);
  assert.equal(result.realizedCash, 40);
});

test("TC-18 Super Admin Lifecycle validates statuses, role, and license-day math", () => {
  assert.deepEqual(
    ["ACTIVE", "GRACE_PERIOD", "SUSPENDED"].map(analytics.normalizeGovernanceStatus),
    ["ACTIVE", "GRACE_PERIOD", "SUSPENDED"],
  );
  assert.equal(analytics.extendLicenseDate("2026-09-01", 30, "2026-09-15"), "2026-10-15");
  assert.doesNotThrow(() => analytics.assertSuperAdmin("SUPER_ADMIN"));
  assert.throws(() => analytics.assertSuperAdmin("AGENCY_ADMIN"), /platform owner/i);
});

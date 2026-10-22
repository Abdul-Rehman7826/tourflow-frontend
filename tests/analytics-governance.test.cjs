/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function loadTypeScript(file) {
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
    require,
    module,
    module.exports,
  );
  return module.exports;
}

const {
  assertSuperAdmin,
  calculateExecutiveAnalytics,
  calculateTourFinancials,
  canViewExecutiveAnalytics,
  canViewTourCosts,
  extendLicenseDate,
  normalizeGovernanceStatus,
} = loadTypeScript("lib/analytics-governance.ts");

const tour = {
  id: "tour-a",
  tenantId: "tenant-a",
  title: "Test Departure",
  destinations: [],
  departureDate: "2026-10-01",
  returnDate: "2026-10-08",
  durationDays: 8,
  maxCapacity: 20,
  bookedSeats: 2,
  pricePerPerson: 500,
  allocatedOverheads: 100,
  status: "OPEN",
  inclusions: [],
};

const booking = {
  id: "booking-a",
  bookingNumber: "WCH-BK-000001",
  tenantId: "tenant-a",
  clientId: "client-a",
  clientName: "Test Client",
  clientPhone: "03000000000",
  serviceType: "GROUP_TOUR",
  packageId: "tour-a",
  packageTitle: "Test Departure",
  paxCount: 2,
  totalAgreedAmount: 1000,
  assignedRep: "Rep",
  status: "CONFIRMED",
  milestones: [],
  travelers: [],
  createdAt: "2026-09-01",
};

function invoice(overrides = {}) {
  return {
    id: "invoice-a",
    invoiceNumber: "INV-001",
    tenantId: "tenant-a",
    bookingId: "booking-a",
    tourId: "tour-a",
    clientId: "client-a",
    clientName: "Test Client",
    serviceDescription: "Test Departure",
    totalAmount: 1000,
    paidAmount: 300,
    dueAmount: 700,
    status: "PARTIALLY_PAID",
    dueDate: "2026-09-10",
    createdAt: "2026-09-01",
    installments: [],
    ...overrides,
  };
}

const expense = {
  id: "expense-a",
  tenantId: "tenant-a",
  tourId: "tour-a",
  category: "FLIGHT",
  vendorName: "Airline",
  amount: 300,
  currency: "PKR",
  date: "2026-09-01",
  createdAt: "2026-09-01T00:00:00.000Z",
};

test("tour margin uses recognized revenue, direct costs and allocated overhead", () => {
  const result = calculateTourFinancials(
    "tenant-a",
    tour,
    [booking],
    [invoice()],
    [expense],
  );
  assert.equal(result.recognizedRevenue, 1000);
  assert.equal(result.directVendorExpenses, 300);
  assert.equal(result.allocatedOverheads, 100);
  assert.equal(result.netProfit, 600);
  assert.equal(result.roiPercent, 200);
  assert.equal(result.marginPercent, 60);
});

test("ROI returns zero instead of NaN or Infinity when direct costs are zero", () => {
  const result = calculateTourFinancials(
    "tenant-a",
    { ...tour, allocatedOverheads: 50 },
    [booking],
    [invoice({ totalAmount: 500, paidAmount: 0, dueAmount: 500 })],
    [],
  );
  assert.equal(result.netProfit, 450);
  assert.equal(result.roiPercent, 0);
  assert.equal(Number.isFinite(result.roiPercent), true);
});

test("executive analytics isolates tenants and counts verified invoice cash only", () => {
  const pendingClaim = { tenantId: "tenant-a", amount: 500, status: "PENDING_VERIFICATION" };
  const result = calculateExecutiveAnalytics(
    "tenant-a",
    [
      invoice(),
      invoice({ id: "cancelled", totalAmount: 5000, paidAmount: 5000, dueAmount: 0, status: "CANCELLED" }),
      invoice({ id: "foreign", tenantId: "tenant-b", totalAmount: 9000, paidAmount: 9000, dueAmount: 0 }),
    ],
    [tour, { ...tour, id: "foreign-tour", tenantId: "tenant-b" }],
    [booking],
    [expense, { ...expense, id: "foreign-expense", tenantId: "tenant-b", amount: 8000 }],
    "2026-09-17",
  );
  assert.equal(pendingClaim.status, "PENDING_VERIFICATION");
  assert.equal(result.grossBilled, 1000);
  assert.equal(result.realizedCash, 300);
  assert.equal(result.outstandingTotal, 700);
  assert.equal(result.outstandingAging.days1To30, 700);
  assert.equal(result.netTourProfit, 600);
});

test("financial privacy permits only the intended operational roles", () => {
  assert.equal(canViewExecutiveAnalytics("AGENCY_ADMIN"), true);
  assert.equal(canViewExecutiveAnalytics("TOUR_MANAGER"), false);
  assert.equal(canViewExecutiveAnalytics("FRONT_DESK"), false);
  assert.equal(canViewTourCosts("AGENCY_ADMIN"), true);
  assert.equal(canViewTourCosts("TOUR_MANAGER"), true);
  for (const role of ["FRONT_DESK", "VISA_CONSULTANT", "EMPLOYEE"]) {
    assert.equal(canViewTourCosts(role), false);
    assert.throws(() => assertSuperAdmin(role), /platform owner/);
  }
  assert.doesNotThrow(() => assertSuperAdmin("SUPER_ADMIN"));
});

test("license renewal math uses the later of expiry or today", () => {
  assert.equal(extendLicenseDate("2026-12-01", 30, "2026-09-17"), "2026-12-31");
  assert.equal(extendLicenseDate("2026-01-01", 90, "2026-09-17"), "2026-12-16");
  assert.equal(extendLicenseDate("2026-09-17", 180, "2026-09-17"), "2027-03-16");
  assert.equal(extendLicenseDate("2026-09-17", 365, "2026-09-17"), "2027-09-17");
});

test("governance status normalizes legacy labels to canonical controls", () => {
  assert.equal(normalizeGovernanceStatus("Active"), "ACTIVE");
  assert.equal(normalizeGovernanceStatus("GRACE_PERIOD"), "GRACE_PERIOD");
  assert.equal(normalizeGovernanceStatus("Suspended"), "SUSPENDED");
  assert.throws(() => normalizeGovernanceStatus("DELETED"), /Unsupported/);
});

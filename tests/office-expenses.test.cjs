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
  calculateExecutiveAnalytics,
  calculateOfficeExpenseSummary,
  canManageOfficeExpenses,
} = loadTypeScript("lib/analytics-governance.ts");

const tour = {
  id: "tour-a",
  tenantId: "tenant-a",
  title: "Europe Departure",
  departureDate: "2026-10-01",
  returnDate: "2026-10-15",
  durationDays: 15,
  maxCapacity: 30,
  bookedSeats: 10,
  allocatedOverheads: 500,
  status: "OPEN",
};

const booking = {
  id: "booking-a",
  tenantId: "tenant-a",
  packageId: "tour-a",
  status: "CONFIRMED",
};

const invoice = {
  id: "invoice-a",
  tenantId: "tenant-a",
  bookingId: "booking-a",
  tourId: "tour-a",
  totalAmount: 10000,
  paidAmount: 7000,
  dueAmount: 3000,
  status: "PARTIALLY_PAID",
  dueDate: "2026-09-01",
};

const tourExpense = {
  id: "direct-a",
  tenantId: "tenant-a",
  tourId: "tour-a",
  category: "FLIGHT",
  vendorName: "Airline",
  amount: 4000,
  currency: "PKR",
  date: "2026-09-01",
  createdAt: "2026-09-01T00:00:00.000Z",
};

const officeExpense = {
  id: "office-a",
  tenantId: "tenant-a",
  category: "RENT",
  vendorName: "Office Landlord",
  amount: 1000,
  currency: "PKR",
  paymentMethod: "BANK_TRANSFER",
  paidAt: "2026-09-05",
  receiptRef: "RENT-SEP",
  recordedByUserId: "admin-a",
  createdAt: "2026-09-05T10:00:00.000Z",
};

test("office overhead summary is tenant scoped and grouped by category", () => {
  const result = calculateOfficeExpenseSummary("tenant-a", [
    officeExpense,
    { ...officeExpense, id: "office-b", category: "UTILITIES", amount: 250 },
    { ...officeExpense, id: "foreign", tenantId: "tenant-b", amount: 9000 },
  ]);
  assert.equal(result.total, 1250);
  assert.equal(result.count, 2);
  assert.equal(result.byCategory.RENT, 1000);
  assert.equal(result.byCategory.UTILITIES, 250);
});

test("executive P&L subtracts office overheads after direct vendor costs", () => {
  const result = calculateExecutiveAnalytics(
    "tenant-a",
    [invoice],
    [tour],
    [booking],
    [tourExpense],
    "2026-09-17",
    [officeExpense],
  );
  assert.equal(result.grossBilled, 10000);
  assert.equal(result.realizedCash, 7000);
  assert.equal(result.directVendorExpenses, 4000);
  assert.equal(result.allocatedOverheads, 500);
  assert.equal(result.officeOverheads, 1000);
  assert.equal(result.netTourProfit, 4500);
  assert.equal(result.tourRoiPercent, 112.5);
});

test("office overhead integration keeps zero direct-cost ROI finite", () => {
  const result = calculateExecutiveAnalytics(
    "tenant-a",
    [{ ...invoice, totalAmount: 2000, paidAmount: 0, dueAmount: 2000 }],
    [{ ...tour, allocatedOverheads: 0 }],
    [booking],
    [],
    "2026-09-17",
    [officeExpense],
  );
  assert.equal(result.netTourProfit, 1000);
  assert.equal(result.tourRoiPercent, 0);
  assert.equal(Number.isFinite(result.tourRoiPercent), true);
});

test("front desk and consultants cannot manage the office ledger", () => {
  assert.equal(canManageOfficeExpenses("AGENCY_ADMIN"), true);
  assert.equal(canManageOfficeExpenses("HR_MANAGER"), true);
  for (const role of ["FRONT_DESK", "VISA_CONSULTANT", "TOUR_MANAGER", "EMPLOYEE"]) {
    assert.equal(canManageOfficeExpenses(role), false);
  }
});

test("office expense route and context methods are wired", () => {
  const page = fs.readFileSync(path.join(root, "app/(dashboard)/expenses/page.tsx"), "utf8");
  const context = fs.readFileSync(path.join(root, "context/DataContext.tsx"), "utf8");
  const sidebar = fs.readFileSync(path.join(root, "components/layout/Sidebar.tsx"), "utf8");
  assert.match(page, /Office &amp; Overhead Expense Ledger/);
  assert.match(context, /addOfficeExpense/);
  assert.match(context, /updateOfficeExpense/);
  assert.match(context, /deleteOfficeExpense/);
  assert.match(sidebar, /Office Expenses/);
});

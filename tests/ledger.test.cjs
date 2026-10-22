/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
function loadTypeScript(file) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)(require, module, module.exports);
  return module.exports;
}

const { buildLedgerEntries, summarizeLedger, calculateSupplierPayables } = loadTypeScript("lib/ledger.ts");

test("ledger builds verified customer credits and operational debits with a running balance", () => {
  const entries = buildLedgerEntries("tenant-a", {
    invoices: [{
      id: "inv-a", tenantId: "tenant-a", invoiceNumber: "INV-001", clientName: "Client A",
      totalAmount: 1000, paidAmount: 300, dueAmount: 700, status: "PARTIALLY_PAID", installments: [
        { id: "pay-a", invoiceId: "inv-a", amount: 300, paymentDate: "2026-09-10", method: "Cash", receiptNo: "REC-1", recordedBy: "Admin" },
      ],
    }],
    tourExpenses: [{ id: "cost-a", tenantId: "tenant-a", tourId: "tour-a", category: "FLIGHT", vendorName: "Airline", amount: 100, currency: "PKR", date: "2026-09-11", createdAt: "2026-09-11T00:00:00Z" }],
    officeExpenses: [{ id: "office-a", tenantId: "tenant-a", category: "RENT", vendorName: "Landlord", amount: 25, currency: "PKR", paymentMethod: "BANK_TRANSFER", paidAt: "2026-09-12", recordedByUserId: "admin", createdAt: "2026-09-12T00:00:00Z" }],
  });
  assert.deepEqual(entries.map((entry) => entry.type), ["CUSTOMER_PAYMENT", "SUPPLIER_PAYMENT", "OFFICE_EXPENSE"]);
  assert.deepEqual(summarizeLedger(entries), { credits: 300, debits: 125, netCash: 175 });
  assert.equal(entries.at(-1).balance, 175);
});

test("ledger and supplier payables isolate tenant records", () => {
  const expenses = [
    { id: "a", tenantId: "tenant-a", tourId: "tour-a", category: "HOTEL", vendorName: "Hotel A", amount: 400 },
    { id: "b", tenantId: "tenant-b", tourId: "tour-b", category: "HOTEL", vendorName: "Hotel B", amount: 9000 },
  ];
  assert.equal(buildLedgerEntries("tenant-a", { tourExpenses: expenses }).length, 1);
  assert.deepEqual(calculateSupplierPayables("tenant-a", expenses), { total: 400, count: 1, byVendor: { "Hotel A": 400 } });
});

test("pending payment claims do not create ledger credits", () => {
  const entries = buildLedgerEntries("tenant-a", { invoices: [{
    id: "inv-a", tenantId: "tenant-a", invoiceNumber: "INV-001", clientName: "Client A",
    totalAmount: 1000, paidAmount: 0, dueAmount: 1000, status: "UNPAID", installments: [],
  }] });
  assert.equal(entries.some((entry) => entry.type === "CUSTOMER_PAYMENT"), false);
});

test("disbursed payroll is represented as an employee debit", () => {
  const entries = buildLedgerEntries("tenant-a", { payrollRuns: [{
    id: "run-a", tenantId: "tenant-a", monthString: "September 2026", monthCode: "2026-09",
    totalGrossLiability: 1000, totalDeductions: 0, totalNetDisbursement: 900, status: "DISBURSED", generatedAt: "2026-09-30T10:00:00Z",
    items: [{ id: "item-a", employeeId: "emp-a", employeeCode: "WCH-EMP-001", employeeName: "Employee A", department: "OPERATIONS", designation: "Officer", basicSalary: 1000, allowances: 0, grossPay: 1000, workingDaysInMonth: 26, daysPresent: 26, unexcusedAbsences: 0, totalLateArrivals: 0, lateArrivalDeduction: 0, unpaidLeaveDeduction: 0, salaryAdvancesDeduction: 100, bonusesOrIncentives: 0, netPayableSalary: 900, paymentMethod: "CASH", bankName: "", bankAccountNumber: "", bankIban: "", paymentStatus: "PROCESSED" }],
  }] });
  assert.equal(entries[0].type, "PAYROLL_DISBURSEMENT");
  assert.equal(entries[0].debit, 900);
});

test("ledger route and context wiring are present", () => {
  const page = fs.readFileSync(path.join(root, "app/(dashboard)/ledger/page.tsx"), "utf8");
  const context = fs.readFileSync(path.join(root, "context/DataContext.tsx"), "utf8");
  assert.match(page, /Financial Ledger &amp; Departure ROI/);
  assert.match(page, /Supplier Payables/);
  assert.match(page, /Departure ROI/);
  assert.match(context, /ledgerEntries/);
});

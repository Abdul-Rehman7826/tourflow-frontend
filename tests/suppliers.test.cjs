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

const { canManageSuppliers, getSupplierPayableExposure, normalizeSupplierName } = loadTypeScript("lib/supplier-operations.ts");

test("supplier wholesale access is limited to agency admins and tour managers", () => {
  assert.equal(canManageSuppliers("AGENCY_ADMIN"), true);
  assert.equal(canManageSuppliers("TOUR_MANAGER"), true);
  for (const role of ["FRONT_DESK", "VISA_CONSULTANT", "HR_MANAGER", "EMPLOYEE"]) assert.equal(canManageSuppliers(role), false);
});

test("supplier payable exposure is tenant-scoped and ignores name formatting", () => {
  const expenses = [
    { tenantId: "tenant-a", vendorName: "  Atlas DMC ", amount: 120000 },
    { tenantId: "tenant-a", vendorName: "atlas dmc", amount: 35000 },
    { tenantId: "tenant-b", vendorName: "Atlas DMC", amount: 999999 },
    { tenantId: "tenant-a", vendorName: "Other Vendor", amount: 5000 },
  ];
  assert.equal(normalizeSupplierName(" Atlas DMC "), "atlas dmc");
  assert.equal(getSupplierPayableExposure("tenant-a", "ATLAS DMC", expenses), 155000);
  assert.equal(getSupplierPayableExposure("tenant-b", "Atlas DMC", expenses), 999999);
});

test("supplier contract, centralized state, route guard, and workspace are wired", () => {
  const types = fs.readFileSync(path.join(root, "types/erp.ts"), "utf8");
  const context = fs.readFileSync(path.join(root, "context/DataContext.tsx"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/(dashboard)/layout.tsx"), "utf8");
  const page = fs.readFileSync(path.join(root, "app/(dashboard)/suppliers/page.tsx"), "utf8");
  assert.match(types, /interface Supplier/);
  assert.match(types, /SupplierCategory/);
  assert.match(context, /createSupplier/);
  assert.match(context, /updateSupplier/);
  assert.match(context, /deleteSupplier/);
  assert.match(context, /suppliers: scoped/);
  assert.match(layout, /prefix: "\/suppliers", permission: "tours"/);
  assert.match(page, /Suppliers &amp; Partner DMCs/);
  assert.match(page, /Add Supplier/);
});

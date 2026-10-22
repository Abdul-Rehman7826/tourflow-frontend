const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backendRoot = path.resolve(root, '..', 'backend');

test('Phase 5 SQL migration defines suppliers, tour_expenses, and office_expenses', () => {
  const sqlFile = path.join(backendRoot, 'database', 'migrations', '012_suppliers_expenses_and_ledger.sql');
  assert.ok(fs.existsSync(sqlFile), '012_suppliers_expenses_and_ledger.sql exists');

  const content = fs.readFileSync(sqlFile, 'utf8');
  assert.match(content, /CREATE TABLE IF NOT EXISTS suppliers/);
  assert.match(content, /CREATE TABLE IF NOT EXISTS tour_expenses/);
  assert.match(content, /CREATE TABLE IF NOT EXISTS office_expenses/);
  assert.match(content, /tenant_id VARCHAR\(36\) NOT NULL/);
  assert.match(content, /CONSTRAINT fk_suppliers_tenant/);
  assert.match(content, /CONSTRAINT fk_tour_expenses_tenant/);
  assert.match(content, /CONSTRAINT fk_office_expenses_tenant/);
});

test('Backend migrate.php registers suppliers, tour_expenses, and office_expenses', () => {
  const migrateFile = path.join(backendRoot, 'scripts', 'migrate.php');
  const content = fs.readFileSync(migrateFile, 'utf8');
  assert.match(content, /'suppliers'/);
  assert.match(content, /'tour_expenses'/);
  assert.match(content, /'office_expenses'/);
});

test('FinanceService.php implements full supplier directory, tour costing, overheads, and dynamic ledger', () => {
  const serviceFile = path.join(backendRoot, 'src', 'Finance', 'FinanceService.php');
  assert.ok(fs.existsSync(serviceFile), 'FinanceService.php exists');

  const content = fs.readFileSync(serviceFile, 'utf8');
  assert.match(content, /class FinanceService/);
  assert.match(content, /function listSuppliers/);
  assert.match(content, /function getSupplier/);
  assert.match(content, /function createSupplier/);
  assert.match(content, /function updateSupplier/);
  assert.match(content, /function deleteSupplier/);
  assert.match(content, /function listTourExpenses/);
  assert.match(content, /function createTourExpense/);
  assert.match(content, /function deleteTourExpense/);
  assert.match(content, /function listOfficeExpenses/);
  assert.match(content, /function createOfficeExpense/);
  assert.match(content, /function deleteOfficeExpense/);
  assert.match(content, /function getOfficeExpenseSummary/);
  assert.match(content, /function getLedgerEntries/);
  assert.match(content, /function getLedgerSummary/);
  assert.match(content, /function getTourFinancials/);

  // Referential audit protection check: blocks deleting supplier if historical tour cost exists
  assert.match(content, /This supplier has linked tour cost records\. Mark it inactive instead of deleting it\./);
  // Multi-tenant check
  assert.match(content, /tenant_id = :tenant_id/);
});

test('Public router index.php handles Phase 5 Finance routes', () => {
  const indexFile = path.join(backendRoot, 'public', 'index.php');
  const content = fs.readFileSync(indexFile, 'utf8');

  assert.ok(content.includes("use TourFlow\\Finance\\FinanceService;"));
  assert.ok(content.includes("$finance = new FinanceService();"));
  assert.ok(content.includes("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS"));
  assert.ok(content.includes("'/api/v1/suppliers'"));
  assert.ok(content.includes("/suppliers/([^/]+)/exposure"));
  assert.ok(content.includes("/tours/([^/]+)/expenses"));
  assert.ok(content.includes("'/api/v1/expenses/office'"));
  assert.ok(content.includes("'/api/v1/expenses/office/summary'"));
  assert.ok(content.includes("'/api/v1/ledger'"));
  assert.ok(content.includes("'/api/v1/ledger/summary'"));
  assert.ok(content.includes("'/api/v1/ledger/tour-financials'"));
});

test('Frontend supplier-api.ts and expense-api.ts exist with typed methods', () => {
  const supplierApi = path.join(root, 'lib', 'supplier-api.ts');
  const expenseApi = path.join(root, 'lib', 'expense-api.ts');

  assert.ok(fs.existsSync(supplierApi), 'supplier-api.ts exists');
  assert.ok(fs.existsSync(expenseApi), 'expense-api.ts exists');

  const sContent = fs.readFileSync(supplierApi, 'utf8');
  assert.match(sContent, /export async function fetchSuppliers/);
  assert.match(sContent, /export async function getSupplier/);
  assert.match(sContent, /export async function createSupplierApi/);
  assert.match(sContent, /export async function updateSupplierApi/);
  assert.match(sContent, /export async function deleteSupplierApi/);
  assert.match(sContent, /export async function getSupplierExposure/);

  const eContent = fs.readFileSync(expenseApi, 'utf8');
  assert.match(eContent, /export async function fetchTourExpenses/);
  assert.match(eContent, /export async function createTourExpenseApi/);
  assert.match(eContent, /export async function deleteTourExpenseApi/);
  assert.match(eContent, /export async function fetchOfficeExpenses/);
  assert.match(eContent, /export async function createOfficeExpenseApi/);
  assert.match(eContent, /export async function deleteOfficeExpenseApi/);
  assert.match(eContent, /export async function fetchOfficeExpenseSummary/);
  assert.match(eContent, /export async function fetchLedgerEntries/);
  assert.match(eContent, /export async function fetchLedgerSummary/);
  assert.match(eContent, /export async function fetchTourFinancials/);
});

test('DataContext syncs Phase 5 live data in background with optimistic state', () => {
  const contextFile = path.join(root, 'context', 'DataContext.tsx');
  const content = fs.readFileSync(contextFile, 'utf8');

  assert.match(content, /import\("@\/lib\/supplier-api"\)\.then/);
  assert.match(content, /createSupplierApi/);
  assert.match(content, /updateSupplierApi/);
  assert.match(content, /deleteSupplierApi/);
  assert.match(content, /import\("@\/lib\/expense-api"\)\.then/);
  assert.match(content, /createTourExpenseApi/);
  assert.match(content, /deleteTourExpenseApi/);
  assert.match(content, /createOfficeExpenseApi/);
  assert.match(content, /deleteOfficeExpenseApi/);
});

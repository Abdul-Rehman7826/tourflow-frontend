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

const { canAccessDocumentVault, getVaultDocumentStatus } = loadTypeScript("lib/document-vault.ts");

test("expired documents become compliance exceptions while rejected records stay rejected", () => {
  assert.equal(getVaultDocumentStatus({ expiryDate: "2026-09-16", verificationStatus: "VERIFIED" }, "2026-09-17"), "EXPIRED");
  assert.equal(getVaultDocumentStatus({ expiryDate: "2026-09-16", verificationStatus: "REJECTED" }, "2026-09-17"), "REJECTED");
  assert.equal(getVaultDocumentStatus({ expiryDate: "2026-12-31", verificationStatus: "VERIFIED" }, "2026-09-17"), "VERIFIED");
});

test("document vault access is limited to agency admin and visa consultant", () => {
  assert.equal(canAccessDocumentVault("AGENCY_ADMIN"), true);
  assert.equal(canAccessDocumentVault("VISA_CONSULTANT"), true);
  for (const role of ["FRONT_DESK", "TOUR_MANAGER", "HR_MANAGER", "EMPLOYEE"]) assert.equal(canAccessDocumentVault(role), false);
});

test("document vault contracts, route and centralized handlers are wired", () => {
  const types = fs.readFileSync(path.join(root, "types/erp.ts"), "utf8");
  const page = fs.readFileSync(path.join(root, "app/(dashboard)/documents/page.tsx"), "utf8");
  const context = fs.readFileSync(path.join(root, "context/DataContext.tsx"), "utf8");
  const layout = fs.readFileSync(path.join(root, "app/(dashboard)/layout.tsx"), "utf8");
  assert.match(types, /interface VaultDocument/);
  assert.match(page, /Secure Document Vault/);
  assert.match(page, /Upload Document/);
  assert.match(context, /uploadVaultDocument/);
  assert.match(context, /verifyVaultDocument/);
  assert.match(context, /deleteVaultDocument/);
  assert.match(layout, /prefix: "\/documents", permission: "visaPipeline"/);
});

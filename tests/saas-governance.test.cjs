/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, "../lib/saas-governance.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const loaded = { exports: {} };
new Function("module", "exports", source)(loaded, loaded.exports);

const { normalizeSubdomain, isValidSubdomain, licenseDaysRemaining, isModuleEnabled, homeRouteForRole, canAccessSuperAdmin } = loaded.exports;
const routeSource = ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, "../lib/route-access.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const routeLoaded = { exports: {} };
new Function("module", "exports", routeSource)(routeLoaded, routeLoaded.exports);
const { isPublicRoute } = routeLoaded.exports;

test("normalizes and validates agency subdomains", () => {
  assert.equal(normalizeSubdomain("  World Class Travels! "), "world-class-travels");
  assert.equal(isValidSubdomain("world-class-travels"), true);
  assert.equal(isValidSubdomain("-bad--slug"), false);
});

test("computes trial days using UTC calendar dates", () => {
  const today = new Date("2026-10-01T12:00:00Z");
  assert.equal(licenseDaysRemaining("2026-10-03", today), 2);
  assert.equal(licenseDaysRemaining("2026-09-30", today), -1);
  assert.equal(licenseDaysRemaining(null, today), null);
});

test("requires an explicit enabled module flag", () => {
  assert.equal(isModuleEnabled({ crm: true }, "crm"), true);
  assert.equal(isModuleEnabled({ crm: true }, "payroll"), false);
  assert.equal(isModuleEnabled({ visa: false }, "visa"), false);
});

test("routes roles to isolated workspaces and protects governance", () => {
  assert.equal(homeRouteForRole("SUPER_ADMIN"), "/super-admin/tenants");
  assert.equal(homeRouteForRole("AGENCY_ADMIN"), "/dashboard");
  assert.equal(homeRouteForRole("FRONT_DESK"), "/payslips");
  assert.equal(canAccessSuperAdmin("SUPER_ADMIN"), true);
  assert.equal(canAccessSuperAdmin("AGENCY_ADMIN"), false);
  assert.equal(canAccessSuperAdmin(undefined), false);
});

test("keeps landing and onboarding public without widening protected prefixes", () => {
  assert.equal(isPublicRoute("/"), true);
  assert.equal(isPublicRoute("/signup"), true);
  assert.equal(isPublicRoute("/reset-password"), true);
  assert.equal(isPublicRoute("/admin/login"), true);
  assert.equal(isPublicRoute("/attendance/scan"), true);
  assert.equal(isPublicRoute("/dashboard"), false);
  assert.equal(isPublicRoute("/super-admin/tenants"), false);
  assert.equal(isPublicRoute("/login-imposter"), false);
});

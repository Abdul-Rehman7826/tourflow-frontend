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
      try {
        return require(name);
      } catch {
        throw new Error(`Unexpected runtime dependency ${name} in ${file}`);
      }
    },
    module,
    module.exports,
  );
  return module.exports;
}

const screenAccess = loadTypeScript("lib/screen-access.ts");
const attendanceOps = loadTypeScript("lib/attendance-operations.ts");
const demoData = loadTypeScript("lib/demo-data.ts", {
  "@/lib/screen-access": screenAccess,
  "@/lib/attendance-operations": attendanceOps,
});
const profileSession = loadTypeScript("lib/profile-session.ts");
const authLib = loadTypeScript("lib/auth.ts");

const demoAuth = loadTypeScript("lib/demo-auth.ts", {
  "@/lib/demo-data": demoData,
  "@/lib/screen-access": screenAccess,
  "@/lib/profile-session": profileSession,
  "@/lib/auth": authLib,
  "@/context/RoleContext": {},
  "@/components/auth/ProfilePinModal": {},
});

test("DEMO-01: Demo accounts define all 6 core ERP roles", () => {
  const roles = demoAuth.DEMO_ACCOUNTS.map((a) => a.role);
  assert.ok(roles.includes("AGENCY_ADMIN"), "Must have AGENCY_ADMIN");
  assert.ok(roles.includes("FRONT_DESK"), "Must have FRONT_DESK");
  assert.ok(roles.includes("TOUR_MANAGER"), "Must have TOUR_MANAGER");
  assert.ok(roles.includes("VISA_CONSULTANT"), "Must have VISA_CONSULTANT");
  assert.ok(roles.includes("HR_MANAGER"), "Must have HR_MANAGER");
  assert.ok(roles.includes("SUPER_ADMIN"), "Must have SUPER_ADMIN");

  for (const account of demoAuth.DEMO_ACCOUNTS) {
    assert.ok(account.email.includes("@"), `Account ${account.id} must have valid email`);
    assert.strictEqual(account.quickPin, "1234", `Account ${account.id} must use universal demo pin 1234`);
    assert.ok(account.password.length >= 8, `Account ${account.id} password must be non-empty`);
    assert.ok(account.keyPermissions.length > 0, `Account ${account.id} must describe key permissions`);
  }
});

test("DEMO-02: JWT token generator produces compliant 3-part base64url tokens", () => {
  const token = demoAuth.createDemoJwtToken({
    sub: "emp-001",
    role: "AGENCY_ADMIN",
    tenant_id: "tenant-world-class",
    token_kind: "profile",
    email: "admin@worldclassholidays.org",
  });

  const parts = token.split(".");
  assert.strictEqual(parts.length, 3, "JWT must consist of header.payload.signature");

  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  assert.strictEqual(payload.sub, "emp-001");
  assert.strictEqual(payload.role, "AGENCY_ADMIN");
  assert.strictEqual(payload.tenant_id, "tenant-world-class");
  assert.strictEqual(payload.token_kind, "profile");
  assert.ok(payload.exp > payload.iat, "Expiry must be in the future");
});

test("DEMO-03: Demo ERP datasets seed with complete operational records", () => {
  assert.strictEqual(demoData.DEMO_SHIFTS.length, 3, "Must have 3 operational shifts (Morning, General, Evening)");
  assert.strictEqual(demoData.DEMO_EMPLOYEES.length, 6, "Must have 6 operational employee records");
  assert.strictEqual(demoData.DEMO_SUPPLIERS.length, 6, "Must have 6 premier suppliers");
  assert.strictEqual(demoData.DEMO_OFFICE_EXPENSES.length, 6, "Must have 6 operational office expenses");
  assert.strictEqual(demoData.DEMO_VAULT_DOCUMENTS.length, 6, "Must have 6 custody vault records");
  assert.strictEqual(demoData.DEMO_PAYROLL_RUNS.length, 1, "Must have 1 finalized historical payroll run");
  assert.strictEqual(demoData.DEMO_PAYROLL_RUNS[0].items.length, 6, "Payroll run must disburse for all 6 employees");
});

test("DEMO-04: getDemoAgencyProfiles provides workstation-ready staff cards", () => {
  const profiles = demoAuth.getDemoAgencyProfiles();
  assert.ok(profiles.length >= 5, "Workstation profiles must cover agency staff roles");
  for (const profile of profiles) {
    assert.ok(profile.id, "Profile must have ID");
    assert.ok(profile.full_name, "Profile must have full name");
    assert.strictEqual(profile.has_pin, true, "Profile must be PIN secured");
  }
});

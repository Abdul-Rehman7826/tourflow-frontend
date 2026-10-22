/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = ts.transpileModule(
  fs.readFileSync(path.resolve(__dirname, "../lib/profile-session.ts"), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const profileSession = { exports: {} };
new Function("module", "exports", source)(profileSession, profileSession.exports);

test("Quick PIN accepts exactly four digits", () => {
  assert.equal(profileSession.exports.PIN_PATTERN.test("0427"), true);
  for (const invalid of ["123", "12345", "12a4", " 1234", "1234 "]) {
    assert.equal(profileSession.exports.PIN_PATTERN.test(invalid), false);
  }
});

test("inactivity lock duration is exactly 30 minutes", () => {
  assert.equal(profileSession.exports.INACTIVITY_TIMEOUT_MS, 1_800_000);
});

test("seven-day terminal session resolves to 604800 seconds", () => {
  assert.equal(profileSession.exports.terminalCookieMaxAge(7), 604_800);
});

test("profile roles route to their operational workspace", () => {
  assert.equal(profileSession.exports.profileHomeRoute("AGENCY_ADMIN"), "/dashboard");
  assert.equal(profileSession.exports.profileHomeRoute("FRONT_DESK"), "/leads");
});

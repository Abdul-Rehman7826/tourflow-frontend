const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backendRoot = path.resolve(root, '..', 'backend');

test('Phase 6 SQL migration defines agency_settings with strict constraints and mediumtext logos', () => {
  const sqlFile = path.join(backendRoot, 'database', 'migrations', '013_agency_settings_and_governance.sql');
  assert.ok(fs.existsSync(sqlFile), '013_agency_settings_and_governance.sql exists');

  const content = fs.readFileSync(sqlFile, 'utf8');
  assert.match(content, /CREATE TABLE IF NOT EXISTS agency_settings/i);
  assert.match(content, /tenant_id VARCHAR\(36\) NOT NULL/i);
  assert.match(content, /dark_logo MEDIUMTEXT NULL/i);
  assert.match(content, /light_logo MEDIUMTEXT NULL/i);
  assert.match(content, /invoice_template VARCHAR\(32\) NOT NULL DEFAULT 'minimal'/i);
  assert.match(content, /accent VARCHAR\(10\) NOT NULL DEFAULT '#7C3AED'/i);
  assert.match(content, /decimals TINYINT\(1\) NOT NULL DEFAULT 2/i);
  assert.match(content, /visa_markup DECIMAL\(10, 2\) NOT NULL DEFAULT 0\.00/i);
  assert.match(content, /UNIQUE KEY uq_agency_settings_tenant \(tenant_id\)/i);
  assert.match(content, /CONSTRAINT fk_agency_settings_tenant FOREIGN KEY \(tenant_id\) REFERENCES tenants \(id\) ON DELETE CASCADE/i);
});

test('Backend migrate.php registers agency_settings in required tables', () => {
  const migrateFile = path.join(backendRoot, 'scripts', 'migrate.php');
  const content = fs.readFileSync(migrateFile, 'utf8');
  assert.match(content, /'agency_settings'/);
});

test('AgencySettingsService.php implements full white-label profile management, validation, and storage guard', () => {
  const serviceFile = path.join(backendRoot, 'src', 'Settings', 'AgencySettingsService.php');
  assert.ok(fs.existsSync(serviceFile), 'AgencySettingsService.php exists');

  const content = fs.readFileSync(serviceFile, 'utf8');
  assert.match(content, /class AgencySettingsService/);
  assert.match(content, /function getSettings/);
  assert.match(content, /function saveSettings/);
  assert.match(content, /function updateTerminalSessionExpiry/);
  assert.match(content, /function getLicenseStatus/);

  // Storage guard: validates logo size threshold (max 500 KB binary / 750k chars)
  assert.match(content, /Dark logo exceeds 500 KB storage limit/);
  assert.match(content, /Light logo exceeds 500 KB storage limit/);

  // Validation: hex color regex
  assert.match(content, /\^#\[0-9a-fA-F\]\{6\}\$/);

  // Multi-tenant isolation: tenant_id binding
  assert.match(content, /tenant_id = :tenant_id/);
});

test('TenantAccess.php enforces 7-day grace period with telemetry headers and blocks expired tenants', () => {
  const accessFile = path.join(backendRoot, 'src', 'Auth', 'TenantAccess.php');
  assert.ok(fs.existsSync(accessFile), 'TenantAccess.php exists');

  const content = fs.readFileSync(accessFile, 'utf8');
  assert.match(content, /X-License-Grace-Period: Active/);
  assert.match(content, /X-License-Grace-Days-Remaining/);
  assert.match(content, /subscription_status = 'GRACE_PERIOD'/);
  assert.match(content, /subscription_status = 'SUSPENDED'/);
  assert.match(content, /TENANT_LICENSE_EXPIRED/);
});

test('Public router index.php handles Phase 6 Agency Settings and License routes', () => {
  const indexFile = path.join(backendRoot, 'public', 'index.php');
  const content = fs.readFileSync(indexFile, 'utf8');

  assert.ok(content.includes("use TourFlow\\Settings\\AgencySettingsService;"), 'Imports AgencySettingsService');
  assert.ok(content.includes("$settings = new AgencySettingsService();"), 'Instantiates AgencySettingsService');
  assert.ok(content.includes("'/api/v1/agency/settings'"), 'Routes /api/v1/agency/settings');
  assert.ok(content.includes("'/api/v1/agency/terminal-session-expiry'"), 'Routes /api/v1/agency/terminal-session-expiry');
  assert.ok(content.includes("'/api/v1/agency/license-status'"), 'Routes /api/v1/agency/license-status');
});

test('Frontend settings-api.ts exists with typed endpoints', () => {
  const settingsApi = path.join(root, 'lib', 'settings-api.ts');
  assert.ok(fs.existsSync(settingsApi), 'settings-api.ts exists');

  const content = fs.readFileSync(settingsApi, 'utf8');
  assert.match(content, /export async function fetchAgencySettingsApi/);
  assert.match(content, /export async function saveAgencySettingsApi/);
  assert.match(content, /export async function updateTerminalSessionExpiryApi/);
  assert.match(content, /export async function fetchLicenseStatusApi/);
  assert.match(content, /export interface TenantLicenseStatus/);
});

test('Frontend ThemeContext.tsx synchronizes settings with remote API', () => {
  const themeContextFile = path.join(root, 'context', 'ThemeContext.tsx');
  const content = fs.readFileSync(themeContextFile, 'utf8');

  assert.match(content, /fetchAgencySettingsApi/);
  assert.match(content, /saveAgencySettingsApi/);
});

test('Frontend SettingsWorkspace.tsx connects terminal session security to updateTerminalSessionExpiryApi', () => {
  const workspaceFile = path.join(root, 'components', 'settings', 'SettingsWorkspace.tsx');
  const content = fs.readFileSync(workspaceFile, 'utf8');

  assert.match(content, /updateTerminalSessionExpiryApi/);
});

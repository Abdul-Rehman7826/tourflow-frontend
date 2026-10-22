const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const backendRoot = path.resolve(root, '..', 'backend');

test('AttendanceService implements public finalizeTenant method for automated CLI and cron processing', () => {
  const serviceFile = path.join(backendRoot, 'src', 'Attendance', 'AttendanceService.php');
  assert.ok(fs.existsSync(serviceFile), 'AttendanceService.php exists');

  const content = fs.readFileSync(serviceFile, 'utf8');
  assert.match(content, /public function finalizeTenant\(string \$tenantId, string \$date, \?string \$actorUserId = null\): array/);
  assert.match(content, /public function finalize\(array \$payload\): array/);
  assert.match(content, /return \$this->finalizeTenant\(\$tenantId, \$date, \(string\) \$principal\['user'\]\['id'\]\);/);

  // Absence resolution
  assert.match(content, /'AUTO_FINALIZER'/);
  assert.match(content, /'ABSENT'/);

  // Leave resolution
  assert.match(content, /'ON_LEAVE'/);
  assert.match(content, /'LEAVE_FINALIZED'/);

  // Missing checkout audit without fabricating checkout timestamps
  assert.match(content, /'MISSING_CHECKOUT'/);
});

test('cron_attendance_finalizer.php CLI script exists and implements multi-tenant automated daily cycle', () => {
  const cronScript = path.join(backendRoot, 'scripts', 'cron_attendance_finalizer.php');
  assert.ok(fs.existsSync(cronScript), 'cron_attendance_finalizer.php exists');

  const content = fs.readFileSync(cronScript, 'utf8');
  assert.match(content, /PHP_SAPI !== 'cli'/);
  assert.match(content, /UPPER\(subscription_plan\) <> 'PLATFORM'/);
  assert.match(content, /finalizeTenant\(\$tenantId, \$targetDate, null\)/);
  assert.match(content, /Asia\/Karachi/);
  assert.match(content, /TourFlow Daily Attendance Automated Finalizer/);
  assert.match(content, /absent_records_created/);
  assert.match(content, /leave_records_resolved/);
  assert.match(content, /open_check_ins_flagged/);
});

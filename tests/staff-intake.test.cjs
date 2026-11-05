const test = require('node:test');
const assert = require('node:assert/strict');

function formatCnic(value) {
  const digits = value.replace(/\D/g, "").slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

test('formatCnic formats Pakistani CNIC correctly with standard hyphen masking', () => {
  assert.equal(formatCnic(''), '');
  assert.equal(formatCnic('3'), '3');
  assert.equal(formatCnic('35201'), '35201');
  assert.equal(formatCnic('352011'), '35201-1');
  assert.equal(formatCnic('352011234567'), '35201-1234567');
  assert.equal(formatCnic('3520112345671'), '35201-1234567-1');
  assert.equal(formatCnic('35201-1234567-1'), '35201-1234567-1');
  assert.equal(formatCnic('35201-1234567-19999'), '35201-1234567-1');
  assert.equal(formatCnic('abc-35201-xyz-1234567-1'), '35201-1234567-1');
});

test('CNIC validation requires exact 13 digits and matches standard format', () => {
  const cnicRegex = /^\d{5}-\d{7}-\d$/;
  
  // Incomplete CNIC
  assert.equal(cnicRegex.test(formatCnic('35201')), false);
  assert.equal(cnicRegex.test(formatCnic('35201123456')), false);
  assert.equal(formatCnic('35201123456').replace(/\D/g, '').length === 13, false);

  // Exact 13 digits
  const validFormatted = formatCnic('3520112345671');
  assert.equal(validFormatted, '35201-1234567-1');
  assert.equal(validFormatted.replace(/\D/g, '').length, 13);
  assert.equal(cnicRegex.test(validFormatted), true);
});

function parseNumericInput(raw, max) {
  const clean = raw.replace(/\D/g, "");
  if (!clean) return "";
  const noLeadingZero = clean.replace(/^0+(?=\d)/, "");
  if (max !== undefined) {
    const num = Number(noLeadingZero);
    if (num > max) return String(max);
  }
  return noLeadingZero;
}

test('parseNumericInput cleans leading zeros and allows clearing to empty string', () => {
  // Clearing input returns empty string, not sticky 0
  assert.equal(parseNumericInput(''), '');

  // Single zero remains zero
  assert.equal(parseNumericInput('0'), '0');

  // Double zero cleans to single zero
  assert.equal(parseNumericInput('00'), '0');

  // Typing after zero strips the leading zero instead of leaving '04' or '0454'
  assert.equal(parseNumericInput('04'), '4');
  assert.equal(parseNumericInput('0454'), '454');
  assert.equal(parseNumericInput('0075000'), '75000');

  // Normal numbers preserved
  assert.equal(parseNumericInput('75000'), '75000');
  assert.equal(parseNumericInput('15000'), '15000');

  // Maximum caps for leave days
  assert.equal(parseNumericInput('14', 60), '14');
  assert.equal(parseNumericInput('75', 60), '60');
  assert.equal(parseNumericInput('8', 30), '8');
  assert.equal(parseNumericInput('35', 30), '30');
});

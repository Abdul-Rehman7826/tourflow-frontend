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

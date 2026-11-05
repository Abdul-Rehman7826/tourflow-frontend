const test = require('node:test');
const assert = require('node:assert/strict');

// 1. Pax count stepper & numeric input rules
function parsePaxInput(raw) {
  if (raw === "") return "";
  const cleanDigits = raw.replace(/\D/g, "");
  if (!cleanDigits) return "";
  const num = Math.min(100, Math.max(1, parseInt(cleanDigits, 10)));
  return String(num);
}

function adjustPax(currentVal, delta) {
  const current = parseInt(currentVal, 10) || 1;
  const next = Math.max(1, Math.min(100, current + delta));
  return String(next);
}

function resolveEffectivePax(raw) {
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) || parsed < 1 ? 1 : Math.min(100, parsed);
}

test('Lead Intake Pax count defaults to 1 and enforces stepper bounds (1 to 100)', () => {
  // Default is 1
  const defaultPax = "1";
  assert.equal(resolveEffectivePax(defaultPax), 1);

  // Decreasing below 1 stays at 1
  assert.equal(adjustPax("1", -1), "1");
  assert.equal(adjustPax("0", -1), "1");

  // Increasing pax works smoothly
  assert.equal(adjustPax("1", 1), "2");
  assert.equal(adjustPax("2", 1), "3");
  assert.equal(adjustPax("5", -1), "4");

  // Upper bound capped at 100
  assert.equal(adjustPax("100", 1), "100");
  assert.equal(adjustPax("99", 5), "100");

  // Empty string or backspaced field resolves to safe fallback 1
  assert.equal(resolveEffectivePax(""), 1);
  assert.equal(resolveEffectivePax("0"), 1);
});

test('parsePaxInput avoids sticky zero and handles manual typing cleanly', () => {
  // Clearing input returns empty string (allows user to retype freely)
  assert.equal(parsePaxInput(""), "");

  // Typing a number directly
  assert.equal(parsePaxInput("3"), "3");
  assert.equal(parsePaxInput("14"), "14");

  // Strips non-digits
  assert.equal(parsePaxInput("3pax"), "3");
  assert.equal(parsePaxInput("abc"), "");

  // Exceeding 100 caps at 100
  assert.equal(parsePaxInput("150"), "100");
});

// 2. Field validation rules
function validateLeadIntake(fields) {
  const errors = {};

  // Full name
  if (!fields.fullName || !fields.fullName.trim()) {
    errors.fullName = "Traveler full name is required";
  } else if (fields.fullName.trim().length < 2) {
    errors.fullName = "Full name must be at least 2 characters";
  } else if (!/[a-zA-Z]/.test(fields.fullName)) {
    errors.fullName = "Full name must contain alphabetical characters";
  }

  // Phone
  const digits = (fields.phone || "").replace(/\D/g, "");
  if (!digits) {
    errors.phone = "Phone / WhatsApp contact number is required";
  } else if (digits.length < 7) {
    errors.phone = "Valid contact number must have at least 7 digits";
  }

  // Email (optional, but validated if present)
  if (fields.email && fields.email.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      errors.email = "Please enter a valid email address (e.g. name@example.com)";
    }
  }

  // Destination / Package target offer
  if (!fields.destinationInterest || !fields.destinationInterest.trim()) {
    errors.destinationInterest = "Destination or package offer is required";
  } else if (fields.destinationInterest.trim().length < 2) {
    errors.destinationInterest = "Please specify a destination or package";
  }

  // Pax count
  const parsedPax = parseInt(fields.groupSize, 10);
  if (!fields.groupSize || isNaN(parsedPax) || parsedPax < 1) {
    errors.groupSize = "Pax count must be at least 1";
  } else if (parsedPax > 100) {
    errors.groupSize = "Pax count cannot exceed 100";
  }

  // Follow-up date
  if (!fields.followUpDate || isNaN(Date.parse(fields.followUpDate))) {
    errors.followUpDate = "Scheduled callback date is required";
  }

  // Assigned rep
  if (!fields.assignedTo || !fields.assignedTo.trim()) {
    errors.assignedTo = "Please select an assigned Front Desk representative";
  }

  return errors;
}

test('Lead intake validation blocks empty or invalid submissions', () => {
  const emptyForm = {
    fullName: "",
    phone: "",
    email: "",
    destinationInterest: "",
    groupSize: "",
    followUpDate: "",
    assignedTo: "",
  };

  const errors = validateLeadIntake(emptyForm);
  assert.equal(errors.fullName, "Traveler full name is required");
  assert.equal(errors.phone, "Phone / WhatsApp contact number is required");
  assert.equal(errors.destinationInterest, "Destination or package offer is required");
  assert.equal(errors.groupSize, "Pax count must be at least 1");
  assert.equal(errors.followUpDate, "Scheduled callback date is required");
  assert.equal(errors.assignedTo, "Please select an assigned Front Desk representative");

  // Invalid email format
  const invalidEmailForm = {
    ...emptyForm,
    fullName: "Kamran Ali",
    phone: "03001234567",
    destinationInterest: "Europe 5-Country Grand Tour",
    groupSize: "1",
    followUpDate: "2026-11-10",
    assignedTo: "Fiza Salman",
    email: "not-an-email",
  };
  const emailErrors = validateLeadIntake(invalidEmailForm);
  assert.equal(emailErrors.email, "Please enter a valid email address (e.g. name@example.com)");

  // Short phone number
  const shortPhoneForm = {
    ...invalidEmailForm,
    email: "kamran@gmail.com",
    phone: "123",
  };
  const phoneErrors = validateLeadIntake(shortPhoneForm);
  assert.equal(phoneErrors.phone, "Valid contact number must have at least 7 digits");

  // Valid submission passes with 0 errors
  const validForm = {
    fullName: "Kamran Ali",
    phone: "3001234567",
    email: "kamran@gmail.com",
    destinationInterest: "Europe 5-Country Grand Tour (15 Days)",
    groupSize: "1",
    followUpDate: "2026-11-10",
    assignedTo: "Fiza Salman",
  };
  const validErrors = validateLeadIntake(validForm);
  assert.equal(Object.keys(validErrors).length, 0);
});

// 3. Offer calculation per Pax
function calculateOfferTotal(pricePerPax, paxCount) {
  return pricePerPax * paxCount;
}

test('Offer calculations scale accurately with passenger pax', () => {
  const europeRate = 850000;
  assert.equal(calculateOfferTotal(europeRate, 1), 850000);
  assert.equal(calculateOfferTotal(europeRate, 2), 1700000);
  assert.equal(calculateOfferTotal(europeRate, 4), 3400000);

  const umrahRate = 460000;
  assert.equal(calculateOfferTotal(umrahRate, 1), 460000);
  assert.equal(calculateOfferTotal(umrahRate, 3), 1380000);

  const visaRate = 95000;
  assert.equal(calculateOfferTotal(visaRate, 1), 95000);
  assert.equal(calculateOfferTotal(visaRate, 5), 475000);
});

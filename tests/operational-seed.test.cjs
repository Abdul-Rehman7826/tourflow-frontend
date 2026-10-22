const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const result = { exports: {} };
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(result.exports, name => dependencies[name]);
  return result.exports;
}
const source = load('data/operational-source.ts');
const seed = load('data/mockData.ts', { './operational-source': source });
const bookingOps = load('lib/booking-operations.ts', { '@/lib/lead-operations': load('lib/lead-operations.ts') });
const { reviewProof } = load('lib/payment-recovery.ts', { '@/lib/booking-operations': bookingOps });
const snapshot = () => ({ clients: seed.mockClients, leads: seed.mockLeads, bookings: seed.mockBookings, invoices: seed.mockInvoices, tours: seed.mockTours, passengers: seed.mockPassengers, paymentProofClaims: seed.mockPaymentProofClaims, recoveryCallLogs: seed.mockRecoveryCallLogs, duplicates: [], expenses: [], visaCases: [] });
test('every supplied booking has a client, invoice, and matching manifest seats', () => {
  for (const booking of seed.mockBookings) {
    assert.ok(seed.mockClients.some(c => c.id === booking.clientId && c.bookingIds.includes(booking.id)));
    assert.ok(seed.mockInvoices.some(i => i.id === booking.invoiceId && i.bookingId === booking.id));
    assert.equal(booking.travelers.length, booking.paxCount);
    assert.equal(seed.mockPassengers.filter(p => p.bookingId === booking.id).length, booking.paxCount);
    for (const traveler of booking.travelers) {
      assert.equal(traveler.bookingId, booking.id);
      if (traveler.assignedRoomId) assert.ok(seed.mockTours.find(t => t.id === booking.packageId).rooms.some(r => r.id === traveler.assignedRoomId && r.assignedTravelerIds.includes(traveler.id)));
    }
  }
  for (const tour of seed.mockTours) {
    assert.equal(tour.bookedSeats, seed.mockBookings.filter(b => b.packageId === tour.id).reduce((n, b) => n + b.paxCount, 0));
    assert.equal((Date.parse(tour.returnDate) - Date.parse(tour.departureDate)) / 86400000 + 1, tour.durationDays);
  }
});
test('invoices reconcile with receipts and milestones without dangling foreign keys', () => {
  for (const invoice of seed.mockInvoices) {
    assert.equal(invoice.paidAmount + invoice.dueAmount, invoice.totalAmount);
    assert.equal(invoice.installments.reduce((n, p) => n + p.amount, 0), invoice.paidAmount);
    assert.equal(invoice.milestones.reduce((n, m) => n + m.amount, 0), invoice.totalAmount);
    assert.ok(seed.mockClients.some(c => c.id === invoice.clientId));
    if (invoice.bookingId) assert.ok(seed.mockBookings.some(b => b.id === invoice.bookingId));
  }
  assert.equal(new Set(seed.mockInvoices.map(i => i.invoiceNumber)).size, seed.mockInvoices.length);
  assert.equal(seed.mockInvoices.find(i => i.id === 'inv-03').bookingId, undefined);
});
test('seed pending claim approves atomically and approved seed receipt cannot be replayed', () => {
  const state = snapshot();
  const admin = { id: 'staff-admin-01', name: 'Nadeem Akhtar', role: 'AGENCY_ADMIN', tenantId: 'tenant-world-class' };
  let counter = 0;
  const uuid = () => `test-${++counter}`;
  const next = reviewProof(state, admin, 'proof-01', 'APPROVE', '', 'Bank Transfer', '2026-09-12T12:00:00Z', uuid);
  assert.equal(next.invoices.find(i => i.id === 'inv-01').dueAmount, 380000);
  assert.equal(state.invoices.find(i => i.id === 'inv-01').dueAmount, 780000);
  assert.throws(() => reviewProof(state, admin, 'proof-02', 'APPROVE', '', 'Bank Transfer', '2026-09-12T12:00:00Z', uuid), /already/);
});
test('reconciled paid bookings can cancel and release their seats with a refund', () => {
  const state = snapshot();
  const next = bookingOps.cancelBookingTransaction(state, 'tenant-world-class', 'booking-01', { cancellationFeeRetained: 0, refundMethod: 'ORIGINAL_PAYMENT', reasonCategory: 'CLIENT_REQUEST' }, { id: 'staff-admin-01', role: 'AGENCY_ADMIN', tenantId: 'tenant-world-class' }, '2026-09-12T12:00:00Z', () => 'refund-test');
  assert.equal(next.tours.find(t => t.id === 'tour-wch-01').bookedSeats, 3);
  assert.equal(next.bookings.find(b => b.id === 'booking-01').refund.refundAmountIssued, 1700000);
});

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const result = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', 'require', source)(result.exports, name => dependencies[name]);
  return result.exports;
}
const leads = load('lib/lead-operations.ts');
const { createBookingDraft, confirmBookingTransaction, updateBookingTraveler } = load('lib/booking-operations.ts', { '@/lib/lead-operations': leads });
let sequence = 0;
const uuid = () => `id-${++sequence}`;
const now = '2026-09-12T12:00:00Z';
const fixture = () => ({
  clients: [{ id: 'client', tenantId: 'agency', leadId: 'old-lead', fullName: 'Returning Client', phone: '923001234567', conversion: { kind: 'CUSTOM_PACKAGE', description: 'Old holiday', rate: 100 }, total: 100 }],
  leads: [], duplicates: [], bookings: [], invoices: [], passengers: [], visaCases: [], expenses: [],
  tours: [{ id: 'tour', tenantId: 'agency', title: 'Departure', status: 'GUARANTEED', maxCapacity: 3, bookedSeats: 0 }],
});
const input = (pax = 1) => ({ clientId: 'client', assignedRep: 'Fatima', conversion: { kind: 'GROUP_TOUR', tourId: 'tour', pax, pricePerPerson: 100, deposit: 20 }, milestones: [
  { name: 'Token', amount: 20, dueDate: '2026-09-12' },
  { name: 'Balance', amount: pax * 100 - 20, dueDate: '2026-10-01' },
] });
const confirm = (state, payload, payment) => {
  const draft = createBookingDraft(state, 'agency', payload, now, uuid);
  return confirmBookingTransaction(draft.state, 'agency', draft.booking.id, 'Fatima', now, uuid, payment);
};
test('completing a reserved traveler updates the manifest without double counting seats', () => {
  const state = confirm(fixture(), input(2));
  const booking = state.bookings[0];
  const fields = { fullName: 'Test Traveler', passportNo: 'TEST123', passportExpiry: '2030-01-01' };
  const updated = updateBookingTraveler(state, 'agency', booking.id, booking.travelers[0].id, fields, now);
  const repeated = updateBookingTraveler(updated, 'agency', booking.id, booking.travelers[0].id, fields, now);
  assert.equal(repeated.tours[0].bookedSeats, state.tours[0].bookedSeats);
  assert.equal(repeated.bookings[0].paxCount, 2);
  assert.equal(repeated.bookings[0].travelers[0].isComplete, true);
  assert.equal(repeated.passengers.find(p => p.travelerId === booking.travelers[0].id).name, fields.fullName);
  assert.deepEqual(repeated.invoices, state.invoices);
});

test('repeat bookings reuse client, retain conversion, and allocate distinct seats and invoices', () => {
  const initial = fixture();
  const first = confirm(initial, input(), { amount: 20, method: 'Cheque', paymentDate: '2026-09-12' });
  const second = confirm(first, input());
  assert.equal(second.clients.length, 1);
  assert.deepEqual(second.clients, initial.clients);
  assert.equal(second.bookings.length, 2);
  assert.notEqual(second.bookings[0].bookingNumber, second.bookings[1].bookingNumber);
  assert.equal(second.bookings[0].leadId, undefined);
  assert.equal(second.tours[0].bookedSeats, 2);
  assert.equal(second.passengers.length, 2);
  assert.equal(first.invoices[0].paidAmount, 20);
  assert.equal(first.invoices[0].dueAmount, 80);
  assert.equal(first.invoices[0].status, 'PARTIALLY_PAID');
  assert.equal(initial.tours[0].bookedSeats, 0);
});
test('capacity and invalid payments leave original state untouched', () => {
  const state = fixture();
  const snapshot = JSON.stringify(state);
  assert.throws(() => confirm(state, input(4)), /seats/);
  assert.throws(() => confirm(state, input(), { amount: 101, method: 'Cash', paymentDate: '2026-09-12' }));
  assert.equal(JSON.stringify(state), snapshot);
});
test('visa rebooking uses new booking credentials without changing old client conversion', () => {
  const state = fixture();
  const next = confirm(state, { ...input(), conversion: { kind: 'VISA', country: 'UK', category: 'Visitor', serviceFee: 70, embassyCharges: 30 } });
  assert.equal(next.visaCases[0].country, 'UK');
  assert.equal(next.visaCases[0].visaType, 'Visitor');
  assert.equal(next.clients[0].conversion.kind, 'CUSTOM_PACKAGE');
});
test('cross-tenant client cannot be booked', () => {
  const state = fixture();
  state.clients[0].tenantId = 'other';
  assert.throws(() => confirm(state, input()), /Client not found/);
});

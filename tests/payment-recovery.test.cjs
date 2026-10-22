const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
function load(path, deps = {}) {
  const module = { exports: {} };
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(module.exports, name => deps[name]);
  return module.exports;
}
const bookings = load('lib/booking-operations.ts', { '@/lib/lead-operations': load('lib/lead-operations.ts') });
const { submitProof, reviewProof, appendRecoveryCall } = load('lib/payment-recovery.ts', { '@/lib/booking-operations': bookings });
const staff = { id: 'rep', name: 'Fatima', role: 'FRONT_DESK', tenantId: 'agency' };
const admin = { ...staff, id: 'admin', role: 'AGENCY_ADMIN' };
const now = '2026-09-12T12:00:00Z';
let n = 0;
const uuid = () => `id-${++n}`;
const fixture = () => ({ clients: [], leads: [], duplicates: [], bookings: [], tours: [], passengers: [], visaCases: [], expenses: [], invoices: [{ id: 'invoice', tenantId: 'agency', totalAmount: 100, paidAmount: 0, dueAmount: 100, status: 'UNPAID', installments: [], milestones: [] }] });
const input = { invoiceId: 'invoice', amount: 40, bankReference: 'BANK-123', screenshotUrl: 'data:image/png;base64,aGVsbG8=' };
test('submission changes no balance; approval settles once with audit identity', () => {
  const initial = fixture();
  const pending = submitProof(initial, staff, input, now, 'claim');
  assert.deepEqual(pending.invoices, initial.invoices);
  assert.equal(pending.paymentProofClaims[0].status, 'PENDING_VERIFICATION');
  assert.throws(() => reviewProof(pending, staff, 'claim', 'APPROVE', '', 'Bank Transfer', now, uuid), /restricted/);
  const approved = reviewProof(pending, admin, 'claim', 'APPROVE', '', 'Bank Transfer', now, uuid);
  assert.equal(approved.invoices[0].paidAmount, 40);
  assert.equal(approved.invoices[0].dueAmount, 60);
  assert.equal(approved.paymentProofClaims[0].verifiedByAdminId, 'admin');
  assert.equal(approved.invoices[0].installments.length, 1);
  assert.throws(() => reviewProof(approved, admin, 'claim', 'APPROVE', '', 'Bank Transfer', now, uuid), /already/);
});
test('rejection needs reason and leaves money unchanged', () => {
  const state = submitProof(fixture(), staff, input, now, 'claim');
  assert.throws(() => reviewProof(state, admin, 'claim', 'REJECT', '', 'Cash', now, uuid), /reason/);
  const rejected = reviewProof(state, admin, 'claim', 'REJECT', 'Reference not found', 'Cash', now, uuid);
  assert.deepEqual(rejected.invoices, state.invoices);
  assert.equal(rejected.paymentProofClaims[0].status, 'REJECTED');
});
test('duplicate references, overclaim, tenant mismatch, and stale approvals are blocked', () => {
  const pending = submitProof(fixture(), staff, input, now, 'claim');
  assert.throws(() => submitProof(pending, staff, input, now, 'duplicate'), /already/);
  assert.throws(() => submitProof(pending, staff, { ...input, amount: 80, bankReference: 'NEW' }, now, 'over'), /Pending/);
  assert.throws(() => submitProof(fixture(), { ...staff, tenantId: 'other' }, input, now, 'foreign'), /not found/);
  const cancelled = { ...pending, invoices: pending.invoices.map(i => ({ ...i, status: 'CANCELLED' })) };
  assert.throws(() => reviewProof(cancelled, admin, 'claim', 'APPROVE', '', 'Cash', now, uuid), /Cancelled/);
  assert.equal(cancelled.paymentProofClaims[0].status, 'PENDING_VERIFICATION');
});
test('recovery calls preserve author, callback and reverse chronological timeline', () => {
  const input = { invoiceId: 'invoice', outcome: 'PROMISED_PAYMENT', notes: 'Will pay tomorrow', callbackDate: '2026-09-13' };
  const first = appendRecoveryCall(fixture(), staff, input, now, 'first');
  const second = appendRecoveryCall(first, staff, input, now, 'second');
  assert.equal(second.recoveryCallLogs[0].id, 'second');
  assert.equal(second.recoveryCallLogs[0].staffName, 'Fatima');
  assert.equal(second.recoveryCallLogs[0].callbackDate, '2026-09-13');
  assert.throws(() => appendRecoveryCall(first, { ...staff, tenantId: 'other' }, input, now, 'bad'), /not found/);
});

test('approvals allocate cumulative credit oldest first and synchronize booking without double-counting spend', () => {
  const state = fixture();
  const milestones = [
    { id: 'late', title: 'Final', amount: 60, dueDate: '2026-11-01', status: 'Pending' },
    { id: 'early', title: 'Token', amount: 40, dueDate: '2026-09-01', status: 'Overdue' },
  ];
  state.invoices[0] = { ...state.invoices[0], bookingId: 'booking', clientId: 'client', milestones };
  state.bookings = [{ id: 'booking', tenantId: 'agency', status: 'CONFIRMED', milestones: milestones.map(m => ({ ...m, isPaid: false })) }];
  state.clients = [{ id: 'client', totalLifetimeSpend: 100 }];
  let next = submitProof(state, staff, { ...input, amount: 20 }, now, 'first');
  next = reviewProof(next, admin, 'first', 'APPROVE', '', 'Bank Transfer', now, uuid);
  assert.equal(next.bookings[0].paymentStatus, 'PARTIALLY_PAID');
  assert.equal(next.invoices[0].milestones[0].status, 'Overdue');
  next = submitProof(next, staff, { ...input, amount: 20, bankReference: 'SECOND' }, now, 'second');
  next = reviewProof(next, admin, 'second', 'APPROVE', '', 'Bank Transfer', now, uuid);
  assert.equal(next.invoices[0].milestones[0].id, 'early');
  assert.equal(next.invoices[0].milestones[0].status, 'Paid');
  assert.equal(next.bookings[0].milestones.find(m => m.id === 'early').isPaid, true);
  next = submitProof(next, staff, { ...input, amount: 60, bankReference: 'FINAL' }, now, 'final');
  next = reviewProof(next, admin, 'final', 'APPROVE', '', 'Bank Transfer', now, uuid);
  assert.equal(next.bookings[0].paymentStatus, 'PAID');
  assert.equal(next.invoices[0].dueAmount, 0);
  assert.equal(next.clients[0].totalLifetimeSpend, 100);
  assert.equal(new Set(next.invoices[0].installments.map(p => p.receiptNo)).size, 3);
});

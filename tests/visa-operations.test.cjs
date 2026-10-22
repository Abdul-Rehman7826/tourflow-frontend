const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const moduleExports = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('lib/visa-operations.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleExports, () => { throw new Error('Unexpected runtime dependency'); });
const { saveVisaCase, normalizeVisaCase, VISA_STAGES, bridgeGroupTourVisaCases, archiveVisaCase } = moduleExports;
const actor = { id: 'admin', name: 'Managing Director', role: 'AGENCY_ADMIN', tenantId: 'wch' };
const now = '2026-09-14T10:00:00Z';
let counter = 0;
const uuid = () => `id-${++counter}`;
const fixture = () => ({ clients: [{ id: 'client', tenantId: 'wch', fullName: 'Haris', phone: '03001234567' }], bookings: [], visaCases: [], invoices: [], leads: [], duplicates: [], tours: [], passengers: [], expenses: [] });

function groupFixture() {
  const state = fixture();
  state.tours = [{ id: 'tour', tenantId: 'wch', title: 'Europe Departure', destination: 'Schengen', bookedSeats: 3 }];
  state.bookings = [{ id: 'booking', bookingNumber: 'WCH-BK-000001', tenantId: 'wch', clientId: 'client', clientPhone: '03001234567', serviceType: 'GROUP_TOUR', packageId: 'tour', status: 'CONFIRMED', createdAt: now, assignedRep: 'Fatima', travelers: [{ id: 't1', fullName: 'Haris', passportNo: 'PK123', passportExpiry: '2030-01-01' }, { id: 't2', fullName: '' }, { id: 't3', fullName: 'Aiza' }] }];
  return state;
}

test('bridge creates one case per named confirmed traveler and is idempotent after reload', () => {
  const original = groupFixture();
  const state = bridgeGroupTourVisaCases(original);
  assert.equal(state.visaCases.length, 2);
  const c = normalizeVisaCase(state.visaCases[0], state);
  assert.equal(c.sourceType, 'GROUP_TOUR');
  assert.equal(c.bookingRef, 'WCH-BK-000001');
  assert.equal(c.tourId, 'tour');
  assert.equal(c.passportExpiry, '2030-01-01');
  assert.equal(c.stage, 'DOCUMENTS_PENDING');
  assert.equal(c.isArchived, false);
  assert.equal(c.custodyConfirmed, false);
  assert.deepEqual(c.custodyHistory, []);
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(bridgeGroupTourVisaCases(restored), restored);
  assert.equal(state.bookings, original.bookings);
  assert.equal(state.tours, original.tours);
  assert.equal(state.invoices, original.invoices);
  original.bookings[0].travelers[1].fullName = 'Bilal';
  assert.equal(bridgeGroupTourVisaCases(state).visaCases.length, 3);
});

test('bridge excludes drafts, cancelled bookings and foreign-tenant tour linkage', () => {
  for (const status of ['DRAFT', 'CANCELLED', 'COMPLETED']) {
    const state = groupFixture(); state.bookings[0].status = status;
    assert.equal(bridgeGroupTourVisaCases(state).visaCases.length, 0);
  }
  const state = groupFixture(); state.tours[0].tenantId = 'foreign';
  assert.equal(bridgeGroupTourVisaCases(state).visaCases.length, 0);
});

test('archive preserves case work and custody, delivered auto-archives, restore is tenant guarded', () => {
  let state = bridgeGroupTourVisaCases(groupFixture());
  const id = state.visaCases[0].id;
  state = saveVisaCase(state, actor, id, { passportCustody: 'OFFICE_SAFE', custodySafeLockerId: 'Safe A', stage: 'DELIVERED' }, now, uuid);
  assert.equal(normalizeVisaCase(state.visaCases[0], state).isArchived, true);
  const history = state.visaCases[0].pipeline.custodyHistory;
  assert.equal(bridgeGroupTourVisaCases(state), state);
  state = archiveVisaCase(state, actor, id, false, now);
  assert.equal(state.visaCases[0].pipeline.stage, 'DECISION_RECEIVED');
  assert.equal(state.visaCases[0].pipeline.isArchived, false);
  state = archiveVisaCase(state, actor, id, true, now);
  assert.deepEqual(state.visaCases[0].pipeline.custodyHistory, history);
  assert.equal(state.visaCases[0].pipeline.passportCustody, 'OFFICE_SAFE');
  assert.throws(() => archiveVisaCase(state, { ...actor, tenantId: 'foreign' }, id, false, now), /not found/);
  assert.throws(() => archiveVisaCase(state, { ...actor, role: 'SUPER_ADMIN' }, id, false, now), /restricted/);
  state.bookings[0].status = 'CANCELLED';
  assert.equal(normalizeVisaCase(state.visaCases[0], state).isArchived, true);
  assert.throws(() => archiveVisaCase(state, actor, id, false, now), /no longer/);
});

test('manual cases stay standalone and cannot spoof tour linkage', () => {
  const state = saveVisaCase(groupFixture(), actor, null, { ...input(), sourceType: 'GROUP_TOUR', tourId: 'tour', bookingId: 'booking', travelerId: 't1' }, now, uuid);
  assert.equal(state.visaCases[0].pipeline.sourceType, 'STANDALONE_CONSULTANCY');
  assert.equal(state.visaCases[0].bookingId, undefined);
  assert.equal(bridgeGroupTourVisaCases(state).visaCases.length, 3);
});
const input = () => ({ clientId: 'client', applicantName: 'Haris', applicantPhone: '03001234567', country: 'UK', visaType: 'Visitor', stage: 'DOCUMENTS_PENDING', decision: 'PENDING', assignedStaffId: 'admin', assignedStaffName: actor.name, passportNumber: 'PK123', passportCustody: 'CLIENT_HOLDING', consultancyFee: 50000, embassyFeePaid: 20000, documentChecklist: [{ id: 'doc', name: 'Passport Copy', required: true, received: false, verified: false }] });

test('saved six-stage cases and old custody events migrate without losing audit details', () => {
  const state = saveVisaCase(fixture(), actor, null, input(), now, uuid);
  const raw = state.visaCases[0];
  raw.pipeline.custodyHistory = [{ id: 'audit', from: 'CLIENT_HOLDING', to: 'OFFICE_SAFE', staffId: 'admin', staffName: actor.name, timestamp: now, reference: 'Locker 04' }];
  for (const [oldStage, expected] of [['COMPLETED', 'DELIVERED'], ['PASSPORT_READY_FOR_PICKUP', 'DECISION_RECEIVED']]) {
    raw.pipeline.stage = oldStage;
    const restored = normalizeVisaCase(raw, state);
    assert.equal(restored.stage, expected);
    assert.equal(restored.custodyHistory[0].details, 'Locker 04');
    assert.equal(restored.custodyHistory[0].transferredByStaff, actor.name);
    const saved = saveVisaCase(state, actor, raw.id, { stage: expected }, now, uuid);
    assert.deepEqual(saved.visaCases[0].pipeline.custodyHistory, restored.custodyHistory);
  }
});

test('legacy cases always expose an empty history and obsolete stages are rejected on write', () => {
  const state = saveVisaCase(fixture(), actor, null, input(), now, uuid);
  const raw = state.visaCases[0];
  delete raw.pipeline.custodyHistory;
  assert.deepEqual(normalizeVisaCase(raw, state).custodyHistory, []);
  assert.throws(() => saveVisaCase(state, actor, raw.id, { stage: 'COMPLETED' }, now, uuid), /Invalid visa stage/);
});
test('create persists exactly five stages without moving custody', () => {
  assert.deepEqual(VISA_STAGES, ['DOCUMENTS_PENDING', 'APPOINTMENT_BOOKED', 'SUBMITTED_TO_EMBASSY', 'DECISION_RECEIVED', 'DELIVERED']);
  let state = saveVisaCase(fixture(), actor, null, input(), now, uuid);
  const id = state.visaCases[0].id;
  assert.equal(state.visaCases[0].pipeline.caseNumber, 'VSA-2026-0001');
  for (const stage of VISA_STAGES) {
    state = saveVisaCase(state, actor, id, { stage }, now, uuid);
    const restored = normalizeVisaCase(JSON.parse(JSON.stringify(state.visaCases[0])), state);
    assert.equal(restored.stage, stage);
    assert.equal(restored.passportCustody, 'CLIENT_HOLDING');
  }
  assert.deepEqual(state.invoices, []);
});
test('vault requires locker and courier references and records immutable actor history', () => {
  let state = saveVisaCase(fixture(), actor, null, input(), now, uuid);
  const id = state.visaCases[0].id;
  assert.throws(() => saveVisaCase(state, actor, id, { passportCustody: 'OFFICE_SAFE' }, now, uuid), /locker/);
  state = saveVisaCase(state, actor, id, { passportCustody: 'OFFICE_SAFE', custodySafeLockerId: 'Safe A - 04' }, now, uuid);
  assert.throws(() => saveVisaCase(state, actor, id, { passportCustody: 'DISPATCHED_COURIER' }, now, uuid), /tracking/);
  state = saveVisaCase(state, actor, id, { passportCustody: 'DISPATCHED_COURIER', courierTrackingCode: 'TCS123', tenantId: 'foreign', custodyHistory: [] }, now, uuid);
  const c = normalizeVisaCase(state.visaCases[0], state);
  assert.equal(c.tenantId, 'wch');
  assert.equal(c.custodyHistory.length, 3);
  assert.equal(c.custodyHistory[0].staffId, 'admin');
  assert.equal(c.custodyHistory[0].details, 'TCS123');
  assert.equal(c.custodyHistory[0].fromLocation, 'OFFICE_SAFE');
  assert.equal(c.custodyHistory[0].toLocation, 'DISPATCHED_COURIER');
  assert.equal(c.custodyHistory[0].transferredByStaff, actor.name);
});
test('role, tenant, invalid document and fee inputs cannot mutate the original', () => {
  const state = saveVisaCase(fixture(), actor, null, input(), now, uuid);
  const id = state.visaCases[0].id;
  assert.throws(() => saveVisaCase(state, { ...actor, role: 'SUPER_ADMIN' }, id, {}, now, uuid), /restricted/);
  assert.throws(() => saveVisaCase(state, { ...actor, tenantId: 'foreign' }, id, {}, now, uuid), /not found/);
  assert.throws(() => saveVisaCase(state, actor, id, { consultancyFee: -1 }, now, uuid), /Fees/);
  assert.throws(() => saveVisaCase(state, actor, id, { documentChecklist: [{ ...input().documentChecklist[0], verified: true }] }, now, uuid), /receive/);
  assert.equal(state.visaCases[0].pipeline.consultancyFee, 50000);
});
test('received and verified checklist flags survive reload separately', () => {
  let state = saveVisaCase(fixture(), actor, null, input(), now, uuid);
  const id = state.visaCases[0].id;
  state = saveVisaCase(state, { ...actor, role: 'FRONT_DESK' }, id, { documentChecklist: [{ ...input().documentChecklist[0], received: true }] }, now, uuid);
  assert.equal(normalizeVisaCase(state.visaCases[0], state).documentChecklist[0].received, true);
  assert.equal(normalizeVisaCase(state.visaCases[0], state).documentChecklist[0].verified, false);
});
test('legacy booking applicant links normalize and edits synchronize traveler without touching finances', () => {
  const state = fixture();
  state.bookings = [{ id: 'booking', tenantId: 'wch', clientId: 'client', travelers: [{ id: 'traveler', fullName: 'Haris', passportExpiry: '2030-01-01' }] }];
  state.visaCases = [{ id: 'legacy', tenantId: 'wch', bookingId: 'booking', travelerId: 'traveler', clientName: 'Haris', passportNo: '', country: 'UK', visaType: 'Visitor', stage: 'Document Collection', appointmentDate: '', consultantName: 'Bilal', feeAmount: 70000, updatedAt: now }];
  const legacy = normalizeVisaCase(state.visaCases[0], state);
  assert.equal(legacy.clientId, 'client');
  assert.equal(legacy.custodyConfirmed, false);
  const next = saveVisaCase(state, actor, 'legacy', { passportNumber: 'PK333', applicantName: 'Dr. Haris' }, now, uuid);
  assert.equal(next.bookings[0].travelers[0].passportNo, 'PK333');
  assert.equal(next.visaCases[0].pipeline.custodyConfirmed, false);
  assert.deepEqual(next.invoices, state.invoices);
});

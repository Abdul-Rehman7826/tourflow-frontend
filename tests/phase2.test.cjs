const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '..');

function load(relativePath, mocks = {}) {
  const filename = path.join(root, relativePath);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const resolve = (id) => {
    if (id in mocks) return mocks[id];
    if (id.endsWith('.css')) return {};
    if (id.startsWith('@/')) {
      const relative = id.slice(2);
      const extension = ['.ts', '.tsx'].find((ext) => fs.existsSync(path.join(root, relative + ext)));
      return load(relative + extension, mocks);
    }
    if (id.startsWith('.')) {
      const relative = path.normalize(path.join(path.dirname(relativePath), id));
      const extension = ['.ts', '.tsx', '.js'].find((ext) => fs.existsSync(path.join(root, relative + ext)));
      if (extension !== undefined) return load(relative + extension, mocks);
    }
    return require(id);
  };
  new Function('require', 'module', 'exports', 'localStorage', source)(
    resolve, module, module.exports, mocks.localStorage,
  );
  return module.exports;
}

const seeds = load('lib/mock-data.ts');
const tenant = { id: seeds.INITIAL_LEADS[0].tenantId, slug: 'test', name: 'World Class Holidays' };

for (const fee of [0, 5, 20]) test(`cancellation refunds paid less ${fee}, releases seats once and persists audit`, () => {
  const app = store();
  const tour = app.read().tours.find(t => t.maxCapacity - t.bookedSeats >= 2 && ['OPEN', 'FILLING_FAST'].includes(t.status));
  const booking = app.read().convertLeadToBooking(bookingLead(app).id,
    { kind: 'GROUP_TOUR', tourId: tour.id, pricePerPerson: 100, pax: 2, deposit: 0 }, schedule(200),
    { amount: 20, method: 'Cash', paymentDate: '2026-09-09' });
  const originalInvoice = app.read().invoices.find(i => i.id === booking.invoiceId);
  const input = { cancellationFeeRetained: fee, refundMethod: 'CASH', reasonCategory: 'CLIENT_REQUEST', notes: 'Changed plans' };
  app.read().cancelBooking(booking.id, input);
  const restored = store(app.storage).read();
  const cancelled = restored.bookings.find(b => b.id === booking.id);
  const invoice = restored.invoices.find(i => i.id === booking.invoiceId);
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.refund.refundAmountIssued, 20 - fee);
  assert.equal(cancelled.refund.processedBy, 'test-admin');
  assert.deepEqual(invoice.refund, cancelled.refund);
  assert.deepEqual(invoice.installments, JSON.parse(JSON.stringify(originalInvoice.installments)));
  assert.equal(invoice.status, 'CANCELLED');
  assert.equal(invoice.dueAmount, 0);
  assert.equal(restored.tours.find(t => t.id === tour.id).bookedSeats, tour.bookedSeats);
  assert.equal(restored.passengers.filter(p => p.bookingId === booking.id).length, 0);
  assert.equal(cancelled.travelers.length, 2);
  assert.throws(() => restored.cancelBooking(booking.id, input), /confirmed/);
  assert.throws(() => restored.recordPayment(invoice.id, 1, 'Cash'), /cancelled|confirmed|balance/i);
});

test('cancellation enforces admin, tenant, amount and persistence guards without partial updates', () => {
  const app = store();
  const booking = app.read().convertLeadToBooking(bookingLead(app).id,
    { kind: 'CUSTOM_PACKAGE', description: 'Test', rate: 200 }, schedule(200),
    { amount: 20, method: 'Cash', paymentDate: '2026-09-09' });
  const input = { cancellationFeeRetained: 0, refundMethod: 'BANK_WIRE', reasonCategory: 'OTHER' };
  const before = app.read();
  for (const role of ['FRONT_DESK', 'SUPER_ADMIN', 'TOUR_MANAGER', 'VISA_CONSULTANT']) {
    app.setUser({ id: 'other', name: 'Other', role, tenantId: tenant.id });
    assert.throws(() => app.read().cancelBooking(booking.id, input), /restricted/);
  }
  app.setUser({ id: 'other', name: 'Other', role: 'AGENCY_ADMIN', tenantId: 'another-tenant' });
  assert.throws(() => app.read().cancelBooking(booking.id, input), /restricted/);
  app.setUser({ id: 'test-admin', name: 'Tester', role: 'AGENCY_ADMIN', tenantId: tenant.id });
  for (const fee of [-1, 21, NaN, Infinity]) assert.throws(() => app.read().cancelBooking(booking.id, { ...input, cancellationFeeRetained: fee }));
  assert.throws(() => app.read().cancelBooking(booking.id, { ...input, refundMethod: 'INVALID' }));
  app.storage.set = () => { throw new Error('Quota'); };
  assert.throws(() => app.read().cancelBooking(booking.id, input), /Unable to save/);
  assert.deepEqual(app.read().bookings, before.bookings);
  assert.deepEqual(app.read().invoices, before.invoices);
});

test('unpaid visa cancellation archives case without deleting client history', () => {
  const app = store();
  const booking = app.read().convertLeadToBooking(bookingLead(app).id,
    { kind: 'VISA', country: 'UK', category: 'Tourist', serviceFee: 150, embassyCharges: 50 }, schedule(200));
  app.read().cancelBooking(booking.id, { cancellationFeeRetained: 0, refundMethod: 'ORIGINAL_PAYMENT', reasonCategory: 'VISA_REJECTION' });
  assert.equal(app.read().visaCases.filter(v => v.bookingId === booking.id).length, 0);
  assert.ok(app.read().clients.some(c => c.id === booking.clientId));
  const snapshot = JSON.parse(app.storage.get('tourflow_erp_v3'));
  assert.ok(snapshot.visaCases.find(v => v.bookingId === booking.id).cancelledAt);
  assert.equal(app.read().bookings.find(b => b.id === booking.id).refund.refundAmountIssued, 0);
});

test('cancellation action is rendered only for the owning agency admin', () => {
  const invoice = { id: 'inv', bookingId: 'bk', tenantId: tenant.id, paidAmount: 100, dueAmount: 20 };
  for (const role of ['AGENCY_ADMIN', 'FRONT_DESK', 'SUPER_ADMIN', 'TOUR_MANAGER', 'VISA_CONSULTANT']) {
    const { BookingCancellation } = load('components/invoices/BookingCancellation.tsx', {
      '@/context/AuthContext': { useAuth: () => ({ user: { role, tenantId: tenant.id } }) },
      '@/context/DataContext': { useData: () => ({ bookings: [{ id: 'bk', status: 'CONFIRMED' }], cancelBooking() {} }) },
      '@/context/ThemeContext': { useAgencySettings: () => ({ formatMoney: String }) },
    });
    const html = renderToStaticMarkup(React.createElement(BookingCancellation, { invoice }));
    assert.equal(html.includes('Cancel Booking / Refund'), role === 'AGENCY_ADMIN');
  }
});

test('cancelling a sold-out tour reopens it and adjusts net collections', () => {
  const app = store();
  const tour = app.read().tours.find(t => t.maxCapacity - t.bookedSeats > 0 && ['OPEN', 'FILLING_FAST'].includes(t.status));
  const pax = tour.maxCapacity - tour.bookedSeats;
  const booking = app.read().convertLeadToBooking(bookingLead(app).id,
    { kind: 'GROUP_TOUR', tourId: tour.id, pricePerPerson: 100, pax, deposit: 0 }, schedule(pax * 100),
    { amount: 20, method: 'Cash', paymentDate: '2026-09-09' });
  assert.equal(app.read().tours.find(t => t.id === tour.id).status, 'SOLD_OUT');
  const collected = app.read().tenantSummary.totalCollected;
  app.read().cancelBooking(booking.id, { cancellationFeeRetained: 5, refundMethod: 'CASH', reasonCategory: 'CLIENT_REQUEST' });
  assert.notEqual(app.read().tours.find(t => t.id === tour.id).status, 'SOLD_OUT');
  assert.equal(app.read().tenantSummary.totalCollected, collected - 15);
});

// Exercise the actual provider mutations with isolated hook state and browser storage.
// This does not simulate React scheduling or replace browser interaction tests.
function store(storage = new Map()) {
  let authUser = { id: 'test-admin', name: 'Tester', role: 'AGENCY_ADMIN', tenantId: tenant.id };
  const states = [];
  let cursor = 0;
  let mounted = false;
  const effects = [];
  const localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const hooks = {
    ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (next) => {
        states[index] = typeof next === 'function' ? next(states[index]) : next;
      }];
    },
    useMemo: (fn) => fn(),
    useRef(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = { current: initial };
      return states[index];
    },
    useEffect: (fn) => { if (!mounted) effects.push(fn); },
  };
  const { DataProvider } = load('context/DataContext.tsx', {
    react: hooks,
    '@/context/TenantContext': { useTenant: () => ({ tenant }) },
    '@/context/AuthContext': { useAuth: () => ({
      user: authUser,
      staffUsers: [
        { id: 'fatima', tenantId: tenant.id, name: 'Fatima', status: 'Active', role: 'FRONT_DESK' },
        { id: 'aiza', tenantId: tenant.id, name: 'Aiza', status: 'Active', role: 'FRONT_DESK' },
        { id: 'bilal', tenantId: tenant.id, name: 'Bilal', status: 'Active', role: 'FRONT_DESK' },
      ],
    }) },
    localStorage,
  });
  function read() {
    cursor = 0;
    return DataProvider({ children: null }).props.value;
  }
  read();
  mounted = true;
  effects.forEach((effect) => effect());
  return { read, storage, setUser: (user) => { authUser = user; } };
}

test('intake, newest interaction, tomorrow callback and conversion survive reload', () => {
  const app = store();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const lead = app.read().addLead({
    fullName: 'Tariq Mehmood', phone: '+92 300 0000000', source: 'WhatsApp',
    interestType: 'GROUP_TOUR', groupSize: 4, notes: 'Walk-in inquiry', followUpDate: tomorrow,
  });
  assert.equal(app.read().leads[0].id, lead.id);
  assert.equal(app.read().leads[0].groupSize, 4);
  app.read().addInteraction(lead.id, 'Client requested brochure for Europe tour', 'Phone Call', 'Test Rep', tomorrow);
  assert.equal(app.read().leads[0].interactions[0].note, 'Client requested brochure for Europe tour');
  assert.equal(app.read().leads[0].followUpDate, tomorrow);
  app.read().convertLead(lead.id, { kind: 'CUSTOM_PACKAGE', description: 'Europe family itinerary', rate: 250000 });
  const restored = store(app.storage).read().leads[0];
  assert.equal(restored.status, 'CONVERTED');
  assert.equal(restored.interactions.length, 3);
  assert.equal(restored.followUpDate, tomorrow);
  assert.equal(store(app.storage).read().clients[0].leadId, lead.id);
});

test('visa stage and document verification persist on reload', () => {
  const app = store();
  const visa = app.read().visaCases.find((item) => item.stage === 'Document Collection');
  app.read().updateVisaStage(visa.id, 'Ready for Submission');
  const docs = visa.documents.map((doc, index) => ({ ...doc, status: index < 3 ? 'Verified' : 'Pending' }));
  app.read().updateVisaDocuments(visa.id, docs);
  const restored = store(app.storage).read().visaCases.find((item) => item.id === visa.id);
  assert.equal(restored.stage, 'Ready for Submission');
  assert.equal(restored.documents.filter((doc) => doc.status === 'Verified').length, 3);
  assert.equal(restored.documents.length, visa.documents.length);
});

for (const method of ['Cash', 'Bank Transfer']) {
  test(`remaining invoice balance settles all milestones with ${method}`, () => {
    const app = store();
    const invoice = app.read().invoices.find((item) => item.status === 'PARTIALLY_PAID');
    app.read().recordPayment(invoice.id, invoice.dueAmount, method);
    const restored = store(app.storage).read().invoices.find((item) => item.id === invoice.id);
    assert.equal(restored.status, 'PAID');
    assert.equal(restored.dueAmount, 0);
    assert.equal(restored.paidAmount, restored.totalAmount);
    assert.ok(restored.milestones.every((milestone) => milestone.status === 'Paid'));
    assert.equal(restored.installments.at(-1).method, method);
  });
}

test('partial payment cannot skip a larger earlier milestone', () => {
  const app = store();
  const invoice = app.read().invoices.find((item) => item.status === 'PARTIALLY_PAID' && item.milestones?.filter((milestone) => milestone.status !== 'Paid').length >= 2);
  const pending = invoice.milestones.filter((milestone) => milestone.status !== 'Paid');
  const payment = Math.min(invoice.dueAmount, pending[0].amount / 2);
  app.read().recordPayment(invoice.id, payment, 'Cash');
  const updated = app.read().invoices.find((item) => item.id === invoice.id);
  assert.equal(updated.milestones.find((milestone) => milestone.id === pending[0].id).status, pending[0].status);
  assert.equal(updated.milestones.find((milestone) => milestone.id === pending[1].id).status, pending[1].status);
});

test('invalid payments do not alter invoice balances or receipts', () => {
  const app = store();
  const invoice = app.read().invoices.find((item) => item.status === 'PARTIALLY_PAID');
  for (const amount of [NaN, Infinity, -1, 0, invoice.dueAmount + 1]) {
    app.read().recordPayment(invoice.id, amount, 'Cash');
    assert.deepEqual(app.read().invoices.find((item) => item.id === invoice.id), invoice);
  }
});

test('decimal settlement has no floating point remainder', () => {
  const invoice = { ...seeds.INITIAL_INVOICES[0], totalAmount: 0.3, paidAmount: 0.1,
    dueAmount: 0.2, status: 'PARTIALLY_PAID', installments: [], milestones: [] };
  const storage = new Map([['tourflow_erp_data_v1_invoices', JSON.stringify([invoice])]]);
  const app = store(storage);
  app.read().recordPayment(invoice.id, 0.2, 'Cash');
  assert.equal(app.read().invoices[0].dueAmount, 0);
  assert.equal(app.read().invoices[0].paidAmount, 0.3);
  assert.equal(app.read().invoices[0].status, 'PAID');
});

function renderPage(file, data, role = 'AGENCY_ADMIN', id = '', overrides = {}) {
  const { defaultSettings, formatAmount } = load('lib/agency-settings.ts');
  const settings = defaultSettings();
  const Page = load(file, {
    '@/context/ThemeContext': { useAgencySettings: () => ({ settings, formatMoney: (value) => formatAmount(value, settings) }) },
    '@/context/DataContext': { useData: () => data },
    '@/context/TenantContext': { useTenant: () => ({ tenant }) },
    '@/context/RoleContext': { useRole: () => ({ role, roleMeta: { title: role } }) },
    '@/context/AuthContext': { useAuth: () => ({ user: { id: 'test', role, tenantId: tenant.id }, isHydrated: true }) },
    'next/navigation': { useParams: () => ({ id }), useRouter: () => ({}) },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
    ...overrides,
  }).default;
  return renderToStaticMarkup(React.createElement(Page));
}

function selectedState(index, selected) {
  let cursor = 0;
  return { ...React, useState(initial) {
    const state = React.useState(initial);
    return cursor++ === index ? [selected, state[1]] : state;
  } };
}

test('open lead drawer receives the updated record after a note is saved', () => {
  const app = store();
  const snapshot = app.read().leads[0];
  app.read().addInteraction(snapshot.id, 'Fresh drawer note', 'Phone Call', 'Tester', '2026-09-08');
  let received;
  renderPage('app/(dashboard)/leads/page.tsx', app.read(), 'FRONT_DESK', '', {
    react: selectedState(10, snapshot),
    '@/components/leads/LeadInteractionDrawer': { LeadInteractionDrawer: ({ lead }) => {
      received = lead;
      return null;
    } },
  });
  assert.equal(received.interactions[0].note, 'Fresh drawer note');
  assert.equal(received.followUpDate, '2026-09-08');
});

test('open visa drawer receives current stage and document data', () => {
  const app = store();
  const snapshot = app.read().visaCases[0];
  app.read().updateVisaStage(snapshot.id, 'Ready for Submission');
  let received;
  renderPage('app/(dashboard)/visa-tracker/page.tsx', app.read(), 'AGENCY_ADMIN', '', {
    react: selectedState(4, snapshot.id),
    '@/components/visa/VisaOperationsModal': { VisaOperationsModal: ({ visaCase }) => {
      received = visaCase;
      return null;
    } },
  });
  assert.equal(received.stage, 'APPOINTMENT_BOOKED');
});

test('switching to front desk while ROI is selected removes financial content', () => {
  const data = store().read();
  const file = 'app/(dashboard)/tours/[id]/page.tsx';
  const admin = renderPage(file, data, 'AGENCY_ADMIN', data.tours[0].id, { react: selectedState(0, 'FINANCIALS') });
  const frontDesk = renderPage(file, data, 'FRONT_DESK', data.tours[0].id, { react: selectedState(0, 'FINANCIALS') });
  assert.ok(admin.includes('Net Tour Profit'));
  assert.ok(!frontDesk.includes('Net Tour Profit'));
  assert.ok(!frontDesk.includes('Vendor Cost &amp; ROI Breakdown'));
});

test('tour cards render booked seats and matching occupancy width', () => {
  const data = store().read();
  const tour = data.tours[0];
  const html = renderPage('app/(dashboard)/tours/page.tsx', data);
  assert.match(html, new RegExp(String(tour.bookedSeats)));
  assert.match(html, new RegExp(String(tour.maxCapacity)));
  assert.match(html, new RegExp(`width:${Math.round(tour.bookedSeats / tour.maxCapacity * 100)}%`));
});

test('manifest renders family, passport, rooms and red expiry warning; front desk has no ROI tab', () => {
  const data = store().read();
  const tour = data.tours[0];
  const passenger = data.passengers.find((item) => item.tourId === tour.id);
  const admin = renderPage('app/(dashboard)/tours/[id]/page.tsx', data, 'AGENCY_ADMIN', tour.id);
  assert.ok(admin.includes(passenger.passportNo));
  assert.ok(admin.includes(passenger.familyGroup));
  assert.ok(admin.includes(passenger.roomAllocation));
  assert.ok(admin.includes('Financials'));
  const frontDesk = renderPage('app/(dashboard)/tours/[id]/page.tsx', data, 'FRONT_DESK', tour.id);
  assert.ok(!frontDesk.includes('Financials'));
  assert.ok(!frontDesk.includes('% ROI'));
  assert.match(admin, /text-rose-600[^]*?Expiring within 6 mo/);
});

test('visa board renders the five requested columns in order', () => {
  const source = fs.readFileSync(path.join(root, 'lib/visa-operations.ts'), 'utf8');
  assert.match(source, /VISA_STAGES[^=]*= \['DOCUMENTS_PENDING', 'APPOINTMENT_BOOKED', 'SUBMITTED_TO_EMBASSY', 'DECISION_RECEIVED', 'DELIVERED'\]/);
  const html = renderPage('app/(dashboard)/visa-tracker/page.tsx', store().read());
  for (const label of ['Documents Pending', 'Appointment Booked', 'Submitted To Embassy', 'Decision Received']) assert.ok(html.includes(label));
});

const csvRow = { fullName: 'Imported Customer', phone: '923119998877', email: '', interestType: 'VISA', source: 'WhatsApp', groupSize: 1, budget: 20000 };

test('CRM imports, bulk updates and duplicate resolutions persist across reloads', () => {
  const app = store();
  assert.deepEqual(app.read().importLeads([csvRow, csvRow], ['Fatima']), { imported: 1, flagged: 1 });
  let data = store(app.storage).read();
  const lead = data.leads.find(l => l.phone === csvRow.phone);
  assert.equal(lead.assignedTo, 'Fatima');
  data.bulkUpdateLeads([lead.id], { status: 'LOST', lossReason: 'Unresponsive to Callbacks', lossNote: 'Three attempts' });
  data = store(app.storage).read();
  assert.equal(data.leads.find(l => l.id === lead.id).lossNote, 'Three attempts');
  data.resolveDuplicate(data.duplicates[0].id, 'merge');
  data = store(app.storage).read();
  assert.equal(data.duplicates.length, 0);
  assert.match(data.leads.find(l => l.id === lead.id).interactions[0].note, /CSV inquiry/);
});

test('front desk can update leads but cannot invoke importer, distribution or duplicate mutations', () => {
  const app = store();
  app.read().importLeads([csvRow, csvRow], []);
  const duplicateId = app.read().duplicates[0].id;
  app.setUser({ id: 'reception', name: 'Fatima', tenantId: tenant.id, role: 'FRONT_DESK' });
  const data = app.read();
  assert.equal(data.duplicates.length, 0);
  assert.throws(() => data.importLeads([csvRow], []), /restricted/);
  assert.throws(() => data.distributeUnassigned(['Fatima']), /restricted/);
  assert.throws(() => data.resolveDuplicate(duplicateId, 'discard'), /restricted/);
  data.bulkUpdateLeads([data.leads[0].id], { assignedTo: 'Fatima' });
  assert.equal(app.read().leads[0].assignedTo, 'Fatima');
  app.setUser({ id: 'owner', name: 'Owner', tenantId: null, role: 'SUPER_ADMIN' });
  assert.throws(() => app.read().convertLead(data.leads[0].id, { kind: 'UMRAH', description: 'Trip', rate: 1 }), /restricted/);
});

test('CRM storage failures leave conversion and duplicate transactions unchanged', () => {
  const app = store();
  const initialClientCount = app.read().clients.length;
  app.read().importLeads([csvRow, csvRow], []);
  const before = app.read();
  const snapshot = app.storage.get('tourflow_erp_v3');
  app.storage.set = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => before.convertLead(before.leads[0].id, { kind: 'UMRAH', description: 'Trip', rate: 100 }), /Unable to save/);
  assert.throws(() => before.resolveDuplicate(before.duplicates[0].id, 'create'), /Unable to save/);
  assert.equal(app.read().clients.length, initialClientCount);
  assert.equal(app.read().leads[0].status, 'NEW');
  assert.equal(app.read().duplicates.length, 1);
  assert.equal(app.storage.get('tourflow_erp_v3'), snapshot);
});

test('rapid duplicate conversion calls create only one permanent client', () => {
  const app = store();
  const initialClientCount = app.read().clients.length;
  app.read().importLeads([csvRow], []);
  const data = app.read();
  const conversion = { kind: 'VISA', country: 'Canada', category: 'Tourist', serviceFee: 100, embassyCharges: 200 };
  data.convertLead(data.leads[0].id, conversion);
  assert.throws(() => data.convertLead(data.leads[0].id, conversion), /already/);
  assert.equal(store(app.storage).read().clients.length, initialClientCount + 1);
});

test('round robin distributes only open unassigned records and preserves existing owners', () => {
  const app = store();
  app.read().importLeads([csvRow, { ...csvRow, phone: '923119998876' }, { ...csvRow, phone: '923119998875' }], []);
  const imported = app.read().leads.filter(l => l.phone.startsWith('92311999887'));
  app.read().bulkUpdateLeads([imported[0].id], { assignedTo: 'Bilal' });
  assert.equal(app.read().distributeUnassigned(['Fatima', 'Aiza']), 2);
  const restored = store(app.storage).read().leads.filter(l => l.phone.startsWith('92311999887'));
  assert.deepEqual(restored.map(l => l.assignedTo).sort(), ['Aiza', 'Bilal', 'Fatima']);
  assert.throws(() => app.read().distributeUnassigned(['Not an active rep']), /active/);
});

test('lead tabs render only for admin and client records are visible after conversion', () => {
  const app = store();
  app.read().importLeads([csvRow], []);
  app.read().convertLead(app.read().leads[0].id, { kind: 'UMRAH', description: '14 day package', rate: 200000 });
  const data = app.read();
  const admin = renderPage('app/(dashboard)/leads/page.tsx', data, 'AGENCY_ADMIN');
  const reception = renderPage('app/(dashboard)/leads/page.tsx', data, 'FRONT_DESK');
  assert.match(admin, /Bulk CSV Importer/); assert.match(admin, /Duplicate Queue/);
  assert.ok(!reception.includes('Bulk CSV Importer')); assert.ok(!reception.includes('Duplicate Queue'));
  assert.match(reception, /Select all filtered leads/);
  const clients = renderPage('app/(dashboard)/clients/page.tsx', data, 'FRONT_DESK');
  assert.match(clients, /Imported Customer/); assert.match(clients, /14 day package/);
  const owner = renderPage('app/(dashboard)/clients/page.tsx', data, 'SUPER_ADMIN');
  assert.match(owner, /Access Restricted/); assert.ok(!owner.includes('Imported Customer'));
});

test('malformed CRM snapshot blocks writes instead of overwriting saved content', () => {
  const saved = new Map([['tourflow_crm_v2', '{broken']]);
  const app = store(saved);
  assert.equal(app.read().crmReady, false);
  assert.match(app.read().crmError, /could not be loaded/);
  assert.throws(() => app.read().importLeads([csvRow], []), /not ready/);
  assert.equal(saved.get('tourflow_crm_v2'), '{broken');
});

const schedule = total => [
  { name: 'Initial Token Deposit', amount: total / 10, dueDate: '2026-09-09' },
  { name: 'Mid-term Installment', amount: total * 4 / 10, dueDate: '2026-10-01' },
  { name: 'Pre-Departure Balance', amount: total / 2, dueDate: '2026-11-01' },
];

test('lead quote saves without converting, allocating or paying and can be resumed once', () => {
  const app = store();
  const lead = bookingLead(app);
  const tour = app.read().tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status));
  const conversion = { kind: 'GROUP_TOUR', tourId: tour.id, pax: 1, pricePerPerson: 100, deposit: 10 };
  const before = app.read();
  const quote = before.saveDraftBooking(lead.id, conversion, schedule(100));
  let data = store(app.storage).read();
  assert.equal(data.leads.find(l => l.id === lead.id).status, 'NEW');
  assert.equal(data.clients.length, before.clients.length);
  assert.deepEqual(data.tours, before.tours);
  assert.deepEqual(data.passengers, before.passengers);
  assert.deepEqual(data.invoices, JSON.parse(JSON.stringify(before.invoices)));
  assert.equal(quote.status, 'DRAFT');
  assert.equal(quote.clientId, '');
  const updated = data.saveDraftBooking(lead.id, conversion, schedule(100));
  assert.equal(updated.id, quote.id);
  assert.equal(updated.bookingNumber, quote.bookingNumber);
  const resumed = store(app.storage);
  const booked = resumed.read().confirmBookingTransaction(lead.id, conversion, schedule(100), { amount: 100, method: 'Credit Card', paymentDate: '2026-09-11', reference: 'CARD-123' });
  data = resumed.read();
  assert.equal(data.bookings.length, before.bookings.length + 1);
  assert.equal(booked.id, quote.id);
  assert.equal(booked.bookingNumber, quote.bookingNumber);
  assert.equal(data.invoices.find(i => i.id === booked.invoiceId).status, 'PAID');
  assert.equal(data.invoices.find(i => i.id === booked.invoiceId).installments[0].reference, 'CARD-123');
  assert.equal(data.tours.find(t => t.id === tour.id).bookedSeats, tour.bookedSeats + 1);
  assert.throws(() => data.confirmBookingTransaction(lead.id, conversion, schedule(100)), /already/);
});

test('overcapacity quote is allowed but failed confirmation preserves the whole quote', () => {
  const app = store();
  const initialClientCount = app.read().clients.length;
  const lead = bookingLead(app);
  const tour = app.read().tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status));
  const pax = tour.maxCapacity - tour.bookedSeats + 1;
  const conversion = { kind: 'GROUP_TOUR', tourId: tour.id, pax, pricePerPerson: 100, deposit: 0 };
  const quote = app.read().saveDraftBooking(lead.id, conversion, schedule(pax * 100));
  const before = app.storage.get('tourflow_erp_v3');
  assert.throws(() => app.read().confirmBooking(quote.id), /seats/);
  assert.equal(app.storage.get('tourflow_erp_v3'), before);
  assert.equal(app.read().clients.length, initialClientCount);
});

test('unpaid confirmation and draft role/storage guards are enforced', () => {
  const app = store();
  const lead = bookingLead(app);
  const conversion = { kind: 'UMRAH', description: 'Package', rate: 100 };
  const quote = app.read().saveDraftBooking(lead.id, conversion, schedule(100));
  app.read().confirmBooking(quote.id);
  const invoice = app.read().invoices.find(i => i.bookingId === quote.id);
  assert.equal(invoice.status, 'UNPAID');
  assert.equal(invoice.installments.length, 0);
  const nextLead = bookingLead(app);
  app.setUser({ id: 'tour-manager', name: 'Tours', tenantId: tenant.id, role: 'TOUR_MANAGER' });
  assert.throws(() => app.read().saveDraftBooking(nextLead.id, conversion, schedule(100)), /restricted/);
  app.setUser({ id: 'admin', name: 'Admin', tenantId: tenant.id, role: 'AGENCY_ADMIN' });
  const before = app.storage.get('tourflow_erp_v3');
  app.storage.set = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => app.read().saveDraftBooking(nextLead.id, conversion, schedule(100)), /Unable to save/);
  assert.equal(app.storage.get('tourflow_erp_v3'), before);
});

test('conversion modal renders both actions, live quote totals and an overcapacity guard', () => {
  const app = store();
  const lead = bookingLead(app);
  const tour = app.read().tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status));
  const pax = tour.maxCapacity - tour.bookedSeats + 1;
  app.read().saveDraftBooking(lead.id, { kind: 'GROUP_TOUR', tourId: tour.id, pax, pricePerPerson: 100, deposit: 0 }, schedule(pax * 100));
  const { ConvertLeadModal } = load('components/leads/ConvertLeadModal.tsx', {
    '@/context/DataContext': { useData: () => app.read() },
    '@/context/AuthContext': { useAuth: () => ({ user: { id: 'test-admin', name: 'Tester', role: 'AGENCY_ADMIN', tenantId: tenant.id } }) },
  });
  const html = renderToStaticMarkup(React.createElement(ConvertLeadModal, { lead, onClose() {} }));
  assert.match(html, /Save as Draft Quote/);
  assert.match(html, /Confirm Booking &amp; Issue Invoice/);
  assert.match(html, /Not enough available seats/);
  assert.match(html, /value="confirm" disabled/);
  assert.match(html, /UNPAID/);
  assert.match(html, /Token \/ Deposit Received Today/);
  assert.match(html, /max-w-4xl/);
  assert.match(html, /md:grid-cols-2/);
  assert.match(html, /<footer/);
  assert.match(html, /Cancel \/ Close/);
  assert.ok(!html.includes('Convert &amp; Create Client'));
  assert.ok(!html.includes('Reference / Cheque #'));
});

function bookingLead(app) {
  return app.read().addLead({ fullName: 'Booking Test Family', phone: '03001239876',
    interestType: 'GROUP_TOUR', groupSize: 2, notes: '', followUpDate: '2026-09-10' });
}

test('fresh demo callbacks follow local calendar days across month boundaries', () => {
  const leads = seeds.createFreshDemoLeads(new Date(2026, 8, 30, 12));
  assert.deepEqual(leads.map(l => l.followUpDate), ['2026-09-30', '2026-10-01', '2026-09-30', '2026-10-02', '2026-09-30', '2026-10-03']);
  assert.deepEqual(leads.map(l => l.fullName), ['Bilal Qureshi', 'Dr. Haris Mahmood', 'Haji Muhammad Ashraf', 'Zainab & Fahad', 'Usman Tariq', 'Syed Ali Raza']);
  assert.deepEqual(leads.map(l => l.budget), [1400000, 450000, 1950000, 900000, 180000, 3200000]);
  assert.ok(leads.every(l => l.status !== 'CONVERTED' && !l.clientId));
});

test('demo reset persists fresh leads and baseline operations without erasing another tenant or settings', () => {
  const app = store();
  app.storage.set('settings-sentinel', 'keep');
  const before = app.read();
  const defaultClientCount = before.clients.length;
  const defaultBookingCount = before.bookings.length;
  const snapshot = JSON.parse(app.storage.get('tourflow_erp_v3'));
  const tour = before.tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status) && t.maxCapacity > t.bookedSeats);
  before.confirmBookingTransaction(before.leads[0].id, { kind: 'GROUP_TOUR', tourId: tour.id, pax: 1, pricePerPerson: 100, deposit: 0 }, schedule(100), { amount: 20, method: 'Cash', paymentDate: '2026-09-09' });
  app.read().resetToDefaultMockData();
  const restored = store(app.storage).read();
  assert.equal(restored.leads.length, 6);
  assert.ok(restored.leads.every(l => l.status !== 'CONVERTED' && !l.clientId));
  assert.equal(restored.clients.length, defaultClientCount);
  assert.equal(restored.bookings.length, defaultBookingCount);
  assert.deepEqual(restored.tours, JSON.parse(JSON.stringify(before.tours)));
  assert.deepEqual(restored.invoices, JSON.parse(JSON.stringify(before.invoices)));
  assert.deepEqual(restored.passengers, JSON.parse(JSON.stringify(before.passengers)));
  assert.equal(app.storage.get('settings-sentinel'), 'keep');
  const after = JSON.parse(app.storage.get('tourflow_erp_v3'));
  for (const key of ['leads', 'clients', 'duplicates', 'bookings', 'tours', 'visaCases', 'invoices', 'expenses']) {
    assert.deepEqual(after[key].filter(x => x.tenantId !== tenant.id), snapshot[key].filter(x => x.tenantId !== tenant.id));
  }
});

test('demo reset rejects front desk and publishes nothing when persistence fails', () => {
  const app = store();
  app.setUser({ id: 'rep', name: 'Fatima', role: 'FRONT_DESK', tenantId: tenant.id });
  assert.throws(() => app.read().resetToDefaultMockData(), /restricted/);
  app.setUser({ id: 'admin', name: 'Admin', role: 'AGENCY_ADMIN', tenantId: tenant.id });
  bookingLead(app);
  const before = app.read();
  app.storage.set = () => { throw new Error('Quota'); };
  assert.throws(() => app.read().resetToDefaultMockData(), /Unable to save/);
  assert.deepEqual(app.read().leads, before.leads);
});

test('atomic lead-to-booking conversion links invoice, token, seats and travelers across reload', () => {
  const app = store();
  const lead = bookingLead(app);
  const tour = app.read().tours.find(t => t.maxCapacity - t.bookedSeats >= 2 && ['OPEN', 'FILLING_FAST'].includes(t.status));
  const booking = app.read().convertLeadToBooking(lead.id,
    { kind: 'GROUP_TOUR', tourId: tour.id, pricePerPerson: 100, pax: 2, deposit: 20 }, schedule(200),
    { amount: 20, method: 'Cash', paymentDate: '2026-09-09' });
  const data = store(app.storage).read();
  const invoice = data.invoices.find(i => i.id === booking.invoiceId);
  assert.match(booking.bookingNumber, /^WCH-BK-\d{6}$/);
  assert.equal(booking.status, 'CONFIRMED');
  assert.equal(data.leads.find(l => l.id === lead.id).status, 'CONVERTED');
  assert.equal(data.clients.find(c => c.id === booking.clientId).leadId, lead.id);
  assert.equal(invoice.bookingId, booking.id);
  assert.equal(invoice.paidAmount, 20);
  assert.equal(invoice.dueAmount, 180);
  assert.equal(data.bookings.find((item) => item.id === booking.id).milestones[0].isPaid, true);
  assert.equal(data.tours.find(t => t.id === tour.id).bookedSeats, tour.bookedSeats + 2);
  assert.equal(data.passengers.filter(p => p.bookingId === booking.id).length, 2);
  assert.ok(data.passengers.filter(p => p.bookingId === booking.id).every(p => p.paymentStatus === 'PARTIAL'));
  const restored = store(app.storage);
  restored.read().recordPayment(invoice.id, 180, 'Bank Transfer');
  assert.ok(restored.read().bookings.find((item) => item.id === booking.id).milestones.every(ms => ms.isPaid));
  assert.ok(restored.read().passengers.filter(p => p.bookingId === booking.id).every(p => p.paymentStatus === 'PAID'));
});

test('existing converted client can create an unpaid draft without repeating conversion or posting quoted token', () => {
  const app = store();
  const initialClientCount = app.read().clients.length;
  const lead = bookingLead(app);
  const tour = app.read().tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status));
  app.read().convertLead(lead.id, { kind: 'GROUP_TOUR', tourId: tour.id, pricePerPerson: 100, pax: 1, deposit: 10 });
  const before = app.read();
  const convertedClient = before.clients.find((client) => client.leadId === lead.id);
  const booking = before.createBooking({ clientId: convertedClient.id, milestones: schedule(100) });
  assert.equal(booking.status, 'DRAFT');
  assert.equal(app.read().invoices.length, before.invoices.length);
  assert.equal(app.read().tours.find(t => t.id === tour.id).bookedSeats, tour.bookedSeats);
  app.read().confirmBooking(booking.id);
  const invoice = app.read().invoices.find(i => i.bookingId === booking.id);
  assert.equal(invoice.paidAmount, 0);
  assert.equal(invoice.installments.length, 0);
  assert.equal(app.read().clients.length, initialClientCount + 1);
  assert.throws(() => app.read().confirmBooking(booking.id), /already/);
  assert.throws(() => app.read().createBooking({ clientId: convertedClient.id, milestones: schedule(100) }), /already/);
});

test('failed capacity and invalid token roll back the entire conversion', () => {
  const app = store();
  const initialBookingCount = app.read().bookings.length;
  const initialClientCount = app.read().clients.length;
  const lead = bookingLead(app);
  const tour = app.read().tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status));
  const before = app.storage.get('tourflow_erp_v3');
  const pax = tour.maxCapacity - tour.bookedSeats + 1;
  assert.throws(() => app.read().convertLeadToBooking(lead.id,
    { kind: 'GROUP_TOUR', tourId: tour.id, pricePerPerson: 10, pax, deposit: 0 }, schedule(pax * 10)), /seats/);
  assert.equal(app.storage.get('tourflow_erp_v3'), before);
  assert.throws(() => app.read().convertLeadToBooking(lead.id,
    { kind: 'CUSTOM_PACKAGE', description: 'Test', rate: 100 }, schedule(100),
    { amount: 101, method: 'Cash', paymentDate: '2026-09-09' }), /remaining balance/);
  assert.equal(app.read().bookings.length, initialBookingCount);
  assert.equal(app.read().clients.length, initialClientCount);
  assert.equal(app.storage.get('tourflow_erp_v3'), before);
});

test('storage failure publishes no booking, invoice or operational allocation', () => {
  const app = store();
  const lead = bookingLead(app);
  const before = app.read();
  app.storage.set = () => { throw new Error('Quota'); };
  assert.throws(() => before.convertLeadToBooking(lead.id,
    { kind: 'VISA', country: 'Canada', category: 'Tourist', serviceFee: 100, embassyCharges: 200 }, schedule(300)), /Unable to save/);
  assert.deepEqual(app.read().visaCases, before.visaCases);
  assert.deepEqual(app.read().invoices, before.invoices);
  assert.equal(app.read().clients.length, before.clients.length);
  assert.equal(app.read().bookings.length, before.bookings.length);
});

test('traveler updates synchronize manifests without increasing reserved seats', () => {
  const app = store();
  const tour = app.read().tours.find(t => ['OPEN', 'FILLING_FAST'].includes(t.status));
  const booking = app.read().convertLeadToBooking(bookingLead(app).id,
    { kind: 'GROUP_TOUR', tourId: tour.id, pricePerPerson: 100, pax: 1, deposit: 0 }, schedule(100));
  const input = { fullName: 'Completed Traveler', passportNo: 'PK123456', passportExpiry: '2030-01-01', roomPreference: 'TRIPLE' };
  app.read().updateTraveler(booking.id, booking.travelers[0].id, input);
  app.read().updateTraveler(booking.id, booking.travelers[0].id, input);
  const restored = store(app.storage).read();
  assert.equal(restored.tours.find(t => t.id === tour.id).bookedSeats, tour.bookedSeats + 1);
  assert.equal(restored.bookings[0].travelers[0].isComplete, true);
  assert.equal(restored.passengers.find(p => p.bookingId === booking.id).roomAllocation, 'Triple Room');
  assert.throws(() => restored.updateTraveler(booking.id, booking.travelers[0].id, { ...input, passportExpiry: '2030-02-30' }), /valid/);
});

test('visa conversion allocates a linked checklist case; operations roles cannot confirm bookings', () => {
  const app = store();
  const booking = app.read().convertLeadToBooking(bookingLead(app).id,
    { kind: 'VISA', country: 'Canada', category: 'Tourist', serviceFee: 100, embassyCharges: 200 }, schedule(300));
  const visa = app.read().visaCases.find(v => v.bookingId === booking.id);
  assert.equal(visa.stage, 'Document Collection');
  assert.equal(visa.documents.length, 4);
  app.setUser({ id: 'visa', name: 'Bilal', tenantId: tenant.id, role: 'VISA_CONSULTANT' });
  app.read().updateTraveler(booking.id, booking.travelers[0].id, { fullName: 'Updated Applicant', passportNo: 'PK789' });
  assert.equal(app.read().visaCases.find(v => v.id === visa.id).passportNo, 'PK789');
  assert.throws(() => app.read().confirmBooking(booking.id), /restricted/);
  app.setUser({ id: 'owner', role: 'SUPER_ADMIN', tenantId: null });
  assert.equal(app.read().bookings.length, 0);
  assert.throws(() => app.read().createBooking({ clientId: booking.clientId, milestones: schedule(300) }), /restricted/);
});

test('milestone amounts and dates must be valid before draft creation', () => {
  const app = store();
  const initialBookingCount = app.read().bookings.length;
  const lead = bookingLead(app);
  app.read().convertLead(lead.id, { kind: 'UMRAH', description: 'Package', rate: 100 });
  const clientId = app.read().clients.find((client) => client.leadId === lead.id).id;
  for (const milestones of [[], schedule(99), [{ name: 'Total', amount: NaN, dueDate: '2026-09-09' }],
    [{ name: 'Total', amount: 100, dueDate: '2026-02-30' }], schedule(100).reverse()]) {
    assert.throws(() => app.read().createBooking({ clientId, milestones }));
    assert.equal(app.read().bookings.length, initialBookingCount);
  }
  assert.throws(() => app.read().createBooking({ clientId: 'foreign-client', milestones: schedule(100) }), /not found/);
});

test('legacy migration preserves original snapshots and rejects stale browser writes', () => {
  const legacy = JSON.stringify({ leads: seeds.INITIAL_LEADS, clients: [], duplicates: [] });
  const storage = new Map([['tourflow_crm_v2', legacy]]);
  const first = store(storage);
  assert.equal(storage.get('tourflow_crm_v2'), legacy);
  assert.ok(storage.has('tourflow_erp_v3'));
  const second = store(storage);
  bookingLead(first);
  assert.throws(() => bookingLead(second), /another tab/);
  assert.equal(store(storage).read().leads.length, seeds.INITIAL_LEADS.filter(l => l.tenantId === tenant.id).length + 1);
});

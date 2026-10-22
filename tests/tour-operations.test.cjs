const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const output = {};
new Function('exports', 'require', ts.transpileModule(fs.readFileSync('lib/tour-operations.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(output, () => { throw new Error('Unexpected dependency'); });
const { allocateTourRoom } = output;
const { changeTourOperations } = output;
const { unfilledPassengerSlots } = output;

test('flight utilization counts issued tickets on confirmed tenant bookings only', () => {
  const booking = { tenantId: 'wch', packageId: 'tour', status: 'CONFIRMED', travelers: [{ documents: { ticketIssued: true } }, { documents: { ticketIssued: false } }, {}] };
  const bookings = [booking, { ...booking, status: 'CANCELLED' }, { ...booking, tenantId: 'other' }, { ...booking, packageId: 'other' }];
  assert.deepEqual(output.flightSeatUtilization(bookings, 'wch', 'tour', 2), { ticketed: 1, allocated: 2, remaining: 1, percent: 50, overCapacity: false });
  assert.deepEqual(output.flightSeatUtilization(bookings, 'wch', 'tour', 0), { ticketed: 1, allocated: 0, remaining: 0, percent: 0, overCapacity: true });
  assert.equal(output.flightSeatUtilization([booking, booking], 'wch', 'tour', 1).percent, 100);
});

test('intake counts unnamed seats, not missing documents, and never exceeds booked capacity', () => {
  assert.equal(unfilledPassengerSlots({ paxCount: 2, travelers: [{ fullName: 'Bilal', isComplete: false }, { fullName: 'Aiza', isComplete: true }] }), 0);
  assert.equal(unfilledPassengerSlots({ paxCount: 3, travelers: [{ fullName: 'Bilal' }, { fullName: '   ' }, {}] }), 2);
  assert.equal(unfilledPassengerSlots({ paxCount: 2, travelers: undefined }), 2);
  assert.equal(unfilledPassengerSlots({ paxCount: 1, travelers: [{ fullName: 'Bilal' }, { fullName: 'Aiza' }] }), 0);
});
const fixture = () => ({
  tours: [{ id: 'tour', tenantId: 'wch', bookedSeats: 2, rooms: [
    { id: 'old', tourId: 'tour', roomNumber: '101', hotelName: 'Pullman', roomType: 'DOUBLE', assignedTravelerIds: ['one'] },
    { id: 'new', tourId: 'tour', roomNumber: '102', hotelName: 'Pullman', roomType: 'SINGLE', assignedTravelerIds: [] },
  ] }],
  bookings: [{ id: 'booking', tenantId: 'wch', packageId: 'tour', status: 'CONFIRMED', paxCount: 2, travelers: [
    { id: 'one', fullName: 'Bilal', assignedRoomId: 'old', passportNo: 'ABC' },
    { id: 'two', fullName: 'Aiza' },
  ] }], invoices: [{ totalAmount: 500000 }],
  passengers: [{ tourId: 'tour', bookingId: 'booking', travelerId: 'one', roomAllocation: 'Double Room' }],
});
test('moves room and booking metadata atomically without financial or seat changes', () => {
  const original = fixture();
  const next = allocateTourRoom(original, 'wch', 'tour', 'new', 'one');
  assert.deepEqual(next.tours[0].rooms.map(r => r.assignedTravelerIds), [[], ['one']]);
  assert.equal(next.bookings[0].travelers[0].assignedRoomId, 'new');
  assert.equal(next.bookings[0].travelers[0].roomPreference, 'SINGLE');
  assert.equal(next.bookings[0].travelers[0].passportNo, 'ABC');
  assert.equal(original.bookings[0].travelers[0].assignedRoomId, 'old');
  assert.equal(next.tours[0].bookedSeats, 2);
  assert.equal(next.invoices, original.invoices);
  assert.equal(next.passengers[0].roomAllocation, 'Single Room');
  assert.deepEqual(allocateTourRoom(next, 'wch', 'tour', 'new', 'one'), next);
});
test('rejects full rooms, foreign tours, missing rooms and non-confirmed travelers', () => {
  const state = allocateTourRoom(fixture(), 'wch', 'tour', 'new', 'one');
  assert.throws(() => allocateTourRoom(state, 'wch', 'tour', 'new', 'two'), /full/);
  assert.throws(() => allocateTourRoom(state, 'other', 'tour', 'new', 'one'), /not found/);
  assert.throws(() => allocateTourRoom(state, 'wch', 'tour', 'missing', 'one'), /not found/);
  state.bookings[0].status = 'CANCELLED';
  assert.throws(() => allocateTourRoom(state, 'wch', 'tour', 'new', 'one'), /confirmed/);
});

test('unassignment and room deletion release occupants without releasing booked seats', () => {
  const state = allocateTourRoom(fixture(), 'wch', 'tour', 'new', 'one');
  const next = changeTourOperations(state, 'wch', 'tour', { type: 'UNASSIGN', roomId: 'new', travelerId: 'one' });
  assert.equal(next.bookings[0].travelers[0].assignedRoomId, undefined);
  assert.equal(next.passengers[0].roomAllocation, undefined);
  assert.deepEqual(next.tours[0].rooms[1].assignedTravelerIds, []);
  const removed = changeTourOperations(state, 'wch', 'tour', { type: 'DELETE_ROOM', roomId: 'new' });
  assert.equal(removed.bookings[0].travelers[0].assignedRoomId, undefined);
  assert.equal(removed.tours[0].rooms.length, 1);
  assert.equal(removed.tours[0].bookedSeats, 2);
  assert.equal(removed.invoices, state.invoices);
});

test('room edits preserve occupants and cannot shrink below occupancy', () => {
  const state = allocateTourRoom(fixture(), 'wch', 'tour', 'old', 'two');
  const room = { ...state.tours[0].rooms[0], hotelName: 'Pullman', roomNumber: '204', assignedTravelerIds: [] };
  const next = changeTourOperations(state, 'wch', 'tour', { type: 'SAVE_ROOM', room });
  assert.deepEqual(next.tours[0].rooms[0].assignedTravelerIds, ['one', 'two']);
  assert.throws(() => changeTourOperations(state, 'wch', 'tour', { type: 'SAVE_ROOM', room: { ...room, roomType: 'SINGLE' } }), /capacity/);
  assert.throws(() => changeTourOperations(state, 'foreign', 'tour', { type: 'SAVE_ROOM', room }), /agency/);
});

test('itinerary CRUD, activities, meals and order survive serialized state', () => {
  const day = { dayNumber: 1, date: '2026-10-01', city: 'Paris', title: 'Arrival', hotelName: 'Pullman', activities: ['Welcome cruise'], mealsIncluded: ['DINNER'] };
  let state = changeTourOperations(fixture(), 'wch', 'tour', { type: 'ADD_DAY', day });
  state = changeTourOperations(state, 'wch', 'tour', { type: 'ADD_DAY', day: { ...day, dayNumber: 2, title: 'Louvre' } });
  state = changeTourOperations(state, 'wch', 'tour', { type: 'UPDATE_DAY', dayNumber: 1, day: { activities: ['Welcome cruise', 'Dinner'], mealsIncluded: ['BREAKFAST', 'DINNER'] } });
  state = changeTourOperations(state, 'wch', 'tour', { type: 'MOVE_DAY', dayNumber: 2, direction: -1 });
  assert.deepEqual(state.tours[0].itinerary.map(d => [d.dayNumber, d.title]), [[1, 'Louvre'], [2, 'Arrival']]);
  state = changeTourOperations(state, 'wch', 'tour', { type: 'DELETE_DAY', dayNumber: 1 });
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(restored.tours[0].itinerary[0].dayNumber, 1);
  assert.deepEqual(restored.tours[0].itinerary[0].activities, ['Welcome cruise', 'Dinner']);
  assert.deepEqual(restored.tours[0].itinerary[0].mealsIncluded, ['BREAKFAST', 'DINNER']);
  assert.equal(restored.bookings[0].paxCount, 2);
  assert.throws(() => changeTourOperations(state, 'wch', 'tour', { type: 'ADD_DAY', day: { ...day, dayNumber: 0 } }), /positive integer/);
});

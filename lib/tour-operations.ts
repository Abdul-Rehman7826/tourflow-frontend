import type { ERPState } from './booking-operations';
import type { Passenger, RoomType, RoomAllocation, ItineraryDay, Booking } from '@/types/erp';

export function unfilledPassengerSlots(booking: Pick<Booking, 'paxCount' | 'travelers'>): number {
  const assigned = (booking.travelers ?? []).filter(t => t.fullName?.trim()).length;
  return Math.max(0, booking.paxCount - assigned);
}

export function flightSeatUtilization(bookings: Booking[], tenantId: string, tourId: string, allocatedSeats: number) {
  const ticketed = bookings
    .filter(b => b.tenantId === tenantId && b.packageId === tourId && b.status === 'CONFIRMED')
    .flatMap(b => b.travelers ?? [])
    .filter(t => t.documents?.ticketIssued).length;
  const allocated = Number.isFinite(allocatedSeats) ? Math.max(0, Math.floor(allocatedSeats)) : 0;
  return { ticketed, allocated, remaining: Math.max(0, allocated - ticketed), percent: allocated ? Math.min(100, ticketed / allocated * 100) : 0, overCapacity: ticketed > allocated };
}

export const ROOM_CAPACITY: Record<RoomType, number> = {
  SINGLE: 1, DOUBLE: 2, TRIPLE: 3, FAMILY: 4,
};
const ROOM_LABEL: Record<RoomType, Passenger['roomAllocation']> = {
  SINGLE: 'Single Room', DOUBLE: 'Double Room', TRIPLE: 'Triple Room', FAMILY: 'Family Suite',
};

export function allocateTourRoom(
  state: ERPState, tenantId: string, tourId: string, roomId: string, travelerId: string,
): ERPState {
  const tour = state.tours.find(t => t.id === tourId && t.tenantId === tenantId);
  const room = tour?.rooms?.find(r => r.id === roomId && r.tourId === tourId);
  if (!tour || !room) throw new Error('Room not found for this agency tour.');
  const booking = state.bookings.find(b => b.tenantId === tenantId && b.packageId === tourId && b.status === 'CONFIRMED' && b.travelers.some(t => t.id === travelerId));
  if (!booking || !booking.travelers.find(t => t.id === travelerId)?.fullName?.trim()) {
    throw new Error('Select a named traveler from a confirmed booking on this tour.');
  }
  const occupants = room.assignedTravelerIds.filter(id => id !== travelerId);
  if (occupants.length >= ROOM_CAPACITY[room.roomType]) throw new Error('This room is full.');
  return {
    ...state,
    passengers: state.passengers.map(p => p.tourId === tourId && p.bookingId === booking.id && p.travelerId === travelerId
      ? { ...p, roomAllocation: ROOM_LABEL[room.roomType] } : p),
    tours: state.tours.map(t => t.id !== tour.id ? t : {
      ...t, rooms: t.rooms!.map(r => ({
        ...r, assignedTravelerIds: r.id === roomId
          ? [...occupants, travelerId]
          : r.assignedTravelerIds.filter(id => id !== travelerId),
      })),
    }),
    bookings: state.bookings.map(b => b.id !== booking.id ? b : {
      ...b, travelers: b.travelers.map(t => t.id !== travelerId ? t : {
        ...t, assignedRoomId: room.id, roomPreference: room.roomType, roommateId: undefined,
      }),
    }),
  };
}

export type TourOperation =
  | { type: 'SAVE_ROOM'; room: RoomAllocation }
  | { type: 'DELETE_ROOM'; roomId: string }
  | { type: 'UNASSIGN'; roomId: string; travelerId: string }
  | { type: 'ADD_DAY'; day: ItineraryDay }
  | { type: 'UPDATE_DAY'; dayNumber: number; day: Partial<ItineraryDay> }
  | { type: 'DELETE_DAY'; dayNumber: number }
  | { type: 'MOVE_DAY'; dayNumber: number; direction: -1 | 1 };

export function changeTourOperations(state: ERPState, tenantId: string, tourId: string, action: TourOperation): ERPState {
  const tour = state.tours.find(t => t.id === tourId && t.tenantId === tenantId);
  if (!tour) throw new Error('Tour not found for this agency.');
  let rooms = tour.rooms ?? [];
  let itinerary = [...(tour.itinerary ?? [])];
  const released = new Set<string>();
  if (action.type === 'SAVE_ROOM') {
    const room = action.room;
    const old = rooms.find(r => r.id === room.id);
    if (!room.roomNumber.trim() || !room.hotelName.trim() || !(room.roomType in ROOM_CAPACITY)) throw new Error('Enter hotel, room number and valid room type.');
    if (rooms.some(r => r.id !== room.id && r.hotelName.trim().toLowerCase() === room.hotelName.trim().toLowerCase() && r.roomNumber.trim().toLowerCase() === room.roomNumber.trim().toLowerCase())) throw new Error('This hotel room already exists.');
    if ((old?.assignedTravelerIds.length ?? 0) > ROOM_CAPACITY[room.roomType]) throw new Error('Move occupants before reducing room capacity.');
    const saved = { ...room, tourId, roomNumber: room.roomNumber.trim(), hotelName: room.hotelName.trim(), assignedTravelerIds: old?.assignedTravelerIds ?? [] };
    rooms = old ? rooms.map(r => r.id === old.id ? saved : r) : [...rooms, saved];
  } else if (action.type === 'DELETE_ROOM' || action.type === 'UNASSIGN') {
    const room = rooms.find(r => r.id === action.roomId);
    if (!room) throw new Error('Room not found.');
    if (action.type === 'DELETE_ROOM') {
      room.assignedTravelerIds.forEach(id => released.add(id));
      rooms = rooms.filter(r => r.id !== room.id);
    } else {
      released.add(action.travelerId);
      rooms = rooms.map(r => r.id === room.id ? { ...r, assignedTravelerIds: r.assignedTravelerIds.filter(id => id !== action.travelerId) } : r);
    }
  } else {
    if (action.type === 'ADD_DAY' || action.type === 'UPDATE_DAY') {
      const day = action.day;
      if (day.dayNumber !== undefined && (!Number.isInteger(day.dayNumber) || day.dayNumber < 1)) throw new Error('Day number must be a positive integer.');
      if (day.mealsIncluded?.some(m => !['BREAKFAST', 'LUNCH', 'DINNER'].includes(m))) throw new Error('Select valid meal inclusions.');
      if (day.date && (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(Date.parse(day.date)))) throw new Error('Enter a valid itinerary date.');
      if (day.activities?.some(a => !a.trim())) throw new Error('Activities cannot be blank.');
    }
    if (action.type === 'ADD_DAY') {
      const index = Math.max(0, Math.min(itinerary.length, action.day.dayNumber - 1));
      itinerary.splice(index, 0, action.day);
    } else {
      const index = itinerary.findIndex(d => d.dayNumber === action.dayNumber);
      if (index < 0) throw new Error('Itinerary day no longer exists.');
      if (action.type === 'DELETE_DAY') itinerary.splice(index, 1);
      if (action.type === 'UPDATE_DAY') {
        const day = { ...itinerary[index], ...action.day };
        itinerary.splice(index, 1);
        itinerary.splice(Math.max(0, Math.min(itinerary.length, (action.day.dayNumber ?? index + 1) - 1)), 0, day);
      }
      if (action.type === 'MOVE_DAY') {
        const target = index + action.direction;
        if (target < 0 || target >= itinerary.length) return state;
        [itinerary[index], itinerary[target]] = [itinerary[target], itinerary[index]];
      }
    }
    itinerary = itinerary.map((day, index) => ({ ...day, dayNumber: index + 1 }));
    if (itinerary.some(d => !d.title.trim() || !d.city.trim())) throw new Error('Each day needs a title and city.');
  }
  return {
    ...state,
    tours: state.tours.map(t => t.id === tour.id ? { ...t, rooms, itinerary } : t),
    bookings: state.bookings.map(b => b.tenantId !== tenantId || b.packageId !== tourId ? b : {
      ...b, travelers: b.travelers.map(t => {
        if (released.has(t.id) && (action.type === 'DELETE_ROOM' || action.type === 'UNASSIGN') && t.assignedRoomId === action.roomId) return { ...t, assignedRoomId: undefined, roommateId: undefined };
        const room = rooms.find(r => r.assignedTravelerIds.includes(t.id));
        return room ? { ...t, assignedRoomId: room.id, roomPreference: room.roomType } : t;
      }),
    }),
    passengers: state.passengers.map(p => {
      if (p.tourId !== tourId) return p;
      const room = rooms.find(r => r.assignedTravelerIds.includes(p.travelerId ?? ''));
      return room ? { ...p, roomAllocation: ROOM_LABEL[room.roomType] } : released.has(p.travelerId ?? '') ? { ...p, roomAllocation: undefined } : p;
    }),
  };
}

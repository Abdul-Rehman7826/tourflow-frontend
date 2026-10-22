import { apiClient } from "@/lib/api-client";
import { TourPackage, RoomAllocation, ItineraryDay, FlightBlock } from "@/types/erp";

export interface CreateTourPayload {
  title?: string;
  destination?: string;
  destinations?: (string | { name?: string })[];
  routeFlags?: string[];
  route_flags?: string[];
  departureDate?: string;
  departure_date?: string;
  returnDate?: string;
  return_date?: string;
  durationDays?: number;
  duration_days?: number;
  maxCapacity?: number;
  max_capacity?: number;
  pricePerPerson?: number;
  price_per_person?: number;
  estimatedSupplierCostPerPax?: number;
  estimated_supplier_cost_per_pax?: number;
  allocatedOverheads?: number;
  allocated_overheads?: number;
  inclusions?: string[];
  bannerGradient?: string;
  banner_gradient?: string;
  requiredPassportValidityMonths?: number;
  required_passport_validity_months?: number;
}

export interface CreateRoomPayload {
  room_number: string;
  room_type: "SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY";
  hotel_name: string;
  max_occupants?: number;
  notes?: string;
}

export interface ItineraryDayPayload {
  day_number: number;
  date?: string;
  city: string;
  title: string;
  hotel_name?: string;
  activities?: string[];
  meals_included?: ("BREAKFAST" | "LUNCH" | "DINNER")[];
}

export interface FlightBlockPayload {
  airline: string;
  pnr_code: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  baggage_allowance?: string;
  total_allocated_seats?: number;
}

export interface PassengerManifestReport {
  tourId: string;
  tourTitle: string;
  departureDate: string;
  requiredValidityMonths: number;
  minPassportValidDate: string;
  flightUtilization: {
    allocatedSeats: number;
    ticketedSeats: number;
    remainingSeats: number;
    percent: number;
  };
  roomCount: number;
  roomAllocations: Record<string, {
    roomNumber: string;
    roomType: string;
    hotelName: string;
  }>;
}

export async function fetchToursApi(params?: {
  status?: string;
  destination?: string;
}): Promise<TourPackage[]> {
  return apiClient.get<TourPackage[]>("/tours", { params });
}

export async function fetchTourApi(tourId: string): Promise<TourPackage> {
  return apiClient.get<TourPackage>(`/tours/${encodeURIComponent(tourId)}`);
}

export async function createTourApi(payload: CreateTourPayload | Partial<TourPackage>): Promise<TourPackage> {
  const p = payload as Record<string, any>;
  const destinationsRaw = p.destinations || [];
  const normalized = {
    title: p.title || "Untitled Tour",
    destination: p.destination || "Destination",
    destinations: destinationsRaw.map((d: any) => typeof d === "string" ? d : d?.name || ""),
    route_flags: p.route_flags || p.routeFlags || [],
    departure_date: p.departure_date || p.departureDate || new Date().toISOString().split("T")[0],
    return_date: p.return_date || p.returnDate || new Date().toISOString().split("T")[0],
    max_capacity: p.max_capacity ?? p.maxCapacity ?? 20,
    price_per_person: p.price_per_person ?? p.pricePerPerson ?? 0,
    estimated_supplier_cost_per_pax: p.estimated_supplier_cost_per_pax ?? p.estimatedSupplierCostPerPax,
    allocated_overheads: p.allocated_overheads ?? p.allocatedOverheads ?? 0,
    inclusions: p.inclusions || [],
    banner_gradient: p.banner_gradient || p.bannerGradient,
    required_passport_validity_months: p.required_passport_validity_months ?? p.requiredPassportValidityMonths ?? 6,
  };
  return apiClient.post<TourPackage>("/tours", normalized);
}

export async function updateTourApi(
  tourId: string,
  payload: Partial<CreateTourPayload> & { status?: string }
): Promise<TourPackage> {
  const p = payload as Record<string, any>;
  const normalized: Record<string, unknown> = { ...payload };
  if (p.departureDate) normalized.departure_date = p.departureDate;
  if (p.returnDate) normalized.return_date = p.returnDate;
  if (p.maxCapacity !== undefined) normalized.max_capacity = p.maxCapacity;
  if (p.pricePerPerson !== undefined) normalized.price_per_person = p.pricePerPerson;
  if (p.routeFlags) normalized.route_flags = p.routeFlags;
  return apiClient.patch<TourPackage>(`/tours/${encodeURIComponent(tourId)}`, normalized);
}

export async function deleteTourApi(tourId: string): Promise<{ success: boolean; deleted_id: string }> {
  return apiClient.delete<{ success: boolean; deleted_id: string }>(`/tours/${encodeURIComponent(tourId)}`);
}

export async function saveItineraryDayApi(
  tourId: string,
  payload: ItineraryDayPayload
): Promise<TourPackage> {
  return apiClient.post<TourPackage>(`/tours/${encodeURIComponent(tourId)}/itinerary`, payload);
}

export async function deleteItineraryDayApi(
  tourId: string,
  dayNumber: number
): Promise<TourPackage> {
  return apiClient.delete<TourPackage>(`/tours/${encodeURIComponent(tourId)}/itinerary/${dayNumber}`);
}

export async function saveFlightBlockApi(
  tourId: string,
  payload: FlightBlockPayload
): Promise<TourPackage> {
  return apiClient.post<TourPackage>(`/tours/${encodeURIComponent(tourId)}/flight-block`, payload);
}

export async function fetchTourRoomsApi(tourId: string): Promise<RoomAllocation[]> {
  return apiClient.get<RoomAllocation[]>(`/tours/${encodeURIComponent(tourId)}/rooms`);
}

export async function createTourRoomApi(
  tourId: string,
  payload: CreateRoomPayload
): Promise<RoomAllocation> {
  return apiClient.post<RoomAllocation>(`/tours/${encodeURIComponent(tourId)}/rooms`, payload);
}

export async function updateTourRoomApi(
  tourId: string,
  roomId: string,
  payload: Partial<CreateRoomPayload>
): Promise<RoomAllocation> {
  return apiClient.patch<RoomAllocation>(
    `/tours/${encodeURIComponent(tourId)}/rooms/${encodeURIComponent(roomId)}`,
    payload
  );
}

export async function deleteTourRoomApi(
  tourId: string,
  roomId: string
): Promise<{ success: boolean; deleted_room_id: string }> {
  return apiClient.delete<{ success: boolean; deleted_room_id: string }>(
    `/tours/${encodeURIComponent(tourId)}/rooms/${encodeURIComponent(roomId)}`
  );
}

export async function allocateTourRoomApi(
  tourId: string,
  roomId: string,
  travelerId: string,
  bookingId?: string
): Promise<RoomAllocation[]> {
  return apiClient.post<RoomAllocation[]>(
    `/tours/${encodeURIComponent(tourId)}/rooms/${encodeURIComponent(roomId)}/allocate`,
    { traveler_id: travelerId, booking_id: bookingId }
  );
}

export async function unassignTourRoomApi(
  tourId: string,
  roomId: string,
  travelerId: string
): Promise<RoomAllocation[]> {
  return apiClient.post<RoomAllocation[]>(
    `/tours/${encodeURIComponent(tourId)}/rooms/${encodeURIComponent(roomId)}/unassign`,
    { traveler_id: travelerId }
  );
}

export async function fetchPassengerManifestApi(tourId: string): Promise<PassengerManifestReport> {
  return apiClient.get<PassengerManifestReport>(`/tours/${encodeURIComponent(tourId)}/manifest`);
}

// ============================================================================
// COMPATIBILITY ALIASES & UTILITIES
// ============================================================================

export const getTourPackages = fetchToursApi;
export const createTourPackage = createTourApi;

export function checkPassport6MWarning(passportExpiry?: string, departureDate?: string): boolean {
  if (!passportExpiry || !departureDate) return false;
  try {
    const exp = new Date(passportExpiry);
    const dep = new Date(departureDate);
    if (isNaN(exp.getTime()) || isNaN(dep.getTime())) return false;
    const sixMonthsAfterDep = new Date(dep);
    sixMonthsAfterDep.setMonth(sixMonthsAfterDep.getMonth() + 6);
    return exp < sixMonthsAfterDep;
  } catch {
    return false;
  }
}

export async function downloadManifestCSV(tourId: string): Promise<void> {
  const report = await fetchPassengerManifestApi(tourId).catch(() => null);
  const rows = [
    ["Tour ID", "Room Number", "Room Type", "Hotel"],
  ];
  if (report?.roomAllocations) {
    for (const [, room] of Object.entries(report.roomAllocations)) {
      rows.push([tourId, room.roomNumber, room.roomType, room.hotelName]);
    }
  }
  const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `manifest-${tourId}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function updateManifestItem(
  tourId: string,
  travelerId: string,
  data: Record<string, unknown>
): Promise<{ success: boolean }> {
  if (data.assignedRoomId && typeof data.assignedRoomId === "string") {
    await allocateTourRoomApi(tourId, data.assignedRoomId, travelerId).catch(() => {});
  }
  return { success: true };
}

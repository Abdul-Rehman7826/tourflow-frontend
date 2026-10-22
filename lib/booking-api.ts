/**
 * TourFlow ERP - Booking Engine & Quotations API Service Layer
 * Connects frontend conversion modals and booking operations to live FastAPI endpoints.
 */

import { apiClient } from "@/lib/api-client";
import { Booking, InvoiceMilestone, TravelerManifestItem, ServiceType, BookingStatus } from "@/types/erp";
import { Client } from "@/lib/lead-operations";

export interface QuotationCreatePayload {
  leadId?: string;
  serviceType: ServiceType;
  packageId?: string;
  packageTitle?: string;
  paxCount: number;
  agreedPricePerPax?: number;
  totalAgreedAmount: number;
  milestones: Pick<InvoiceMilestone, "name" | "amount" | "dueDate">[];
  quoteConversion?: Record<string, unknown>;
}

export interface BookingConfirmPayload {
  leadId?: string;
  quoteId?: string;
  clientId?: string;
  serviceType: ServiceType;
  packageId?: string;
  packageTitle?: string;
  paxCount: number;
  agreedPricePerPax?: number;
  totalAgreedAmount: number;
  initialDeposit?: number;
  paymentMethod?: string;
  paymentReference?: string;
  milestones: Pick<InvoiceMilestone, "name" | "amount" | "dueDate">[];
  quoteConversion?: Record<string, unknown>;
}

export interface BookingConfirmationResponse {
  booking: Booking;
  client?: Client;
  invoiceId?: string;
  milestones?: InvoiceMilestone[];
  travelers?: TravelerManifestItem[];
}

export interface BookingDetail extends Booking {
  invoice?: Record<string, unknown>;
  clientDetails?: Client;
}

/**
 * 1. Create a Draft Quotation (Does not reserve seats or convert lead)
 */
export async function createQuotation(payload: QuotationCreatePayload): Promise<Booking> {
  const response = await apiClient.post<Booking>("/bookings/quote", payload);
  return response;
}

/**
 * 2. Confirm Booking (Atomic Conversion with Idempotency Key header)
 */
export async function confirmBooking(
  payload: BookingConfirmPayload,
  idempotencyKey?: string
): Promise<BookingConfirmationResponse> {
  const key =
    idempotencyKey ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idemp-${Date.now()}`);
  const response = await apiClient.post<BookingConfirmationResponse>(
    "/bookings/confirm",
    payload,
    {
      headers: {
        "Idempotency-Key": key,
      },
    }
  );
  return response;
}

/**
 * 3. Fetch All Bookings (Filtered by status, tour_id, or service type)
 */
export async function fetchBookings(params?: {
  status?: BookingStatus | string;
  service_type?: ServiceType | string;
  tour_id?: string;
  client_id?: string;
}): Promise<Booking[]> {
  const response = await apiClient.get<Booking[]>("/bookings", { params });
  return Array.isArray(response) ? response : [];
}

/**
 * 4. Get Booking Detail by Booking ID
 */
export async function getBookingDetail(bookingId: string): Promise<BookingDetail> {
  const response = await apiClient.get<BookingDetail>(`/bookings/${bookingId}`);
  return response;
}

/**
 * 5. Update Traveler Manifest Record
 */
export async function updateBookingTraveler(
  bookingId: string,
  travelerId: string,
  data: Partial<TravelerManifestItem>
): Promise<TravelerManifestItem> {
  const response = await apiClient.put<TravelerManifestItem>(
    `/bookings/${bookingId}/travelers/${travelerId}`,
    data
  );
  return response;
}

/**
 * 6. Cancel Booking (Agency Admin Only)
 */
export async function cancelBooking(
  bookingId: string,
  cancellationReason: string,
  cancellationFeeRetained: number = 0,
  refundMethod: string = "CASH",
  notes?: string
): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/bookings/${bookingId}/cancel`,
    {
      cancellation_reason: cancellationReason,
      cancellation_fee_retained: cancellationFeeRetained,
      refund_method: refundMethod,
      notes,
    }
  );
  return response;
}

/**
 * TourFlow ERP - Bookings & Client Rebooking API Layer
 * Integrates global booking wizard with live FastAPI backend endpoints and DataContext.
 */

import { apiClient } from "@/lib/api-client";
import {
  Booking,
  InvoiceMilestone,
  ServiceType,
  SavedTravelerProfile,
} from "@/types/erp";
import { Client } from "@/lib/lead-operations";

export * from "@/lib/booking-api";

export interface ClientSearchResult extends Client {
  totalBookings?: number;
  totalSpend?: number;
  lastBookingDate?: string;
  savedTravelers?: SavedTravelerProfile[];
}

export interface RebookClientPayload {
  clientId: string;
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
  serviceConfig?: {
    country?: string;
    category?: string;
    serviceFee?: number;
    embassyCharges?: number;
    description?: string;
  };
}

/**
 * Search clients for global re-booking wizard
 */
export async function searchClients(query: string, tenantId?: string): Promise<ClientSearchResult[]> {
  try {
    const response = await apiClient.get<ClientSearchResult[]>("/clients/search", {
      params: { q: query, tenant_id: tenantId },
    });
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.warn("Falling back to local client search:", err);
    return [];
  }
}

/**
 * Fetch saved traveler profiles / family members for a client
 */
export async function getSavedTravelers(clientId: string): Promise<SavedTravelerProfile[]> {
  try {
    const response = await apiClient.get<SavedTravelerProfile[]>(`/clients/${clientId}/travelers`);
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.warn("Falling back to client profile:", err);
    return [];
  }
}

/**
 * Re-book an existing client with atomic conversion
 */
export async function rebookClient(
  payload: RebookClientPayload,
  idempotencyKey?: string
): Promise<{
  booking: Booking;
  client: Client;
  invoiceId?: string;
  milestones?: InvoiceMilestone[];
}> {
  const key =
    idempotencyKey ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idemp-rebook-${Date.now()}`);

  const response = await apiClient.post<{
    booking: Booking;
    client: Client;
    invoiceId?: string;
    milestones?: InvoiceMilestone[];
  }>("/bookings/rebook", payload, {
    headers: {
      "Idempotency-Key": key,
    },
  });

  return response;
}

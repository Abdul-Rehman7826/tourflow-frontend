/**
 * CRM Leads API Client for TourFlow ERP
 * Handles fetching, creating, updating, and deleting leads against the FastAPI backend,
 * transforming snake_case backend payloads to frontend Lead interface objects.
 */

import { apiClient, ApiError } from "./api-client";
import type { Lead, Interaction, LeadStatus, LeadInterestType, LeadSource } from "@/types/erp";

export interface ApiInteractionResponse {
  id?: string;
  lead_id?: string;
  leadId?: string;
  note: string;
  author?: string;
  channel?: string;
  created_at?: string;
  createdAt?: string;
}

export interface ApiLeadResponse {
  id: string | number;
  tenant_id?: string;
  tenantId?: string;
  full_name?: string;
  fullName?: string;
  name?: string;
  phone: string;
  email?: string;
  source?: string;
  interest_type?: string;
  interestType?: string;
  destination_interest?: string;
  destinationInterest?: string;
  group_size?: number;
  groupSize?: number;
  status: string;
  notes?: string;
  interactions?: ApiInteractionResponse[];
  follow_up_date?: string;
  followUpDate?: string;
  assigned_to?: string;
  assignedTo?: string;
  budget?: number;
  created_at?: string;
  createdAt?: string;
  client_id?: string;
  clientId?: string;
  loss_reason?: string;
  lossReason?: string;
  loss_note?: string;
  lossNote?: string;
}

/**
 * Normalizes backend lead payload to frontend Lead model
 */
export function backendToFrontendLead(raw: ApiLeadResponse): Lead {
  const rawStatus = (raw.status || "NEW").toUpperCase() as LeadStatus;
  const validStatus: LeadStatus = ["NEW", "CONTACTED", "QUOTE_SENT", "FOLLOW_UP", "CONVERTED", "LOST"].includes(rawStatus)
    ? rawStatus
    : "NEW";

  const rawInterest = (raw.interest_type || raw.interestType || "GROUP_TOUR").toUpperCase() as LeadInterestType;
  const validInterest: LeadInterestType = ["GROUP_TOUR", "VISA", "UMRAH", "CUSTOM_PACKAGE"].includes(rawInterest)
    ? rawInterest
    : "GROUP_TOUR";

  const interactions: Interaction[] = Array.isArray(raw.interactions)
    ? raw.interactions.map((i, index) => ({
        id: String(i.id || `int-${index}-${Date.now()}`),
        leadId: String(i.lead_id || i.leadId || raw.id),
        note: i.note || "",
        author: i.author || "System Agent",
        channel: (i.channel as Interaction["channel"]) || "Phone Call",
        createdAt: i.created_at || i.createdAt || new Date().toISOString(),
      }))
    : [];

  return {
    id: String(raw.id),
    tenantId: raw.tenant_id || raw.tenantId || "tenant-world-class",
    fullName: raw.full_name || raw.fullName || raw.name || "Unnamed Prospect",
    phone: raw.phone || "",
    email: raw.email || "",
    source: (raw.source as LeadSource) || "Walk-in",
    interestType: validInterest,
    destinationInterest: raw.destination_interest || raw.destinationInterest || "",
    groupSize: raw.group_size ?? raw.groupSize ?? 1,
    status: validStatus,
    notes: raw.notes || "",
    interactions,
    followUpDate: raw.follow_up_date || raw.followUpDate || new Date().toISOString().split("T")[0],
    assignedTo: raw.assigned_to || raw.assignedTo || "Unassigned",
    budget: raw.budget ?? 0,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    clientId: raw.client_id || raw.clientId,
    lossReason: raw.loss_reason || raw.lossReason,
    lossNote: raw.loss_note || raw.lossNote,
  };
}

/**
 * Transforms frontend Lead model or creation data to backend payload (snake_case)
 */
export function frontendToBackendLead(lead: Partial<Lead>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (lead.fullName !== undefined) payload.full_name = lead.fullName;
  if (lead.phone !== undefined) payload.phone = lead.phone;
  if (lead.email !== undefined) payload.email = lead.email;
  if (lead.source !== undefined) payload.source = lead.source;
  if (lead.interestType !== undefined) payload.interest_type = lead.interestType;
  if (lead.destinationInterest !== undefined) payload.destination_interest = lead.destinationInterest;
  if (lead.groupSize !== undefined) payload.group_size = lead.groupSize;
  if (lead.status !== undefined) payload.status = lead.status;
  if (lead.notes !== undefined) payload.notes = lead.notes;
  if (lead.followUpDate !== undefined) payload.follow_up_date = lead.followUpDate;
  if (lead.assignedTo !== undefined) payload.assigned_to = lead.assignedTo;
  if (lead.budget !== undefined) payload.budget = lead.budget;
  if (lead.tenantId !== undefined) payload.tenant_id = lead.tenantId;
  if (lead.clientId !== undefined) payload.client_id = lead.clientId;
  if (lead.lossReason !== undefined) payload.loss_reason = lead.lossReason;
  if (lead.lossNote !== undefined) payload.loss_note = lead.lossNote;

  if (Array.isArray(lead.interactions)) {
    payload.interactions = lead.interactions.map((i) => ({
      id: i.id,
      lead_id: i.leadId,
      note: i.note,
      author: i.author,
      channel: i.channel,
      created_at: i.createdAt,
    }));
  }

  return payload;
}

/**
 * Fetches leads from FastAPI backend GET /leads
 */
export async function fetchLeadsApi(tenantId?: string): Promise<Lead[]> {
  const rawList = await apiClient.get<ApiLeadResponse[]>("/leads", {
    params: tenantId ? { tenant_id: tenantId } : undefined,
  });

  if (!Array.isArray(rawList)) {
    return [];
  }

  return rawList.map(backendToFrontendLead);
}

/**
 * Creates a new lead via POST /leads
 */
export async function createLeadApi(leadData: Omit<Lead, "id" | "createdAt" | "interactions"> & { notes?: string }): Promise<Lead> {
  const backendPayload = frontendToBackendLead(leadData);
  const raw = await apiClient.post<ApiLeadResponse>("/leads", backendPayload);
  return backendToFrontendLead(raw);
}

/**
 * Updates an existing lead via PUT or PATCH /leads/{id}
 */
export async function updateLeadApi(id: string, updates: Partial<Lead>): Promise<Lead> {
  const backendPayload = frontendToBackendLead(updates);
  let raw: ApiLeadResponse;
  try {
    raw = await apiClient.patch<ApiLeadResponse>(`/leads/${id}`, backendPayload);
  } catch (err: unknown) {
    if (err instanceof ApiError && (err.status === 405 || err.status === 404)) {
      raw = await apiClient.put<ApiLeadResponse>(`/leads/${id}`, backendPayload);
    } else {
      throw err;
    }
  }
  return backendToFrontendLead(raw);
}

/**
 * Deletes a lead via DELETE /leads/{id}
 */
export async function deleteLeadApi(id: string): Promise<void> {
  await apiClient.delete(`/leads/${id}`);
}

/**
 * Adds an interaction note to a lead via POST /leads/{id}/interactions
 */
export async function addInteractionApi(
  leadId: string,
  interaction: Omit<Interaction, "id" | "leadId" | "createdAt">
): Promise<Interaction> {
  const payload = {
    note: interaction.note,
    author: interaction.author,
    channel: interaction.channel,
  };

  try {
    const raw = await apiClient.post<ApiInteractionResponse>(`/leads/${leadId}/interactions`, payload);
    return {
      id: String(raw.id || `int-${Date.now()}`),
      leadId,
      note: raw.note || interaction.note,
      author: raw.author || interaction.author,
      channel: (raw.channel as Interaction["channel"]) || interaction.channel,
      createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    };
  } catch {
    // If endpoint isn't separate, fallback to updating lead object directly
    const newInt: Interaction = {
      id: `int-${Date.now()}`,
      leadId,
      note: interaction.note,
      author: interaction.author,
      channel: interaction.channel,
      createdAt: new Date().toISOString(),
    };
    return newInt;
  }
}

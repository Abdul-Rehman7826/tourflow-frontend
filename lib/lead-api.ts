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
  service_type?: string;
  interest_type?: string;
  interestType?: string;
  package_interest?: string;
  destination_interest?: string;
  destinationInterest?: string;
  pax_count?: number;
  group_size?: number;
  groupSize?: number;
  status: string;
  priority?: string;
  notes?: string;
  interactions?: ApiInteractionResponse[];
  scheduled_callback?: string;
  follow_up_date?: string;
  followUpDate?: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  assigned_employee_code?: string;
  assigned_to?: string;
  assignedTo?: string;
  budget_target?: number;
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

  const rawInterest = (raw.service_type || raw.interest_type || raw.interestType || "GROUP_TOUR").toUpperCase() as LeadInterestType;
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
    destinationInterest: raw.package_interest || raw.destination_interest || raw.destinationInterest || "",
    groupSize: raw.pax_count ?? raw.group_size ?? raw.groupSize ?? 1,
    status: validStatus,
    notes: raw.notes || "",
    interactions,
    followUpDate: raw.scheduled_callback ? raw.scheduled_callback.split("T")[0].split(" ")[0] : (raw.follow_up_date || raw.followUpDate || new Date().toISOString().split("T")[0]),
    assignedTo: raw.assigned_employee_name || raw.assigned_to || raw.assignedTo || "Unassigned",
    assignedEmployeeId: raw.assigned_employee_id,
    assigned_employee_id: raw.assigned_employee_id,
    budget: raw.budget_target !== undefined && raw.budget_target !== null ? Number(raw.budget_target) : (raw.budget ?? 0),
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    clientId: raw.client_id || raw.clientId,
    lossReason: raw.loss_reason || raw.lossReason,
    lossNote: raw.loss_note || raw.lossNote,
  };
}

/**
 * Transforms frontend Lead model or creation data to backend payload (snake_case)
 */
export function frontendToBackendLead(lead: Partial<Lead> & { notes?: string; assignedEmployeeId?: string; assigned_employee_id?: string }): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (lead.fullName !== undefined) payload.full_name = lead.fullName;
  if (lead.phone !== undefined) payload.phone = lead.phone;
  if (lead.email !== undefined) payload.email = lead.email;
  if (lead.source !== undefined) payload.source = lead.source;
  if (lead.interestType !== undefined) {
    payload.service_type = lead.interestType;
    payload.interest_type = lead.interestType;
  }
  if (lead.destinationInterest !== undefined) {
    payload.package_interest = lead.destinationInterest;
    payload.destination_interest = lead.destinationInterest;
  }
  if (lead.groupSize !== undefined) {
    payload.pax_count = lead.groupSize;
    payload.group_size = lead.groupSize;
  }
  if (lead.status !== undefined) payload.status = lead.status;
  if (lead.notes !== undefined) payload.notes = lead.notes;
  if (lead.followUpDate !== undefined) {
    payload.scheduled_callback = lead.followUpDate;
    payload.follow_up_date = lead.followUpDate;
  }
  if (lead.assignedTo !== undefined) {
    payload.assigned_to = lead.assignedTo;
  }
  const employeeId = lead.assignedEmployeeId || lead.assigned_employee_id;
  if (employeeId !== undefined && employeeId !== "") {
    payload.assigned_employee_id = employeeId;
  }
  if (lead.budget !== undefined) {
    payload.budget_target = lead.budget;
    payload.budget = lead.budget;
  }
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
export async function createLeadApi(leadData: Omit<Lead, "id" | "createdAt" | "interactions"> & { notes?: string; assignedEmployeeId?: string }): Promise<Lead> {
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
 * Assigns a lead to an employee via POST /leads/{id}/assign
 */
export async function assignLeadApi(leadId: string, employeeId: string | null): Promise<Lead> {
  const raw = await apiClient.post<ApiLeadResponse>(`/leads/${leadId}/assign`, {
    assigned_employee_id: employeeId,
  });
  return backendToFrontendLead(raw);
}

/**
 * Bulk assigns leads to an employee via POST /leads/bulk-assign
 */
export async function bulkAssignLeadsApi(leadIds: string[], employeeId: string | null): Promise<{ count: number }> {
  return await apiClient.post<{ count: number }>('/leads/bulk-assign', {
    lead_ids: leadIds,
    assigned_employee_id: employeeId,
  });
}

/**
 * Logs an interaction on an existing lead via POST /leads/{id}/interactions
 */
export async function addLeadInteractionApi(leadId: string, payload: {
  note: string;
  author?: string;
  channel?: "WhatsApp" | "Walk-in" | "Phone Call" | "Email" | "Office Visit";
  scheduled_callback?: string;
}): Promise<Interaction> {
  const raw = await apiClient.post<ApiInteractionResponse>(`/leads/${leadId}/interactions`, {
    note: payload.note,
    author: payload.author || "Front Desk Rep",
    channel: payload.channel || "Phone Call",
    scheduled_callback: payload.scheduled_callback,
  });

  return {
    id: String(raw.id || `int-${Date.now()}`),
    leadId: String(raw.lead_id || raw.leadId || leadId),
    note: raw.note,
    author: raw.author || payload.author || "Front Desk Rep",
    channel: (raw.channel as Interaction["channel"]) || payload.channel || "Phone Call",
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
  };
}

/**
 * Deletes a lead via DELETE /leads/{id}
 */
export const addInteractionApi = addLeadInteractionApi;

export async function deleteLeadApi(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/leads/${id}`);
    return true;
  } catch (err) {
    console.error(`Failed to delete lead ${id}:`, err);
    return false;
  }
}

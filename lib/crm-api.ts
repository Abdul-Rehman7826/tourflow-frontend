import { apiClient } from "@/lib/api-client";

export interface ClientProfile {
  id: string;
  tenant_id: string;
  country_code: string;
  phone: string;
  normalized_phone: string;
  full_name: string;
  email?: string | null;
  passport_no?: string | null;
  passport_expiry?: string | null;
  address?: string | null;
  total_bookings: number;
  lifetime_spend: number;
  created_at: string;
  updated_at: string;
}

export interface LeadInteraction {
  id: string;
  lead_id: string;
  interaction_type: "PHONE_CALL" | "WHATSAPP" | "OFFICE_VISIT" | "EMAIL" | "QUOTATION_SENT" | "STATUS_CHANGE";
  notes: string;
  author_user_id?: string | null;
  author_name: string;
  scheduled_callback?: string | null;
  created_at: string;
}

export interface LeadRecord {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  assigned_employee_id?: string | null;
  assigned_employee_name?: string | null;
  assigned_employee_code?: string | null;
  country_code: string;
  phone: string;
  normalized_phone: string;
  full_name: string;
  email?: string | null;
  service_type: "GROUP_TOUR" | "UMRAH" | "CUSTOM_HOLIDAY" | "VISA_ONLY" | "FLIGHT_ONLY";
  package_interest?: string | null;
  pax_count: number;
  budget_target?: number | null;
  source: "WALK_IN" | "WHATSAPP" | "PHONE_INBOUND" | "WEB_FORM";
  status: "NEW_INQUIRY" | "CONTACTED" | "QUOTED" | "CONVERTED" | "LOST";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  scheduled_callback?: string | null;
  lost_reason?: string | null;
  lost_notes?: string | null;
  created_at: string;
  updated_at: string;
  is_duplicate?: boolean;
  client?: {
    id: string;
    full_name: string;
    total_bookings: number;
    lifetime_spend: number;
  } | null;
  interactions?: LeadInteraction[];
}

export interface LeadQueueStats {
  unassigned_count: number;
  active_count: number;
  recovery_count: number;
  archived_count: number;
  overdue_callbacks_count: number;
}

export interface DuplicateCheckResult {
  is_duplicate: boolean;
  client: ClientProfile | null;
  active_lead: LeadRecord | null;
}

export interface CreateLeadPayload {
  full_name: string;
  country_code: string;
  phone: string;
  email?: string;
  service_type: string;
  package_interest?: string;
  pax_count?: number;
  budget_target?: number;
  source: string;
  priority?: string;
  assigned_employee_id?: string;
  scheduled_callback?: string;
  notes?: string;
}

export async function fetchLeadsApi(params?: {
  queue?: string;
  status?: string;
  search?: string;
  assigned_employee_id?: string;
}): Promise<LeadRecord[]> {
  return apiClient.get<LeadRecord[]>("/leads", { params });
}

export async function fetchQueueStatsApi(): Promise<LeadQueueStats> {
  return apiClient.get<LeadQueueStats>("/leads/queue-stats");
}

export async function createLeadApi(payload: CreateLeadPayload): Promise<LeadRecord> {
  return apiClient.post<LeadRecord>("/leads", payload);
}

export async function fetchLeadApi(leadId: string): Promise<LeadRecord> {
  return apiClient.get<LeadRecord>(`/leads/${encodeURIComponent(leadId)}`);
}

export async function updateLeadApi(
  leadId: string,
  payload: Partial<CreateLeadPayload> & { status?: string }
): Promise<LeadRecord> {
  return apiClient.patch<LeadRecord>(`/leads/${encodeURIComponent(leadId)}`, payload);
}

export async function assignLeadApi(
  leadId: string,
  assignedEmployeeId: string | null
): Promise<LeadRecord> {
  return apiClient.post<LeadRecord>(`/leads/${encodeURIComponent(leadId)}/assign`, {
    assigned_employee_id: assignedEmployeeId,
  });
}

export async function bulkAssignLeadsApi(
  leadIds: string[],
  assignedEmployeeId: string | null
): Promise<{ success: boolean; updated_count: number }> {
  return apiClient.post<{ success: boolean; updated_count: number }>("/leads/bulk-assign", {
    lead_ids: leadIds,
    assigned_employee_id: assignedEmployeeId,
  });
}

export async function markLeadLostApi(
  leadId: string,
  lostReason: string,
  lostNotes?: string
): Promise<LeadRecord> {
  return apiClient.post<LeadRecord>(`/leads/${encodeURIComponent(leadId)}/mark-lost`, {
    lost_reason: lostReason,
    lost_notes: lostNotes,
  });
}

export async function addLeadInteractionApi(
  leadId: string,
  payload: {
    interaction_type: string;
    notes: string;
    scheduled_callback?: string;
  }
): Promise<LeadInteraction> {
  return apiClient.post<LeadInteraction>(
    `/leads/${encodeURIComponent(leadId)}/interactions`,
    payload
  );
}

export async function fetchLeadInteractionsApi(leadId: string): Promise<LeadInteraction[]> {
  return apiClient.get<LeadInteraction[]>(`/leads/${encodeURIComponent(leadId)}/interactions`);
}

export async function fetchClientsApi(search?: string): Promise<ClientProfile[]> {
  return apiClient.get<ClientProfile[]>("/clients", { params: { q: search } });
}

export async function checkDuplicateClientApi(
  countryCode: string,
  phone: string
): Promise<DuplicateCheckResult> {
  return apiClient.get<DuplicateCheckResult>("/clients/check-duplicate", {
    params: { country_code: countryCode, phone },
  });
}

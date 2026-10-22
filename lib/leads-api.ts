/**
 * TourFlow ERP - Leads & Call Center Operational Queues API Layer
 * Connects frontend 4-Queue Call Center to FastAPI backend endpoints and DataContext.
 */

import { apiClient } from "@/lib/api-client";
import { Lead, LeadInterestType, LeadStatus, Interaction, LeadSource } from "@/types/erp";
import { LossReason } from "@/lib/lead-operations";

export type LeadQueueType = "UNASSIGNED" | "ACTIVE_SALES" | "PAYMENT_RECOVERY" | "ARCHIVE";

export interface LeadQueueStats {
  unassignedCount: number;
  activeSalesCount: number;
  paymentRecoveryCount: number;
  archiveCount: number;
  callbacksDueToday: number;
  callbacksOverdue: number;
  walkInsCount: number;
  convertedCount: number;
}

export interface BulkAssignPayload {
  leadIds: string[];
  assignedTo: string;
}

export interface LeadInteractionPayload {
  leadId: string;
  channel: "PHONE_CALL" | "WHATSAPP" | "EMAIL" | "IN_PERSON" | "NOTE";
  summary: string;
  sentiment?: "POSITIVE" | "NEUTRAL" | "HESITANT" | "PRICE_SENSITIVE" | "LOST";
  nextFollowUpDate?: string;
  authorName?: string;
}

export interface LeadStatusUpdatePayload {
  status: LeadStatus;
  lossReason?: LossReason;
  lossNotes?: string;
}

/**
 * Determine which operational queue a lead belongs to
 */
export function categorizeLeadQueue(lead: Lead): LeadQueueType {
  if (lead.status === "CONVERTED" || lead.status === "LOST") {
    return "ARCHIVE";
  }
  if (!lead.assignedTo?.trim() || lead.assignedTo.trim().toLowerCase() === "unassigned") {
    return "UNASSIGNED";
  }
  return "ACTIVE_SALES";
}

/**
 * Calculate detailed callback status: OVERDUE, DUE_TODAY, UPCOMING, or NONE
 */
export function getLeadCallbackStatus(lead: Lead, todayStr: string): "OVERDUE" | "DUE_TODAY" | "UPCOMING" | "NONE" {
  if (["LOST", "CONVERTED"].includes(lead.status) || !lead.followUpDate || !todayStr) {
    return "NONE";
  }
  const day = lead.followUpDate.slice(0, 10);
  if (day < todayStr) return "OVERDUE";
  if (day === todayStr) return "DUE_TODAY";
  return "UPCOMING";
}

/**
 * Format phone number into clean WhatsApp link
 */
export function getWhatsAppLink(phone: string, clientName?: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (/^03\d{9}$/.test(cleaned)) cleaned = `92${cleaned.slice(1)}`;
  if (/^3\d{9}$/.test(cleaned)) cleaned = `92${cleaned}`;
  
  const text = encodeURIComponent(
    `Hello ${clientName || "there"}, thank you for contacting World Class Holidays! How may we assist with your travel inquiries today?`
  );
  return `https://wa.me/${cleaned}?text=${text}`;
}

// Convert Backend Lead record (snake_case) to Frontend Lead (camelCase)
export function backendToFrontendLead(item: Record<string, unknown>): Lead {
  if (!item) return {} as Lead;

  return {
    id: String(item.id || item.lead_id || `lead-${Date.now()}`),
    tenantId: String(item.tenant_id || item.tenantId || "tenant-world-class"),
    fullName: String(item.full_name || item.fullName || "Unnamed Lead"),
    phone: String(item.phone || ""),
    email: item.email as string | undefined,
    interestType: (item.interest_type || item.interestType || "GROUP_TOUR") as LeadInterestType,
    destinationInterest: (item.destination_interest || item.destinationInterest || item.destination) as string | undefined,
    budget: Number(item.estimated_budget || item.budget || item.estimatedBudget || 0),
    groupSize: Number(item.group_size || item.groupSize || 1),
    source: (item.source || "Walk-in") as LeadSource,
    status: (item.status || "NEW") as LeadStatus,
    lossReason: item.loss_reason as LossReason | undefined,
    assignedTo: String(item.assigned_to || item.assignedTo || "Unassigned"),
    notes: (item.notes || "") as string,
    followUpDate: String(item.follow_up_date || item.followUpDate || ""),
    createdAt: String(item.created_at || item.createdAt || new Date().toISOString()),
    interactions: Array.isArray(item.interactions) ? (item.interactions as Interaction[]) : [],
  };
}

/**
 * API Methods
 */
export async function fetchLeadsQueue(queueType: LeadQueueType, params?: { search?: string; source?: string; interest?: string }) {
  try {
    const query = new URLSearchParams({ queue: queueType, ...params }).toString();
    const res = await apiClient.get<Record<string, unknown>[]>(`/leads?${query}`);
    return Array.isArray(res) ? res.map(backendToFrontendLead) : [];
  } catch (err) {
    console.warn(`[leads-api] fetchLeadsQueue ${queueType} error:`, err);
    return null;
  }
}

export async function bulkAssignLeads(payload: BulkAssignPayload) {
  try {
    return await apiClient.post<{ updatedCount: number }>("/leads/bulk-assign", {
      lead_ids: payload.leadIds,
      assigned_to: payload.assignedTo,
    });
  } catch (err) {
    console.warn("[leads-api] bulkAssignLeads error:", err);
    return null;
  }
}

export async function logLeadInteraction(payload: LeadInteractionPayload) {
  try {
    return await apiClient.post<Interaction>(`/leads/${payload.leadId}/interactions`, {
      channel: payload.channel,
      summary: payload.summary,
      sentiment: payload.sentiment,
      next_follow_up_date: payload.nextFollowUpDate,
      author_name: payload.authorName,
    });
  } catch (err) {
    console.warn("[leads-api] logLeadInteraction error:", err);
    return null;
  }
}

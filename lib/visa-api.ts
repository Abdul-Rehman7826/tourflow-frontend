/**
 * Visa Operations & Passport Safe Custody Vault API Client for TourFlow ERP
 * Handles fetching, creating, updating, and physical custody transfers against FastAPI /api/v1/visa.
 */

import { apiClient, ApiError } from "./api-client";
import type {
  VisaCase,
  VisaStage,
  VisaDecision,
  PassportCustodyLocation,
  VisaDocumentItem,
  PassportCustodyEvent,
} from "@/types/erp";

export interface ApiCustodyEventResponse {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  visa_case_id?: string;
  visaCaseId?: string;
  passport_number?: string;
  passportNumber?: string;
  from_location?: PassportCustodyLocation;
  fromLocation?: PassportCustodyLocation;
  to_location?: PassportCustodyLocation;
  toLocation?: PassportCustodyLocation;
  actor_staff_id?: string;
  actor_staff_name?: string;
  staffId?: string;
  staffName?: string;
  transferredByStaff?: string;
  transferredBy?: string;
  safe_locker_id?: string;
  custodySafeLockerId?: string;
  courier_tracking_code?: string;
  courierTrackingCode?: string;
  notes?: string;
  details?: string;
  reference?: string;
  created_at?: string;
  timestamp?: string;
}

export interface ApiVisaDocumentResponse {
  id: string;
  name: string;
  required?: boolean;
  received?: boolean;
  verified?: boolean;
  file_url?: string;
  fileUrl?: string;
  notes?: string;
  verified_at?: string;
  verifiedAt?: string;
}

export interface ApiVisaCaseResponse {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  case_number?: string;
  caseNumber?: string;
  client_id?: string;
  clientId?: string;
  booking_id?: string;
  bookingId?: string;
  booking_ref?: string;
  bookingRef?: string;
  traveler_id?: string;
  travelerId?: string;
  source_type?: "GROUP_TOUR" | "STANDALONE_CONSULTANCY";
  sourceType?: "GROUP_TOUR" | "STANDALONE_CONSULTANCY";
  tour_id?: string;
  tourId?: string;
  tour_title?: string;
  tourTitle?: string;
  applicant_name?: string;
  applicantName?: string;
  applicant_phone?: string;
  applicantPhone?: string;
  country?: string;
  visa_type?: string;
  visaType?: string;
  stage?: string;
  decision?: string;
  is_archived?: boolean;
  isArchived?: boolean;
  assigned_staff_id?: string;
  assignedStaffId?: string;
  assigned_staff_name?: string;
  assignedStaffName?: string;
  appointment_date?: string;
  appointmentDate?: string;
  appointment_time?: string;
  appointmentTime?: string;
  submission_date?: string;
  submissionDate?: string;
  decision_date?: string;
  decisionDate?: string;
  center_name?: string;
  centerName?: string;
  embassy_tracking_ref?: string;
  embassyTrackingRef?: string;
  passport_number?: string;
  passportNumber?: string;
  passport_expiry?: string;
  passportExpiry?: string;
  passport_custody?: PassportCustodyLocation;
  passportCustody?: PassportCustodyLocation;
  custody_confirmed?: boolean;
  custodyConfirmed?: boolean;
  custody_safe_locker_id?: string;
  custodySafeLockerId?: string;
  courier_tracking_code?: string;
  courierTrackingCode?: string;
  consultancy_fee?: number;
  consultancyFee?: number;
  embassy_fee_paid?: number;
  embassyFeePaid?: number;
  document_checklist?: ApiVisaDocumentResponse[];
  documentChecklist?: ApiVisaDocumentResponse[];
  custody_history?: ApiCustodyEventResponse[];
  custodyHistory?: ApiCustodyEventResponse[];
  notes?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface CustodyTransferPayload {
  to_location?: PassportCustodyLocation;
  toLocation?: PassportCustodyLocation;
  safe_locker_id?: string;
  safeLockerId?: string;
  custodySafeLockerId?: string;
  courier_tracking_code?: string;
  courierTrackingCode?: string;
  notes?: string;
  details?: string;
  actor_staff_id?: string;
  actor_staff_name?: string;
}

export interface CreateVisaCasePayload {
  client_id?: string;
  clientId?: string;
  applicant_name: string;
  applicantName?: string;
  applicant_phone: string;
  applicantPhone?: string;
  country: string;
  visa_type: string;
  visaType?: string;
  passport_number: string;
  passportNumber?: string;
  passport_expiry?: string;
  passportExpiry?: string;
  consultancy_fee?: number;
  consultancyFee?: number;
  embassy_fee_paid?: number;
  embassyFeePaid?: number;
  assigned_staff_id?: string;
  assignedStaffId?: string;
  assigned_staff_name?: string;
  assignedStaffName?: string;
  appointment_date?: string;
  appointmentDate?: string;
  center_name?: string;
  centerName?: string;
  document_checklist?: Partial<VisaDocumentItem>[];
  documentChecklist?: Partial<VisaDocumentItem>[];
  notes?: string;
}

export interface VaultSummary {
  totalInCustody: number;
  officeSafeCount: number;
  atEmbassyCount: number;
  dispatchedCourierCount: number;
  withCaseOfficerCount: number;
  unconfirmedCount: number;
}

/**
 * Normalizes an API Custody Event to frontend PassportCustodyEvent
 */
export function backendToFrontendCustodyEvent(raw: ApiCustodyEventResponse): PassportCustodyEvent {
  const fromLoc = raw.from_location || raw.fromLocation;
  const toLoc = raw.to_location || raw.toLocation;
  const staff = raw.actor_staff_name || raw.staffName || raw.transferredByStaff || raw.transferredBy;
  const staffId = raw.actor_staff_id || raw.staffId;
  const locker = raw.safe_locker_id || raw.custodySafeLockerId;
  const courier = raw.courier_tracking_code || raw.courierTrackingCode;
  const note = raw.notes || raw.details || raw.reference;
  const ts = raw.created_at || raw.timestamp || new Date().toISOString();

  return {
    id: String(raw.id || `evt-${Date.now()}`),
    tenant_id: raw.tenant_id || raw.tenantId,
    tenantId: raw.tenantId || raw.tenant_id,
    visa_case_id: raw.visa_case_id || raw.visaCaseId,
    visaCaseId: raw.visaCaseId || raw.visa_case_id,
    passport_number: raw.passport_number || raw.passportNumber,
    passportNumber: raw.passportNumber || raw.passport_number,
    from_location: fromLoc,
    fromLocation: fromLoc,
    to_location: toLoc,
    toLocation: toLoc,
    from: fromLoc,
    to: toLoc,
    actor_staff_id: staffId,
    staffId: staffId,
    actor_staff_name: staff,
    staffName: staff,
    transferredBy: staff,
    transferredByStaff: staff,
    safe_locker_id: locker,
    custodySafeLockerId: locker,
    courier_tracking_code: courier,
    courierTrackingCode: courier,
    notes: note,
    details: note,
    created_at: ts,
    timestamp: ts,
  };
}

/**
 * Normalizes an API Visa Document Item to frontend VisaDocumentItem
 */
export function backendToFrontendVisaDoc(raw: ApiVisaDocumentResponse, idx = 0): VisaDocumentItem {
  return {
    id: String(raw.id || `doc-${idx}-${Date.now()}`),
    name: raw.name || "Untitled Document",
    required: raw.required ?? true,
    received: raw.received ?? false,
    verified: raw.verified ?? false,
    file_url: raw.file_url || raw.fileUrl,
    fileUrl: raw.fileUrl || raw.file_url,
    notes: raw.notes,
    verifiedAt: raw.verified_at || raw.verifiedAt,
  };
}

/**
 * Normalizes an API Visa Case Response to the frontend VisaCase model
 */
export function backendToFrontendVisaCase(raw: ApiVisaCaseResponse): VisaCase {
  const rawStage = (raw.stage || "DOCUMENTS_PENDING").toUpperCase() as VisaStage;
  const stage: VisaStage = [
    "DOCUMENTS_PENDING",
    "APPOINTMENT_BOOKED",
    "SUBMITTED_TO_EMBASSY",
    "DECISION_RECEIVED",
    "PASSPORT_READY_FOR_PICKUP",
    "COMPLETED",
    "DELIVERED",
  ].includes(rawStage)
    ? rawStage
    : "DOCUMENTS_PENDING";

  const rawDecision = (raw.decision || "PENDING").toUpperCase() as VisaDecision;
  const decision: VisaDecision = [
    "PENDING",
    "APPROVED",
    "REFUSED",
    "ADDITIONAL_DOCS_REQUESTED",
  ].includes(rawDecision)
    ? rawDecision
    : "PENDING";

  const rawCustody = (raw.passport_custody || raw.passportCustody || "CLIENT_HOLDING").toUpperCase() as PassportCustodyLocation;
  const passportCustody: PassportCustodyLocation = [
    "CLIENT_HOLDING",
    "OFFICE_SAFE",
    "WITH_CASE_OFFICER",
    "SUBMITTED_TO_VFS_GERRYS",
    "AT_EMBASSY",
    "DISPATCHED_COURIER",
  ].includes(rawCustody)
    ? rawCustody
    : "CLIENT_HOLDING";

  const rawDocs = raw.document_checklist || raw.documentChecklist || [];
  const documentChecklist: VisaDocumentItem[] = rawDocs.map((d, i) => backendToFrontendVisaDoc(d, i));

  const rawHistory = raw.custody_history || raw.custodyHistory || [];
  const custodyHistory: PassportCustodyEvent[] = rawHistory.map(backendToFrontendCustodyEvent);

  const id = String(raw.id);
  const tenantId = String(raw.tenant_id || raw.tenantId || "default");
  const caseNumber = String(raw.case_number || raw.caseNumber || `VSA-${new Date().getFullYear()}-${id.slice(0, 4)}`);
  const applicantName = raw.applicant_name || raw.applicantName || "Unnamed Applicant";
  const applicantPhone = raw.applicant_phone || raw.applicantPhone || "";
  const country = raw.country || "Global";
  const visaType = raw.visa_type || raw.visaType || "Tourist Visa";
  const passportNumber = raw.passport_number || raw.passportNumber || "";
  const passportExpiry = raw.passport_expiry || raw.passportExpiry;
  const consultancyFee = Number(raw.consultancy_fee ?? raw.consultancyFee ?? 0);
  const embassyFeePaid = Number(raw.embassy_fee_paid ?? raw.embassyFeePaid ?? 0);
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updated_at || raw.updatedAt || createdAt;

  const isArchived = Boolean(raw.is_archived ?? raw.isArchived ?? (stage === "COMPLETED" || stage === "DELIVERED"));
  const custodyConfirmed = Boolean(raw.custody_confirmed ?? raw.custodyConfirmed ?? (passportCustody !== "CLIENT_HOLDING"));
  const custodySafeLockerId = raw.custody_safe_locker_id || raw.custodySafeLockerId;
  const courierTrackingCode = raw.courier_tracking_code || raw.courierTrackingCode;
  const assignedStaffId = raw.assigned_staff_id || raw.assignedStaffId;
  const assignedStaffName = raw.assigned_staff_name || raw.assignedStaffName;
  const appointmentDate = raw.appointment_date || raw.appointmentDate;
  const appointmentTime = raw.appointment_time || raw.appointmentTime;
  const submissionDate = raw.submission_date || raw.submissionDate;
  const decisionDate = raw.decision_date || raw.decisionDate;
  const centerName = raw.center_name || raw.centerName;
  const embassyTrackingRef = raw.embassy_tracking_ref || raw.embassyTrackingRef;

  return {
    id,
    tenantId,
    tenant_id: tenantId,
    caseNumber,
    case_number: caseNumber,
    clientId: String(raw.client_id || raw.clientId || ""),
    client_id: String(raw.client_id || raw.clientId || ""),
    bookingId: raw.booking_id || raw.bookingId,
    booking_id: raw.booking_id || raw.bookingId,
    bookingRef: raw.booking_ref || raw.bookingRef,
    booking_ref: raw.booking_ref || raw.bookingRef,
    travelerId: raw.traveler_id || raw.travelerId,
    traveler_id: raw.traveler_id || raw.travelerId,
    sourceType: raw.source_type || raw.sourceType || "STANDALONE_CONSULTANCY",
    source_type: raw.source_type || raw.sourceType || "STANDALONE_CONSULTANCY",
    tourId: raw.tour_id || raw.tourId,
    tour_id: raw.tour_id || raw.tourId,
    tourTitle: raw.tour_title || raw.tourTitle,
    tour_title: raw.tour_title || raw.tourTitle,
    applicantName,
    applicant_name: applicantName,
    applicantPhone,
    applicant_phone: applicantPhone,
    country,
    visaType,
    visa_type: visaType,
    stage,
    decision,
    isArchived,
    is_archived: isArchived,
    assignedStaffId,
    assigned_staff_id: assignedStaffId,
    assignedStaffName,
    assigned_staff_name: assignedStaffName,
    appointmentDate,
    appointment_date: appointmentDate,
    appointmentTime,
    appointment_time: appointmentTime,
    submissionDate,
    submission_date: submissionDate,
    decisionDate,
    decision_date: decisionDate,
    centerName,
    center_name: centerName,
    embassyTrackingRef,
    embassy_tracking_ref: embassyTrackingRef,
    passportNumber,
    passport_number: passportNumber,
    passportExpiry,
    passport_expiry: passportExpiry,
    passportCustody,
    passport_custody: passportCustody,
    custodyConfirmed,
    custody_confirmed: custodyConfirmed,
    custodySafeLockerId,
    custody_safe_locker_id: custodySafeLockerId,
    courierTrackingCode,
    courier_tracking_code: courierTrackingCode,
    custodyHistory,
    custody_history: custodyHistory,
    consultancyFee,
    consultancy_fee: consultancyFee,
    embassyFeePaid,
    embassy_fee_paid: embassyFeePaid,
    documentChecklist,
    document_checklist: documentChecklist,
    notes: raw.notes,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt,
  };
}

/**
 * Fetch all visa pipeline cases for an agency tenant
 */
export async function fetchVisaCases(tenantId?: string): Promise<VisaCase[]> {
  try {
    const params = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    let data: ApiVisaCaseResponse[];

    try {
      data = await apiClient.get<ApiVisaCaseResponse[]>(`/visa/cases${params}`);
    } catch {
      // Fallback endpoint
      data = await apiClient.get<ApiVisaCaseResponse[]>(`/visa${params}`);
    }

    if (Array.isArray(data)) {
      return data.map(backendToFrontendVisaCase);
    }
    return [];
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn(`[Visa API] fetchVisaCases returned HTTP ${error.status}: ${error.message}`);
    } else {
      console.warn("[Visa API] fetchVisaCases network error, using local state", error);
    }
    throw error;
  }
}

/**
 * Fetch a single visa case by ID
 */
export async function getVisaCaseDetail(caseId: string): Promise<VisaCase> {
  try {
    let data: ApiVisaCaseResponse;
    try {
      data = await apiClient.get<ApiVisaCaseResponse>(`/visa/cases/${encodeURIComponent(caseId)}`);
    } catch {
      data = await apiClient.get<ApiVisaCaseResponse>(`/visa/${encodeURIComponent(caseId)}`);
    }
    return backendToFrontendVisaCase(data);
  } catch (error) {
    console.warn(`[Visa API] getVisaCaseDetail failed for ${caseId}`, error);
    throw error;
  }
}

/**
 * Create a new standalone visa case
 */
export async function createVisaCase(payload: CreateVisaCasePayload): Promise<VisaCase> {
  try {
    const body = {
      client_id: payload.client_id || payload.clientId,
      applicant_name: payload.applicant_name || payload.applicantName,
      applicant_phone: payload.applicant_phone || payload.applicantPhone,
      country: payload.country,
      visa_type: payload.visa_type || payload.visaType,
      passport_number: payload.passport_number || payload.passportNumber,
      passport_expiry: payload.passport_expiry || payload.passportExpiry,
      consultancy_fee: payload.consultancy_fee ?? payload.consultancyFee ?? 0,
      embassy_fee_paid: payload.embassy_fee_paid ?? payload.embassyFeePaid ?? 0,
      assigned_staff_id: payload.assigned_staff_id || payload.assignedStaffId,
      assigned_staff_name: payload.assigned_staff_name || payload.assignedStaffName,
      appointment_date: payload.appointment_date || payload.appointmentDate,
      center_name: payload.center_name || payload.centerName,
      document_checklist: payload.document_checklist || payload.documentChecklist,
      notes: payload.notes,
    };

    let data: ApiVisaCaseResponse;
    try {
      data = await apiClient.post<ApiVisaCaseResponse>("/visa/cases", body);
    } catch {
      data = await apiClient.post<ApiVisaCaseResponse>("/visa", body);
    }
    return backendToFrontendVisaCase(data);
  } catch (error) {
    console.warn("[Visa API] createVisaCase failed", error);
    throw error;
  }
}

/**
 * Update an existing visa case (stage, logistics, notes, staff assignment)
 */
export async function updateVisaCase(caseId: string, payload: Partial<VisaCase>): Promise<VisaCase> {
  try {
    const body: Record<string, unknown> = {};

    if (payload.stage !== undefined) body.stage = payload.stage;
    if (payload.decision !== undefined) body.decision = payload.decision;
    if (payload.applicantName !== undefined) body.applicant_name = payload.applicantName;
    if (payload.applicantPhone !== undefined) body.applicant_phone = payload.applicantPhone;
    if (payload.country !== undefined) body.country = payload.country;
    if (payload.visaType !== undefined) body.visa_type = payload.visaType;
    if (payload.passportNumber !== undefined) body.passport_number = payload.passportNumber;
    if (payload.passportExpiry !== undefined) body.passport_expiry = payload.passportExpiry;
    if (payload.appointmentDate !== undefined) body.appointment_date = payload.appointmentDate;
    if (payload.appointmentTime !== undefined) body.appointment_time = payload.appointmentTime;
    if (payload.submissionDate !== undefined) body.submission_date = payload.submissionDate;
    if (payload.decisionDate !== undefined) body.decision_date = payload.decisionDate;
    if (payload.centerName !== undefined) body.center_name = payload.centerName;
    if (payload.embassyTrackingRef !== undefined) body.embassy_tracking_ref = payload.embassyTrackingRef;
    if (payload.assignedStaffId !== undefined) body.assigned_staff_id = payload.assignedStaffId;
    if (payload.assignedStaffName !== undefined) body.assigned_staff_name = payload.assignedStaffName;
    if (payload.consultancyFee !== undefined) body.consultancy_fee = payload.consultancyFee;
    if (payload.embassyFeePaid !== undefined) body.embassy_fee_paid = payload.embassyFeePaid;
    if (payload.notes !== undefined) body.notes = payload.notes;
    if (payload.isArchived !== undefined) body.is_archived = payload.isArchived;

    let data: ApiVisaCaseResponse;
    try {
      data = await apiClient.patch<ApiVisaCaseResponse>(`/visa/cases/${encodeURIComponent(caseId)}`, body);
    } catch {
      data = await apiClient.patch<ApiVisaCaseResponse>(`/visa/${encodeURIComponent(caseId)}`, body);
    }
    return backendToFrontendVisaCase(data);
  } catch (error) {
    console.warn(`[Visa API] updateVisaCase failed for ${caseId}`, error);
    throw error;
  }
}

/**
 * Transfer physical passport custody location with immutable audit event logging
 */
export async function transferPassportCustody(
  caseId: string,
  payload: CustodyTransferPayload
): Promise<{ case: VisaCase; event: PassportCustodyEvent }> {
  try {
    const body = {
      to_location: payload.to_location || payload.toLocation,
      safe_locker_id: payload.safe_locker_id || payload.custodySafeLockerId,
      courier_tracking_code: payload.courier_tracking_code || payload.courierTrackingCode,
      notes: payload.notes || payload.details,
      actor_staff_id: payload.actor_staff_id,
      actor_staff_name: payload.actor_staff_name,
    };

    interface CustodyTransferApiResponse {
      case: ApiVisaCaseResponse;
      event: ApiCustodyEventResponse;
    }

    let response: CustodyTransferApiResponse;
    try {
      response = await apiClient.post<CustodyTransferApiResponse>(
        `/visa/cases/${encodeURIComponent(caseId)}/custody`,
        body
      );
    } catch {
      response = await apiClient.post<CustodyTransferApiResponse>(
        `/visa/${encodeURIComponent(caseId)}/custody`,
        body
      );
    }

    return {
      case: backendToFrontendVisaCase(response.case),
      event: backendToFrontendCustodyEvent(response.event),
    };
  } catch (error) {
    console.warn(`[Visa API] transferPassportCustody failed for ${caseId}`, error);
    throw error;
  }
}

/**
 * Verify or toggle a document checklist item
 */
export async function verifyChecklistItem(
  caseId: string,
  itemId: string,
  payload: { verified: boolean; received?: boolean; notes?: string; file_url?: string }
): Promise<VisaCase> {
  try {
    const body = {
      verified: payload.verified,
      received: payload.received ?? payload.verified,
      notes: payload.notes,
      file_url: payload.file_url,
    };

    let data: ApiVisaCaseResponse;
    try {
      data = await apiClient.patch<ApiVisaCaseResponse>(
        `/visa/cases/${encodeURIComponent(caseId)}/checklist/${encodeURIComponent(itemId)}`,
        body
      );
    } catch {
      data = await apiClient.patch<ApiVisaCaseResponse>(
        `/visa/${encodeURIComponent(caseId)}/checklist/${encodeURIComponent(itemId)}`,
        body
      );
    }
    return backendToFrontendVisaCase(data);
  } catch (error) {
    console.warn(`[Visa API] verifyChecklistItem failed for ${caseId} / ${itemId}`, error);
    throw error;
  }
}

/**
 * Fetch immutable custody transfer event history for a visa case
 */
export async function fetchCustodyEvents(caseId: string): Promise<PassportCustodyEvent[]> {
  try {
    let data: ApiCustodyEventResponse[];
    try {
      data = await apiClient.get<ApiCustodyEventResponse[]>(
        `/visa/cases/${encodeURIComponent(caseId)}/custody-events`
      );
    } catch {
      data = await apiClient.get<ApiCustodyEventResponse[]>(
        `/visa/${encodeURIComponent(caseId)}/custody-events`
      );
    }

    if (Array.isArray(data)) {
      return data.map(backendToFrontendCustodyEvent);
    }
    return [];
  } catch (error) {
    console.warn(`[Visa API] fetchCustodyEvents failed for ${caseId}`, error);
    throw error;
  }
}

/**
 * Fetch custody vault metrics summary
 */
export async function fetchVaultSummary(tenantId?: string): Promise<VaultSummary> {
  try {
    const params = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return await apiClient.get<VaultSummary>(`/visa/vault/summary${params}`);
  } catch (error) {
    console.warn("[Visa API] fetchVaultSummary failed", error);
    throw error;
  }
}

/**
 * Upload a file to the secure vault for a checklist item
 */
export async function uploadVaultDocument(
  docId: string,
  file: File
): Promise<{ success: boolean; document?: Partial<VisaDocumentItem> }> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;

    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (tenantId) headers["X-Tenant-Id"] = tenantId;

    const response = await fetch(`${baseUrl}/api/v1/vault/documents/${encodeURIComponent(docId)}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed with status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, document: data };
  } catch (error) {
    console.warn(`[Visa API] uploadVaultDocument failed for ${docId}`, error);
    throw error;
  }
}

/**
 * Get secure vault download URL for a document
 */
export function getVaultDownloadUrl(docId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  return `${baseUrl}/api/v1/vault/documents/${encodeURIComponent(docId)}/download`;
}


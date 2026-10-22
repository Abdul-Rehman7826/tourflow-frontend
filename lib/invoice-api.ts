/**
 * TourFlow ERP - Invoices, Receivables & Payment Verification API Service Layer
 * Connects frontend invoices, payment proofs, and verification desk to live FastAPI endpoints.
 */

import { apiClient } from "@/lib/api-client";
import {
  Invoice,
  PaymentProofClaim,
  ReceivablesAging,
  RecoveryCallLog,
  PaymentMethod,
  PaymentProofStatus,
} from "@/types/erp";

export interface PaymentProofSubmitPayload {
  amount: number;
  payment_method: PaymentMethod;
  bank_reference: string;
  screenshot_url: string;
  notes?: string;
}

export interface VerifyClaimPayload {
  action: "APPROVE" | "REJECT";
  verified_method?: PaymentMethod;
  rejection_reason?: string;
}

export interface RecoveryCallSubmitPayload {
  outcome:
    | "PROMISED_PAYMENT"
    | "LEFT_VOICEMAIL"
    | "UNREACHABLE"
    | "DISPUTED_AMOUNT"
    | "SENT_WHATSAPP_DETAILS";
  notes: string;
  callback_date?: string | null;
}

export interface DirectPaymentPayload {
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  receipt_no?: string;
  notes?: string;
}

/**
 * 1. Fetch Invoices (with optional query filters)
 */
export async function fetchInvoices(params?: {
  status?: string;
  search?: string;
  service_type?: string;
  tenant_id?: string;
}): Promise<Invoice[]> {
  try {
    const response = await apiClient.get<Invoice[]>("/invoices", { params });
    return Array.isArray(response) ? response : [];
  } catch (err) {
    console.warn("fetchInvoices API fallback:", err);
    return [];
  }
}

/**
 * 2. Get Single Invoice Detail by ID
 */
export async function getInvoiceDetail(invoiceId: string): Promise<Invoice | null> {
  try {
    const response = await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
    return response;
  } catch (err) {
    console.warn(`getInvoiceDetail API fallback for ${invoiceId}:`, err);
    return null;
  }
}

/**
 * 3. Fetch Receivables Aging Breakdown
 */
export async function fetchReceivablesAging(): Promise<ReceivablesAging | null> {
  try {
    const response = await apiClient.get<ReceivablesAging>("/invoices/receivables/aging");
    return response;
  } catch (err) {
    console.warn("fetchReceivablesAging API fallback:", err);
    return null;
  }
}

/**
 * 4. Submit Payment Proof Claim (Front Desk / Sales Rep Intake)
 */
export async function submitPaymentProof(
  invoiceId: string,
  payload: PaymentProofSubmitPayload
): Promise<PaymentProofClaim> {
  const response = await apiClient.post<PaymentProofClaim>(
    `/invoices/${invoiceId}/proof`,
    payload
  );
  return response;
}

/**
 * 5. Fetch Payment Proof Claims (Admin Verification Queue)
 */
export async function fetchPaymentProofClaims(params?: {
  status?: PaymentProofStatus | string;
  invoice_id?: string;
}): Promise<PaymentProofClaim[]> {
  try {
    const response = await apiClient.get<PaymentProofClaim[]>("/invoices/claims", { params });
    return Array.isArray(response) ? response : [];
  } catch {
    // Backend endpoint fallback: if /invoices/claims is not deployed or matches {invoice_id} 404, gracefully return empty queue
    return [];
  }
}

/**
 * 6. Verify Payment Claim (Agency Admin Only - Approve & Settle or Reject)
 */
export async function verifyPaymentClaim(
  claimId: string,
  payload: VerifyClaimPayload
): Promise<PaymentProofClaim> {
  const response = await apiClient.post<PaymentProofClaim>(
    `/invoices/claims/${claimId}/verify`,
    payload
  );
  return response;
}

/**
 * 7. Log Debt Recovery Call / WhatsApp Note
 */
export async function logRecoveryCall(
  invoiceId: string,
  payload: RecoveryCallSubmitPayload
): Promise<RecoveryCallLog> {
  const response = await apiClient.post<RecoveryCallLog>(
    `/invoices/${invoiceId}/calls`,
    payload
  );
  return response;
}

/**
 * 8. Record Direct Immediate Payment
 */
export async function recordDirectPayment(
  invoiceId: string,
  payload: DirectPaymentPayload
): Promise<Invoice> {
  const response = await apiClient.post<Invoice>(
    `/invoices/${invoiceId}/payments`,
    payload
  );
  return response;
}

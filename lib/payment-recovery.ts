import { payInvoice, type ERPState } from "@/lib/booking-operations";
import type { PaymentMethod, PaymentProofClaim, RecoveryCallLog } from "@/types/erp";

export interface RecoveryActor { id: string; name: string; role: string; tenantId?: string | null }
export type ProofInput = Pick<PaymentProofClaim, "invoiceId" | "amount" | "bankReference" | "screenshotUrl" | "notes">;
export type CallInput = Pick<RecoveryCallLog, "invoiceId" | "outcome" | "notes" | "callbackDate">;
export const RECOVERY_OUTCOMES = ['PROMISED_PAYMENT', 'LEFT_VOICEMAIL', 'UNREACHABLE', 'DISPUTED_AMOUNT', 'SENT_WHATSAPP_DETAILS'] as const;
function invoiceFor(state: ERPState, actor: RecoveryActor, invoiceId: string, admin = false) {
  if (!(admin ? ['AGENCY_ADMIN'] : ['AGENCY_ADMIN', 'FRONT_DESK']).includes(actor.role)) throw new Error('Access restricted.');
  const invoice = state.invoices.find(i => i.id === invoiceId && i.tenantId === actor.tenantId);
  if (!invoice) throw new Error('Invoice not found in this agency.');
  return invoice;
}
export function submitProof(state: ERPState, actor: RecoveryActor, input: ProofInput, now: string, id: string): ERPState {
  const invoice = invoiceFor(state, actor, input.invoiceId);
  if (invoice.status === 'CANCELLED' || !Number.isFinite(input.amount) || input.amount <= 0 || Math.round(input.amount * 100) > Math.round(invoice.dueAmount * 100) || Math.round(input.amount * 100) === 0) throw new Error('Enter a positive claim no greater than the outstanding balance.');
  const reference = input.bankReference.trim();
  if (!reference || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(input.screenshotUrl) || input.screenshotUrl.length > 2800000) throw new Error('A reference and PNG, JPEG or WebP proof image up to 2 MB are required.');
  const claims = state.paymentProofClaims || [];
  if (claims.some(c => c.status !== 'REJECTED' && c.bankReference.toLowerCase() === reference.toLowerCase() && state.invoices.some(i => i.id === c.invoiceId && i.tenantId === actor.tenantId))) throw new Error('This bank reference has already been submitted.');
  const pending = claims.filter(c => c.invoiceId === invoice.id && c.status === 'PENDING_VERIFICATION').reduce((sum, c) => sum + Math.round(c.amount * 100), 0);
  if (pending + Math.round(input.amount * 100) > Math.round(invoice.dueAmount * 100)) throw new Error('Pending claims already cover this balance.');
  const claim: PaymentProofClaim = { ...input, amount: Math.round(input.amount * 100) / 100, bankReference: reference, id, bookingId: invoice.bookingId || '', clientId: invoice.clientId || '', staffId: actor.id, staffName: actor.name, status: 'PENDING_VERIFICATION', createdAt: now };
  return { ...state, paymentProofClaims: [claim, ...claims] };
}
export function reviewProof(state: ERPState, actor: RecoveryActor, claimId: string, decision: 'APPROVE' | 'REJECT', reason: string, method: PaymentMethod, now: string, uuid: () => string): ERPState {
  const claim = state.paymentProofClaims?.find(c => c.id === claimId);
  if (!claim) throw new Error('Claim not found.');
  const invoice = invoiceFor(state, actor, claim.invoiceId, true);
  if (claim.status !== 'PENDING_VERIFICATION') throw new Error('This claim has already been reviewed.');
  if (!['APPROVE', 'REJECT'].includes(decision)) throw new Error('Invalid decision.');
  if (decision === 'REJECT' && !reason.trim()) throw new Error('A rejection reason is required.');
  const next = decision === 'APPROVE' ? payInvoice(state, invoice.tenantId, invoice.id, { amount: claim.amount, method, reference: claim.bankReference, paymentDate: now.slice(0, 10) }, actor.name, uuid) : state;
  return { ...next, paymentProofClaims: (next.paymentProofClaims || []).map(c => c.id === claimId ? { ...c, status: decision === 'APPROVE' ? 'VERIFIED_APPROVED' : 'REJECTED', rejectionReason: decision === 'REJECT' ? reason.trim() : undefined, verifiedAt: now, verifiedByAdminId: actor.id } : c) };
}
export function appendRecoveryCall(state: ERPState, actor: RecoveryActor, input: CallInput, now: string, id: string): ERPState {
  invoiceFor(state, actor, input.invoiceId);
  if (!RECOVERY_OUTCOMES.includes(input.outcome) || !input.notes.trim()) throw new Error('Select an outcome and enter call notes.');
  if (input.callbackDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.callbackDate) || !Number.isFinite(Date.parse(input.callbackDate)) || new Date(input.callbackDate).toISOString().slice(0, 10) !== input.callbackDate)) throw new Error('Enter a valid callback date.');
  return { ...state, recoveryCallLogs: [{ ...input, notes: input.notes.trim(), id, staffName: actor.name, timestamp: now }, ...(state.recoveryCallLogs || [])] };
}

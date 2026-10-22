import type { ERPState } from '@/lib/booking-operations';
import type { LegacyVisaCase, LegacyVisaStage, VisaCase, VisaStage, VisaDecision, PassportCustodyLocation, CustodyTransferEvent, PassportCustodyEvent } from '@/types/erp';
export const VISA_STAGES: VisaStage[] = ['DOCUMENTS_PENDING', 'APPOINTMENT_BOOKED', 'SUBMITTED_TO_EMBASSY', 'DECISION_RECEIVED', 'DELIVERED'];
export const VISA_DECISIONS: VisaDecision[] = ['PENDING', 'APPROVED', 'REFUSED', 'ADDITIONAL_DOCS_REQUESTED'];
export const CUSTODY_LOCATIONS: PassportCustodyLocation[] = ['CLIENT_HOLDING', 'OFFICE_SAFE', 'WITH_CASE_OFFICER', 'SUBMITTED_TO_VFS_GERRYS', 'AT_EMBASSY', 'DISPATCHED_COURIER'];
const legacyStages: Record<VisaStage, LegacyVisaStage> = {
  DOCUMENTS_PENDING: 'Document Collection',
  APPOINTMENT_BOOKED: 'Embassy Appointment',
  SUBMITTED_TO_EMBASSY: 'Embassy Under Review',
  DECISION_RECEIVED: 'Decision (Approved / Rejected)',
  PASSPORT_READY_FOR_PICKUP: 'Passport Delivered to Client',
  COMPLETED: 'Passport Delivered to Client',
  DELIVERED: 'Passport Delivered to Client',
};
export const visaLabel = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

// Run inside the ERP snapshot boundary, never in a render effect. Stable linkage prevents duplicates on reload.
export function bridgeGroupTourVisaCases(state: ERPState): ERPState {
  const visaCases = [...state.visaCases];
  for (const booking of state.bookings) {
    if (booking.serviceType !== 'GROUP_TOUR' || booking.status !== 'CONFIRMED') continue;
    const tour = state.tours.find(t => t.id === booking.packageId && t.tenantId === booking.tenantId);
    if (!tour) continue;
    for (const traveler of booking.travelers || []) {
      if (!traveler.fullName?.trim()) continue;
      const existing = visaCases.find(c => c.tenantId === booking.tenantId && c.bookingId === booking.id && (c.travelerId || c.pipeline?.travelerId) === traveler.id);
      if (existing) continue;
      const id = `group-visa-${booking.id}-${traveler.id}`;
      const serial = Math.max(visaCases.filter(c => c.tenantId === booking.tenantId).length, ...visaCases.filter(c => c.tenantId === booking.tenantId).map(c => Number(c.pipeline?.caseNumber.match(/^VSA-\d{4}-(\d+)$/)?.[1] || 0))) + 1;
      const createdAt = booking.confirmedAt || booking.createdAt;
      const v: VisaCase = {
        id, tenantId: booking.tenantId, caseNumber: `VSA-${createdAt.slice(0, 4)}-${String(serial).padStart(4, '0')}`,
        clientId: booking.clientId, bookingId: booking.id, bookingRef: booking.bookingNumber,
        travelerId: traveler.id, sourceType: 'GROUP_TOUR', tourId: tour.id, tourTitle: tour.title,
        applicantName: traveler.fullName.trim(), applicantPhone: traveler.phone || booking.clientPhone,
        country: tour.destination || tour.title, visaType: 'Tourist Group Visa', stage: 'DOCUMENTS_PENDING', decision: 'PENDING', isArchived: false,
        assignedStaffId: '', assignedStaffName: booking.assignedRep,
        passportNumber: traveler.passportNo || '', passportExpiry: traveler.passportExpiry,
        passportCustody: 'CLIENT_HOLDING', custodyConfirmed: false, custodyHistory: [],
        consultancyFee: 0, embassyFeePaid: 0,
        documentChecklist: ['Original Passport', '6-Month Bank Statement', 'White Background Photos'].map((name, i) => ({ id: `${id}-doc-${i}`, name, required: true, received: false, verified: false })),
        createdAt, updatedAt: createdAt,
      };
      visaCases.push(toLegacy(v));
    }
  }
  return visaCases.length === state.visaCases.length ? state : { ...state, visaCases };
}

export function archiveVisaCase(state: ERPState, actor: VisaActor, id: string, archived: boolean, now: string): ERPState {
  checkActor(actor);
  const raw = state.visaCases.find(c => c.id === id && c.tenantId === actor.tenantId);
  if (!raw) throw new Error('Visa case not found in this agency.');
  const v = normalizeVisaCase(raw, state);
  if (!archived && (raw.cancelledAt || (v.sourceType === 'GROUP_TOUR' && !state.bookings.some(b => b.id === v.bookingId && b.tenantId === actor.tenantId && b.status === 'CONFIRMED' && b.travelers.some(t => t.id === v.travelerId && t.fullName?.trim()))))) throw new Error('This traveler is no longer on a confirmed booking.');
  const updated = toLegacy({ ...v, isArchived: archived, stage: !archived && v.stage === 'DELIVERED' ? 'DECISION_RECEIVED' : v.stage, updatedAt: now }, raw);
  return { ...state, visaCases: state.visaCases.map(c => c === raw ? updated : c) };
}
export function normalizeVisaCase(raw: LegacyVisaCase, state: ERPState): VisaCase {
  const booking = state.bookings.find(b => b.id === raw.bookingId && b.tenantId === raw.tenantId);
  const saved = raw.pipeline;
  const tour = booking?.serviceType === 'GROUP_TOUR' ? state.tours.find(t => t.id === booking.packageId && t.tenantId === raw.tenantId) : undefined;
  const traveler = booking?.travelers.find(t => t.id === raw.travelerId);
  const client = state.clients.find(c => c.id === (saved?.clientId || booking?.clientId) && c.tenantId === raw.tenantId);
  const savedStage = saved?.stage as string | undefined;
  const stage: VisaStage = (savedStage === 'COMPLETED' ? 'DELIVERED' : savedStage === 'PASSPORT_READY_FOR_PICKUP' ? 'DECISION_RECEIVED' : VISA_STAGES.includes(savedStage as VisaStage) ? savedStage as VisaStage : undefined) || (raw.stage === 'Passport Delivered to Client' ? 'DELIVERED' : ['Approved', 'Rejected', 'Decision (Approved / Rejected)'].includes(raw.stage) ? 'DECISION_RECEIVED' : ['Embassy Under Review', 'Under Embassy Review'].includes(raw.stage) ? 'SUBMITTED_TO_EMBASSY' : ['Embassy Appointment', 'Ready for Submission'].includes(raw.stage) ? 'APPOINTMENT_BOOKED' : 'DOCUMENTS_PENDING');
  return {
    id: raw.id, tenantId: raw.tenantId, bookingId: raw.bookingId,
    sourceType: tour ? 'GROUP_TOUR' : saved?.sourceType || 'STANDALONE_CONSULTANCY',
    tourId: tour?.id || saved?.tourId, tourTitle: tour?.title || saved?.tourTitle,
    bookingRef: booking?.bookingNumber || saved?.bookingRef, travelerId: raw.travelerId || saved?.travelerId,
    isArchived: !!raw.cancelledAt || stage === 'DELIVERED' || !!saved?.isArchived || (!!tour && (booking?.status !== 'CONFIRMED' || !traveler?.fullName?.trim())),
    passportExpiry: traveler?.passportExpiry || saved?.passportExpiry,
    caseNumber: saved?.caseNumber || `VSA-${raw.updatedAt.slice(0, 4)}-${raw.id}`,
    clientId: client?.id || '', applicantName: raw.clientName, applicantPhone: saved?.applicantPhone || client?.phone || '', country: raw.country, visaType: raw.visaType,
    stage, decision: saved?.decision || (raw.decisionStatus === 'Approved' || raw.stage === 'Approved' ? 'APPROVED' : raw.decisionStatus === 'Rejected' || raw.stage === 'Rejected' ? 'REFUSED' : 'PENDING'),
    assignedStaffId: saved?.assignedStaffId || '', assignedStaffName: raw.consultantName,
    appointmentDate: raw.appointmentDate || undefined, submissionDate: raw.submissionDate,
    centerName: saved?.centerName, embassyTrackingRef: saved?.embassyTrackingRef || raw.trackingNumber,
    passportNumber: raw.passportNo, passportCustody: saved?.passportCustody || 'CLIENT_HOLDING', custodyConfirmed: saved?.custodyConfirmed || false,
    custodySafeLockerId: saved?.custodySafeLockerId, courierTrackingCode: saved?.courierTrackingCode, custodyHistory: (saved?.custodyHistory || []).map(event => {
      const oldEvent = event as unknown as PassportCustodyEvent;
      return { id: event.id, timestamp: event.timestamp, fromLocation: event.fromLocation ?? oldEvent.from, toLocation: event.toLocation ?? oldEvent.to, transferredByStaff: event.transferredByStaff ?? oldEvent.staffName, staffId: event.staffId, details: event.details ?? oldEvent.reference } satisfies CustodyTransferEvent;
    }),
    consultancyFee: saved?.consultancyFee ?? raw.feeAmount, embassyFeePaid: saved?.embassyFeePaid ?? 0,
    documentChecklist: (raw.documents || []).map(d => ({ id: d.id, name: d.name, required: d.required, received: d.status === 'Verified' || saved?.documentChecklist.find(s => s.id === d.id)?.received || false, verified: d.status === 'Verified', notes: d.notes, fileUrl: saved?.documentChecklist.find(s => s.id === d.id)?.fileUrl })),
    createdAt: saved?.createdAt || raw.updatedAt, updatedAt: raw.updatedAt,
  };
}
export type VisaCaseInput = Omit<VisaCase, 'id' | 'tenantId' | 'caseNumber' | 'createdAt' | 'updatedAt' | 'custodyHistory' | 'bookingId' | 'sourceType' | 'tourId' | 'tourTitle' | 'bookingRef' | 'travelerId' | 'isArchived'>;
export type VisaCasePatch = Partial<VisaCaseInput>;
export interface VisaActor { id: string; name: string; role: string; tenantId?: string | null }
function checkActor(actor: VisaActor) {
  if (!actor.tenantId || !['AGENCY_ADMIN', 'FRONT_DESK', 'VISA_CONSULTANT'].includes(actor.role)) throw new Error('Access restricted.');
}
function validate(v: VisaCase, state: ERPState) {
  if (!VISA_STAGES.includes(v.stage) || !VISA_DECISIONS.includes(v.decision) || !CUSTODY_LOCATIONS.includes(v.passportCustody)) throw new Error('Invalid visa stage, decision or custody location.');
  if (!v.applicantName.trim() || !v.country.trim() || !v.visaType.trim()) throw new Error('Applicant, country and visa category are required.');
  if (v.clientId && !state.clients.some(c => c.id === v.clientId && c.tenantId === v.tenantId)) throw new Error('Client not found in this agency.');
  if (![v.consultancyFee, v.embassyFeePaid ?? 0].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Fees must be non-negative amounts.');
  for (const date of [v.appointmentDate, v.submissionDate]) if (date && !Number.isFinite(Date.parse(date))) throw new Error('Enter valid logistics dates.');
  if (v.documentChecklist.some(d => !d.name.trim() || (d.verified && !d.received)) || new Set(v.documentChecklist.map(d => d.id)).size !== v.documentChecklist.length) throw new Error('Documents need unique IDs and names; receive a document before verifying it.');
  if (v.passportCustody !== 'CLIENT_HOLDING' && !v.passportNumber?.trim()) throw new Error('Passport number is required before taking custody.');
  if (v.passportCustody === 'OFFICE_SAFE' && !v.custodySafeLockerId?.trim()) throw new Error('Enter the safe / locker identifier.');
  if (v.passportCustody === 'DISPATCHED_COURIER' && !v.courierTrackingCode?.trim()) throw new Error('Enter courier tracking before dispatch.');
}
function toLegacy(v: VisaCase, raw?: LegacyVisaCase): LegacyVisaCase {
  return { ...raw, id: v.id, tenantId: v.tenantId, pipeline: v, bookingId: v.bookingId, travelerId: v.travelerId, clientName: v.applicantName, passportNo: v.passportNumber || '', country: v.country, flagEmoji: raw?.flagEmoji || '', visaType: v.visaType, stage: legacyStages[v.stage], appointmentDate: v.appointmentDate || '', submissionDate: v.submissionDate, consultantName: v.assignedStaffName || '', feeAmount: v.consultancyFee + (v.embassyFeePaid || 0), trackingNumber: v.embassyTrackingRef, decisionStatus: v.decision === 'APPROVED' ? 'Approved' : v.decision === 'REFUSED' ? 'Rejected' : 'Pending', documents: v.documentChecklist.map(d => ({ id: d.id, name: d.name, required: d.required, status: d.verified ? 'Verified' : 'Pending', notes: d.notes })), updatedAt: v.updatedAt };
}
export function saveVisaCase(state: ERPState, actor: VisaActor, id: string | null, input: VisaCasePatch, now: string, uuid: () => string): ERPState {
  checkActor(actor);
  const raw = id ? state.visaCases.find(v => v.id === id && v.tenantId === actor.tenantId && !v.cancelledAt) : undefined;
  if (id && !raw) throw new Error('Visa case not found in this agency.');
  const old = raw ? normalizeVisaCase(raw, state) : undefined;
  if (!old && !input.clientId) throw new Error('Link this case to a CRM client.');
  // Only operational fields are editable; tenant, booking linkage and audit IDs are immutable.
  const fields = ['clientId', 'applicantName', 'applicantPhone', 'country', 'visaType', 'stage', 'decision', 'assignedStaffId', 'assignedStaffName', 'appointmentDate', 'centerName', 'embassyTrackingRef', 'submissionDate', 'passportNumber', 'passportExpiry', 'passportCustody', 'custodySafeLockerId', 'courierTrackingCode', 'consultancyFee', 'embassyFeePaid', 'documentChecklist'] as const;
  const patch = Object.fromEntries(fields.filter(k => k in input).map(k => [k, input[k]]));
  const newId = old?.id || uuid();
  const serial = Math.max(state.visaCases.filter(c => c.tenantId === actor.tenantId).length, ...state.visaCases.filter(c => c.tenantId === actor.tenantId).map(c => Number(c.pipeline?.caseNumber.match(/^VSA-\d{4}-(\d+)$/)?.[1] || 0))) + 1;
  const v = { sourceType: 'STANDALONE_CONSULTANCY', isArchived: false, ...old, ...patch, id: newId, tenantId: actor.tenantId!, caseNumber: old?.caseNumber || `VSA-${now.slice(0, 4)}-${String(serial).padStart(4, '0')}`, createdAt: old?.createdAt || now, updatedAt: now, custodyHistory: old?.custodyHistory || [] } as VisaCase;
  if (old?.bookingId && v.clientId !== old.clientId) throw new Error('A booking-linked case cannot change its client.');
  v.isArchived = v.stage === 'DELIVERED' || !!old?.isArchived;
  validate(v, state);
  const custodyChange = !old || old.passportCustody !== v.passportCustody || !old.custodyConfirmed || old.custodySafeLockerId !== v.custodySafeLockerId || old.courierTrackingCode !== v.courierTrackingCode;
  v.custodyConfirmed = old?.custodyConfirmed || false;
  if (custodyChange && 'passportCustody' in input) {
    v.custodyConfirmed = true;
    v.custodyHistory = [{ id: uuid(), fromLocation: old?.passportCustody || 'CLIENT_HOLDING', toLocation: v.passportCustody, staffId: actor.id, transferredByStaff: actor.name, timestamp: now, details: v.passportCustody === 'OFFICE_SAFE' ? v.custodySafeLockerId : v.passportCustody === 'DISPATCHED_COURIER' ? v.courierTrackingCode : v.embassyTrackingRef }, ...(old?.custodyHistory || [])];
  }
  const updated = toLegacy(v, raw);
  return { ...state,
    bookings: state.bookings.map(b => raw?.bookingId === b.id && b.tenantId === actor.tenantId ? { ...b, travelers: b.travelers.map(t => t.id === raw.travelerId ? { ...t, fullName: v.applicantName, phone: v.applicantPhone, passportNo: v.passportNumber, passportExpiry: v.passportExpiry, isComplete: !!(v.applicantName.trim() && v.passportNumber?.trim() && v.passportExpiry) } : t) } : b),
    visaCases: raw ? state.visaCases.map(c => c.id === raw.id && c.tenantId === actor.tenantId ? updated : c) : [updated, ...state.visaCases] };
}

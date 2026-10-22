/**
 * TourFlow Engine - Core ERP Data Models & Multi-Tenant Types
 */

// ============================================================================
// 1. TENANCY
// ============================================================================
export interface Tenant {
  id: string;
  agencyName: string;
  subdomain: string;
  logoUrl?: string;
  subtitle?: string;
  plan?: string;
}

export interface TenantGovernanceRecord {
  id: string;
  name: string;
  subdomain: string;
  contactEmail: string;
  planTier: "STARTER" | "GROWTH" | "ENTERPRISE";
  status: "ACTIVE" | "GRACE_PERIOD" | "SUSPENDED";
  licenseExpiresAt: string;
  mrrPKR: number;
}

// ============================================================================
// 2. LEADS & INTERACTIONS (FRONT DESK & CRM)
// ============================================================================
export type LeadInterestType =
  "GROUP_TOUR" | "VISA" | "UMRAH" | "CUSTOM_PACKAGE";

export type LeadStatus =
  "NEW" | "CONTACTED" | "QUOTE_SENT" | "FOLLOW_UP" | "CONVERTED" | "LOST";

export interface Interaction {
  id: string;
  leadId: string;
  note: string;
  author: string;
  channel: "WhatsApp" | "Walk-in" | "Phone Call" | "Email" | "Office Visit";
  createdAt: string; // ISO date string
}

export type LeadSource =
  "Walk-in" | "WhatsApp" | "Phone Call" | "Meta Ad" | "Referral" | "Web Form";

export interface Lead {
  clientId?: string;
  lossReason?: string;
  lossNote?: string;
  id: string;
  tenantId: string;
  fullName: string;
  phone: string;
  email?: string;
  source?: LeadSource;
  interestType: LeadInterestType;
  destinationInterest?: string;
  groupSize?: number;
  status: LeadStatus;
  notes: string; // Summary / primary note
  interactions: Interaction[]; // Detailed audit log
  followUpDate: string; // ISO date string (YYYY-MM-DD)
  assignedTo: string; // Staff member name
  budget?: number;
  createdAt: string; // ISO date string
}

// ============================================================================
// 3. GROUP TOURS & PASSENGERS (TOUR OPERATIONS)
// ============================================================================
export type TourStatus =
  "PLANNING" | "OPEN" | "GUARANTEED" | "FILLING_FAST" | "SOLD_OUT" | "IN_PROGRESS" | "COMPLETED";

export interface DestinationTag {
  code: string;
  name: string;
}

export type SavedTravelerRelationship = "SELF" | "SPOUSE" | "CHILD" | "PARENT" | "OTHER";

export interface SavedTravelerProfile {
  id: string;
  fullName: string;
  relationship: SavedTravelerRelationship;
  passportNo: string;
  passportExpiry: string;
  dateOfBirth?: string;
  nationality: string;
}

export interface ItineraryDay {
  dayNumber: number;
  date?: string;
  city: string;
  title: string;
  activities: string[];
  hotelName: string;
  mealsIncluded: ("BREAKFAST" | "LUNCH" | "DINNER")[];
}

// Compatibility for saved departures predating the operational contract.
export interface LegacyItineraryDay {
  dayNumber: number;
  title: string;
  city: string;
  hotelStay?: string;
  date?: string;
  hotelName?: string;
  activities: string[];
  mealsIncluded: ("BREAKFAST" | "LUNCH" | "DINNER")[] | string[];
}

export type RoomType = "SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY";

export interface RoomAllocation {
  id: string;
  tourId: string;
  roomNumber: string;
  roomType: RoomType;
  hotelName: string;
  assignedTravelerIds: string[];
  notes?: string;
}

export interface FlightBlock {
  id: string;
  tourId: string;
  airline: string;
  pnrCode: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  baggageAllowance: string;
  totalAllocatedSeats: number;
}

export interface TourPackage {
  id: string;
  tenantId: string;
  title: string;
  slug?: string;
  destination?: string;
  destinations: (string | DestinationTag)[];
  routeFlags?: string[]; // Emojis like ["🇫🇷", "🇨🇭", "🇮🇹", "🇦🇹", "🇩🇪"]
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  durationDays: number;

  durationNights?: number;
  maxCapacity: number;
  bookedSeats: number;
  pricePerPerson: number;
  estimatedSupplierCostPerPax?: number;
  allocatedOverheads?: number;
  basePricePerPax?: number;
  status: TourStatus;
  inclusions: string[];
  bannerGradient?: string;
  itinerary?: (ItineraryDay | LegacyItineraryDay)[];
  flightBlock?: FlightBlock;
  rooms?: RoomAllocation[];
  requiredPassportValidityMonths?: number;
}

export type PassengerPaymentStatus = "PAID" | "PARTIAL" | "UNPAID";

export interface Passenger {
  bookingId?: string;
  travelerId?: string;
  id: string;
  tourId: string;
  name: string;
  familyGroup?: string;
  passportNo: string;
  passportExpiryDate: string; // YYYY-MM-DD
  roomAllocation?:
    | "Single Room"
    | "Double Room"
    | "Twin Room"
    | "Triple Room"
    | "Family Suite"
    | "Quad Sharing";
  paymentStatus: PassengerPaymentStatus;
  contactPhone?: string;
  seatNo?: string;
  notes?: string;
}

// ============================================================================
// 4. VISA APPLICATION PIPELINE
// ============================================================================
export type VisaStage =
  | "DOCUMENTS_PENDING"
  | "APPOINTMENT_BOOKED"
  | "SUBMITTED_TO_EMBASSY"
  | "DECISION_RECEIVED"
  | "PASSPORT_READY_FOR_PICKUP"
  | "COMPLETED"
  | "DELIVERED";

export type VisaDecision =
  | "PENDING"
  | "APPROVED"
  | "REFUSED"
  | "ADDITIONAL_DOCS_REQUESTED";

export type PassportCustodyLocation =
  | "CLIENT_HOLDING"
  | "OFFICE_SAFE"
  | "WITH_CASE_OFFICER"
  | "SUBMITTED_TO_VFS_GERRYS"
  | "AT_EMBASSY"
  | "DISPATCHED_COURIER";

export interface VisaDocumentItem {
  id: string;
  name: string;
  required: boolean;
  received: boolean;
  verified: boolean;
  file_url?: string;
  fileUrl?: string;
  notes?: string;
  verifiedAt?: string;
}

export type VisaDocumentChecklistItem = VisaDocumentItem;

export interface PassportCustodyEvent {
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
  from?: PassportCustodyLocation;
  to?: PassportCustodyLocation;
  actor_staff_id?: string;
  actor_staff_name?: string;
  staffId?: string;
  staffName?: string;
  transferredBy?: string;
  transferredByStaff?: string;
  safe_locker_id?: string;
  custodySafeLockerId?: string;
  courier_tracking_code?: string;
  courierTrackingCode?: string;
  notes?: string;
  details?: string;
  reference?: string;
  receivedBy?: string;
  created_at?: string;
  timestamp: string;
}

export type CustodyTransferEvent = PassportCustodyEvent;

export interface VisaCase {
  id: string;
  tenantId: string;
  tenant_id?: string;
  caseNumber: string;
  case_number?: string;
  clientId: string;
  client_id?: string;
  bookingId?: string;
  booking_id?: string;
  bookingRef?: string;
  booking_ref?: string;
  travelerId?: string;
  traveler_id?: string;
  sourceType?: "GROUP_TOUR" | "STANDALONE_CONSULTANCY";
  source_type?: "GROUP_TOUR" | "STANDALONE_CONSULTANCY";
  tourId?: string;
  tour_id?: string;
  tourTitle?: string;
  tour_title?: string;
  applicantName: string;
  applicant_name?: string;
  applicantPhone: string;
  applicant_phone?: string;
  country: string;
  visaType: string;
  visa_type?: string;
  stage: VisaStage;
  decision: VisaDecision;
  isArchived?: boolean;
  is_archived?: boolean;
  assignedStaffId?: string;
  assigned_staff_id?: string;
  assignedStaffName?: string;
  assigned_staff_name?: string;
  appointmentDate?: string;
  appointment_date?: string;
  appointmentTime?: string;
  appointment_time?: string;
  submissionDate?: string;
  submission_date?: string;
  decisionDate?: string;
  decision_date?: string;
  centerName?: string;
  center_name?: string;
  embassyTrackingRef?: string;
  embassy_tracking_ref?: string;
  passportNumber: string;
  passport_number?: string;
  passportExpiry?: string;
  passport_expiry?: string;
  passportCustody: PassportCustodyLocation;
  passport_custody?: PassportCustodyLocation;
  custodyConfirmed?: boolean;
  custody_confirmed?: boolean;
  custodySafeLockerId?: string;
  custody_safe_locker_id?: string;
  courierTrackingCode?: string;
  courier_tracking_code?: string;
  custodyHistory: PassportCustodyEvent[];
  custody_history?: PassportCustodyEvent[];
  consultancyFee: number;
  consultancy_fee?: number;
  embassyFeePaid?: number;
  embassy_fee_paid?: number;
  documentChecklist: VisaDocumentItem[];
  document_checklist?: VisaDocumentItem[];
  notes?: string;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export type LegacyVisaStage =
  | "Document Collection"
  | "Ready for Submission"
  | "Embassy Under Review"
  | "Decision (Approved / Rejected)"
  | "Passport Delivered to Client"
  | "Document Verification"
  | "Embassy Appointment"
  | "Under Embassy Review"
  | "Approved"
  | "Rejected";

export interface LegacyVisaDocumentItem {
  id: string;
  name: string;
  required: boolean;
  status: "Verified" | "Pending";
  verifiedAt?: string;
  notes?: string;
}

export interface LegacyVisaCase {
  pipeline?: VisaCase;
  cancelledAt?: string;
  bookingId?: string;
  travelerId?: string;
  id: string;
  tenantId: string;
  clientName: string;
  passportNo: string;
  country: string;
  flagEmoji: string;
  visaType: string; // e.g. "Tourist", "Business", "Student"
  stage: LegacyVisaStage;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime?: string; // e.g. "10:30 AM"
  submissionDate?: string; // YYYY-MM-DD
  consultantName: string;
  feeAmount: number;
  notes?: string;
  decisionStatus?: "Approved" | "Rejected" | "Pending";
  trackingNumber?: string;
  documents?: LegacyVisaDocumentItem[];
  updatedAt: string; // ISO string
}

// ============================================================================
// 5. INVOICES & PAYMENTS (FINANCE & BILLING)
// ============================================================================
export type PaymentMethod =
  | "BANK_TRANSFER"
  | "CASH"
  | "CREDIT_CARD"
  | "RAAST"
  | "CHEQUE"
  | "Bank Transfer"
  | "Cash"
  | "Credit Card"
  | "Cheque"
  | "Online Portal"
  | string;

export type PaymentProofStatus =
  | "PENDING_VERIFICATION"
  | "VERIFIED_APPROVED"
  | "REJECTED";

export type MilestoneStatus =
  | "PENDING"
  | "PAID"
  | "OVERDUE"
  | "PENDING_VERIFICATION"
  | "Paid"
  | "Pending"
  | "Overdue";

export interface PaymentProofClaim {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  invoice_id?: string;
  invoiceId: string;
  booking_id?: string;
  bookingId?: string;
  client_id?: string;
  clientId?: string;
  amount: number;
  payment_method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  bank_reference?: string;
  bankReference: string;
  screenshot_url?: string;
  screenshotUrl: string;
  staff_id?: string;
  staffId?: string;
  staff_name?: string;
  staffName?: string;
  notes?: string;
  status: PaymentProofStatus;
  rejection_reason?: string | null;
  rejectionReason?: string | null;
  verified_by_admin_id?: string | null;
  verifiedByAdminId?: string | null;
  verified_at?: string | null;
  verifiedAt?: string | null;
  created_at?: string;
  createdAt: string;
}

export interface ReceivablesAging {
  total_outstanding: number;
  current_due: number;
  overdue_1_15: number;
  overdue_16_30: number;
  overdue_30_plus: number;
}

export type RecoveryCallOutcome =
  | "PROMISED_PAYMENT"
  | "LEFT_VOICEMAIL"
  | "UNREACHABLE"
  | "DISPUTED_AMOUNT"
  | "SENT_WHATSAPP_DETAILS";

export interface RecoveryCallLog {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  invoice_id?: string;
  invoiceId: string;
  staff_id?: string;
  staffId?: string;
  staff_name?: string;
  staffName: string;
  outcome: RecoveryCallOutcome;
  notes: string;
  callback_date?: string | null;
  callbackDate?: string;
  timestamp?: string;
  created_at?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
  reference?: string;
  receiptNo: string;
  recordedBy: string;
}

export type InvoicePaymentStatus =
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export type InvoiceStatus =
  | InvoicePaymentStatus
  | "PENDING"
  | "PAID"
  | "PARTIALLY_PAID"
  | "UNPAID"
  | "OVERDUE"
  | "CANCELLED";

export interface InvoiceLineItem {
  id: string;
  description: string;
  category:
    | "Tour Package"
    | "Visa Fee"
    | "Hotel Surcharge"
    | "Insurance"
    | "Tax / Service Charge";
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceMilestone {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  invoice_id?: string;
  invoiceId?: string;
  name?: string; // e.g. "Token Deposit", "Mid-term Installment", "Final Pre-Departure Clearance"
  title?: string; // Backward-compatible alias
  percentage?: number;
  amount: number;
  due_date?: string;
  dueDate: string; // ISO Date string
  status: MilestoneStatus | string;
  paid_amount?: number;
  paidAmount?: number;
  paid_at?: string | null;
  paidAt?: string;
  payment_method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  bank_reference?: string;
  bankReference?: string;
  proofAttachmentUrl?: string;
  receiptNo?: string;
}

export interface Invoice {
  refund?: RefundRecord;
  booking_id?: string;
  bookingId?: string;
  booking_number?: string;
  bookingRef?: string; // e.g. "WCH-BK-000005"
  client_id?: string;
  clientId?: string;
  id: string;
  tenant_id?: string;
  tenantId: string;
  invoice_number?: string;
  invoiceNumber: string; // e.g. "WCH-INV-2026-0048"
  client_name?: string;
  clientName: string;
  client_phone?: string;
  clientPhone?: string;
  client_email?: string;
  clientEmail?: string;
  clientAddress?: string;
  serviceCategory?:
    | "GROUP_TOUR"
    | "VISA_CONSULTANCY"
    | "UMRAH"
    | "CUSTOM_PACKAGE";
  packageTitle?: string;
  tour_title?: string;
  tourId?: string;
  serviceDescription: string;

  // Financial Totals
  subtotal?: number;
  taxAmount?: number;
  discountAmount?: number;
  total_amount?: number;
  totalAmount: number;
  paid_amount?: number;
  paidAmount: number;
  outstanding_amount?: number;
  outstandingAmount?: number;
  due_amount?: number;
  dueAmount: number;
  payment_status?: InvoicePaymentStatus;
  status: InvoicePaymentStatus | InvoiceStatus;

  // Milestones & Aging
  milestones?: InvoiceMilestone[];
  claims?: PaymentProofClaim[];
  issueDate?: string;
  finalDueDate?: string;
  due_date?: string;
  dueDate: string; // YYYY-MM-DD
  created_at?: string;
  createdAt: string; // YYYY-MM-DD
  updated_at?: string;
  updatedAt?: string;
  installments: Payment[];
  lineItems?: InvoiceLineItem[];
}

// ============================================================================
// 6. TOUR DIRECT EXPENSES (LEDGER & ROI)
// ============================================================================
export type ExpenseCategory =
  | "FLIGHT"
  | "HOTEL"
  | "TRANSPORT"
  | "VISA"
  | "GUIDE"
  | "MISC";

export interface TourExpense {
  id: string;
  tenantId: string;
  tourId: string;
  vendorName: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  notes?: string;
  date: string;
  createdAt: string;
}

export type OfficeExpenseCategory =
  | "RENT"
  | "UTILITIES"
  | "INTERNET_COMMUNICATION"
  | "OFFICE_SUPPLIES"
  | "PANTRY_TEA"
  | "MARKETING_ADS"
  | "SOFTWARE_LICENSES"
  | "MAINTENANCE"
  | "MISC_OVERHEAD";

export type ExpensePaymentMethod = "CASH" | "BANK_TRANSFER" | "PETTY_CASH";

export interface OfficeExpense {
  id: string;
  tenantId: string;
  category: OfficeExpenseCategory;
  vendorName: string;
  amount: number;
  currency: string;
  paymentMethod: ExpensePaymentMethod;
  paidAt: string;
  receiptRef?: string;
  notes?: string;
  recordedByUserId: string;
  createdAt: string;
}

export type LedgerTransactionType =
  | "CUSTOMER_PAYMENT"
  | "SUPPLIER_PAYMENT"
  | "OFFICE_EXPENSE"
  | "PAYROLL_DISBURSEMENT"
  | "REFUND";

export interface LedgerEntry {
  id: string;
  tenantId: string;
  date: string;
  referenceNo: string;
  type: LedgerTransactionType;
  description: string;
  partyName: string;
  paymentMethod: string;
  debit: number;
  credit: number;
  balance: number;
  linkedEntityId?: string;
}

export type DocumentCategory =
  | "PASSPORT_SCAN"
  | "BANK_STATEMENT"
  | "ATTESTED_AFFIDAVIT"
  | "TRAVEL_INSURANCE"
  | "TAX_RETURN"
  | "EMBASSY_RECEIPT"
  | "OTHER";

export type DocumentVerificationStatus =
  | "VERIFIED"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "EXPIRED";

export interface VaultDocument {
  id: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  category: DocumentCategory;
  title: string;
  fileUrl: string;
  fileSize?: string;
  expiryDate?: string;
  verificationStatus: DocumentVerificationStatus;
  uploadedByStaffId: string;
  uploadedByStaffName: string;
  verifiedByStaffId?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export type SupplierCategory =
  | "AIRLINE_CONSOLIDATOR"
  | "HOTEL_CHAIN"
  | "LOCAL_DMC"
  | "TRANSPORT_OPERATOR"
  | "VISA_EMBASSY_AGENT"
  | "OTHER";

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  category: SupplierCategory;
  contactPerson: string;
  phone: string;
  email?: string;
  operatingRegions: string[];
  currency: string;
  bankDetails: {
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    iban?: string;
  };
  status: "ACTIVE" | "INACTIVE";
  notes?: string;
  createdAt: string;
}

export type { BookingStatus, ServiceType } from "@/types/booking";

export interface InstallmentMilestone {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  invoice_id?: string;
  invoiceId?: string;
  title?: string;
  name?: string;
  amount: number;
  due_date?: string;
  dueDate: string;
  /** SRS payment lifecycle; isPaid remains for legacy local snapshots. */
  status?: "PAID" | "PENDING" | "OVERDUE" | string;
  isPaid?: boolean;
  paid_at?: string | null;
  paidAt?: string;
  transactionRef?: string;
}

export interface DocumentReadiness {
  passportCopyUploaded: boolean;
  visaGranted: boolean;
  ticketIssued: boolean;
}

export interface TravelerManifestItem {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  booking_id?: string;
  bookingId: string;
  tour_id?: string;
  tourId?: string;
  slot_number?: number;
  slotNumber?: number;
  full_name?: string;
  fullName?: string;
  phone?: string;
  passport_no?: string;
  passportNo?: string;
  /** API-facing alias for passportNo. */
  passportNumber?: string;
  passport_expiry?: string;
  passportExpiry?: string;
  dateOfBirth?: string;
  room_preference?: "SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY";
  roomPreference?: "SINGLE" | "DOUBLE" | "TRIPLE" | "FAMILY";
  assigned_room_id?: string;
  assignedRoomId?: string;
  roommateId?: string;
  paymentStatus?: "PAID" | "PARTIAL" | "UNPAID";
  payment_status?: "PAID" | "PARTIAL" | "UNPAID";
  documents?: DocumentReadiness;
  familyGroup?: string;
  roomAllocation?: string;
  is_complete?: boolean;
  isComplete: boolean;
  notes?: string;
}

export interface Booking {
  refund?: RefundRecord;
  cancelled_at?: string;
  cancelledAt?: string;
  cancelled_by?: string;
  cancelledBy?: string;
  // Lead quotations have no permanent client until confirmation.
  quoteConversion?: import("@/lib/lead-operations").Conversion;
  quote_conversion?: Record<string, unknown>;
  id: string;
  booking_number?: string;
  bookingNumber: string;
  tenant_id?: string;
  tenantId: string;
  lead_id?: string;
  leadId?: string;
  /** API-facing alias for leadId. */
  sourceLeadId?: string;
  client_id?: string;
  clientId: string;
  client_name?: string;
  clientName: string;
  client_phone?: string;
  clientPhone: string;
  service_type?: import("@/types/booking").ServiceType;
  serviceType: import("@/types/booking").ServiceType;
  package_id?: string;
  packageId?: string;
  /** API-facing alias for packageId. */
  tour_id?: string;
  tourId?: string;
  package_title?: string;
  packageTitle: string;
  /** API-facing alias for packageTitle. */
  tour_title?: string;
  tourTitle?: string;
  pax_count?: number;
  paxCount: number;
  agreed_price_per_pax?: number;
  agreedPricePerPax?: number;
  total_agreed_amount?: number;
  totalAgreedAmount: number;
  token_deposit?: number;
  tokenDeposit?: number;
  assigned_rep?: string;
  assignedRep: string;
  status: import("@/types/booking").BookingStatus;
  payment_status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  paymentStatus?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  invoice_id?: string;
  invoiceId?: string;
  milestones: InstallmentMilestone[];
  travelers: TravelerManifestItem[];
  cancellation_reason?: string;
  cancellationReason?: string;
  cancelledByStaffId?: string;
  retention_fee?: number;
  retentionFee?: number;
  refund_amount?: number;
  refundAmount?: number;
  created_at?: string;
  createdAt: string;
  updated_at?: string;
  updatedAt?: string;
  confirmed_at?: string;
  confirmedAt?: string;
  confirmed_by?: string;
  confirmedBy?: string;
}

export interface RefundRecord {
  id: string;
  bookingId: string;
  invoiceId: string;
  totalPaidBeforeCancellation: number;
  cancellationFeeRetained: number;
  refundAmountIssued: number;
  refundMethod: "CASH" | "BANK_WIRE" | "ORIGINAL_PAYMENT";
  refundReference?: string;
  reasonCategory: "CLIENT_REQUEST" | "VISA_REJECTION" | "MEDICAL_EMERGENCY" | "TOUR_POSTPONED" | "OTHER";
  notes?: string;
  processedBy: string;
  processedAt: string;
}

// ============================================================================
// 7. HR CORE, EMPLOYEE DIRECTORY & WORK SHIFTS
// ============================================================================
export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'PROBATION' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED';
export type ScreenAccessLevel = 'NONE' | 'READ' | 'FULL';
export type DepartmentCode = 'MANAGEMENT' | 'OPERATIONS' | 'SALES_FRONT_DESK' | 'VISA_CONSULTANCY' | 'ACCOUNTS';
export type Department = DepartmentCode | string;

export interface ScreenAccessRules {
  leads: ScreenAccessLevel;
  bookings: ScreenAccessLevel;
  clients: ScreenAccessLevel;
  tours: ScreenAccessLevel;
  visaPipeline: ScreenAccessLevel;
  invoices: ScreenAccessLevel;
  hrAndPayroll: ScreenAccessLevel;
}

export interface DepartmentItem {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name: string;
  code?: DepartmentCode | string;
  description?: string;
}

export interface Designation {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  department_id?: string;
  departmentId?: string;
  title: string;
  description?: string;
}

export interface Shift {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name: string;              // e.g. "Regular Day Shift"
  start_time?: string;        // "09:00:00"
  startTime: string;          // "09:00"
  end_time?: string;          // "18:00:00"
  endTime: string;            // "18:00"
  grace_minutes?: number;     // 15
  gracePeriodMinutes: number; // 15
  half_day_minutes?: number;   // 240
  halfDayMinutes?: number;
  is_active?: boolean;
  working_days?: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
  workingDays: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
}

export type WorkShift = Shift;

export interface EmployeeProfile {
  id: string;
  tenant_id?: string;
  tenantId: string;
  user_id?: string;
  userId?: string;          // Links to auth account
  employee_code?: string;
  employeeCode: string;     // e.g. "WCH-EMP-001"
  full_name?: string;
  fullName: string;
  avatar_url?: string;
  avatarUrl?: string; // Image URL or Base64 data URI
  email: string;
  phone: string;
  cnic?: string;
  cnicNumber: string;       // Pakistan National Identity Card
  department_id?: string;
  departmentId?: string;
  department_name?: string;
  departmentName?: string;
  department: Department;
  designation_id?: string;
  designationId?: string;
  designation_title?: string;
  designationTitle?: string;
  designation: string;      // e.g. "Senior Visa Consultant", "Front Desk Officer"
  employment_status?: EmploymentStatus;
  status: EmploymentStatus;
  joining_date?: string;
  joiningDate: string;      // ISO string
  shift_id?: string;
  shiftId: string;
  shift_name?: string;
  shiftName: string;

  // Compensation & Banking (Admin Only)
  basic_salary?: number;
  basicSalary: number;      // e.g. 75000 (PKR)
  allowances: number;
  bank_name?: string;
  bankName: string;
  bank_account_number?: string;
  bankAccountNumber: string;
  bank_iban?: string;
  bankIban: string;

  // Leave Entitlements (Annual Pool)
  annual_leave_allowance?: number;
  annualLeaveAllowance: number; // e.g. 14 days
  sick_leave_allowance?: number;
  sickLeaveAllowance: number;   // e.g. 8 days
  leaves_taken?: number;
  leavesTaken: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
  activeDeviceId?: string;
  device_status?: 'BOUND' | 'UNENROLLED' | 'REVOKED';
  deviceStatus: 'BOUND' | 'UNENROLLED' | 'REVOKED';
  device_model?: string;
  deviceModel?: string;
  deviceEnrolledAt?: string;
  deviceRevokedAt?: string;
  deviceRevokedBy?: string;
  deviceRevocationReason?: string;
  screen_access?: ScreenAccessRules;
  screenAccess: ScreenAccessRules;
}

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'WEEKLY_OFF';

export type AttendanceSource =
  | 'QR_SCAN'
  | 'KIOSK_PIN'
  | 'MANUAL'
  | 'MANUAL_HR'
  | 'MANUAL_ADMIN'
  | 'CORRECTION'
  | 'RFID'
  | 'NFC'
  | 'FINGERPRINT'
  | 'BIOMETRIC_IMPORT'
  | 'AUTO_FINALIZER';

export interface RegisteredDevice {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  deviceToken: string;
  deviceModel: string;
  status: 'ACTIVE' | 'REVOKED';
  enrolledAt: string;
  lastUsedAt: string;
}

export type LeaveType = 'ANNUAL' | 'SICK' | 'CASUAL' | 'UNPAID';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type DeviceBindingStatus = 'BOUND' | 'UNENROLLED' | 'REVOKED';

export interface AttendanceReconciliationMetadata {
  resolution: 'ON_LEAVE' | 'ABSENT' | 'MISSING_CHECKOUT' | 'UNCHANGED' | 'WEEKLY_OFF';
  cutoffTime: string;
  leaveRequestId?: string;
  leaveType?: LeaveType;
  isPaidLeave?: boolean;
}

export interface AttendanceRecord {
  id: string;
  tenant_id?: string;
  tenantId: string;
  employee_id?: string;
  employeeId: string;
  employee_code?: string;
  employeeCode: string;
  employee_name?: string;
  employeeName: string;
  department_name?: string;
  department: string;
  date?: string;
  attendanceDate: string;
  shift_name?: string;
  shiftName: string;
  shift_start?: string;
  shiftStartTime: string;
  shift_end?: string;
  shiftEndTime: string;
  graceCutoffTime: string;
  check_in?: string | null;
  checkInAt?: string;
  check_out?: string | null;
  checkOutAt?: string;
  status: AttendanceStatus;
  workedMinutes: number;
  net_work_minutes?: number;
  lateMinutes: number;
  late_minutes?: number;
  source: AttendanceSource;
  notes?: string;
  correctionReason?: string;
  adjustedByStaff?: string;
  adjustedAt?: string;
  device_id?: string | null;
  deviceId?: string;
  finalizedAt?: string;
  finalizedBy?: string;
  /** @deprecated Use finalizedBy. Retained for existing persisted records. */
  finalizedByStaff?: string;
  leaveRequestId?: string;
  leaveType?: LeaveType;
  isPaidLeave?: boolean;
  cutoffStatus?: AttendanceCutoffStatus;
  reconciliationMetadata?: AttendanceReconciliationMetadata;
}

export type AttendanceCutoffStatus =
  | "OPEN"
  | "FINALIZED"
  | "MISSING_CHECKOUT"
  | "PENDING_REVIEW"
  | "RECONCILED";

export interface DailyAttendanceSummary {
  date: string;
  total_headcount: number;
  present_count: number;
  late_count: number;
  absent_count?: number;
  leave_count?: number;
  unpunched_count: number;
  records: AttendanceRecord[];
}

export interface PunchResult {
  success: boolean;
  action?: 'CHECK_IN' | 'CHECK_OUT' | 'CHECK_IN_RECORDED' | 'CHECK_OUT_RECORDED';
  error?: 'UNREGISTERED_DEVICE' | 'DEVICE_REVOKED' | 'ALREADY_COMPLETED' | 'INVALID_QR';
  message?: string;
  time?: string;
  status?: 'PRESENT' | 'LATE';
  lateMinutes?: number;
  workedMinutes?: number;
  isNewEnrollment?: boolean;
  deviceToken?: string;
  employeeId?: string;
  employeeName?: string;
  record?: AttendanceRecord;
}

// ============================================================================
// 8. LEAVE MANAGEMENT & ENTITLEMENTS
// ============================================================================
export interface LeaveRequest {
  id: string;
  tenant_id?: string;
  tenantId: string;
  employee_id?: string;
  employeeId: string;
  employee_code?: string;
  employeeCode: string;
  employee_name?: string;
  employeeName: string;
  department: string;
  leave_type?: LeaveType;
  leaveType: LeaveType;
  start_date?: string;
  startDate: string;
  end_date?: string;
  endDate: string;
  total_days?: number;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  applied_at?: string;
  appliedAt: string;
  reviewed_by?: string;
  reviewedBy?: string;
  reviewed_at?: string;
  reviewedAt?: string;
  rejection_reason?: string;
  rejectionReason?: string;
}

export interface LeaveBalanceSummary {
  employee_id?: string;
  employeeId: string;
  annual_total?: number;
  annualTotal: number;
  annual_used?: number;
  annualUsed: number;
  annual_remaining?: number;
  annualRemaining: number;
  sick_total?: number;
  sickTotal: number;
  sick_used?: number;
  sickUsed: number;
  sick_remaining?: number;
  sickRemaining: number;
  unpaid_days_taken?: number;
  unpaidDaysTaken: number;
}

export interface AttendanceFinalizationSummary {
  targetDate: string;
  cutoffTime: string;
  absentEmployeeIds: string[];
  leaveEmployeeIds: string[];
  missingCheckoutEmployeeIds: string[];
  unchangedEmployeeIds: string[];
  finalizedAt: string;
  finalizedBy: string;
  executedByStaff: string;
}

// ============================================================================
// 9. MONTHLY PAYROLL, ADVANCES & PAYSLIPS
// ============================================================================
export type PayrollStatus = 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISBURSED' | 'LOCKED';

export interface SalaryAdvance {
  id: string;
  tenant_id?: string;
  tenantId: string;
  employee_id?: string;
  employeeId: string;
  employee_name?: string;
  employeeName: string;
  request_date?: string;
  requestDate: string;
  amount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DEDUCTED';
  approved_by_admin?: string;
  approvedByAdmin?: string;
  reviewed_at?: string;
  reviewedAt?: string;
  payroll_month?: string;
  payrollMonth: string;
}

export interface EmployeePayrollItem {
  id: string;
  employee_id?: string;
  employeeId: string;
  employee_code?: string;
  employeeCode: string;
  employee_name?: string;
  employeeName: string;
  department: string;
  designation: string;
  basic_salary?: number;
  basicSalary: number;
  allowances: number;
  gross_pay?: number;
  grossPay: number;
  working_days_in_month?: number;
  workingDaysInMonth: number;
  days_present?: number;
  daysPresent: number;
  unexcused_absences?: number;
  unexcusedAbsences: number;
  total_late_arrivals?: number;
  totalLateArrivals: number;
  late_arrival_deduction?: number;
  lateArrivalDeduction: number;
  unpaid_leave_deduction?: number;
  unpaidLeaveDeduction: number;
  unpaid_leave_days?: number;
  unpaidLeaveDays?: number;
  salary_advances_deduction?: number;
  salaryAdvancesDeduction: number;
  bonuses_or_incentives?: number;
  bonusesOrIncentives: number;
  net_payable_salary?: number;
  netPayableSalary: number;
  payment_method?: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CHEQUE';
  bank_name?: string;
  bankName: string;
  bank_account_number?: string;
  bankAccountNumber: string;
  bank_iban?: string;
  bankIban: string;
  payment_status?: 'UNPAID' | 'PROCESSED';
  paymentStatus: 'UNPAID' | 'PROCESSED';
  payment_reference?: string;
  paymentReference?: string;
}

export interface MonthlyPayrollRun {
  id: string;
  tenant_id?: string;
  tenantId: string;
  month_string?: string;
  monthString: string;
  month_code?: string;
  monthCode: string;
  total_gross_liability?: number;
  totalGrossLiability: number;
  total_deductions?: number;
  totalDeductions: number;
  total_net_disbursement?: number;
  totalNetDisbursement: number;
  status: PayrollStatus;
  items: EmployeePayrollItem[];
  generated_at?: string;
  generatedAt: string;
  approved_by_admin_id?: string;
  approvedByAdminId?: string;
  approved_at?: string;
  approvedAt?: string;
  disbursed_at?: string;
  disbursedAt?: string;
}

export interface EmployeeSelfServiceProfile {
  id: string;
  tenantId: string;
  employeeCode: string;
  fullName: string;
  avatarUrl?: string;
  email: string;
  phone: string;
  department: Department;
  designation: string;
  status: EmploymentStatus;
  shiftId: string;
  shiftName: string;
  deviceStatus: 'BOUND' | 'UNENROLLED' | 'REVOKED';
  deviceModel?: string;
}

export interface PersonalPayslipRecord {
  runId: string;
  run_id?: string;
  tenantId: string;
  tenant_id?: string;
  monthString: string;
  month_string?: string;
  monthCode: string;
  month_code?: string;
  payrollStatus: PayrollStatus;
  payroll_status?: PayrollStatus;
  generatedAt: string;
  generated_at?: string;
  approvedAt?: string;
  approved_at?: string;
  disbursedAt?: string;
  disbursed_at?: string;
  item: EmployeePayrollItem;
}

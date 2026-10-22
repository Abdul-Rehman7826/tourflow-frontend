"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { allocateTourRoom, changeTourOperations, unfilledPassengerSlots, type TourOperation } from "@/lib/tour-operations";
import { normalizeVisaCase, saveVisaCase, bridgeGroupTourVisaCases, archiveVisaCase, type VisaCasePatch, type VisaCaseInput } from '@/lib/visa-operations';
import type { VisaCase as PipelineVisaCase } from '@/types/erp';
import { mockTours, mockClients, mockBookings, mockInvoices, mockLeads, mockPassengers, mockPaymentProofClaims, mockRecoveryCallLogs, OPERATIONAL_TENANT_ID } from "@/data/mockData";
import { submitProof, reviewProof, appendRecoveryCall, type ProofInput, type CallInput } from "@/lib/payment-recovery";
import type { PaymentProofClaim, RecoveryCallLog } from "@/types/erp";
import {
  createBookingDraft,
  cancelBookingTransaction,
  confirmBookingTransaction,
  payInvoice,
  updateBookingTraveler,
} from "@/lib/booking-operations";
import type {
  ERPState,
  CancellationInput,
  BookingDraftInput,
  BookingPaymentInput,
  TravelerUpdate,
} from "@/lib/booking-operations";
import {
  applyBulk,
  convertCRM,
  importCRM,
  resolveCRM,
} from "@/lib/lead-operations";
import type {
  CRMState,
  Client,
  Duplicate,
  Conversion,
  ImportRow,
  BulkChange,
} from "@/lib/lead-operations";
import { useTenant } from "@/context/TenantContext";
import {
  createEmployee as createEmployeeApi,
  updateEmployee as updateEmployeeApi,
  fetchEmployees as fetchEmployeesApi,
  fetchShifts as fetchShiftsApi,
  createShift as createShiftApi,
  updateShift as updateShiftApi,
} from "@/lib/hr-api";
import { correctAttendanceRecord, createManualAttendance, fetchDailyAttendance as fetchDailyAttendanceApi, finalizeAttendanceApi, voidAttendanceRecord as voidAttendanceRecordApi } from "@/lib/attendance-api";
import {
  generatePayrollRun as generatePayrollRunApi,
  getPayrollRuns as getPayrollRunsApi,
  approvePayrollRun as approvePayrollRunApi,
  disbursePayrollRun as disbursePayrollRunApi,
  requestSalaryAdvance as requestSalaryAdvanceApi,
  reviewSalaryAdvance as reviewSalaryAdvanceApi,
  getSalaryAdvances as getSalaryAdvancesApi,
} from "@/lib/payroll-api";
import {
  fetchLeaveHistoryApi,
  fetchLeaveRecordsApi,
  recordLeaveApi,
  reviewLegacyLeaveRequestApi,
  updateLeaveEntitlementApi,
  voidLeaveApi,
} from "@/lib/leave-api";
import type { UserRole } from "@/context/RoleContext";
import { normalizeScreenAccess } from "@/lib/screen-access";
import {
  createTourApi,
  updateTourApi,
  deleteTourApi,
  allocateTourRoomApi,
} from "@/lib/tours-api";
import {
  ATTENDANCE_STORAGE_PREFIX,
  ATTENDANCE_CUTOFF_STORAGE_PREFIX,
  DEFAULT_ATTENDANCE_CUTOFF,
  REGISTERED_DEVICE_STORAGE_PREFIX,
  finalizeAttendanceRecords,
  isOfficeQrTokenValid,
  localDateKey,
  processDeviceAttendance as runDeviceAttendance,
  seedTodayAttendance,
  type DeviceAttendanceResult,
} from "@/lib/attendance-operations";
import {
  PAYROLL_STORAGE_PREFIX,
  SALARY_ADVANCE_STORAGE_PREFIX,
  calculatePayrollRun as buildPayrollRun,
  updatePayrollItem as applyPayrollItemUpdate,
} from "@/lib/payroll-operations";
import {
  LEAVE_STORAGE_PREFIX,
  calculateLeaveBalance,
  leaveWorkingDates,
  reviewLeaveRequestRecord,
  syncApprovedLeaveAttendance,
  validateLeaveRequest,
} from "@/lib/leave-operations";
import {
  calculateTourFinancials,
  canManageOfficeExpenses,
  canViewTourCosts,
} from "@/lib/analytics-governance";
import { buildLedgerEntries } from "@/lib/ledger";
import {
  Lead,
  TourPackage,
  Passenger,
  PassengerPaymentStatus,
  LegacyVisaCase as VisaCase,
  LegacyVisaDocumentItem as VisaDocumentItem,
  Invoice,
  TourExpense,
  OfficeExpense,
  OfficeExpenseCategory,
  ExpensePaymentMethod,
  LegacyVisaStage as VisaStage,
  PaymentMethod,
  Interaction,
  LeadStatus,
  LeadInterestType,
  Booking,
  FlightBlock,
  RoomAllocation,
  RoomType,
  ItineraryDay,
  EmployeeProfile,
  WorkShift,
  AttendanceRecord,
  AttendanceFinalizationSummary,
  PunchResult,
  RegisteredDevice,
  EmployeePayrollItem,
  MonthlyPayrollRun,
  SalaryAdvance,
  EmployeeSelfServiceProfile,
  LeaveRequest,
  PersonalPayslipRecord,
  LeaveBalanceSummary,
  LedgerEntry,
  VaultDocument,
  DocumentCategory,
  DocumentVerificationStatus,
  Supplier,
  SupplierCategory,
} from "@/types/erp";
import {
  INITIAL_LEADS,
  INITIAL_TOURS,
  INITIAL_PASSENGERS,
  INITIAL_VISA_CASES,
  INITIAL_INVOICES,
  INITIAL_EXPENSES,
  createFreshDemoLeads,
} from "@/lib/mock-data";

export interface NewLeadInput {
  fullName: string;
  phone: string;
  email?: string;
  source?: "Walk-in" | "WhatsApp" | "Phone Call" | "Meta Ad" | "Referral" | "Web Form";
  interestType: LeadInterestType;
  destinationInterest?: string;
  groupSize?: number;
  budget?: number;
  notes: string;
  followUpDate: string;
  assignedTo?: string;
  initialChannel?:
    "WhatsApp" | "Walk-in" | "Phone Call" | "Email" | "Office Visit";
}

function buildDeviceEnrollmentPayload(tenantId: string, employeeId: string) {
  const issuedAt = new Date();
  return {
    type: "DEVICE_ONBOARDING",
    tenantId,
    employeeId,
    token: `dev_enroll_${crypto.randomUUID().slice(0, 8)}`,
    expiresAt: new Date(issuedAt.getTime() + 15 * 60_000).toISOString(),
  };
}

export interface TourROI {
  tourId: string;
  title: string;
  grossRevenue: number;
  totalExpenses: number;
  netMargin: number;
  marginPercentage: number;
  bookedSeats: number;
  maxCapacity: number;
  occupancyRate: number;
  allocatedOverheads: number;
  roiPercentage: number;
}

export type TourExpenseInput = Omit<
  TourExpense,
  "id" | "tenantId" | "createdAt" | "currency"
>;

export type OfficeExpenseInput = {
  category: OfficeExpenseCategory;
  vendorName: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  paidAt: string;
  receiptRef?: string;
  notes?: string;
};

export type VaultDocumentInput = Omit<VaultDocument, "id" | "tenantId" | "clientName" | "createdAt" | "uploadedByStaffId" | "uploadedByStaffName" | "verifiedByStaffId" | "verifiedAt">;
export type SupplierInput = Omit<Supplier, "id" | "tenantId" | "createdAt">;

export type TourPackageInput = Omit<TourPackage, "id" | "tenantId" | "bookedSeats" | "slug"> & { slug?: string };

export interface DataContextType {
  employees: EmployeeProfile[];
  shifts: WorkShift[];
  createShiftRecord: (shift: Partial<WorkShift>) => Promise<WorkShift>;
  updateShiftRecord: (shiftId: string, shift: Partial<WorkShift>) => Promise<WorkShift>;
  createEmployeeRecord: (profile: Omit<EmployeeProfile, "id" | "employeeCode" | "userId" | "updatedAt">, authData?: { role?: UserRole; password?: string; accessGranted?: boolean; screenAccess?: EmployeeProfile["screenAccess"]; quickPin?: string; avatarColor?: string; avatarIcon?: string }) => Promise<EmployeeProfile>;
  updateEmployeeRecord: (employeeId: string, profileData: Partial<EmployeeProfile>, authData?: { role?: UserRole; password?: string; accessGranted?: boolean; screenAccess?: EmployeeProfile["screenAccess"]; quickPin?: string; avatarColor?: string; avatarIcon?: string }) => Promise<EmployeeProfile>;
  attendanceRecords: AttendanceRecord[];
  registeredDevices: RegisteredDevice[];
  processDeviceAttendance: (input: {
    employee: EmployeeProfile;
    shift: WorkShift;
    clientDeviceToken: string | null;
    userAgent: string;
  }) => DeviceAttendanceResult;
  processMobileScan: (scannedPayloadStr: string, clientDeviceToken: string | null) => PunchResult;
  revokeRegisteredDevice: (deviceId: string) => void;
  revokeEmployeeDevice: (employeeId: string, reason: string) => void;
  resetEmployeeDeviceEnrollment: (employeeId: string) => void;
  createDeviceEnrollmentToken: (employeeId: string) => string;
  createManualAttendanceRecord: (employeeId: string, attendanceDate: string, updates: Partial<AttendanceRecord>, mandatoryReason: string) => Promise<AttendanceRecord>;
  updateManualAttendanceRecord: (recordId: string, updates: Partial<AttendanceRecord>, mandatoryReason: string) => Promise<AttendanceRecord>;
  voidAttendanceRecord: (recordId: string, mandatoryReason: string) => Promise<void>;
  attendanceCutoffTime: string;
  leaveRequests: LeaveRequest[];
  previewDailyAttendance: (targetDate: string) => AttendanceFinalizationSummary;
  finalizeDailyAttendance: (targetDate: string, executedByStaff: string) => Promise<AttendanceFinalizationSummary>;
  updateAttendanceCutoffTime: (cutoffTime: string) => void;
  payrollRuns: MonthlyPayrollRun[];
  salaryAdvances: SalaryAdvance[];
  currentEmployeeProfile: EmployeeSelfServiceProfile | null;
  personalAttendanceRecords: AttendanceRecord[];
  personalSalaryAdvances: SalaryAdvance[];
  personalPayslips: PersonalPayslipRecord[];
  getEmployeeLeaveBalance: (employeeId: string) => LeaveBalanceSummary;
  personalLeaveRequests: LeaveRequest[];
  personalLeaveBalance: LeaveBalanceSummary | null;
  leaveBalances: LeaveBalanceSummary[];
  reviewLeaveRequest: (requestId: string, decision: "APPROVE" | "REJECT", rejectionReason?: string) => LeaveRequest;
  recordLeave: (input: Pick<LeaveRequest, "employeeId" | "leaveType" | "startDate" | "endDate" | "reason">) => Promise<LeaveRequest>;
  voidLeave: (requestId: string, reason: string) => Promise<LeaveRequest>;
  updateLeaveEntitlement: (employeeId: string, annualTotal: number, sickTotal: number) => EmployeeProfile;
  getPersonalPayslip: (runId: string, requestedEmployeeId?: string) => PersonalPayslipRecord;
  calculateMonthlyPayroll: (monthCode: string) => MonthlyPayrollRun;
  updatePayrollEmployee: (runId: string, employeeId: string, updates: Pick<EmployeePayrollItem, "bonusesOrIncentives" | "paymentMethod">) => MonthlyPayrollRun;
  approvePayrollRun: (runId: string) => MonthlyPayrollRun;
  disbursePayrollRun: (runId: string, paymentReference: string) => MonthlyPayrollRun;
  createSalaryAdvance: (input: Pick<SalaryAdvance, "employeeId" | "amount" | "reason" | "payrollMonth">) => SalaryAdvance;
  requestPersonalSalaryAdvance: (input: Pick<SalaryAdvance, "amount" | "reason" | "payrollMonth">) => SalaryAdvance;
  reviewSalaryAdvance: (advanceId: string, decision: "APPROVE" | "REJECT") => SalaryAdvance;
  paymentProofClaims: PaymentProofClaim[];
  recoveryCallLogs: RecoveryCallLog[];
  submitPaymentProof: (input: ProofInput) => void;
  reviewPaymentProof: (id: string, decision: 'APPROVE' | 'REJECT', reason: string, method: PaymentMethod) => void;
  approvePaymentClaim: (id: string, method?: PaymentMethod) => void;
  rejectPaymentClaim: (id: string, reason: string) => void;
  logRecoveryCall: (input: CallInput) => void;
  createBookingForExistingClient: (clientId: string, input: Omit<BookingDraftInput, "clientId"> & { conversion: Conversion }, payment?: BookingPaymentInput) => Booking;
  cancelBooking: (id: string, input: CancellationInput) => void;
  saveDraftBooking: (
    leadId: string,
    conversion: Conversion,
    milestones: BookingDraftInput["milestones"],
  ) => Booking;
  confirmBookingTransaction: DataContextType["convertLeadToBooking"];
  bookings: Booking[];
  createBooking: (input: BookingDraftInput) => Booking;
  confirmBooking: (id: string, token?: BookingPaymentInput) => void;
  convertLeadToBooking: (
    leadId: string,
    conversion: Conversion,
    milestones: BookingDraftInput["milestones"],
    token?: BookingPaymentInput,
  ) => Booking;
  updateTraveler: (
    bookingId: string,
    travelerId: string,
    input: TravelerUpdate,
  ) => void;
  updateTravelerDetails: (tourId: string, bookingId: string, travelerId: string, fields: TravelerUpdate) => void;
  unassignTravelerSlot: (tourId: string, bookingId: string, travelerId: string) => void;
  reassignRoomAllocation: (tourId: string, travelerId: string, newRoomType: RoomType | undefined) => void;
  assignTravelerToBooking: (tourId: string, bookingId: string, fields: TravelerUpdate) => string;
  deleteTravelerFromManifest: (tourId: string, bookingId: string, travelerId: string) => void;
  clients: Client[];
  duplicates: Duplicate[];
  activeReps: string[];
  crmReady: boolean;
  crmError: string;
  bulkUpdateLeads: (ids: string[], change: BulkChange) => void;
  convertLead: (id: string, conversion: Conversion) => void;
  importLeads: (
    rows: ImportRow[],
    reps: string[],
  ) => { imported: number; flagged: number };
  distributeUnassigned: (reps: string[]) => number;
  resolveDuplicate: (
    id: string,
    action: "merge" | "create" | "discard",
  ) => void;
  // Tenant-scoped datasets (Filtered automatically by active tenant.id)
  leads: Lead[];
  tours: TourPackage[];
  passengers: Passenger[];
  visaCases: VisaCase[];
  visaPipelineCases: PipelineVisaCase[];
  saveVisaPipelineCase: (id: string | null, input: VisaCaseInput | VisaCasePatch) => void;
  setVisaCaseArchived: (id: string, archived: boolean) => void;
  invoices: Invoice[];
  expenses: TourExpense[];
  officeExpenses: OfficeExpense[];
  ledgerEntries: LedgerEntry[];
  addTourExpense: (input: TourExpenseInput) => TourExpense;
  updateTourExpense: (id: string, input: Partial<TourExpenseInput>) => TourExpense;
  deleteTourExpense: (id: string) => void;
  addOfficeExpense: (input: OfficeExpenseInput) => OfficeExpense;
  updateOfficeExpense: (id: string, input: Partial<OfficeExpenseInput>) => OfficeExpense;
  deleteOfficeExpense: (id: string) => void;
  vaultDocuments: VaultDocument[];
  uploadVaultDocument: (input: VaultDocumentInput) => VaultDocument;
  updateVaultDocument: (id: string, input: Partial<VaultDocumentInput>) => VaultDocument;
  verifyVaultDocument: (id: string, status: DocumentVerificationStatus, rejectionReason?: string) => VaultDocument;
  deleteVaultDocument: (id: string) => void;
  suppliers: Supplier[];
  createSupplier: (input: SupplierInput) => Supplier;
  updateSupplier: (id: string, input: Partial<SupplierInput>) => Supplier;
  deleteSupplier: (id: string) => void;

  // Global counts & KPIs for the active tenant
  tenantSummary: {
    totalRevenue: number;
    totalCollected: number;
    totalDue: number;
    activeToursCount: number;
    activeVisaCasesCount: number;
    openLeadsCount: number;
  };

  // Mutation Handlers
  addLead: (lead: NewLeadInput) => Lead;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  addInteraction: (
    leadId: string,
    note: string,
    channel?: "WhatsApp" | "Walk-in" | "Phone Call" | "Email" | "Office Visit",
    author?: string,
    newFollowUpDate?: string,
  ) => void;
  updateVisaStage: (caseId: string, newStage: VisaStage) => void;
  updateVisaDocuments: (caseId: string, documents: VisaDocumentItem[]) => void;
  addVisaCase: (newCase: Omit<VisaCase, "id" | "updatedAt">) => VisaCase;
  recordPayment: (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
  ) => void;
  updatePassengerPayment: (
    passengerId: string,
    status: PassengerPaymentStatus,
  ) => void;
  addPassenger: (passenger: Omit<Passenger, "id">) => Passenger;
  getTourROI: (tourId: string) => TourROI | null;
  resetToDefaults: () => void;
  resetToDefaultMockData: () => void;
  updateTourOperations: (tourId: string, input: {
    flightBlock?: FlightBlock;
    rooms?: RoomAllocation[];
  }) => void;
  assignTravelerToRoom: (tourId: string, roomId: string, travelerId: string) => void;
  addRoom: (tourId: string, input: Omit<RoomAllocation, 'id' | 'tourId' | 'assignedTravelerIds'>) => void;
  updateRoom: (tourId: string, roomId: string, input: Omit<RoomAllocation, 'id' | 'tourId' | 'assignedTravelerIds'>) => void;
  deleteRoom: (tourId: string, roomId: string) => void;
  unassignTravelerFromRoom: (tourId: string, roomId: string, travelerId: string) => void;
  addItineraryDay: (tourId: string, day: ItineraryDay) => void;
  updateItineraryDay: (tourId: string, dayNumber: number, day: Partial<ItineraryDay>) => void;
  deleteItineraryDay: (tourId: string, dayNumber: number) => void;
  moveItineraryDay: (tourId: string, dayNumber: number, direction: -1 | 1) => void;
  createTourPackage: (input: TourPackageInput) => TourPackage;
  updateTourPackage: (id: string, input: Partial<TourPackageInput>) => TourPackage;
  deleteTourPackage: (id: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = "tourflow_erp_data_v1";
const CRM_KEY = "tourflow_crm_v2";
const ERP_KEY = "tourflow_erp_v3";
const initialERP = (fresh = false): ERPState => ({
  leads: fresh
    ? [
        ...createFreshDemoLeads(),
        ...INITIAL_LEADS.filter(
          (lead) => lead.tenantId !== "tenant-world-class",
        ),
      ]
    : [...mockLeads, ...INITIAL_LEADS.filter(l => l.tenantId !== OPERATIONAL_TENANT_ID)],
  clients: mockClients,
  duplicates: [],
  bookings: mockBookings,
  paymentProofClaims: mockPaymentProofClaims,
  recoveryCallLogs: mockRecoveryCallLogs,
  tours: [...mockTours, ...INITIAL_TOURS.filter(t => t.tenantId !== OPERATIONAL_TENANT_ID)],
  passengers: [...mockPassengers, ...INITIAL_PASSENGERS.filter(p => INITIAL_TOURS.some(t => t.id === p.tourId && t.tenantId !== OPERATIONAL_TENANT_ID))],
  visaCases: INITIAL_VISA_CASES.filter(v => v.tenantId !== OPERATIONAL_TENANT_ID),
  invoices: [...mockInvoices, ...INITIAL_INVOICES.filter(i => i.tenantId !== OPERATIONAL_TENANT_ID)],
  expenses: [...INITIAL_EXPENSES],
  officeExpenses: [],
  vaultDocuments: [],
  suppliers: [],
});

function normalizeTourExpense(expense: TourExpense): TourExpense {
  const legacyCategory: Record<string, TourExpense["category"]> = {
    Flight: "FLIGHT",
    Hotel: "HOTEL",
    Transport: "TRANSPORT",
    "Visa / Border": "VISA",
    "Guide / Sightseeing": "GUIDE",
    Meal: "MISC",
  };
  const legacy = expense as TourExpense & { paidDate?: string };
  const date = expense.date || legacy.paidDate || expense.createdAt?.slice(0, 10);
  return {
    ...expense,
    category: legacyCategory[expense.category] || expense.category,
    currency: expense.currency || "PKR",
    date: date || new Date().toISOString().slice(0, 10),
    createdAt: expense.createdAt || `${date || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
  };
}
const CURRENCY_FIELD_KEYS = new Set(["currency", "currencySymbol"]);
const CURRENCY_TEXT_PATTERNS = [/\bPKR\s*/g, /\bUSD\s*/g, /₨\s*/g, /\$\s*/g];

function sanitizeCurrencyText(value: string) {
  return CURRENCY_TEXT_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, ""),
    value,
  )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizePersistedData<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeCurrencyText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePersistedData(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !CURRENCY_FIELD_KEYS.has(key))
        .map(([key, item]) => [key, sanitizePersistedData(item)]),
    ) as T;
  }

  return value;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const { user, staffUsers } = useAuth();
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [hrTenantId, setHrTenantId] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [registeredDevices, setRegisteredDevices] = useState<RegisteredDevice[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendanceCutoffTime, setAttendanceCutoffTime] = useState(DEFAULT_ATTENDANCE_CUTOFF);
  const [attendanceTenantId, setAttendanceTenantId] = useState<string | null>(null);
  const [payrollRuns, setPayrollRuns] = useState<MonthlyPayrollRun[]>([]);
  const [salaryAdvances, setSalaryAdvances] = useState<SalaryAdvance[]>([]);
  const [payrollTenantId, setPayrollTenantId] = useState<string | null>(null);
  const [leaveTenantId, setLeaveTenantId] = useState<string | null>(null);
  const [crm, setCRM] = useState<ERPState>(() => initialERP());
  const crmRef = useRef(crm);
  const persistedSnapshot = useRef<string | null>(null);
  const [crmError, setCRMError] = useState("");
  const [crmReady, setCRMReady] = useState(false);
  const allLeads = crm.leads;
  useEffect(() => {
    const employeeKey = `tourflow_hr_employees_${tenant.id}`;
    const shiftKey = `tourflow_hr_shifts_${tenant.id}`;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const normalizeEmployee = (entry: EmployeeProfile): EmployeeProfile => {
        const linked = staffUsers.find((staff) => staff.id === entry.userId || staff.email.toLowerCase() === entry.email.toLowerCase());
        return {
          ...entry,
          deviceStatus: entry.deviceStatus || "UNENROLLED",
          screenAccess: normalizeScreenAccess(entry.screenAccess, linked?.role || "FRONT_DESK"),
        };
      };
      try {
        const savedEmployees = localStorage.getItem(employeeKey);
        const savedShifts = localStorage.getItem(shiftKey);
        const loadedEmployees = savedEmployees ? JSON.parse(savedEmployees) : [];
        setEmployees(Array.isArray(loadedEmployees) ? loadedEmployees.map(normalizeEmployee) : []);
        setShifts(savedShifts ? JSON.parse(savedShifts) : []);
      } catch {
        setEmployees([]);
        setShifts([]);
      }
      setHrTenantId(tenant.id);
    });
    return () => { cancelled = true; };
  }, [staffUsers, tenant.id]);

  useEffect(() => {
    if (hrTenantId !== tenant.id) return;
    localStorage.setItem(`tourflow_hr_employees_${tenant.id}`, JSON.stringify(employees));
    localStorage.setItem(`tourflow_hr_shifts_${tenant.id}`, JSON.stringify(shifts));
  }, [employees, shifts, hrTenantId, tenant.id]);

  useEffect(() => {
    if (hrTenantId !== tenant.id || !user || user.role === "SUPER_ADMIN") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const records = JSON.parse(localStorage.getItem(`${ATTENDANCE_STORAGE_PREFIX}${tenant.id}`) || "[]");
        const devices = JSON.parse(localStorage.getItem(`${REGISTERED_DEVICE_STORAGE_PREFIX}${tenant.id}`) || "[]");
        const storedLeaves = JSON.parse(localStorage.getItem(`${LEAVE_STORAGE_PREFIX}${tenant.id}`) || "[]");
        const storedCutoff = localStorage.getItem(`${ATTENDANCE_CUTOFF_STORAGE_PREFIX}${tenant.id}`);
        const seededToday = seedTodayAttendance(employees.filter((entry) => entry.tenantId === tenant.id), shifts);
        const today = localDateKey();
        const persisted = Array.isArray(records) ? records.filter((entry: AttendanceRecord) => entry.tenantId === tenant.id) : [];
        const historical = persisted.filter((entry: AttendanceRecord) => entry.attendanceDate !== today);
        const currentDay = new Map(seededToday.map((entry) => [entry.employeeId, entry]));
        persisted.filter((entry: AttendanceRecord) => entry.attendanceDate === today).forEach((entry: AttendanceRecord) => currentDay.set(entry.employeeId, entry));
        setAttendanceRecords([...historical, ...currentDay.values()]);
        setRegisteredDevices(Array.isArray(devices) ? devices : []);
        setLeaveRequests(Array.isArray(storedLeaves) ? storedLeaves.filter((entry: LeaveRequest) => entry.tenantId === tenant.id) : []);
        setAttendanceCutoffTime(storedCutoff && /^([01]\d|2[0-3]):[0-5]\d$/.test(storedCutoff) ? storedCutoff : DEFAULT_ATTENDANCE_CUTOFF);
      } catch {
        setAttendanceRecords(seedTodayAttendance(employees.filter((entry) => entry.tenantId === tenant.id), shifts));
        setRegisteredDevices([]);
        setLeaveRequests([]);
        setAttendanceCutoffTime(DEFAULT_ATTENDANCE_CUTOFF);
      }
      // Employees receive only their history; HR/Admins receive the agency register.
      const loadLeaveRecords = user && ["AGENCY_ADMIN", "HR_MANAGER"].includes(user.role)
        ? fetchLeaveRecordsApi
        : fetchLeaveHistoryApi;
      loadLeaveRecords().then((liveLeaves) => {
        if (!cancelled && Array.isArray(liveLeaves)) setLeaveRequests(liveLeaves);
      }).catch(() => {});
      setAttendanceTenantId(tenant.id);
    });
    return () => { cancelled = true; };
  }, [employees, hrTenantId, shifts, tenant.id, user]);

  useEffect(() => {
    if (attendanceTenantId !== tenant.id) return;
    localStorage.setItem(`${ATTENDANCE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(attendanceRecords));
    localStorage.setItem(`${REGISTERED_DEVICE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(registeredDevices));
    localStorage.setItem(`${LEAVE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(leaveRequests));
    localStorage.setItem(`${ATTENDANCE_CUTOFF_STORAGE_PREFIX}${tenant.id}`, attendanceCutoffTime);
  }, [attendanceCutoffTime, attendanceRecords, attendanceTenantId, leaveRequests, registeredDevices, tenant.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAttendance = (event: StorageEvent) => {
      if (!event.newValue) return;
      try {
        if (event.key === `${ATTENDANCE_STORAGE_PREFIX}${tenant.id}`) {
          const records = JSON.parse(event.newValue) as AttendanceRecord[];
          if (Array.isArray(records)) setAttendanceRecords(records.filter((entry) => entry.tenantId === tenant.id));
        }
        if (event.key === `${REGISTERED_DEVICE_STORAGE_PREFIX}${tenant.id}`) {
          const devices = JSON.parse(event.newValue) as RegisteredDevice[];
          if (Array.isArray(devices)) setRegisteredDevices(devices.filter((entry) => entry.tenantId === tenant.id));
        }
        if (event.key === `${LEAVE_STORAGE_PREFIX}${tenant.id}`) {
          const requests = JSON.parse(event.newValue) as LeaveRequest[];
          if (Array.isArray(requests)) setLeaveRequests(requests.filter((entry) => entry.tenantId === tenant.id));
        }
        if (event.key === `${ATTENDANCE_CUTOFF_STORAGE_PREFIX}${tenant.id}` && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.newValue)) {
          setAttendanceCutoffTime(event.newValue);
        }
      } catch {
        // Ignore malformed local demo data from another browser tab.
      }
    };
    window.addEventListener("storage", syncAttendance);
    return () => window.removeEventListener("storage", syncAttendance);
  }, [tenant.id]);

  useEffect(() => {
    if (hrTenantId !== tenant.id || !user || user.role === "SUPER_ADMIN") return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const storedRuns = JSON.parse(localStorage.getItem(`${PAYROLL_STORAGE_PREFIX}${tenant.id}`) || "[]");
        const storedAdvances = JSON.parse(localStorage.getItem(`${SALARY_ADVANCE_STORAGE_PREFIX}${tenant.id}`) || "[]");
        setPayrollRuns(Array.isArray(storedRuns) ? storedRuns.filter((run: MonthlyPayrollRun) => run.tenantId === tenant.id) : []);
        setSalaryAdvances(Array.isArray(storedAdvances) ? storedAdvances.filter((advance: SalaryAdvance) => advance.tenantId === tenant.id) : []);
      } catch {
        setPayrollRuns([]);
        setSalaryAdvances([]);
      }
      // Asynchronously fetch live payroll runs and salary advances from FastAPI backend
      getPayrollRunsApi(tenant.id).then((liveRuns) => {
        if (!cancelled && Array.isArray(liveRuns)) setPayrollRuns(liveRuns);
      }).catch(() => {});

      getSalaryAdvancesApi(tenant.id).then((liveAdvances) => {
        if (!cancelled && Array.isArray(liveAdvances)) setSalaryAdvances(liveAdvances);
      }).catch(() => {});

      setPayrollTenantId(tenant.id);
    });
    return () => { cancelled = true; };
  }, [hrTenantId, tenant.id, user]);

  useEffect(() => {
    if (payrollTenantId !== tenant.id) return;
    localStorage.setItem(`${PAYROLL_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(payrollRuns));
    localStorage.setItem(`${SALARY_ADVANCE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(salaryAdvances));
  }, [payrollRuns, payrollTenantId, salaryAdvances, tenant.id]);

  useEffect(() => {
    if (hrTenantId !== tenant.id) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const stored = JSON.parse(localStorage.getItem(`${LEAVE_STORAGE_PREFIX}${tenant.id}`) || "[]") as LeaveRequest[];
        setLeaveRequests(Array.isArray(stored) ? stored.filter((request) => request.tenantId === tenant.id) : []);
      } catch {
        setLeaveRequests([]);
      }
      setLeaveTenantId(tenant.id);
    });
    return () => { cancelled = true; };
  }, [hrTenantId, tenant.id, user]);

  useEffect(() => {
    if (leaveTenantId !== tenant.id) return;
    localStorage.setItem(`${LEAVE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(leaveRequests));
  }, [leaveRequests, leaveTenantId, tenant.id]);

  const processDeviceAttendance: DataContextType["processDeviceAttendance"] = (input) => {
    if (!user || user.tenantId !== tenant.id || input.employee.tenantId !== tenant.id) {
      return { success: false, error: "UNAUTHORIZED_DEVICE", message: "Sign in with the employee account linked to this device." };
    }
    const result = runDeviceAttendance({
      tenantId: tenant.id,
      ...input,
      attendanceRecords,
      registeredDevices,
    });
    if (!result.success) return result;
    setAttendanceRecords(result.records);
    setRegisteredDevices(result.devices);
    const activeDevice = result.devices.find((device) => device.employeeId === input.employee.id && device.status === "ACTIVE");
    if (activeDevice) {
      setEmployees((previous) => previous.map((employee) => employee.id === input.employee.id
        ? { ...employee, activeDeviceId: activeDevice.id, deviceStatus: "BOUND", deviceModel: activeDevice.deviceModel, deviceEnrolledAt: activeDevice.enrolledAt, deviceRevokedAt: undefined, deviceRevokedBy: undefined, deviceRevocationReason: undefined, updatedAt: new Date().toISOString() }
        : employee));
    }
    const recordsJson = JSON.stringify(result.records);
    localStorage.setItem(`${ATTENDANCE_STORAGE_PREFIX}${tenant.id}`, recordsJson);
    localStorage.setItem(`${REGISTERED_DEVICE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(result.devices));
    window.dispatchEvent(new StorageEvent("storage", { key: `${ATTENDANCE_STORAGE_PREFIX}${tenant.id}`, newValue: recordsJson }));
    return result;
  };

  const processMobileScan: DataContextType["processMobileScan"] = (scannedPayloadStr, clientDeviceToken) => {
    let payload: {
      type?: string;
      tenantId?: string;
      employeeId?: string;
      token?: string;
      expiresAt?: string;
    };
    try {
      payload = JSON.parse(scannedPayloadStr) as typeof payload;
    } catch {
      return { success: false, error: "INVALID_QR", message: "Unrecognized QR code format." };
    }

    if (!payload.type || payload.tenantId !== tenant.id) {
      return { success: false, error: "INVALID_QR", message: "This QR code does not belong to the active agency." };
    }
    if (!user) {
      return { success: false, error: "UNREGISTERED_DEVICE", message: "Please log in to your staff portal first." };
    }

    const employee = employees.find((entry) =>
      entry.tenantId === tenant.id && (entry.userId === user.id || entry.email.toLowerCase() === user.email.toLowerCase()));
    if (!employee) {
      return { success: false, error: "UNREGISTERED_DEVICE", message: "Your login is not linked to an employee profile." };
    }
    const shift = shifts.find((entry) => entry.id === employee.shiftId) || shifts[0];
    if (!shift) {
      return { success: false, error: "INVALID_QR", message: "No attendance shift is assigned to this employee." };
    }

    const isEnrollment = payload.type === "DEVICE_ONBOARDING";
    if (isEnrollment) {
      if (payload.employeeId !== employee.id || !payload.token || !payload.expiresAt) {
        return { success: false, error: "INVALID_QR", message: "This onboarding QR belongs to another employee." };
      }
      if (new Date(payload.expiresAt).getTime() <= new Date().getTime()) {
        return { success: false, error: "INVALID_QR", message: "This onboarding QR has expired. Request a new code from HR." };
      }
      if (localStorage.getItem(`tourflow_consumed_enrollment_${payload.token}`)) {
        return { success: false, error: "INVALID_QR", message: "This onboarding QR has already been used." };
      }
    } else if (
      payload.type !== "OFFICE_ATTENDANCE" ||
      !payload.token ||
      !isOfficeQrTokenValid(payload.token, tenant.id)
    ) {
      return { success: false, error: "INVALID_QR", message: "This office QR has expired. Scan the newly refreshed code." };
    }

    if (!isEnrollment && employee.deviceStatus === "REVOKED") {
      return { success: false, error: "DEVICE_REVOKED", message: "This phone binding was revoked by HR. Request a new onboarding QR." };
    }

    const result = processDeviceAttendance({
      employee,
      shift,
      clientDeviceToken: isEnrollment ? null : clientDeviceToken,
      userAgent: navigator.userAgent,
    });
    if (!result.success) {
      if (result.error === "ALREADY_COMPLETED") {
        return { success: false, error: "ALREADY_COMPLETED", message: "Attendance cycle already closed for today." };
      }
      return {
        success: false,
        error: employee.deviceStatus === "REVOKED" ? "DEVICE_REVOKED" : "UNREGISTERED_DEVICE",
        message: result.message,
      };
    }

    if (isEnrollment && payload.token) {
      localStorage.setItem(`tourflow_consumed_enrollment_${payload.token}`, new Date().toISOString());
    }
    return {
      success: true,
      action: result.action,
      time: result.time,
      status: result.action === "CHECK_IN" && (result.status === "PRESENT" || result.status === "LATE") ? result.status : undefined,
      lateMinutes: result.action === "CHECK_IN" ? result.lateMinutes : undefined,
      workedMinutes: result.action === "CHECK_OUT" ? result.workedMinutes : undefined,
      isNewEnrollment: result.action === "CHECK_IN" ? result.isNewEnrollment : false,
      deviceToken: result.deviceToken,
      employeeId: employee.id,
      employeeName: employee.fullName,
      message: isEnrollment ? `Device registered successfully to ${employee.fullName}.` : undefined,
    };
  };

  const revokeRegisteredDevice: DataContextType["revokeRegisteredDevice"] = (deviceId) => {
    requireHRAdmin();
    const updated = registeredDevices.map((device) =>
      device.id === deviceId && device.tenantId === tenant.id
        ? { ...device, status: "REVOKED" as const }
        : device,
    );
    setRegisteredDevices(updated);
    localStorage.setItem(`${REGISTERED_DEVICE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(updated));
    const device = registeredDevices.find((entry) => entry.id === deviceId);
    const revokedAt = new Date().toISOString();
    if (device) setEmployees((previous) => previous.map((employee) => employee.id === device.employeeId
      ? { ...employee, activeDeviceId: undefined, deviceStatus: "REVOKED", deviceRevokedAt: revokedAt, deviceRevokedBy: user?.name || "HR administrator", deviceRevocationReason: "Registered attendance device revoked", updatedAt: revokedAt }
      : employee));
  };

  const revokeEmployeeDevice: DataContextType["revokeEmployeeDevice"] = (employeeId, reason) => {
    requireHRAdmin();
    if (!reason.trim()) throw new Error("A revocation reason is required for the device audit trail.");
    const employee = employees.find((entry) => entry.id === employeeId && entry.tenantId === tenant.id);
    if (!employee) throw new Error("Employee profile not found.");

    const revokedAt = new Date().toISOString();
    setRegisteredDevices((previous) => previous.filter((device) => !(device.tenantId === tenant.id && device.employeeId === employeeId)));
    setEmployees((previous) => previous.map((entry) => entry.id === employeeId
      ? {
          ...entry,
          activeDeviceId: undefined,
          deviceStatus: "REVOKED",
          deviceModel: undefined,
          deviceEnrolledAt: undefined,
          deviceRevokedAt: revokedAt,
          deviceRevokedBy: user?.name || "HR administrator",
          deviceRevocationReason: reason.trim(),
          updatedAt: revokedAt,
        }
      : entry));

    const auditKey = `tourflow_device_audit_${tenant.id}`;
    const existing = JSON.parse(localStorage.getItem(auditKey) || "[]") as unknown[];
    localStorage.setItem(auditKey, JSON.stringify([{
      id: crypto.randomUUID(),
      employeeId,
      employeeName: employee.fullName,
      action: "REVOKED",
      reason: reason.trim(),
      adjustedByStaff: user?.name || "Agency Admin",
      timestamp: revokedAt,
    }, ...(Array.isArray(existing) ? existing : [])]));
  };

  const resetEmployeeDeviceEnrollment: DataContextType["resetEmployeeDeviceEnrollment"] = (employeeId) => {
    requireHRAdmin();
    const updatedDevices = registeredDevices.filter((device) => !(device.tenantId === tenant.id && device.employeeId === employeeId));
    setRegisteredDevices(updatedDevices);
    localStorage.setItem(`${REGISTERED_DEVICE_STORAGE_PREFIX}${tenant.id}`, JSON.stringify(updatedDevices));
    setEmployees((previous) => previous.map((employee) => employee.id === employeeId
      ? { ...employee, activeDeviceId: undefined, deviceStatus: "UNENROLLED", deviceModel: undefined, deviceEnrolledAt: undefined, deviceRevokedAt: undefined, deviceRevokedBy: undefined, deviceRevocationReason: undefined, updatedAt: new Date().toISOString() }
      : employee));
  };

  const createDeviceEnrollmentToken: DataContextType["createDeviceEnrollmentToken"] = (employeeId) => {
    requireHRAdmin();
    const employee = employees.find((entry) => entry.id === employeeId && entry.tenantId === tenant.id);
    if (!employee) throw new Error("Employee profile not found.");
    const payload = buildDeviceEnrollmentPayload(tenant.id, employeeId);
    localStorage.setItem(`tourflow_device_enrollment_${payload.token}`, JSON.stringify(payload));
    return JSON.stringify(payload);
  };

  const updateManualAttendanceRecord: DataContextType["updateManualAttendanceRecord"] = async (recordId, updates, mandatoryReason) => {
    requireHRAdmin();
    if (mandatoryReason.trim().length < 5) {
      throw new Error("A descriptive correction reason is required before saving.");
    }
    const current = attendanceRecords.find((record) => record.id === recordId && record.tenantId === tenant.id);
    if (!current || current.id.startsWith("unpunched_")) {
      throw new Error("This attendance entry is no longer available. Refresh the attendance page and select the current record.");
    }
    const persisted = await correctAttendanceRecord(recordId, {
      attendance_date: updates.attendanceDate || updates.date || current.attendanceDate || current.date || "",
      status: updates.status || current.status,
      check_in: updates.checkInAt ?? updates.check_in ?? current.checkInAt ?? current.check_in ?? null,
      check_out: updates.checkOutAt ?? updates.check_out ?? current.checkOutAt ?? current.check_out ?? null,
      correction_reason: mandatoryReason.trim(),
    });
    setAttendanceRecords((previous) =>
      previous.map((record) => (record.id === recordId ? persisted : record))
    );
    return persisted;
  };

  const createManualAttendanceRecord: DataContextType["createManualAttendanceRecord"] = async (employeeId, attendanceDate, updates, mandatoryReason) => {
    requireHRAdmin();
    if (mandatoryReason.trim().length < 5) {
      throw new Error("A descriptive attendance reason is required before saving.");
    }
    const existing = attendanceRecords.find((record) =>
      record.tenantId === tenant.id
      && record.employeeId === employeeId
      && (record.attendanceDate === attendanceDate || record.date === attendanceDate)
      && !record.id.startsWith("unpunched_"),
    );
    if (existing) {
      return updateManualAttendanceRecord(
        existing.id,
        { ...updates, attendanceDate },
        mandatoryReason,
      );
    }

    const persisted = await createManualAttendance({
      employee_id: employeeId,
      attendance_date: attendanceDate,
      status: updates.status || "PRESENT",
      check_in: updates.checkInAt ?? updates.check_in ?? null,
      check_out: updates.checkOutAt ?? updates.check_out ?? null,
      correction_reason: mandatoryReason.trim(),
    });
    setAttendanceRecords((previous) => [persisted, ...previous.filter((record) =>
      record.id !== persisted.id
      && !(record.tenantId === persisted.tenantId
        && record.employeeId === persisted.employeeId
        && (record.attendanceDate === persisted.attendanceDate || record.date === persisted.attendanceDate))),
    ]);
    return persisted;
  };

  const voidAttendanceRecord: DataContextType["voidAttendanceRecord"] = async (recordId, mandatoryReason) => {
    requireHRAdmin();
    if (mandatoryReason.trim().length < 5) {
      throw new Error("A descriptive void reason is required before removing attendance.");
    }
    const current = attendanceRecords.find((record) => record.id === recordId && record.tenantId === tenant.id);
    if (!current || current.id.startsWith("unpunched_")) {
      throw new Error("This attendance entry is no longer available. Refresh the attendance page and try again.");
    }
    await voidAttendanceRecordApi(recordId, mandatoryReason.trim());
    setAttendanceRecords((previous) => previous.filter((record) => record.id !== recordId));
  };

  const previewDailyAttendance: DataContextType["previewDailyAttendance"] = (targetDate) => finalizeAttendanceRecords({
    tenantId: tenant.id,
    targetDate,
    cutoffTime: attendanceCutoffTime,
    executedByStaff: user?.name || "Attendance Administrator",
    employees,
    shifts,
    leaveRequests,
    attendanceRecords,
    enforceCutoff: false,
  }).summary;

  const finalizeDailyAttendance: DataContextType["finalizeDailyAttendance"] = async (targetDate, executedByStaff) => {
    requireHRAdmin();
    const persistedCutoff = localStorage.getItem(`${ATTENDANCE_CUTOFF_STORAGE_PREFIX}${tenant.id}`);
    const configuredCutoff = persistedCutoff && /^([01]\d|2[0-3]):[0-5]\d$/.test(persistedCutoff)
      ? persistedCutoff
      : attendanceCutoffTime;
    const preview = finalizeAttendanceRecords({
      tenantId: tenant.id,
      targetDate,
      cutoffTime: configuredCutoff,
      executedByStaff,
      employees,
      shifts,
      leaveRequests,
      attendanceRecords,
      enforceCutoff: false,
    });
    await finalizeAttendanceApi({
      target_date: targetDate,
      cutoff_time: configuredCutoff,
      executed_by: executedByStaff,
    });
    const persisted = await fetchDailyAttendanceApi();
    setAttendanceRecords(persisted);
    return preview.summary;
  };

  const updateAttendanceCutoffTime: DataContextType["updateAttendanceCutoffTime"] = (cutoffTime) => {
    requireHRAdmin();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime)) throw new Error("Enter a valid attendance cutoff time.");
    setAttendanceCutoffTime(cutoffTime);
    localStorage.setItem(`${ATTENDANCE_CUTOFF_STORAGE_PREFIX}${tenant.id}`, cutoffTime);
  };

  const requireHRAdmin = () => {
    if (!user || !["AGENCY_ADMIN", "HR_MANAGER"].includes(user.role) || user.tenantId !== tenant.id) {
      throw new Error("Only agency administrators or HR managers can manage payroll operations.");
    }
  };

  const resolveCurrentEmployee = () => {
    if (!user || user.tenantId !== tenant.id) return null;
    const userEmail = user.email?.toLowerCase();
    return employees.find((employee) =>
      employee.tenantId === tenant.id &&
      (employee.userId === user.id || (userEmail && employee.email.toLowerCase() === userEmail))) || null;
  };

  const reviewLeaveRequest: DataContextType["reviewLeaveRequest"] = (requestId, decision, rejectionReason) => {
    requireHRAdmin();
    const current = leaveRequests.find((request) => request.id === requestId && request.tenantId === tenant.id);
    if (!current) throw new Error("Leave request not found.");
    if (current.status !== "PENDING") throw new Error("This leave request has already been reviewed.");
    if (decision === "REJECT" && !rejectionReason?.trim()) throw new Error("A rejection reason is required.");
    const employee = employees.find((entry) => entry.id === current.employeeId && entry.tenantId === tenant.id);
    if (!employee) throw new Error("The linked employee profile was not found.");
    const shift = shifts.find((entry) => entry.id === employee.shiftId) || shifts[0];
    if (!shift) throw new Error("The employee has no assigned work shift.");
    if (decision === "APPROVE") {
      const affectedMonths = new Set(leaveWorkingDates(current.startDate, current.endDate, shift).map((date) => date.slice(0, 7)));
      const closedPayroll = payrollRuns.find((run) =>
        run.tenantId === tenant.id && affectedMonths.has(run.monthCode) && ["APPROVED", "DISBURSED", "LOCKED"].includes(run.status));
      if (closedPayroll) throw new Error(`${closedPayroll.monthString} payroll is finalized. Reopen it before approving this leave.`);
      validateLeaveRequest(
        current,
        employee,
        leaveRequests.filter((request) => request.id !== current.id),
        calculateLeaveBalance(employee, leaveRequests.filter((request) => request.id !== current.id)),
      );
    }
    const updated = reviewLeaveRequestRecord(
      current,
      decision,
      user?.name || "HR Administrator",
      rejectionReason,
    );
    setLeaveRequests((previous) => previous.map((request) => request.id === requestId ? updated : request));
    if (decision === "APPROVE") {
      setAttendanceRecords((previous) => syncApprovedLeaveAttendance(previous, updated, employee, shift));
    }
    reviewLegacyLeaveRequestApi(requestId, {
      decision,
      rejection_reason: rejectionReason,
      reviewed_by: user?.name,
    }).then((serverRequest) => {
      setLeaveRequests((previous) => previous.map((request) => request.id === requestId ? serverRequest : request));
    }).catch(() => {});
    return updated;
  };

  const recordLeave: DataContextType["recordLeave"] = async (input) => {
    requireHRAdmin();
    const employee = employees.find((entry) => entry.id === input.employeeId && entry.tenantId === tenant.id);
    if (!employee || employee.status !== "ACTIVE") throw new Error("Select an active employee in this agency.");
    const recorded = await recordLeaveApi({
      employee_id: employee.id,
      leave_type: input.leaveType,
      start_date: input.startDate,
      end_date: input.endDate,
      reason: input.reason,
    });
    setLeaveRequests((previous) => [recorded, ...previous.filter((request) => request.id !== recorded.id)]);
    return recorded;
  };

  const voidLeave: DataContextType["voidLeave"] = async (requestId, reason) => {
    requireHRAdmin();
    if (!reason.trim()) throw new Error("A reason is required to void leave.");
    const current = leaveRequests.find((request) => request.id === requestId && request.tenantId === tenant.id);
    if (!current || current.status !== "APPROVED") throw new Error("Only approved leave records can be voided.");
    const updated = await voidLeaveApi(requestId, { reason: reason.trim() });
    setLeaveRequests((previous) => previous.map((request) => request.id === requestId ? updated : request));
    return updated;
  };

  const getEmployeeLeaveBalance: DataContextType["getEmployeeLeaveBalance"] = (employeeId) => {
    const employee = employees.find((entry) => entry.id === employeeId && entry.tenantId === tenant.id);
    if (!employee) throw new Error("Employee profile not found.");
    const currentEmployee = resolveCurrentEmployee();
    const canInspectRoster = Boolean(user && ["AGENCY_ADMIN", "HR_MANAGER"].includes(user.role));
    if (!canInspectRoster && currentEmployee?.id !== employeeId) {
      throw new Error("You can only view your own leave balance.");
    }
    return calculateLeaveBalance(employee, leaveRequests);
  };

  const updateLeaveEntitlement: DataContextType["updateLeaveEntitlement"] = (employeeId, annualTotal, sickTotal) => {
    requireHRAdmin();
    if (!Number.isFinite(annualTotal) || !Number.isFinite(sickTotal) || annualTotal < 0 || sickTotal < 0) {
      throw new Error("Leave entitlements must be valid positive values.");
    }
    const current = employees.find((employee) => employee.id === employeeId && employee.tenantId === tenant.id);
    if (!current) throw new Error("Employee profile not found.");
    const updated = { ...current, annualLeaveAllowance: annualTotal, sickLeaveAllowance: sickTotal, updatedAt: new Date().toISOString() };
    setEmployees((previous) => previous.map((employee) => employee.id === employeeId ? updated : employee));
    updateLeaveEntitlementApi(employeeId, {
      annual_allowance: annualTotal,
      sick_allowance: sickTotal,
    }).catch(() => {});
    return updated;
  };

  const updateEmployeeRecord: DataContextType["updateEmployeeRecord"] = async (employeeId, profileData, authData) => {
    requireHRAdmin();
    const current = employees.find((entry) => entry.id === employeeId);
    if (!current) throw new Error("Employee profile not found.");
    const persisted = await updateEmployeeApi(employeeId, profileData, authData);
    const updated: EmployeeProfile = { ...current, ...profileData, ...persisted, tenantId: tenant.id, updatedAt: new Date().toISOString() };
    setEmployees((previous) => previous.map((entry) => entry.id === employeeId ? updated : entry));
    return updated;
  };

  const createEmployeeRecord: DataContextType["createEmployeeRecord"] = async (profile, authData) => {
    requireHRAdmin();
    const persisted = await createEmployeeApi(profile, authData);
    const created: EmployeeProfile = {
      ...profile,
      ...persisted,
      tenantId: tenant.id,
      updatedAt: new Date().toISOString(),
    };
    setEmployees((previous) => [created, ...previous]);
    return created;
  };

  const createShiftRecord: DataContextType["createShiftRecord"] = async (shiftData) => {
    requireHRAdmin();
    const persisted = await createShiftApi(shiftData);
    setShifts((previous) => [...previous, persisted]);
    return persisted;
  };

  const updateShiftRecord: DataContextType["updateShiftRecord"] = async (shiftId, shiftData) => {
    requireHRAdmin();
    const persisted = await updateShiftApi(shiftId, shiftData);
    setShifts((previous) =>
      previous.map((shift) => (shift.id === shiftId ? persisted : shift))
    );
    return persisted;
  };

  const calculateMonthlyPayroll: DataContextType["calculateMonthlyPayroll"] = (monthCode) => {
    requireHRAdmin();
    const existingRun = payrollRuns.find((run) => run.tenantId === tenant.id && run.monthCode === monthCode);
    const calculated = buildPayrollRun({
      tenantId: tenant.id,
      monthCode,
      employees,
      attendanceRecords,
      salaryAdvances,
      existingRun,
    });
    setPayrollRuns((previous) => [calculated, ...previous.filter((run) => run.id !== calculated.id)]);

    // Asynchronously notify live FastAPI backend
    const [yearStr, monthStr] = monthCode.split("-");
    const year = Number(yearStr) || new Date().getFullYear();
    const month = Number(monthStr) || new Date().getMonth() + 1;
    generatePayrollRunApi(month, year, tenant.id).then((serverRun) => {
      setPayrollRuns((previous) => [serverRun, ...previous.filter((run) => run.monthCode !== serverRun.monthCode)]);
    }).catch(() => {});

    return calculated;
  };

  const updatePayrollEmployee: DataContextType["updatePayrollEmployee"] = (runId, employeeId, updates) => {
    requireHRAdmin();
    const current = payrollRuns.find((run) => run.id === runId && run.tenantId === tenant.id);
    if (!current) throw new Error("Payroll run not found.");
    const updated = applyPayrollItemUpdate(current, employeeId, updates);
    setPayrollRuns((previous) => previous.map((run) => run.id === runId ? updated : run));
    return updated;
  };

  const approvePayrollRun: DataContextType["approvePayrollRun"] = (runId) => {
    requireHRAdmin();
    const current = payrollRuns.find((run) => run.id === runId && run.tenantId === tenant.id);
    if (!current) throw new Error("Payroll run not found.");
    if (current.status !== "CALCULATED") throw new Error("Only calculated payroll can be approved.");
    if (salaryAdvances.some((advance) =>
      advance.tenantId === tenant.id && advance.payrollMonth === current.monthCode && advance.status === "PENDING")) {
      throw new Error("Review all pending salary advances before approving payroll.");
    }
    const updated: MonthlyPayrollRun = {
      ...current,
      status: "APPROVED",
      approvedByAdminId: user!.id,
      approvedAt: new Date().toISOString(),
    };
    setPayrollRuns((previous) => previous.map((run) => run.id === runId ? updated : run));

    // Asynchronously sync approval with FastAPI backend
    approvePayrollRunApi(runId).then((serverRun) => {
      setPayrollRuns((previous) => previous.map((run) => run.id === serverRun.id ? serverRun : run));
    }).catch(() => {});

    return updated;
  };

  const disbursePayrollRun: DataContextType["disbursePayrollRun"] = (runId, paymentReference) => {
    requireHRAdmin();
    if (!paymentReference.trim()) throw new Error("A bank batch or payment reference is required.");
    const current = payrollRuns.find((run) => run.id === runId && run.tenantId === tenant.id);
    if (!current) throw new Error("Payroll run not found.");
    if (current.status !== "APPROVED") throw new Error("Approve payroll before recording disbursement.");
    const updated: MonthlyPayrollRun = {
      ...current,
      status: "DISBURSED",
      disbursedAt: new Date().toISOString(),
      items: current.items.map((item) => ({
        ...item,
        paymentStatus: "PROCESSED",
        paymentReference: paymentReference.trim(),
      })),
    };
    setPayrollRuns((previous) => previous.map((run) => run.id === runId ? updated : run));
    setSalaryAdvances((previous) => previous.map((advance) =>
      advance.tenantId === tenant.id && advance.payrollMonth === current.monthCode && advance.status === "APPROVED"
        ? { ...advance, status: "DEDUCTED" as const }
        : advance));

    // Asynchronously sync disbursement with FastAPI backend
    disbursePayrollRunApi(runId, paymentReference.trim()).then((serverRun) => {
      setPayrollRuns((previous) => previous.map((run) => run.id === serverRun.id ? serverRun : run));
      getSalaryAdvancesApi(tenant.id, serverRun.monthCode).then((advances) => {
        setSalaryAdvances((previous) => [...advances, ...previous.filter((advance) => advance.payrollMonth !== serverRun.monthCode)]);
      }).catch(() => {});
    }).catch(() => {});

    return updated;
  };

  const createSalaryAdvance: DataContextType["createSalaryAdvance"] = (input) => {
    requireHRAdmin();
    const closedRun = payrollRuns.find((run) =>
      run.tenantId === tenant.id && run.monthCode === input.payrollMonth && ["APPROVED", "DISBURSED", "LOCKED"].includes(run.status));
    if (closedRun) throw new Error("Salary advances cannot be added after payroll approval for this month.");
    const employee = employees.find((entry) => entry.id === input.employeeId && entry.tenantId === tenant.id);
    if (!employee) throw new Error("Employee profile not found.");
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a valid salary advance amount.");
    if (!input.reason.trim()) throw new Error("A reason is required for the advance request.");
    const advance: SalaryAdvance = {
      id: `advance_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      requestDate: new Date().toISOString(),
      amount: input.amount,
      reason: input.reason.trim(),
      status: "PENDING",
      payrollMonth: input.payrollMonth,
    };
    setSalaryAdvances((previous) => [advance, ...previous]);

    // Asynchronously submit advance request to FastAPI backend
    requestSalaryAdvanceApi({
      employee_id: employee.id,
      amount: input.amount,
      reason: input.reason.trim(),
      payroll_month: input.payrollMonth,
    }).then((serverAdvance) => {
      setSalaryAdvances((previous) => [serverAdvance, ...previous.filter((entry) => entry.id !== advance.id)]);
    }).catch(() => {});

    return advance;
  };

  const requestPersonalSalaryAdvance: DataContextType["requestPersonalSalaryAdvance"] = (input) => {
    const employee = resolveCurrentEmployee();
    if (!employee) throw new Error("Your login is not linked to an employee profile.");
    const closedRun = payrollRuns.find((run) =>
      run.tenantId === tenant.id && run.monthCode === input.payrollMonth && ["APPROVED", "DISBURSED", "LOCKED"].includes(run.status));
    if (closedRun) throw new Error("Select a repayment month whose payroll is still open.");
    if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Enter a valid salary advance amount.");
    if (!input.reason.trim()) throw new Error("A reason is required for the advance request.");
    const advance: SalaryAdvance = {
      id: `advance_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      requestDate: new Date().toISOString(),
      amount: input.amount,
      reason: input.reason.trim(),
      status: "PENDING",
      payrollMonth: input.payrollMonth,
    };
    setSalaryAdvances((previous) => [advance, ...previous]);

    // Asynchronously submit advance request to FastAPI backend
    requestSalaryAdvanceApi({
      employee_id: employee.id,
      amount: input.amount,
      reason: input.reason.trim(),
      payroll_month: input.payrollMonth,
    }).then((serverAdvance) => {
      setSalaryAdvances((previous) => [serverAdvance, ...previous.filter((entry) => entry.id !== advance.id)]);
    }).catch(() => {});

    return advance;
  };

  const getPersonalPayslip: DataContextType["getPersonalPayslip"] = (runId, requestedEmployeeId) => {
    const employee = resolveCurrentEmployee();
    if (!employee || (requestedEmployeeId && requestedEmployeeId !== employee.id)) {
      throw new Error("Unauthorized: payroll records are restricted to your employee profile.");
    }
    const run = payrollRuns.find((entry) =>
      entry.id === runId && entry.tenantId === tenant.id && ["APPROVED", "DISBURSED", "LOCKED"].includes(entry.status));
    const item = run?.items.find((entry) => entry.employeeId === employee.id);
    if (!run || !item) throw new Error("Payslip not found or access is unauthorized.");
    return {
      runId: run.id,
      tenantId: run.tenantId,
      monthString: run.monthString,
      monthCode: run.monthCode,
      payrollStatus: run.status,
      generatedAt: run.generatedAt,
      approvedAt: run.approvedAt,
      disbursedAt: run.disbursedAt,
      item,
    };
  };

  const reviewSalaryAdvance: DataContextType["reviewSalaryAdvance"] = (advanceId, decision) => {
    requireHRAdmin();
    const current = salaryAdvances.find((advance) => advance.id === advanceId && advance.tenantId === tenant.id);
    if (!current) throw new Error("Salary advance request not found.");
    if (current.status !== "PENDING") throw new Error("This salary advance has already been reviewed.");
    const closedRun = payrollRuns.find((run) =>
      run.tenantId === tenant.id && run.monthCode === current.payrollMonth && ["APPROVED", "DISBURSED", "LOCKED"].includes(run.status));
    if (closedRun) throw new Error("This payroll month is already approved and cannot accept advance changes.");
    const updated: SalaryAdvance = {
      ...current,
      status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
      approvedByAdmin: decision === "APPROVE" ? user?.name || "Agency Admin" : undefined,
      reviewedAt: new Date().toISOString(),
    };
    setSalaryAdvances((previous) => previous.map((advance) => advance.id === advanceId ? updated : advance));

    // Asynchronously submit review to FastAPI backend
    reviewSalaryAdvanceApi(advanceId, decision === "APPROVE" ? "APPROVED" : "REJECTED").then((serverAdvance) => {
      setSalaryAdvances((previous) => previous.map((advance) => advance.id === serverAdvance.id ? serverAdvance : advance));
    }).catch(() => {});

    return updated;
  };
  const commitCRM = (change: CRMState | ERPState) => {
    const next = bridgeGroupTourVisaCases({ ...crmRef.current, ...change });
    // Persist the whole transaction before publishing it: storage failure cannot half-convert a lead.
    try {
      if (localStorage.getItem(ERP_KEY) !== persistedSnapshot.current)
        throw new Error(
          "Saved data changed in another tab. Reload before making changes.",
        );
      const serialized = JSON.stringify(next);
      localStorage.setItem(ERP_KEY, serialized);
      persistedSnapshot.current = serialized;
    } catch (error) {
      if (error instanceof Error && error.message.includes("another tab"))
        throw error;
      throw new Error(
        "Unable to save CRM data. Free browser storage and try again.",
      );
    }
    crmRef.current = next;
    setCRM(next);
  };
  const setAllLeads = (update: Lead[] | ((prev: Lead[]) => Lead[])) => {
    const leads =
      typeof update === "function" ? update(crmRef.current.leads) : update;
    const clients = crmRef.current.clients.map((client) => {
      const lead = leads.find(
        (l) => l.id === client.leadId && l.tenantId === client.tenantId,
      );
      return lead ? { ...client, interactions: lead.interactions } : client;
    });
    commitCRM({ ...crmRef.current, leads, clients });
  };

  useEffect(() => {
    // Platform super admins manage tenants and do not have an agency data scope.
    // Avoid loading agency CRM resources such as leads and invoices for them.
    if (!crmReady || !user || user.role === "SUPER_ADMIN") return;
    let isMounted = true;
    import("@/lib/lead-api").then(({ fetchLeadsApi }) => {
      fetchLeadsApi(tenant.id).then((liveLeads) => {
        if (isMounted && Array.isArray(liveLeads) && liveLeads.length > 0) {
          setAllLeads((prev) => [...liveLeads, ...prev.filter((l) => l.tenantId !== tenant.id)]);
        }
      }).catch(() => {});
    });

    import("@/lib/invoice-api").then(({ fetchInvoices, fetchPaymentProofClaims }) => {
      fetchInvoices({ tenant_id: tenant.id }).then((liveInvoices) => {
        if (isMounted && Array.isArray(liveInvoices) && liveInvoices.length > 0) {
          commitCRM({
            ...crmRef.current,
            invoices: [
              ...liveInvoices,
              ...crmRef.current.invoices.filter((i) => i.tenantId !== tenant.id),
            ],
          });
        }
      }).catch(() => {});

      fetchPaymentProofClaims().then((liveClaims) => {
        if (isMounted && Array.isArray(liveClaims) && liveClaims.length > 0) {
          commitCRM({
            ...crmRef.current,
            paymentProofClaims: [
              ...liveClaims,
              ...(crmRef.current.paymentProofClaims || []).filter(
                (c) => !liveClaims.some((lc) => lc.id === c.id)
              ),
            ],
          });
        }
      }).catch(() => {});
    });

    import("@/lib/supplier-api").then(({ fetchSuppliers }) => {
      fetchSuppliers().then((liveSuppliers) => {
        if (isMounted && Array.isArray(liveSuppliers) && liveSuppliers.length > 0) {
          commitCRM({
            ...crmRef.current,
            suppliers: [
              ...liveSuppliers,
              ...(crmRef.current.suppliers || []).filter(
                (s) => !liveSuppliers.some((ls) => ls.id === s.id)
              ),
            ],
          });
        }
      }).catch(() => {});
    });

    import("@/lib/expense-api").then(({ fetchOfficeExpenses }) => {
      fetchOfficeExpenses().then((liveExpenses) => {
        if (isMounted && Array.isArray(liveExpenses) && liveExpenses.length > 0) {
          commitCRM({
            ...crmRef.current,
            officeExpenses: [
              ...liveExpenses,
              ...(crmRef.current.officeExpenses || []).filter(
                (e) => !liveExpenses.some((le) => le.id === e.id)
              ),
            ],
          });
        }
      }).catch(() => {});
    });

    fetchEmployeesApi(tenant.id).then((liveEmployees) => {
      if (isMounted && Array.isArray(liveEmployees)) {
        setEmployees((previous) => [
          ...liveEmployees,
          ...previous.filter((employee) => employee.tenantId !== tenant.id),
        ]);
      }
    }).catch(() => {});

    fetchShiftsApi().then((liveShifts) => {
      if (isMounted && Array.isArray(liveShifts)) {
        setShifts(liveShifts);
      }
    }).catch(() => {});

    fetchDailyAttendanceApi().then((liveAttendance) => {
      if (isMounted && Array.isArray(liveAttendance)) {
        setAttendanceRecords(liveAttendance);
      }
    }).catch(() => {});

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crmReady, user?.id, tenant.id]);
  const requireCRM = (admin = false) => {
    if (!crmReady)
      throw new Error(
        "CRM storage is not ready. Reload before making changes.",
      );
    if (
      !user ||
      (user.tenantId && user.tenantId !== tenant.id && user.role !== "SUPER_ADMIN" && user.role !== "AGENCY_ADMIN") ||
      !["AGENCY_ADMIN", "FRONT_DESK", "TOUR_MANAGER", "VISA_CONSULTANT", "SUPER_ADMIN"].includes(user.role) ||
      (admin && user.role !== "AGENCY_ADMIN" && user.role !== "SUPER_ADMIN")
    )
      throw new Error("Access restricted for this action.");
  };
  const requireOperations = (roles: string[]) => {
    if (!crmReady)
      throw new Error(
        "CRM storage is not ready. Reload before making changes.",
      );
    if (
      !user ||
      (user.tenantId && user.tenantId !== tenant.id) ||
      !roles.includes(user.role)
    )
      throw new Error("Access restricted for this action.");
  };
  const cancelBooking = (id: string, input: CancellationInput) => {
    requireCRM(true);
    commitCRM(cancelBookingTransaction(crmRef.current, tenant.id, id, input,
      user!, new Date().toISOString(), () => crypto.randomUUID()));
    // Live API Sync
    import("@/lib/booking-api").then(({ cancelBooking: cancelBookingApi }) => {
      cancelBookingApi(
        id,
        input.reasonCategory,
        input.cancellationFeeRetained,
        input.refundMethod,
        input.notes
      ).catch(() => {});
    });
  };
  const activeReps = staffUsers
    .filter(s => s.tenantId === tenant.id && s.status === 'Active' && s.role === 'FRONT_DESK')
    .map(s => s.name);
  const validateReps = (reps: string[]) => {
    if (
      new Set(reps).size !== reps.length ||
      reps.some((rep) => !activeReps.includes(rep))
    )
      throw new Error("Select active agency representatives only.");
  };
  const bulkUpdateLeads = (ids: string[], change: BulkChange) => {
    requireCRM();
    if ("assignedTo" in change) validateReps([change.assignedTo]);
    commitCRM(
      applyBulk(
        crmRef.current,
        tenant.id,
        ids,
        change,
        user!.name,
        new Date().toISOString(),
        () => crypto.randomUUID(),
      ),
    );
    // Live API Sync
    import("@/lib/lead-api").then(({ updateLeadApi }) => {
      ids.forEach((id) => {
        updateLeadApi(id, change).catch(() => {});
      });
    });
  };
  const convertLead = (leadId: string, conversion: Conversion) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    commitCRM(
      convertCRM(
        crmRef.current,
        tenant.id,
        leadId,
        conversion,
        crmRef.current.tours,
        user!.name,
        new Date().toISOString(),
        () => crypto.randomUUID(),
      ),
    );
  };
  const createBooking = (input: BookingDraftInput) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    const result = createBookingDraft(
      crmRef.current,
      tenant.id,
      input,
      new Date().toISOString(),
      () => crypto.randomUUID(),
    );
    commitCRM(result.state);
    return result.booking;
  };
  const createBookingForExistingClient: DataContextType["createBookingForExistingClient"] = (clientId, input, payment) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    if (payment && user!.role !== "AGENCY_ADMIN") throw new Error("Submit payment proof after booking; an admin must verify the receipt.");
    if (input.assignedRep !== user!.name) validateReps([input.assignedRep || ""]);
    if (user!.role === "FRONT_DESK" && input.conversion.kind === "GROUP_TOUR") {
      const tourId = input.conversion.tourId;
      const tour = crmRef.current.tours.find(t => t.id === tourId && t.tenantId === tenant.id);
      if (!tour || input.conversion.pricePerPerson !== tour.pricePerPerson)
        throw new Error("Only an agency admin can change the tour selling price.");
    }
    const now = new Date().toISOString();
    const draft = createBookingDraft(crmRef.current, tenant.id, { ...input, clientId }, now, () => crypto.randomUUID());
    const next = confirmBookingTransaction(draft.state, tenant.id, draft.booking.id, user!.name, now, () => crypto.randomUUID(), payment);
    const history = next.bookings.filter(b => b.clientId === clientId && b.tenantId === tenant.id);
    const confirmed = history.filter(b => b.status === "CONFIRMED" || b.status === "COMPLETED");
    const spend = confirmed.reduce((sum, b) => sum + b.totalAgreedAmount, 0);
    next.clients = next.clients.map(c => c.id === clientId && c.tenantId === tenant.id ? {
      ...c, bookingIds: history.map(b => b.id), totalLifetimeSpend: spend,
      clientTier: confirmed.length >= 3 || spend > 2000000 ? "VIP" : confirmed.length > 1 ? "REGULAR" : "NEW",
    } : c);
    commitCRM(next);
    // Live API Sync
    import("@/lib/booking-api").then(({ confirmBooking: confirmBookingApi }) => {
      confirmBookingApi({
        clientId,
        serviceType: draft.booking.serviceType,
        packageId: draft.booking.tourId,
        paxCount: draft.booking.paxCount,
        agreedPricePerPax: draft.booking.agreedPricePerPax,
        totalAgreedAmount: draft.booking.totalAgreedAmount,
        initialDeposit: payment?.amount,
        paymentMethod: payment?.method,
        paymentReference: payment?.reference,
        milestones: (input.milestones || []).map((m) => ({ name: m.name, amount: m.amount, dueDate: m.dueDate })),
      }).catch(() => {});
    });
    return next.bookings.find(b => b.id === draft.booking.id)!;
  };
  const confirmBooking = (id: string, token?: BookingPaymentInput) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    if (token && user!.role !== "AGENCY_ADMIN") throw new Error("Payment settlement requires admin verification.");
    const quote = crmRef.current.bookings.find(
      (b) =>
        b.id === id &&
        b.tenantId === tenant.id &&
        b.status === "DRAFT" &&
        !b.clientId,
    );
    if (quote?.quoteConversion && quote.leadId) {
      convertLeadToBooking(
        quote.leadId,
        quote.quoteConversion,
        quote.milestones,
        token,
      );
      return;
    }
    commitCRM(
      confirmBookingTransaction(
        crmRef.current,
        tenant.id,
        id,
        user!.name,
        new Date().toISOString(),
        () => crypto.randomUUID(),
        token,
      ),
    );
    // Live API Sync
    import("@/lib/booking-api").then(({ confirmBooking: confirmBookingApi }) => {
      confirmBookingApi({
        quoteId: id,
        initialDeposit: token?.amount,
        paymentMethod: token?.method,
        paymentReference: token?.reference,
      } as any).catch(() => {});
    });
  };
  const prepareLeadBooking = (
    leadId: string,
    conversion: Conversion,
    milestones: BookingDraftInput["milestones"],
  ) => {
    requireCRM();
    const now = new Date().toISOString();
    const uuid = () => crypto.randomUUID();
    const converted = convertCRM(
      crmRef.current,
      tenant.id,
      leadId,
      conversion,
      crmRef.current.tours,
      user!.name,
      now,
      uuid,
    );
    const client = converted.clients.find(
      (c) => c.leadId === leadId && c.tenantId === tenant.id,
    )!;
    const existing = crmRef.current.bookings.find(
      (b) =>
        b.tenantId === tenant.id &&
        b.leadId === leadId &&
        b.status === "DRAFT" &&
        !b.clientId,
    );
    const draft = createBookingDraft(
      {
        ...crmRef.current,
        ...converted,
        bookings: crmRef.current.bookings.filter((b) => b.id !== existing?.id),
      },
      tenant.id,
      { clientId: client.id, milestones },
      now,
      uuid,
    );
    if (existing) {
      draft.booking.id = existing.id;
      draft.booking.bookingNumber = existing.bookingNumber;
      draft.booking.createdAt = existing.createdAt;
      draft.booking.travelers = draft.booking.travelers.map((t) => ({
        ...t,
        bookingId: existing.id,
      }));
    }
    return draft;
  };
  const saveDraftBooking = (
    leadId: string,
    conversion: Conversion,
    milestones: BookingDraftInput["milestones"],
  ) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    const draft = prepareLeadBooking(leadId, conversion, milestones);
    const booking = {
      ...draft.booking,
      clientId: "",
      quoteConversion: conversion,
    };
    // Persist only the quote, never the temporary conversion used for validation.
    commitCRM({
      ...crmRef.current,
      bookings: [
        booking,
        ...crmRef.current.bookings.filter((b) => b.id !== booking.id),
      ],
    });
    // Live API Sync
    import("@/lib/booking-api").then(({ createQuotation: createQuotationApi }) => {
      createQuotationApi({
        leadId,
        serviceType: booking.serviceType,
        packageId: booking.tourId,
        paxCount: booking.paxCount,
        agreedPricePerPax: booking.agreedPricePerPax,
        totalAgreedAmount: booking.totalAgreedAmount,
        milestones: (milestones || []).map((m) => ({ name: m.name, amount: m.amount, dueDate: m.dueDate })),
      }).catch(() => {});
    });
    return booking;
  };
  const convertLeadToBooking = (
    leadId: string,
    conversion: Conversion,
    milestones: BookingDraftInput["milestones"],
    token?: BookingPaymentInput,
  ) => {
    if (token && user?.role !== "AGENCY_ADMIN") throw new Error("Submit payment proof after booking; an admin must verify the receipt.");
    const draft = prepareLeadBooking(leadId, conversion, milestones);
    const next = confirmBookingTransaction(
      draft.state,
      tenant.id,
      draft.booking.id,
      user!.name,
      new Date().toISOString(),
      () => crypto.randomUUID(),
      token,
    );
    commitCRM(next);
    // Live API Sync
    import("@/lib/booking-api").then(({ confirmBooking: confirmBookingApi }) => {
      confirmBookingApi({
        leadId,
        quoteId: draft.booking.id,
        clientId: draft.booking.clientId,
        serviceType: draft.booking.serviceType,
        packageId: draft.booking.tourId,
        paxCount: draft.booking.paxCount,
        agreedPricePerPax: draft.booking.agreedPricePerPax,
        totalAgreedAmount: draft.booking.totalAgreedAmount,
        initialDeposit: token?.amount,
        paymentMethod: token?.method,
        paymentReference: token?.reference,
        milestones: (milestones || []).map((m) => ({ name: m.name, amount: m.amount, dueDate: m.dueDate })),
      }).catch(() => {});
    });
    return next.bookings.find((b) => b.id === draft.booking.id)!;
  };
  const updateTraveler = (
    bookingId: string,
    travelerId: string,
    input: TravelerUpdate,
  ) => {
    requireOperations([
      "AGENCY_ADMIN",
      "FRONT_DESK",
      "TOUR_MANAGER",
      "VISA_CONSULTANT",
    ]);
    const booking = crmRef.current.bookings.find(
      (b) => b.id === bookingId && b.tenantId === tenant.id,
    );
    if (
      (user!.role === "TOUR_MANAGER" &&
        booking?.serviceType !== "GROUP_TOUR") ||
      (user!.role === "VISA_CONSULTANT" &&
        booking?.serviceType !== "VISA_CONSULTANCY")
    )
      throw new Error("Access restricted for this service.");
    commitCRM(
      updateBookingTraveler(
        crmRef.current,
        tenant.id,
        bookingId,
        travelerId,
        input,
        new Date().toISOString(),
      ),
    );
    // Live API Sync
    import("@/lib/booking-api").then(({ updateBookingTraveler: updateBookingTravelerApi }) => {
      updateBookingTravelerApi(bookingId, travelerId, input).catch(() => {});
    });
  };
  const importLeads = (rows: ImportRow[], reps: string[]) => {
    requireCRM(true);
    validateReps(reps);
    if (!rows.length || rows.length > 5000)
      throw new Error("Import between 1 and 5,000 rows.");
    const previous = crmRef.current;
    const next = importCRM(
      previous,
      tenant.id,
      rows,
      reps,
      new Date().toISOString(),
      () => crypto.randomUUID(),
    );
    commitCRM(next);
    return {
      imported: next.leads.length - previous.leads.length,
      flagged: next.duplicates.length - previous.duplicates.length,
    };
  };
  const distributeUnassigned = (reps: string[]) => {
    requireCRM(true);
    validateReps(reps);
    if (!reps.length)
      throw new Error("Select at least one active representative.");
    let count = 0;
    const leads = crmRef.current.leads.map((l) =>
      l.tenantId === tenant.id &&
      (!l.assignedTo || l.assignedTo === "Unassigned") &&
      !["CONVERTED", "LOST"].includes(l.status)
        ? { ...l, assignedTo: reps[count++ % reps.length] }
        : l,
    );
    commitCRM({ ...crmRef.current, leads });
    return count;
  };
  const resolveDuplicate = (
    id: string,
    action: "merge" | "create" | "discard",
  ) => {
    requireCRM(true);
    commitCRM(
      resolveCRM(
        crmRef.current,
        tenant.id,
        id,
        action,
        user!.name,
        new Date().toISOString(),
        () => crypto.randomUUID(),
      ),
    );
  };

  const allTours = crm.tours;
  const allPassengers = crm.passengers;
  const allVisaCases = crm.visaCases;
  const allInvoices = crm.invoices;
  const allExpenses = crm.expenses;
  const [isHydrated, setIsHydrated] = useState(false);

  // One snapshot is the commit boundary for CRM, billing and operations.
  /* eslint-disable react-hooks/set-state-in-effect -- Browser storage hydrates after matching server and client initial renders. */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(ERP_KEY);
      let next = initialERP(true);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === "object") {
          parsed.paymentProofClaims ??= [];
          parsed.recoveryCallLogs ??= [];
          parsed.officeExpenses ??= [];
          parsed.vaultDocuments ??= [];
          parsed.suppliers ??= [];
        }
        if (
          !parsed ||
          Object.keys(next).some((key) => !Array.isArray(parsed[key]))
        )
          throw new Error("Invalid ERP snapshot");
        next = parsed;
      } else {
        const snapshot = localStorage.getItem(CRM_KEY);
        if (snapshot) {
          const parsed = JSON.parse(snapshot);
          if (
            !parsed ||
            !Array.isArray(parsed.leads) ||
            !Array.isArray(parsed.clients) ||
            !Array.isArray(parsed.duplicates)
          )
            throw new Error("Invalid CRM snapshot");
          next = {
            ...next,
            leads: parsed.leads,
            clients: parsed.clients,
            duplicates: parsed.duplicates,
          };
        }
        const legacy = <T,>(key: string, fallback: T[]): T[] => {
          const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}_${key}`);
          if (!saved) return fallback;
          const parsed = sanitizePersistedData<T[]>(JSON.parse(saved));
          if (!Array.isArray(parsed))
            throw new Error("Invalid legacy snapshot");
          return parsed;
        };
        if (!snapshot) next.leads = legacy("leads", next.leads);
        next.tours = legacy("tours", next.tours);
        next.passengers = legacy("passengers", next.passengers);
        next.visaCases = legacy("visa", next.visaCases);
        next.invoices = legacy("invoices", next.invoices);
        next.expenses = legacy("expenses", next.expenses);
        next.officeExpenses = legacy("office_expenses", next.officeExpenses || []);
        next.vaultDocuments = legacy("vault_documents", next.vaultDocuments || []);
        next.suppliers = legacy("suppliers", next.suppliers || []);
        // Keep old keys intact for recovery; all future mutations use only ERP_KEY.
        localStorage.setItem(ERP_KEY, JSON.stringify(next));
      }
      next.expenses = next.expenses.map(normalizeTourExpense);
      const bridged = bridgeGroupTourVisaCases(next);
      if (bridged !== next) localStorage.setItem(ERP_KEY, JSON.stringify(bridged));
      next = bridged;
      crmRef.current = next;
      persistedSnapshot.current = localStorage.getItem(ERP_KEY);
      setCRM(next);
      setCRMReady(true);
    } catch {
      setCRMError(
        "Some saved data could not be loaded. Do not clear browser storage; preserve it for recovery.",
      );
    }
    setIsHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ==========================================================================
  // DYNAMIC MULTI-TENANT FILTERING
  // ==========================================================================
  // Whenever the active tenant changes in TenantContext, these memoized lists
  // strictly filter records belonging to tenant.id!
  const currentLeads = useMemo(
    () => allLeads.filter((item) => item.tenantId === tenant.id),
    [allLeads, tenant.id],
  );

  const currentTours = useMemo(
    () => allTours.filter((item) => item.tenantId === tenant.id),
    [allTours, tenant.id],
  );

  const currentTourIds = useMemo(
    () => new Set(currentTours.map((t) => t.id)),
    [currentTours],
  );

  const currentPassengers = useMemo(
    () => allPassengers.filter((p) => currentTourIds.has(p.tourId)),
    [allPassengers, currentTourIds],
  );

  const currentVisaCases = useMemo(
    () => allVisaCases.filter((item) => item.tenantId === tenant.id && !item.cancelledAt),
    [allVisaCases, tenant.id],
  );

  const currentInvoices = useMemo(
    () => allInvoices.filter((item) => item.tenantId === tenant.id),
    [allInvoices, tenant.id],
  );

  const currentExpenses = useMemo(
    () => allExpenses.filter((item) => item.tenantId === tenant.id),
    [allExpenses, tenant.id],
  );

  const currentOfficeExpenses = useMemo(
    () => (crm.officeExpenses || []).filter((item) => item.tenantId === tenant.id),
    [crm.officeExpenses, tenant.id],
  );

  const currentVaultDocuments = useMemo(
    () => (crm.vaultDocuments || []).filter((item) => item.tenantId === tenant.id),
    [crm.vaultDocuments, tenant.id],
  );

  const currentSuppliers = useMemo(
    () => (crm.suppliers || []).filter((item) => item.tenantId === tenant.id),
    [crm.suppliers, tenant.id],
  );

  const currentLedgerEntries = useMemo(
    () => buildLedgerEntries(tenant.id, {
      invoices: currentInvoices,
      tourExpenses: currentExpenses,
      officeExpenses: currentOfficeExpenses,
      payrollRuns: payrollRuns.filter((run) => run.tenantId === tenant.id),
    }),
    [currentExpenses, currentInvoices, currentOfficeExpenses, payrollRuns, tenant.id],
  );

  // Aggregated Tenant KPI summary
  const tenantSummary = useMemo(() => {
    const totalRevenue = currentInvoices.reduce(
      (sum, inv) => sum + (inv.status === "CANCELLED" ? inv.refund?.cancellationFeeRetained ?? 0 : inv.totalAmount),
      0,
    );
    const totalCollected = currentInvoices.reduce(
      (sum, inv) => sum + inv.paidAmount - (inv.refund?.refundAmountIssued ?? 0),
      0,
    );
    const totalDue = currentInvoices.reduce(
      (sum, inv) => sum + inv.dueAmount,
      0,
    );
    const activeToursCount = currentTours.filter(
      (t) => t.status === "OPEN" || t.status === "FILLING_FAST",
    ).length;
    const activeVisaCasesCount = currentVisaCases.filter(
      (v) => !['DELIVERED', 'COMPLETED'].includes(v.pipeline?.stage || '') && v.stage !== 'Passport Delivered to Client',
    ).length;
    const openLeadsCount = currentLeads.filter(
      (l) => l.status !== "CONVERTED" && l.status !== "LOST",
    ).length;

    return {
      totalRevenue,
      totalCollected,
      totalDue,
      activeToursCount,
      activeVisaCasesCount,
      openLeadsCount,
    };
  }, [currentInvoices, currentTours, currentVisaCases, currentLeads]);

  // ==========================================================================
  // MUTATION HANDLERS
  // ==========================================================================

  /**
   * 1. addLead(lead): Ingests a new walk-in or digital lead into the active tenant
   */
  const addLead = (input: NewLeadInput): Lead => {
    requireCRM();
    const newLeadId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const initialInteraction: Interaction | null = input.notes
      ? {
          id: `int-${Date.now().toString().slice(-5)}`,
          leadId: newLeadId,
          channel: input.initialChannel || "WhatsApp",
          note: input.notes,
          author: input.assignedTo || "Front Desk Rep",
          createdAt: nowIso,
        }
      : null;

    const newLead: Lead = {
      id: newLeadId,
      tenantId: tenant.id,
      fullName: input.fullName,
      phone: input.phone,
      email: input.email,
      source:
        input.source ||
        (input.initialChannel === "WhatsApp" ||
        input.initialChannel === "Phone Call"
          ? input.initialChannel
          : "Walk-in"),
      interestType: input.interestType,
      destinationInterest: input.destinationInterest,
      groupSize: input.groupSize || 1,
      budget: input.budget,
      status: "NEW",
      notes: input.notes,
      followUpDate:
        input.followUpDate ||
        new Date(Date.now() + 86400000).toISOString().split("T")[0],
      assignedTo: input.assignedTo || "Front Desk Rep",
      createdAt: nowIso,
      interactions: initialInteraction ? [initialInteraction] : [],
    };

    setAllLeads((prev) => {
      const updated = [newLead, ...prev];
      return updated;
    });

    // Live API Sync
    import("@/lib/lead-api").then(({ createLeadApi }) => {
      createLeadApi(newLead).catch(() => {});
    });

    return newLead;
  };

  /**
   * Update lead status (e.g. from NEW to CONTACTED or CONVERTED)
   */
  const updateLeadStatus = (leadId: string, status: LeadStatus) => {
    bulkUpdateLeads([leadId], { status });
  };

  /**
   * 2. addInteraction(leadId, note, channel, author, newFollowUpDate): Appends an interaction note to a lead
   */
  const addInteraction = (
    leadId: string,
    note: string,
    channel:
      | "WhatsApp"
      | "Walk-in"
      | "Phone Call"
      | "Email"
      | "Office Visit" = "Phone Call",
    author = "Staff Rep",
    newFollowUpDate?: string,
  ) => {
    requireCRM();
    const newInteraction: Interaction = {
      id: crypto.randomUUID(),
      leadId,
      channel,
      note,
      author,
      createdAt: new Date().toISOString(),
    };

    setAllLeads((prev) => {
      const updated = prev.map((lead) => {
        if (lead.id === leadId && lead.tenantId === tenant.id) {
          return {
            ...lead,
            notes: note, // update latest summary note
            followUpDate: newFollowUpDate || lead.followUpDate,
            interactions: [newInteraction, ...lead.interactions],
          };
        }
        return lead;
      });
      return updated;
    });

    // Live API Sync
    import("@/lib/lead-api").then(({ addInteractionApi, updateLeadApi }) => {
      addInteractionApi(leadId, { note, author, channel }).catch(() => {
        updateLeadApi(leadId, { notes: note, followUpDate: newFollowUpDate }).catch(() => {});
      });
    });
  };

  const updateVisaStage = (caseId: string, newStage: VisaStage) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"]);
    commitCRM({
      ...crmRef.current,
      visaCases: crmRef.current.visaCases.map((vc) =>
        vc.id === caseId && vc.tenantId === tenant.id && !vc.cancelledAt
          ? { ...vc, stage: newStage, pipeline: vc.pipeline ? { ...vc.pipeline, stage: normalizeVisaCase({ ...vc, pipeline: undefined, stage: newStage }, crmRef.current).stage } : undefined, updatedAt: new Date().toISOString() }
          : vc,
      ),
    });
  };

  const updateVisaDocuments = (
    caseId: string,
    documents: VisaDocumentItem[],
  ) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"]);
    commitCRM({
      ...crmRef.current,
      visaCases: crmRef.current.visaCases.map((vc) =>
        vc.id === caseId && vc.tenantId === tenant.id && !vc.cancelledAt
          ? { ...vc, documents, updatedAt: new Date().toISOString() }
          : vc,
      ),
    });
  };

  const addVisaCase = (
    newCase: Omit<VisaCase, "id" | "updatedAt">,
  ): VisaCase => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"]);
    if (
      newCase.tenantId !== tenant.id ||
      newCase.bookingId ||
      newCase.travelerId
    )
      throw new Error(
        "Use booking confirmation to allocate a linked visa case.",
      );
    const created: VisaCase = {
      ...newCase,
      id: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
    commitCRM({
      ...crmRef.current,
      visaCases: [created, ...crmRef.current.visaCases],
    });
    return created;
  };

  const submitPaymentProof = (input: ProofInput) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    commitCRM(submitProof(crmRef.current, user!, input, new Date().toISOString(), crypto.randomUUID()));
    import("@/lib/invoice-api").then(({ submitPaymentProof }) => {
      submitPaymentProof(input.invoiceId, {
        amount: input.amount,
        payment_method: "BANK_TRANSFER",
        bank_reference: input.bankReference,
        screenshot_url: input.screenshotUrl,
        notes: input.notes,
      }).catch(() => {});
    });
  };
  const reviewPaymentProof: DataContextType["reviewPaymentProof"] = (id, decision, reason, method) => {
    requireCRM(true);
    commitCRM(reviewProof(crmRef.current, user!, id, decision, reason, method, new Date().toISOString(), () => crypto.randomUUID()));
    import("@/lib/invoice-api").then(({ verifyPaymentClaim }) => {
      verifyPaymentClaim(id, {
        action: decision,
        verified_method: method as PaymentMethod,
        rejection_reason: reason || undefined,
      }).catch(() => {});
    });
  };
  const logRecoveryCall = (input: CallInput) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    commitCRM(appendRecoveryCall(crmRef.current, user!, input, new Date().toISOString(), crypto.randomUUID()));
    import("@/lib/invoice-api").then(({ logRecoveryCall }) => {
      logRecoveryCall(input.invoiceId, {
        outcome: input.outcome as "PROMISED_PAYMENT" | "LEFT_VOICEMAIL" | "UNREACHABLE" | "DISPUTED_AMOUNT" | "SENT_WHATSAPP_DETAILS",
        notes: input.notes,
        callback_date: input.callbackDate || null,
      }).catch(() => {});
    });
  };
  const recordPayment = (
    invoiceId: string,
    amount: number,
    method: PaymentMethod,
    reference?: string,
  ) => {
    requireCRM(true);
    const invoice = crmRef.current.invoices.find(
      (i) => i.id === invoiceId && i.tenantId === tenant.id,
    );
    // Preserve the existing form API's no-op behavior for invalid amounts.
    if (
      !invoice ||
      !Number.isFinite(amount) ||
      Math.round(amount * 100) <= 0 ||
      Math.round(amount * 100) >
        Math.round(invoice.totalAmount * 100) -
          Math.round(invoice.paidAmount * 100)
    )
      return;
    commitCRM(
      payInvoice(
        crmRef.current,
        tenant.id,
        invoiceId,
        {
          amount,
          method,
          reference,
          paymentDate: new Date().toISOString().slice(0, 10),
        },
        user!.name,
        () => crypto.randomUUID(),
      ),
    );
    import("@/lib/invoice-api").then(({ recordDirectPayment }) => {
      recordDirectPayment(invoiceId, {
        amount,
        payment_method: method,
        reference,
      }).catch(() => {});
    });
  };

  const updatePassengerPayment = (
    passengerId: string,
    status: PassengerPaymentStatus,
  ) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK", "TOUR_MANAGER"]);
    const tourIds = new Set(
      crmRef.current.tours
        .filter((t) => t.tenantId === tenant.id)
        .map((t) => t.id),
    );
    const passenger = crmRef.current.passengers.find(
      (p) => p.id === passengerId && tourIds.has(p.tourId),
    );
    if (passenger?.bookingId)
      throw new Error(
        "Linked passenger payment status is calculated from the booking invoice.",
      );
    commitCRM({
      ...crmRef.current,
      passengers: crmRef.current.passengers.map((p) =>
        p.id === passenger?.id ? { ...p, paymentStatus: status } : p,
      ),
    });
  };

  const addPassenger = (newPax: Omit<Passenger, "id">): Passenger => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK", "TOUR_MANAGER"]);
    const tour = crmRef.current.tours.find(
      (t) => t.id === newPax.tourId && t.tenantId === tenant.id,
    );
    if (
      !tour ||
      !["OPEN", "FILLING_FAST"].includes(tour.status) ||
      tour.bookedSeats >= tour.maxCapacity
    )
      throw new Error("No seats available on this agency tour.");
    if (newPax.bookingId || newPax.travelerId)
      throw new Error(
        "Edit the existing booking traveler instead of reserving another seat.",
      );
    const created: Passenger = { ...newPax, id: crypto.randomUUID() };
    commitCRM({
      ...crmRef.current,
      passengers: [created, ...crmRef.current.passengers],
      tours: crmRef.current.tours.map((t) =>
        t.id === tour.id
          ? {
              ...t,
              bookedSeats: t.bookedSeats + 1,
              status:
                t.bookedSeats + 1 === t.maxCapacity ? "SOLD_OUT" : t.status,
            }
          : t,
      ),
    });
    return created;
  };

  const updateTravelerDetails = (
    tourId: string,
    bookingId: string,
    travelerId: string,
    fields: TravelerUpdate,
  ) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    const booking = crmRef.current.bookings.find((item) => item.id === bookingId && item.tenantId === tenant.id);
    if (!booking || booking.packageId !== tourId) throw new Error("Traveler is not linked to this tour.");
    updateTraveler(bookingId, travelerId, fields);
  };

  const unassignTravelerSlot = (tourId: string, bookingId: string, travelerId: string) => {
    updateTravelerDetails(tourId, bookingId, travelerId, { fullName: "", passportNo: "", passportExpiry: undefined, roomPreference: undefined });
  };

  const reassignRoomAllocation = (tourId: string, travelerId: string, newRoomType: RoomType | undefined) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    const booking = crmRef.current.bookings.find((item) => item.tenantId === tenant.id && item.packageId === tourId && item.travelers.some((traveler) => traveler.id === travelerId));
    if (!booking) throw new Error("Traveler is not linked to this tour.");
    const traveler = booking.travelers.find((item) => item.id === travelerId)!;
    updateTraveler(booking.id, travelerId, { fullName: traveler.fullName, passportNo: traveler.passportNo, passportExpiry: traveler.passportExpiry, roomPreference: newRoomType });
  };

  const assignTravelerToBooking = (tourId: string, bookingId: string, fields: TravelerUpdate): string => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    const booking = crmRef.current.bookings.find((item) => item.id === bookingId && item.tenantId === tenant.id && item.packageId === tourId && item.status === "CONFIRMED");
    if (!booking) throw new Error("Select a confirmed booking for this tour.");
    if (!unfilledPassengerSlots(booking)) throw new Error("All passengers are already assigned to this booking. Choose another booking with an open slot.");
    const slot = (booking.travelers ?? []).find((traveler) => !traveler.fullName?.trim());
    if (!slot) throw new Error("This booking is missing its reserved passenger records. Ask an administrator to repair the booking before adding a traveler.");
    updateTravelerDetails(tourId, bookingId, slot.id, fields);
    return slot.id;
  };

  const deleteTravelerFromManifest = (tourId: string, bookingId: string, travelerId: string) => {
    requireOperations(["AGENCY_ADMIN", "FRONT_DESK"]);
    const state = crmRef.current;
    const booking = state.bookings.find((item) => item.id === bookingId && item.tenantId === tenant.id && item.packageId === tourId);
    const tour = state.tours.find((item) => item.id === tourId && item.tenantId === tenant.id);
    if (!booking || !tour) throw new Error("Traveler or tour was not found for this agency.");
    if (!booking.travelers.some((traveler) => traveler.id === travelerId)) throw new Error("Traveler was not found in the booking.");
    commitCRM({
      ...state,
      bookings: state.bookings.map((item) => item.id === bookingId ? { ...item, paxCount: Math.max(0, item.paxCount - 1), travelers: item.travelers.filter((traveler) => traveler.id !== travelerId) } : item),
      passengers: state.passengers.filter((passenger) => !(passenger.tourId === tourId && passenger.bookingId === bookingId && passenger.travelerId === travelerId)),
      tours: state.tours.map((item) => item.id === tourId ? { ...item, bookedSeats: Math.max(0, item.bookedSeats - 1) } : item),
    });
  };

  const updateTourOperations = (
    tourId: string,
    input: { flightBlock?: FlightBlock; rooms?: RoomAllocation[] },
  ) => {
    requireOperations(["AGENCY_ADMIN"]);
    const tour = crmRef.current.tours.find(
      (item) => item.id === tourId && item.tenantId === tenant.id,
    );
    if (!tour) throw new Error("Tour not found for this agency.");
    commitCRM({
      ...crmRef.current,
      tours: crmRef.current.tours.map((item) =>
        item.id === tourId
          ? {
              ...item,
              ...(input.flightBlock ? { flightBlock: input.flightBlock } : {}),
              ...(input.rooms ? { rooms: input.rooms } : {}),
            }
          : item,
      ),
    });
  };

  const assignTravelerToRoom = (
    tourId: string,
    roomId: string,
    travelerId: string,
  ) => {
    requireOperations(["AGENCY_ADMIN"]);
    commitCRM(allocateTourRoom(crmRef.current, tenant.id, tourId, roomId, travelerId));
    void allocateTourRoomApi(tourId, roomId, travelerId).catch(() => {});
  };

  const runTourOperation = (tourId: string, action: TourOperation) => {
    requireOperations(['AGENCY_ADMIN']);
    commitCRM(changeTourOperations(crmRef.current, tenant.id, tourId, action));
  };

  const createTourPackage = (input: TourPackageInput): TourPackage => {
    requireOperations(["AGENCY_ADMIN"]);
    const baseSlug = (input.slug || input.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const created: TourPackage = {
      ...input,
      id: crypto.randomUUID(),
      tenantId: tenant.id,
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      bookedSeats: 0,
    };
    commitCRM({ ...crmRef.current, tours: [created, ...crmRef.current.tours] });

    const destList = input.destinations?.map((d) => typeof d === 'string' ? d : d.name) || [];
    void createTourApi({
      title: input.title,
      destination: destList[0] || input.title,
      destinations: destList,
      route_flags: input.routeFlags,
      departure_date: input.departureDate,
      return_date: input.returnDate,
      max_capacity: input.maxCapacity,
      price_per_person: input.pricePerPerson,
      estimated_supplier_cost_per_pax: input.estimatedSupplierCostPerPax,
      allocated_overheads: input.allocatedOverheads,
      inclusions: input.inclusions,
      banner_gradient: input.bannerGradient,
    }).catch(() => {});

    return created;
  };

  const updateTourPackage = (id: string, input: Partial<TourPackageInput>): TourPackage => {
    requireOperations(["AGENCY_ADMIN"]);
    const current = crmRef.current.tours.find((tour) => tour.id === id && tour.tenantId === tenant.id);
    if (!current) throw new Error("Tour package not found for this agency.");
    const updated: TourPackage = { ...current, ...input, id: current.id, tenantId: current.tenantId, bookedSeats: current.bookedSeats };
    commitCRM({
      ...crmRef.current,
      tours: crmRef.current.tours.map((tour) => tour.id === id && tour.tenantId === tenant.id ? updated : tour),
    });

    void updateTourApi(id, {
      title: input.title,
      departure_date: input.departureDate,
      return_date: input.returnDate,
      max_capacity: input.maxCapacity,
      price_per_person: input.pricePerPerson,
      status: input.status,
    }).catch(() => {});

    return updated;
  };

  const deleteTourPackage = (id: string) => {
    requireOperations(["AGENCY_ADMIN"]);
    const current = crmRef.current.tours.find(
      (tour) => tour.id === id && tour.tenantId === tenant.id,
    );
    if (!current) throw new Error("Tour package not found for this agency.");
    if (current.bookedSeats > 0) throw new Error("Tours with booked seats cannot be deleted.");
    commitCRM({
      ...crmRef.current,
      tours: crmRef.current.tours.filter(
        (tour) => !(tour.id === id && tour.tenantId === tenant.id),
      ),
    });

    void deleteTourApi(id).catch(() => {});
  };

  /**
   * 7. getTourROI(tourId): Calculates departure financial gross revenue, total expenses & net margin
   */
  const getTourROI = (tourId: string): TourROI | null => {
    if (!user || user.tenantId !== tenant.id || !canViewTourCosts(user.role)) {
      return null;
    }
    const tour = allTours.find(
      (candidate) => candidate.id === tourId && candidate.tenantId === tenant.id,
    );
    if (!tour) return null;

    const summary = calculateTourFinancials(
      tenant.id,
      tour,
      crmRef.current.bookings,
      allInvoices,
      allExpenses,
    );
    const occupancyRate =
      tour.maxCapacity > 0 ? (tour.bookedSeats / tour.maxCapacity) * 100 : 0;

    return {
      tourId,
      title: tour.title,
      grossRevenue: summary.recognizedRevenue,
      totalExpenses:
        summary.directVendorExpenses + summary.allocatedOverheads,
      netMargin: summary.netProfit,
      marginPercentage: summary.marginPercent,
      bookedSeats: tour.bookedSeats,
      maxCapacity: tour.maxCapacity,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      allocatedOverheads: summary.allocatedOverheads,
      roiPercentage: summary.roiPercent,
    };
  };

  const addTourExpense = (input: TourExpenseInput): TourExpense => {
    requireOperations(["AGENCY_ADMIN", "TOUR_MANAGER"]);
    const tour = crmRef.current.tours.find(
      (candidate) =>
        candidate.id === input.tourId && candidate.tenantId === tenant.id,
    );
    if (!tour) throw new Error("Tour package not found for this agency.");
    if (!input.vendorName.trim()) throw new Error("Vendor name is required.");
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new Error("Supplier cost must be greater than zero.");
    }
    if (!input.date) throw new Error("Expense date is required.");

    const created: TourExpense = {
      ...input,
      id: `exp_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      vendorName: input.vendorName.trim(),
      amount: Math.round(input.amount * 100) / 100,
      currency: "PKR",
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    commitCRM({
      ...crmRef.current,
      expenses: [created, ...crmRef.current.expenses],
    });
    // Live API Sync
    import("@/lib/expense-api").then(({ createTourExpenseApi }) => {
      createTourExpenseApi(input.tourId, created).catch(() => {});
    });
    return created;
  };

  const updateTourExpense = (
    id: string,
    input: Partial<TourExpenseInput>,
  ): TourExpense => {
    requireOperations(["AGENCY_ADMIN", "TOUR_MANAGER"]);
    const current = crmRef.current.expenses.find(
      (expense) => expense.id === id && expense.tenantId === tenant.id,
    );
    if (!current) throw new Error("Supplier cost not found for this agency.");
    if (input.tourId && input.tourId !== current.tourId) {
      throw new Error("Supplier costs cannot be moved between departures.");
    }
    if (input.amount !== undefined && (!Number.isFinite(input.amount) || input.amount <= 0)) {
      throw new Error("Supplier cost must be greater than zero.");
    }
    if (input.vendorName !== undefined && !input.vendorName.trim()) {
      throw new Error("Vendor name is required.");
    }
    const updated: TourExpense = {
      ...current,
      ...input,
      id: current.id,
      tenantId: current.tenantId,
      tourId: current.tourId,
      currency: current.currency,
      vendorName: input.vendorName?.trim() || current.vendorName,
      amount:
        input.amount === undefined
          ? current.amount
          : Math.round(input.amount * 100) / 100,
      notes:
        input.notes === undefined
          ? current.notes
          : input.notes.trim() || undefined,
      createdAt: current.createdAt,
    };
    commitCRM({
      ...crmRef.current,
      expenses: crmRef.current.expenses.map((expense) =>
        expense.id === current.id ? updated : expense,
      ),
    });
    return updated;
  };

  const deleteTourExpense = (id: string) => {
    requireOperations(["AGENCY_ADMIN", "TOUR_MANAGER"]);
    const current = crmRef.current.expenses.find(
      (expense) => expense.id === id && expense.tenantId === tenant.id,
    );
    if (!current) throw new Error("Supplier cost not found for this agency.");
    commitCRM({
      ...crmRef.current,
      expenses: crmRef.current.expenses.filter(
        (expense) => expense.id !== current.id,
      ),
    });
    // Live API Sync
    import("@/lib/expense-api").then(({ deleteTourExpenseApi }) => {
      deleteTourExpenseApi(id).catch(() => {});
    });
  };

  const OFFICE_EXPENSE_CATEGORIES: OfficeExpenseCategory[] = [
    "RENT",
    "UTILITIES",
    "INTERNET_COMMUNICATION",
    "OFFICE_SUPPLIES",
    "PANTRY_TEA",
    "MARKETING_ADS",
    "SOFTWARE_LICENSES",
    "MAINTENANCE",
    "MISC_OVERHEAD",
  ];
  const OFFICE_PAYMENT_METHODS: ExpensePaymentMethod[] = [
    "CASH",
    "BANK_TRANSFER",
    "PETTY_CASH",
  ];

  const requireOfficeExpenseAccess = () => {
    if (!user || user.tenantId !== tenant.id || !canManageOfficeExpenses(user.role)) {
      throw new Error("Office overhead ledger is restricted to Admin and Finance roles.");
    }
    if (!crmReady) {
      throw new Error("CRM storage is not ready. Reload before making changes.");
    }
  };

  const normalizeOfficeExpenseInput = (
    input: Partial<OfficeExpenseInput>,
    current?: OfficeExpense,
  ): OfficeExpenseInput => {
    const category = input.category ?? current?.category;
    const paymentMethod = input.paymentMethod ?? current?.paymentMethod;
    const vendorName = input.vendorName ?? current?.vendorName ?? "";
    const amount = input.amount ?? current?.amount ?? 0;
    const paidAt = input.paidAt ?? current?.paidAt ?? "";
    if (!category || !OFFICE_EXPENSE_CATEGORIES.includes(category)) {
      throw new Error("Select a valid office expense category.");
    }
    if (!paymentMethod || !OFFICE_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error("Select a valid payment method.");
    }
    if (!vendorName.trim()) throw new Error("Vendor or payee name is required.");
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Office expense amount must be greater than zero.");
    }
    if (!paidAt) throw new Error("Payment date is required.");
    return {
      category,
      vendorName: vendorName.trim(),
      amount: Math.round(amount * 100) / 100,
      paymentMethod,
      paidAt,
      receiptRef: input.receiptRef === undefined
        ? current?.receiptRef
        : input.receiptRef.trim() || undefined,
      notes: input.notes === undefined
        ? current?.notes
        : input.notes.trim() || undefined,
    };
  };

  const addOfficeExpense = (input: OfficeExpenseInput): OfficeExpense => {
    requireOfficeExpenseAccess();
    const normalized = normalizeOfficeExpenseInput(input);
    const created: OfficeExpense = {
      ...normalized,
      id: `office_exp_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      currency: "PKR",
      recordedByUserId: user!.id,
      createdAt: new Date().toISOString(),
    };
    commitCRM({
      ...crmRef.current,
      officeExpenses: [created, ...(crmRef.current.officeExpenses || [])],
    });
    // Live API Sync
    import("@/lib/expense-api").then(({ createOfficeExpenseApi }) => {
      createOfficeExpenseApi(created).catch(() => {});
    });
    return created;
  };

  const updateOfficeExpense = (
    id: string,
    input: Partial<OfficeExpenseInput>,
  ): OfficeExpense => {
    requireOfficeExpenseAccess();
    const current = (crmRef.current.officeExpenses || []).find(
      (expense) => expense.id === id && expense.tenantId === tenant.id,
    );
    if (!current) throw new Error("Office expense not found for this agency.");
    const normalized = normalizeOfficeExpenseInput(input, current);
    const updated: OfficeExpense = {
      ...current,
      ...normalized,
      id: current.id,
      tenantId: current.tenantId,
      currency: current.currency || "PKR",
      recordedByUserId: current.recordedByUserId,
      createdAt: current.createdAt,
    };
    commitCRM({
      ...crmRef.current,
      officeExpenses: (crmRef.current.officeExpenses || []).map((expense) =>
        expense.id === current.id ? updated : expense,
      ),
    });
    return updated;
  };

  const deleteOfficeExpense = (id: string) => {
    requireOfficeExpenseAccess();
    const current = (crmRef.current.officeExpenses || []).find(
      (expense) => expense.id === id && expense.tenantId === tenant.id,
    );
    if (!current) throw new Error("Office expense not found for this agency.");
    commitCRM({
      ...crmRef.current,
      officeExpenses: (crmRef.current.officeExpenses || []).filter(
        (expense) => expense.id !== current.id,
      ),
    });
    // Live API Sync
    import("@/lib/expense-api").then(({ deleteOfficeExpenseApi }) => {
      deleteOfficeExpenseApi(id).catch(() => {});
    });
  };

  const requireVaultAccess = (adminOnly = false) => {
    requireOperations(adminOnly ? ["AGENCY_ADMIN"] : ["AGENCY_ADMIN", "VISA_CONSULTANT"]);
  };

  const uploadVaultDocument = (input: VaultDocumentInput): VaultDocument => {
    requireVaultAccess();
    if (!input.clientId || !input.title.trim() || !input.fileUrl.trim())
      throw new Error("Select a client and provide a document file.");
    if (!(["PASSPORT_SCAN", "BANK_STATEMENT", "ATTESTED_AFFIDAVIT", "TRAVEL_INSURANCE", "TAX_RETURN", "EMBASSY_RECEIPT", "OTHER"] as DocumentCategory[]).includes(input.category))
      throw new Error("Select a valid document category.");
    const client = crmRef.current.clients.find((item) => item.id === input.clientId && item.tenantId === tenant.id);
    if (!client) throw new Error("Client not found in this agency.");
    const created: VaultDocument = {
      ...input,
      id: `vault_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      clientName: client.fullName,
      title: input.title.trim(),
      notes: input.notes?.trim() || undefined,
      uploadedByStaffId: user!.id,
      uploadedByStaffName: user!.name,
      createdAt: new Date().toISOString(),
    };
    commitCRM({ ...crmRef.current, vaultDocuments: [created, ...(crmRef.current.vaultDocuments || [])] });
    return created;
  };

  const updateVaultDocument = (id: string, input: Partial<VaultDocumentInput>): VaultDocument => {
    requireVaultAccess();
    const current = (crmRef.current.vaultDocuments || []).find((item) => item.id === id && item.tenantId === tenant.id);
    if (!current) throw new Error("Document not found in this agency.");
    const updated: VaultDocument = {
      ...current,
      ...input,
      id: current.id,
      tenantId: current.tenantId,
      clientId: current.clientId,
      clientName: current.clientName,
      uploadedByStaffId: current.uploadedByStaffId,
      uploadedByStaffName: current.uploadedByStaffName,
      createdAt: current.createdAt,
      title: (input.title ?? current.title).trim(),
      notes: input.notes?.trim() || current.notes,
    };
    commitCRM({ ...crmRef.current, vaultDocuments: (crmRef.current.vaultDocuments || []).map((item) => item.id === id ? updated : item) });
    return updated;
  };

  const verifyVaultDocument = (id: string, status: DocumentVerificationStatus, rejectionReason?: string): VaultDocument => {
    requireVaultAccess();
    if (!["VERIFIED", "PENDING_REVIEW", "REJECTED", "EXPIRED"].includes(status))
      throw new Error("Select a valid verification status.");
    if (status === "REJECTED" && !rejectionReason?.trim())
      throw new Error("A rejection reason is required.");
    const current = (crmRef.current.vaultDocuments || []).find((item) => item.id === id && item.tenantId === tenant.id);
    if (!current) throw new Error("Document not found in this agency.");
    const updated: VaultDocument = {
      ...current,
      verificationStatus: status,
      rejectionReason: status === "REJECTED" ? rejectionReason!.trim() : undefined,
      verifiedByStaffId: status === "VERIFIED" ? user!.id : undefined,
      verifiedAt: status === "VERIFIED" ? new Date().toISOString() : undefined,
    };
    commitCRM({ ...crmRef.current, vaultDocuments: (crmRef.current.vaultDocuments || []).map((item) => item.id === id ? updated : item) });
    return updated;
  };

  const deleteVaultDocument = (id: string) => {
    requireVaultAccess(true);
    const current = (crmRef.current.vaultDocuments || []).find((item) => item.id === id && item.tenantId === tenant.id);
    if (!current) throw new Error("Document not found in this agency.");
    commitCRM({ ...crmRef.current, vaultDocuments: (crmRef.current.vaultDocuments || []).filter((item) => item.id !== id) });
  };

  const requireSupplierAccess = (adminOnly = false) => {
    requireOperations(adminOnly ? ["AGENCY_ADMIN"] : ["AGENCY_ADMIN", "TOUR_MANAGER"]);
  };

  const validateSupplier = (input: Partial<SupplierInput>) => {
    if (input.name !== undefined && !input.name.trim()) throw new Error("Supplier name is required.");
    if (input.contactPerson !== undefined && !input.contactPerson.trim()) throw new Error("Contact person is required.");
    if (input.phone !== undefined && !input.phone.trim()) throw new Error("Contact phone is required.");
    if (input.category !== undefined && !(["AIRLINE_CONSOLIDATOR", "HOTEL_CHAIN", "LOCAL_DMC", "TRANSPORT_OPERATOR", "VISA_EMBASSY_AGENT", "OTHER"] as SupplierCategory[]).includes(input.category)) throw new Error("Select a valid supplier category.");
    if (input.currency !== undefined && !input.currency.trim()) throw new Error("Settlement currency is required.");
    if (input.operatingRegions !== undefined && input.operatingRegions.some((region) => !region.trim())) throw new Error("Operating regions cannot be empty.");
  };

  const createSupplier = (input: SupplierInput): Supplier => {
    requireSupplierAccess();
    validateSupplier(input);
    const name = input.name.trim();
    if ((crmRef.current.suppliers || []).some((supplier) => supplier.tenantId === tenant.id && supplier.name.toLowerCase() === name.toLowerCase())) throw new Error("A supplier with this name already exists in this agency.");
    const created: Supplier = {
      ...input,
      id: `supplier_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      name,
      contactPerson: input.contactPerson.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      operatingRegions: input.operatingRegions.map((region) => region.trim()).filter(Boolean),
      currency: input.currency.trim().toUpperCase(),
      bankDetails: { ...input.bankDetails, bankName: input.bankDetails.bankName.trim(), accountTitle: input.bankDetails.accountTitle.trim(), accountNumber: input.bankDetails.accountNumber.trim(), iban: input.bankDetails.iban?.trim() || undefined },
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    commitCRM({ ...crmRef.current, suppliers: [created, ...(crmRef.current.suppliers || [])] });
    // Live API Sync
    import("@/lib/supplier-api").then(({ createSupplierApi }) => {
      createSupplierApi(created).catch(() => {});
    });
    return created;
  };

  const updateSupplier = (id: string, input: Partial<SupplierInput>): Supplier => {
    requireSupplierAccess();
    const current = (crmRef.current.suppliers || []).find((supplier) => supplier.id === id && supplier.tenantId === tenant.id);
    if (!current) throw new Error("Supplier not found in this agency.");
    validateSupplier(input);
    const name = input.name?.trim() || current.name;
    if ((crmRef.current.suppliers || []).some((supplier) => supplier.id !== id && supplier.tenantId === tenant.id && supplier.name.toLowerCase() === name.toLowerCase())) throw new Error("A supplier with this name already exists in this agency.");
    const updated: Supplier = {
      ...current,
      ...input,
      id: current.id,
      tenantId: current.tenantId,
      name,
      contactPerson: input.contactPerson?.trim() || current.contactPerson,
      phone: input.phone?.trim() || current.phone,
      email: input.email === undefined ? current.email : input.email.trim() || undefined,
      operatingRegions: input.operatingRegions === undefined ? current.operatingRegions : input.operatingRegions.map((region) => region.trim()).filter(Boolean),
      currency: input.currency?.trim().toUpperCase() || current.currency,
      bankDetails: input.bankDetails ? { ...input.bankDetails, bankName: input.bankDetails.bankName.trim(), accountTitle: input.bankDetails.accountTitle.trim(), accountNumber: input.bankDetails.accountNumber.trim(), iban: input.bankDetails.iban?.trim() || undefined } : current.bankDetails,
      notes: input.notes === undefined ? current.notes : input.notes.trim() || undefined,
      createdAt: current.createdAt,
    };
    commitCRM({ ...crmRef.current, suppliers: (crmRef.current.suppliers || []).map((supplier) => supplier.id === id ? updated : supplier) });
    // Live API Sync
    import("@/lib/supplier-api").then(({ updateSupplierApi }) => {
      updateSupplierApi(id, input).catch(() => {});
    });
    return updated;
  };

  const deleteSupplier = (id: string) => {
    requireSupplierAccess(true);
    const current = (crmRef.current.suppliers || []).find((supplier) => supplier.id === id && supplier.tenantId === tenant.id);
    if (!current) throw new Error("Supplier not found in this agency.");
    if (crmRef.current.expenses.some((expense) => expense.tenantId === tenant.id && expense.vendorName.trim().toLowerCase() === current.name.toLowerCase())) throw new Error("This supplier has linked tour cost records. Mark it inactive instead of deleting it.");
    commitCRM({ ...crmRef.current, suppliers: (crmRef.current.suppliers || []).filter((supplier) => supplier.id !== id) });
    // Live API Sync
    import("@/lib/supplier-api").then(({ deleteSupplierApi }) => {
      deleteSupplierApi(id).catch(() => {});
    });
  };

  /**
   * Reset store back to initial mock seeds
   */
  const resetToDefaults = () => {
    requireCRM(true);
    const defaults = initialERP(true);
    const previous = crmRef.current;
    const scoped = <T extends { tenantId: string }>(
      current: T[],
      seed: T[],
    ) => [
      ...current.filter((item) => item.tenantId !== tenant.id),
      ...seed.filter((item) => item.tenantId === tenant.id),
    ];
    const tourIds = new Set(
      previous.tours.filter((t) => t.tenantId === tenant.id).map((t) => t.id),
    );
    const seedTourIds = new Set(
      defaults.tours.filter((t) => t.tenantId === tenant.id).map((t) => t.id),
    );
    commitCRM({
      leads: scoped(previous.leads, defaults.leads),
      clients: scoped(previous.clients, defaults.clients),
      duplicates: scoped(previous.duplicates, []),
      bookings: scoped(previous.bookings, defaults.bookings),
      tours: scoped(previous.tours, defaults.tours),
      visaCases: scoped(previous.visaCases, defaults.visaCases),
      invoices: scoped(previous.invoices, defaults.invoices),
      paymentProofClaims: [...(previous.paymentProofClaims || []).filter(c => !previous.invoices.some(i => i.id === c.invoiceId && i.tenantId === tenant.id)), ...(defaults.paymentProofClaims || []).filter(c => defaults.invoices.some(i => i.id === c.invoiceId && i.tenantId === tenant.id))],
      recoveryCallLogs: [...(previous.recoveryCallLogs || []).filter(c => !previous.invoices.some(i => i.id === c.invoiceId && i.tenantId === tenant.id)), ...(defaults.recoveryCallLogs || []).filter(c => defaults.invoices.some(i => i.id === c.invoiceId && i.tenantId === tenant.id))],
      expenses: scoped(previous.expenses, defaults.expenses),
      officeExpenses: scoped(previous.officeExpenses || [], defaults.officeExpenses || []),
      vaultDocuments: scoped(previous.vaultDocuments || [], defaults.vaultDocuments || []),
      suppliers: scoped(previous.suppliers || [], defaults.suppliers || []),
      passengers: [
        ...previous.passengers.filter((p) => !tourIds.has(p.tourId)),
        ...defaults.passengers.filter((p) => seedTourIds.has(p.tourId)),
      ],
    });
  };

  const activeEmployee = resolveCurrentEmployee();
  const currentEmployeeProfile: EmployeeSelfServiceProfile | null = activeEmployee ? {
    id: activeEmployee.id,
    tenantId: activeEmployee.tenantId,
    employeeCode: activeEmployee.employeeCode,
    fullName: activeEmployee.fullName,
    avatarUrl: activeEmployee.avatarUrl,
    email: activeEmployee.email,
    phone: activeEmployee.phone,
    department: activeEmployee.department,
    designation: activeEmployee.designation,
    status: activeEmployee.status,
    shiftId: activeEmployee.shiftId,
    shiftName: activeEmployee.shiftName,
    deviceStatus: activeEmployee.deviceStatus,
    deviceModel: activeEmployee.deviceModel,
  } : null;
  const isPayrollAdministrator = Boolean(user && ["AGENCY_ADMIN", "HR_MANAGER"].includes(user.role) && user.tenantId === tenant.id);
  const personalAttendanceRecords = activeEmployee
    ? attendanceRecords.filter((record) => record.tenantId === tenant.id && record.employeeId === activeEmployee.id)
    : [];
  const personalSalaryAdvances = activeEmployee
    ? salaryAdvances.filter((advance) => advance.tenantId === tenant.id && advance.employeeId === activeEmployee.id)
    : [];
  const personalPayslips: PersonalPayslipRecord[] = activeEmployee
    ? payrollRuns.flatMap((run) => {
        if (run.tenantId !== tenant.id || !["APPROVED", "DISBURSED", "LOCKED"].includes(run.status)) return [];
        const item = run.items.find((entry) => entry.employeeId === activeEmployee.id);
        return item ? [{
          runId: run.id,
          tenantId: run.tenantId,
          monthString: run.monthString,
          monthCode: run.monthCode,
          payrollStatus: run.status,
          generatedAt: run.generatedAt,
          approvedAt: run.approvedAt,
          disbursedAt: run.disbursedAt,
          item,
        }] : [];
      }).sort((a, b) => b.monthCode.localeCompare(a.monthCode))
    : [];
  const tenantLeaveRequests = leaveRequests.filter((request) => request.tenantId === tenant.id);
  const personalLeaveRequests = activeEmployee
    ? tenantLeaveRequests.filter((request) => request.employeeId === activeEmployee.id)
    : [];
  const personalLeaveBalance = activeEmployee
    ? calculateLeaveBalance(activeEmployee, tenantLeaveRequests)
    : null;
  const leaveBalances = isPayrollAdministrator
    ? employees.filter((employee) => employee.tenantId === tenant.id).map((employee) => calculateLeaveBalance(employee, tenantLeaveRequests))
    : [];

  return (
    <DataContext.Provider
      value={{
        attendanceRecords: isPayrollAdministrator ? attendanceRecords.filter((record) => record.tenantId === tenant.id) : personalAttendanceRecords,
        registeredDevices: isPayrollAdministrator ? registeredDevices.filter((device) => device.tenantId === tenant.id) : registeredDevices.filter((device) => device.tenantId === tenant.id && device.employeeId === activeEmployee?.id),
        processDeviceAttendance,
        processMobileScan,
        revokeRegisteredDevice,
        revokeEmployeeDevice,
        resetEmployeeDeviceEnrollment,
        createDeviceEnrollmentToken,
        createManualAttendanceRecord,
        updateManualAttendanceRecord,
        voidAttendanceRecord,
        attendanceCutoffTime,
        previewDailyAttendance,
        finalizeDailyAttendance,
        updateAttendanceCutoffTime,
        payrollRuns: isPayrollAdministrator ? payrollRuns.filter((run) => run.tenantId === tenant.id) : [],
        salaryAdvances: isPayrollAdministrator ? salaryAdvances.filter((advance) => advance.tenantId === tenant.id) : [],
        currentEmployeeProfile,
        personalAttendanceRecords,
        personalSalaryAdvances,
        personalPayslips,
        leaveRequests: isPayrollAdministrator ? tenantLeaveRequests : personalLeaveRequests,
        getEmployeeLeaveBalance,
        personalLeaveRequests,
        personalLeaveBalance,
        leaveBalances,
        reviewLeaveRequest,
        recordLeave,
        voidLeave,
        updateLeaveEntitlement,
        getPersonalPayslip,
        calculateMonthlyPayroll,
        updatePayrollEmployee,
        approvePayrollRun,
        disbursePayrollRun,
        createSalaryAdvance,
        requestPersonalSalaryAdvance,
        reviewSalaryAdvance,
        employees:
          user?.tenantId === tenant.id || user?.role === "SUPER_ADMIN"
            ? employees.filter((entry) => entry.tenantId === tenant.id)
            : [],
        shifts,
        createShiftRecord,
        updateShiftRecord,
        createEmployeeRecord,
        updateEmployeeRecord,
        bookings:
          user?.tenantId === tenant.id &&
          [
            "AGENCY_ADMIN",
            "FRONT_DESK",
            "TOUR_MANAGER",
            "VISA_CONSULTANT",
          ].includes(user.role)
            ? crm.bookings.filter(
                (b) =>
                  b.tenantId === tenant.id &&
                  (user.role !== "TOUR_MANAGER" ||
                    b.serviceType === "GROUP_TOUR") &&
                  (user.role !== "VISA_CONSULTANT" ||
                    b.serviceType === "VISA_CONSULTANCY"),
              )
            : [],
        createBooking,
        cancelBooking,
        confirmBooking,
        convertLeadToBooking,
        saveDraftBooking,
        confirmBookingTransaction: convertLeadToBooking,
        createBookingForExistingClient,
        updateTraveler,
        updateTravelerDetails,
        unassignTravelerSlot,
        reassignRoomAllocation,
        assignTravelerToBooking,
        deleteTravelerFromManifest,
        clients: crm.clients.filter((c) => c.tenantId === user?.tenantId),
        duplicates:
          user?.role === "AGENCY_ADMIN"
            ? crm.duplicates.filter((d) => d.tenantId === user.tenantId)
            : [],
        activeReps,
        crmReady,
        crmError,
        bulkUpdateLeads,
        convertLead,
        importLeads,
        distributeUnassigned,
        resolveDuplicate,
        leads: isHydrated
          ? currentLeads
          : INITIAL_LEADS.filter((l) => l.tenantId === tenant.id),
        tours: isHydrated
          ? currentTours
          : INITIAL_TOURS.filter((t) => t.tenantId === tenant.id),
        passengers: currentPassengers,
        visaCases: isHydrated
          ? currentVisaCases
          : INITIAL_VISA_CASES.filter((v) => v.tenantId === tenant.id),
        invoices: isHydrated
          ? currentInvoices
          : INITIAL_INVOICES.filter((i) => i.tenantId === tenant.id),
        expenses:
          user?.tenantId === tenant.id && canViewTourCosts(user.role)
            ? isHydrated
              ? currentExpenses
              : INITIAL_EXPENSES.filter((e) => e.tenantId === tenant.id)
            : [],
        officeExpenses:
          isHydrated && user?.tenantId === tenant.id && canManageOfficeExpenses(user.role)
            ? currentOfficeExpenses
            : [],
        vaultDocuments:
          isHydrated && user?.tenantId === tenant.id && ["AGENCY_ADMIN", "VISA_CONSULTANT"].includes(user.role)
            ? currentVaultDocuments
            : [],
        suppliers:
          isHydrated && user?.tenantId === tenant.id && ["AGENCY_ADMIN", "TOUR_MANAGER"].includes(user.role)
            ? currentSuppliers
            : [],
        uploadVaultDocument,
        updateVaultDocument,
        verifyVaultDocument,
        deleteVaultDocument,
        createSupplier,
        updateSupplier,
        deleteSupplier,
        ledgerEntries:
          isHydrated && user?.tenantId === tenant.id && user.role === "AGENCY_ADMIN"
            ? currentLedgerEntries
            : [],
        addTourExpense,
        updateTourExpense,
        deleteTourExpense,
        addOfficeExpense,
        updateOfficeExpense,
        deleteOfficeExpense,
        tenantSummary,
        addLead,
        updateLeadStatus,
        addInteraction,
        updateVisaStage,
        visaPipelineCases: isHydrated && user && user.tenantId === tenant.id && ['AGENCY_ADMIN', 'FRONT_DESK', 'VISA_CONSULTANT'].includes(user.role) ? crm.visaCases.filter(v => v.tenantId === tenant.id).map(v => normalizeVisaCase(v, crm)) : [],
        saveVisaPipelineCase: (id, input) => {
          requireOperations(['AGENCY_ADMIN', 'FRONT_DESK', 'VISA_CONSULTANT']);
          const old = crmRef.current.visaCases.find(v => v.id === id && v.tenantId === user!.tenantId);
          if (input.assignedStaffId !== undefined && input.assignedStaffId === old?.pipeline?.assignedStaffId) {
            input = { ...input, assignedStaffName: old?.pipeline?.assignedStaffName };
          } else if (input.assignedStaffId) {
            const assignee = input.assignedStaffId === user!.id ? user! : staffUsers.find(s => s.id === input.assignedStaffId && s.tenantId === user!.tenantId && s.status === 'Active');
            if (!assignee || !['AGENCY_ADMIN', 'FRONT_DESK', 'VISA_CONSULTANT'].includes(assignee.role)) throw new Error('Select active staff in this agency.');
            input = { ...input, assignedStaffName: assignee.name };
          } else if (input.assignedStaffId === '') {
            input = { ...input, assignedStaffName: old && input.assignedStaffName === old.consultantName ? old.consultantName : '' };
          }
          commitCRM(saveVisaCase(crmRef.current, user!, id, input, new Date().toISOString(), () => crypto.randomUUID()));

          // Live API Sync
          import("@/lib/visa-api").then(({ createVisaCase, updateVisaCase, transferPassportCustody }) => {
            if (id) {
              if (input.passportCustody && old && input.passportCustody !== old.pipeline?.passportCustody) {
                transferPassportCustody(id, {
                  to_location: input.passportCustody as any,
                  toLocation: input.passportCustody as any,
                  safe_locker_id: input.custodySafeLockerId,
                  safeLockerId: input.custodySafeLockerId,
                  courier_tracking_code: input.courierTrackingCode,
                  notes: input.notes,
                }).catch(() => {});
              }
              updateVisaCase(id, input as any).catch(() => {});
            } else {
              createVisaCase(input as any).catch(() => {});
            }
          }).catch(() => {});
        },
        setVisaCaseArchived: (id, archived) => {
          requireOperations(['AGENCY_ADMIN', 'FRONT_DESK', 'VISA_CONSULTANT']);
          commitCRM(archiveVisaCase(crmRef.current, user!, id, archived, new Date().toISOString()));

          // Live API Sync
          import("@/lib/api-client").then(({ apiClient }) => {
            apiClient.post(`/visa/cases/${encodeURIComponent(id)}/archive`, { is_archived: archived }).catch(() => {});
          }).catch(() => {});
        },
        updateVisaDocuments,
        addVisaCase,
        recordPayment,
        submitPaymentProof,
        reviewPaymentProof,
        approvePaymentClaim: (id, method = 'Bank Transfer') => reviewPaymentProof(id, 'APPROVE', '', method),
        rejectPaymentClaim: (id, reason) => reviewPaymentProof(id, 'REJECT', reason, 'Bank Transfer'),
        logRecoveryCall,
        paymentProofClaims: isHydrated && user && ["AGENCY_ADMIN", "FRONT_DESK"].includes(user.role) && user.tenantId === tenant.id ? (crm.paymentProofClaims || []).filter(c => crm.invoices.some(i => i.id === c.invoiceId && i.tenantId === tenant.id)) : [],
        recoveryCallLogs: isHydrated && user && ["AGENCY_ADMIN", "FRONT_DESK"].includes(user.role) && user.tenantId === tenant.id ? (crm.recoveryCallLogs || []).filter(c => crm.invoices.some(i => i.id === c.invoiceId && i.tenantId === tenant.id)) : [],
        updatePassengerPayment,
        addPassenger,
        updateTourOperations,
        assignTravelerToRoom,
        addRoom: (tourId, input) => runTourOperation(tourId, { type: 'SAVE_ROOM', room: { ...input, id: crypto.randomUUID(), tourId, assignedTravelerIds: [] } }),
        updateRoom: (tourId, roomId, input) => runTourOperation(tourId, { type: 'SAVE_ROOM', room: { ...input, id: roomId, tourId, assignedTravelerIds: [] } }),
        deleteRoom: (tourId, roomId) => runTourOperation(tourId, { type: 'DELETE_ROOM', roomId }),
        unassignTravelerFromRoom: (tourId, roomId, travelerId) => runTourOperation(tourId, { type: 'UNASSIGN', roomId, travelerId }),
        addItineraryDay: (tourId, day) => runTourOperation(tourId, { type: 'ADD_DAY', day }),
        updateItineraryDay: (tourId, dayNumber, day) => runTourOperation(tourId, { type: 'UPDATE_DAY', dayNumber, day }),
        deleteItineraryDay: (tourId, dayNumber) => runTourOperation(tourId, { type: 'DELETE_DAY', dayNumber }),
        moveItineraryDay: (tourId, dayNumber, direction) => runTourOperation(tourId, { type: 'MOVE_DAY', dayNumber, direction }),
        createTourPackage,
        updateTourPackage,
        deleteTourPackage,
        getTourROI,
        resetToDefaults,
        resetToDefaultMockData: resetToDefaults,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}

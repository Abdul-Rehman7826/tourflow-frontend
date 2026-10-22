import type {
  Booking,
  ExpenseCategory,
  Invoice,
  OfficeExpense,
  OfficeExpenseCategory,
  TourExpense,
  TourPackage,
} from "@/types/erp";

export type TenantGovernanceStatus =
  | "ACTIVE"
  | "GRACE_PERIOD"
  | "SUSPENDED";

export interface TourFinancialSummary {
  tourId: string;
  recognizedRevenue: number;
  directVendorExpenses: number;
  allocatedOverheads: number;
  netProfit: number;
  roiPercent: number;
  marginPercent: number;
  costsByCategory: Record<ExpenseCategory, number>;
}

export interface OutstandingAging {
  current: number;
  days1To30: number;
  days31To60: number;
  days61Plus: number;
}

export interface ExecutiveAnalytics {
  grossBilled: number;
  realizedCash: number;
  outstandingTotal: number;
  outstandingAging: OutstandingAging;
  recognizedTourRevenue: number;
  directVendorExpenses: number;
  allocatedOverheads: number;
  officeOverheads: number;
  netTourProfit: number;
  tourRoiPercent: number;
  tourMarginPercent: number;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "FLIGHT",
  "HOTEL",
  "TRANSPORT",
  "VISA",
  "GUIDE",
  "MISC",
];

const cents = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const percentage = (value: number) => Math.round(value * 10) / 10;

export function canViewTourCosts(role: string) {
  return role === "AGENCY_ADMIN" || role === "TOUR_MANAGER";
}

export function canViewExecutiveAnalytics(role: string) {
  return role === "AGENCY_ADMIN";
}

export function canManageOfficeExpenses(role: string) {
  return role === "AGENCY_ADMIN" || role === "HR_MANAGER";
}

export function calculateOfficeExpenseSummary(
  tenantId: string,
  officeExpenses: OfficeExpense[] = [],
) {
  const scopedExpenses = officeExpenses.filter(
    (expense) => expense.tenantId === tenantId,
  );
  const total = cents(scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0));
  const byCategory = scopedExpenses.reduce(
    (acc, expense) => {
      acc[expense.category] = cents((acc[expense.category] || 0) + expense.amount);
      return acc;
    },
    {} as Partial<Record<OfficeExpenseCategory, number>>,
  );
  return { total, count: scopedExpenses.length, byCategory };
}

export function calculateTourFinancials(
  tenantId: string,
  tour: TourPackage,
  bookings: Booking[],
  invoices: Invoice[],
  expenses: TourExpense[],
): TourFinancialSummary {
  if (tour.tenantId !== tenantId) throw new Error("Tour does not belong to this tenant.");

  const bookingIds = new Set(
    bookings
      .filter(
        (booking) =>
          booking.tenantId === tenantId &&
          booking.packageId === tour.id &&
          booking.status !== "CANCELLED",
      )
      .map((booking) => booking.id),
  );
  const recognizedRevenue = cents(
    invoices
      .filter(
        (invoice) =>
          invoice.tenantId === tenantId &&
          invoice.status !== "CANCELLED" &&
          (invoice.tourId === tour.id || bookingIds.has(invoice.bookingId || "")),
      )
      .reduce((sum, invoice) => sum + invoice.totalAmount, 0),
  );
  const scopedExpenses = expenses.filter(
    (expense) => expense.tenantId === tenantId && expense.tourId === tour.id,
  );
  const directVendorExpenses = cents(
    scopedExpenses.reduce((sum, expense) => sum + expense.amount, 0),
  );
  const allocatedOverheads = cents(Math.max(0, tour.allocatedOverheads || 0));
  const netProfit = cents(
    recognizedRevenue - directVendorExpenses - allocatedOverheads,
  );
  const costsByCategory = Object.fromEntries(
    EXPENSE_CATEGORIES.map((category) => [
      category,
      cents(
        scopedExpenses
          .filter((expense) => expense.category === category)
          .reduce((sum, expense) => sum + expense.amount, 0),
      ),
    ]),
  ) as Record<ExpenseCategory, number>;

  return {
    tourId: tour.id,
    recognizedRevenue,
    directVendorExpenses,
    allocatedOverheads,
    netProfit,
    roiPercent:
      directVendorExpenses === 0
        ? 0
        : percentage((netProfit / directVendorExpenses) * 100),
    marginPercent:
      recognizedRevenue === 0
        ? 0
        : percentage((netProfit / recognizedRevenue) * 100),
    costsByCategory,
  };
}

export function calculateExecutiveAnalytics(
  tenantId: string,
  invoices: Invoice[],
  tours: TourPackage[],
  bookings: Booking[],
  expenses: TourExpense[],
  asOfDate: string,
  officeExpenses: OfficeExpense[] = [],
): ExecutiveAnalytics {
  const scopedInvoices = invoices.filter(
    (invoice) => invoice.tenantId === tenantId && invoice.status !== "CANCELLED",
  );
  const grossBilled = cents(
    scopedInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0),
  );
  const realizedCash = cents(
    scopedInvoices.reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          0,
          invoice.paidAmount - (invoice.refund?.refundAmountIssued || 0),
        ),
      0,
    ),
  );
  const outstandingAging: OutstandingAging = {
    current: 0,
    days1To30: 0,
    days31To60: 0,
    days61Plus: 0,
  };
  const asOf = Date.parse(`${asOfDate}T00:00:00Z`);

  for (const invoice of scopedInvoices) {
    const due = Math.max(0, invoice.dueAmount);
    if (!due) continue;
    const dueAt = Date.parse(`${invoice.dueDate}T00:00:00Z`);
    const ageDays = Number.isFinite(dueAt)
      ? Math.floor((asOf - dueAt) / 86_400_000)
      : 0;
    if (ageDays <= 0) outstandingAging.current += due;
    else if (ageDays <= 30) outstandingAging.days1To30 += due;
    else if (ageDays <= 60) outstandingAging.days31To60 += due;
    else outstandingAging.days61Plus += due;
  }

  const tourSummaries = tours
    .filter((tour) => tour.tenantId === tenantId)
    .map((tour) =>
      calculateTourFinancials(tenantId, tour, bookings, invoices, expenses),
    );
  const recognizedTourRevenue = cents(
    tourSummaries.reduce((sum, tour) => sum + tour.recognizedRevenue, 0),
  );
  const directVendorExpenses = cents(
    tourSummaries.reduce((sum, tour) => sum + tour.directVendorExpenses, 0),
  );
  const allocatedOverheads = cents(
    tourSummaries.reduce((sum, tour) => sum + tour.allocatedOverheads, 0),
  );
  const officeOverheads = calculateOfficeExpenseSummary(
    tenantId,
    officeExpenses,
  ).total;
  const netTourProfit = cents(
    recognizedTourRevenue - directVendorExpenses - allocatedOverheads - officeOverheads,
  );

  Object.keys(outstandingAging).forEach((key) => {
    const bucket = key as keyof OutstandingAging;
    outstandingAging[bucket] = cents(outstandingAging[bucket]);
  });

  return {
    grossBilled,
    realizedCash,
    outstandingTotal: cents(
      Object.values(outstandingAging).reduce((sum, value) => sum + value, 0),
    ),
    outstandingAging,
    recognizedTourRevenue,
    directVendorExpenses,
    allocatedOverheads,
    officeOverheads,
    netTourProfit,
    tourRoiPercent:
      directVendorExpenses === 0
        ? 0
        : percentage((netTourProfit / directVendorExpenses) * 100),
    tourMarginPercent:
      recognizedTourRevenue === 0
        ? 0
        : percentage((netTourProfit / recognizedTourRevenue) * 100),
  };
}

export function extendLicenseDate(
  currentRenewalDate: string,
  days: 30 | 90 | 180 | 365,
  today: string,
) {
  const current = Date.parse(`${currentRenewalDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(current) || !Number.isFinite(now)) {
    throw new Error("A valid renewal date is required.");
  }
  const base = Math.max(current, now);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function assertSuperAdmin(role: string) {
  if (role !== "SUPER_ADMIN") {
    throw new Error("Access restricted to the platform owner.");
  }
}

export function normalizeGovernanceStatus(status: string): TenantGovernanceStatus {
  if (status === "Active" || status === "ACTIVE") return "ACTIVE";
  if (status === "Grace Period" || status === "GRACE_PERIOD") {
    return "GRACE_PERIOD";
  }
  if (status === "Suspended" || status === "SUSPENDED") return "SUSPENDED";
  throw new Error("Unsupported tenant status.");
}

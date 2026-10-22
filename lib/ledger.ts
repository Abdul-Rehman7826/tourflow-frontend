import type {
  Invoice,
  LedgerEntry,
  MonthlyPayrollRun,
  OfficeExpense,
  TourExpense,
} from "@/types/erp";

export interface TourFinancialSummary {
  tourId: string;
  tourTitle: string;
  departureDate: string;
  totalRevenue: number;
  totalDirectCost: number;
  netMargin: number;
  roiPercentage: number;
}

type LedgerInput = {
  invoices?: Invoice[];
  tourExpenses?: TourExpense[];
  officeExpenses?: OfficeExpense[];
  payrollRuns?: MonthlyPayrollRun[];
};

const money = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export function calculateTourFinancials(
  tours: Array<{ id: string; title?: string; departureDate?: string }>,
  invoices: Array<{ tourId?: string; booking?: { tourId?: string }; paidAmount?: number; totalAmount?: number }>,
  tourExpenses: Array<{ tourId?: string; amount?: number }>,
): TourFinancialSummary[] {
  return tours.map((tour) => {
    const tourInvoices = invoices.filter(
      (invoice) => invoice.tourId === tour.id || invoice.booking?.tourId === tour.id,
    );
    const totalRevenue = money(
      tourInvoices.reduce(
        (sum, invoice) => sum + (invoice.paidAmount ?? invoice.totalAmount ?? 0),
        0,
      ),
    );
    const totalDirectCost = money(
      tourExpenses
        .filter((expense) => expense.tourId === tour.id)
        .reduce((sum, expense) => sum + (expense.amount || 0), 0),
    );
    const netMargin = money(totalRevenue - totalDirectCost);
    const roiPercentage = totalDirectCost > 0
      ? Number(((netMargin / totalDirectCost) * 100).toFixed(1))
      : 0;

    return {
      tourId: tour.id,
      tourTitle: tour.title || "Untitled Departure",
      departureDate: tour.departureDate || "",
      totalRevenue,
      totalDirectCost,
      netMargin,
      roiPercentage,
    };
  });
}

/** Builds the read-only cash ledger from tenant-scoped operational records. */
export function buildLedgerEntries(tenantId: string, input: LedgerInput): LedgerEntry[] {
  const entries: LedgerEntry[] = [];

  for (const invoice of input.invoices || []) {
    if (invoice.tenantId !== tenantId) continue;
    for (const payment of invoice.installments || []) {
      entries.push({
        id: `payment:${payment.id}`,
        tenantId,
        date: payment.paymentDate,
        referenceNo: payment.receiptNo || payment.reference || invoice.invoiceNumber,
        type: "CUSTOMER_PAYMENT",
        description: `Payment against ${invoice.invoiceNumber}`,
        partyName: invoice.clientName,
        paymentMethod: payment.method,
        debit: 0,
        credit: money(payment.amount),
        balance: 0,
        linkedEntityId: invoice.id,
      });
    }
    if (invoice.refund && invoice.refund.refundAmountIssued > 0) {
      entries.push({
        id: `refund:${invoice.refund.id}`,
        tenantId,
        date: invoice.refund.processedAt.slice(0, 10),
        referenceNo: invoice.refund.refundReference || invoice.invoiceNumber,
        type: "REFUND",
        description: `Refund for ${invoice.invoiceNumber}`,
        partyName: invoice.clientName,
        paymentMethod: invoice.refund.refundMethod,
        debit: money(invoice.refund.refundAmountIssued),
        credit: 0,
        balance: 0,
        linkedEntityId: invoice.id,
      });
    }
  }

  for (const expense of input.tourExpenses || []) {
    if (expense.tenantId !== tenantId) continue;
    entries.push({
      id: `supplier:${expense.id}`,
      tenantId,
      date: expense.date,
      referenceNo: expense.id,
      type: "SUPPLIER_PAYMENT",
      description: `${expense.category} supplier cost`,
      partyName: expense.vendorName,
      paymentMethod: "Supplier ledger",
      debit: money(expense.amount),
      credit: 0,
      balance: 0,
      linkedEntityId: expense.tourId,
    });
  }

  for (const expense of input.officeExpenses || []) {
    if (expense.tenantId !== tenantId) continue;
    entries.push({
      id: `office:${expense.id}`,
      tenantId,
      date: expense.paidAt,
      referenceNo: expense.receiptRef || expense.id,
      type: "OFFICE_EXPENSE",
      description: `${expense.category.replaceAll("_", " ")} overhead`,
      partyName: expense.vendorName,
      paymentMethod: expense.paymentMethod,
      debit: money(expense.amount),
      credit: 0,
      balance: 0,
      linkedEntityId: expense.id,
    });
  }

  for (const run of input.payrollRuns || []) {
    if (run.tenantId !== tenantId || run.status !== "DISBURSED") continue;
    for (const item of run.items || []) {
      if (item.paymentStatus !== "PROCESSED") continue;
      entries.push({
        id: `payroll:${run.id}:${item.id}`,
        tenantId,
        date: run.generatedAt.slice(0, 10),
        referenceNo: item.paymentReference || run.monthCode,
        type: "PAYROLL_DISBURSEMENT",
        description: `Payroll disbursement for ${run.monthString}`,
        partyName: item.employeeName,
        paymentMethod: item.paymentMethod,
        debit: money(item.netPayableSalary),
        credit: 0,
        balance: 0,
        linkedEntityId: run.id,
      });
    }
  }

  entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let balance = 0;
  return entries.map((entry) => {
    balance = money(balance + entry.credit - entry.debit);
    return { ...entry, balance };
  });
}

export function summarizeLedger(entries: LedgerEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      credits: money(summary.credits + entry.credit),
      debits: money(summary.debits + entry.debit),
      netCash: money(summary.netCash + entry.credit - entry.debit),
    }),
    { credits: 0, debits: 0, netCash: 0 },
  );
}

export function calculateSupplierPayables(tenantId: string, expenses: TourExpense[] = []) {
  const scoped = expenses.filter((expense) => expense.tenantId === tenantId);
  const byVendor = scoped.reduce<Record<string, number>>((result, expense) => {
    result[expense.vendorName] = money((result[expense.vendorName] || 0) + expense.amount);
    return result;
  }, {});
  return {
    total: money(scoped.reduce((sum, expense) => sum + expense.amount, 0)),
    count: scoped.length,
    byVendor,
  };
}

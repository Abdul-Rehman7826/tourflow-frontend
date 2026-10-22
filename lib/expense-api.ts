import { apiClient } from "@/lib/api-client";
import type {
  LedgerEntry,
  OfficeExpense,
  OfficeExpenseCategory,
  TourExpense,
  ExpenseCategory,
  ExpensePaymentMethod,
} from "@/types/erp";
import type { TourFinancialSummary } from "@/lib/ledger";

export interface OfficeExpenseSummary {
  total: number;
  count: number;
  byCategory: Record<string, number>;
}

export interface LedgerSummary {
  credits: number;
  debits: number;
  netCash: number;
  entryCount: number;
}

// ============================================================================
// DIRECT TOUR EXPENSES
// ============================================================================

export async function fetchTourExpenses(tourId: string): Promise<TourExpense[]> {
  const response = await apiClient.get<TourExpense[]>(
    `/tours/${encodeURIComponent(tourId)}/expenses`,
  );
  return Array.isArray(response) ? response : [];
}

export async function createTourExpenseApi(
  tourId: string,
  expense: {
    vendorName: string;
    category?: ExpenseCategory | string;
    amount: number;
    supplierId?: string;
    originalCurrency?: string;
    originalAmount?: number;
    exchangeRateToBase?: number;
    receiptRef?: string;
    notes?: string;
    date?: string;
  },
): Promise<TourExpense> {
  return await apiClient.post<TourExpense>(
    `/tours/${encodeURIComponent(tourId)}/expenses`,
    {
      vendor_name: expense.vendorName,
      category: expense.category || "OTHER",
      amount: expense.amount,
      supplier_id: expense.supplierId || null,
      original_currency: expense.originalCurrency || "PKR",
      original_amount: expense.originalAmount ?? expense.amount,
      exchange_rate_to_base: expense.exchangeRateToBase ?? 1.0,
      receipt_ref: expense.receiptRef || null,
      notes: expense.notes || null,
      expense_date: expense.date || new Date().toISOString().slice(0, 10),
    },
  );
}

export async function deleteTourExpenseApi(
  expenseId: string,
): Promise<{ success: boolean; message: string }> {
  return await apiClient.delete<{ success: boolean; message: string }>(
    `/tours/expenses/${encodeURIComponent(expenseId)}`,
  );
}

// ============================================================================
// OFFICE OVERHEAD EXPENSES
// ============================================================================

export async function fetchOfficeExpenses(params?: {
  category?: OfficeExpenseCategory | string;
  from?: string;
  to?: string;
}): Promise<OfficeExpense[]> {
  const response = await apiClient.get<OfficeExpense[]>("/expenses/office", {
    params,
  });
  return Array.isArray(response) ? response : [];
}

export async function createOfficeExpenseApi(expense: {
  category: OfficeExpenseCategory | string;
  vendorName: string;
  amount: number;
  currency?: string;
  paymentMethod?: ExpensePaymentMethod | string;
  paidAt?: string;
  receiptRef?: string;
  notes?: string;
}): Promise<OfficeExpense> {
  return await apiClient.post<OfficeExpense>("/expenses/office", {
    category: expense.category,
    vendor_name: expense.vendorName,
    amount: expense.amount,
    currency: expense.currency || "PKR",
    payment_method: expense.paymentMethod || "CASH",
    paid_at: expense.paidAt || new Date().toISOString().slice(0, 10),
    receipt_ref: expense.receiptRef || null,
    notes: expense.notes || null,
  });
}

export async function deleteOfficeExpenseApi(
  expenseId: string,
): Promise<{ success: boolean; message: string }> {
  return await apiClient.delete<{ success: boolean; message: string }>(
    `/expenses/office/${encodeURIComponent(expenseId)}`,
  );
}

export async function fetchOfficeExpenseSummary(params?: {
  from?: string;
  to?: string;
}): Promise<OfficeExpenseSummary> {
  return await apiClient.get<OfficeExpenseSummary>("/expenses/office/summary", {
    params,
  });
}

// ============================================================================
// GENERAL LEDGER & ROI
// ============================================================================

export async function fetchLedgerEntries(params?: {
  from?: string;
  to?: string;
}): Promise<LedgerEntry[]> {
  const response = await apiClient.get<LedgerEntry[]>("/ledger", { params });
  return Array.isArray(response) ? response : [];
}

export async function fetchLedgerSummary(params?: {
  from?: string;
  to?: string;
}): Promise<LedgerSummary> {
  return await apiClient.get<LedgerSummary>("/ledger/summary", { params });
}

export async function fetchTourFinancials(): Promise<TourFinancialSummary[]> {
  const response = await apiClient.get<TourFinancialSummary[]>(
    "/ledger/tour-financials",
  );
  return Array.isArray(response) ? response : [];
}

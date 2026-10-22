import type { TourExpense } from "@/types/erp";

export function canManageSuppliers(role?: string) {
  return role === "AGENCY_ADMIN" || role === "TOUR_MANAGER";
}

export function normalizeSupplierName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function getSupplierPayableExposure(
  tenantId: string,
  supplierName: string,
  expenses: TourExpense[] = [],
) {
  const normalizedName = normalizeSupplierName(supplierName);
  return expenses
    .filter((expense) => expense.tenantId === tenantId && normalizeSupplierName(expense.vendorName) === normalizedName)
    .reduce((total, expense) => total + (Number(expense.amount) || 0), 0);
}

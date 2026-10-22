import { apiClient } from "@/lib/api-client";
import type { Supplier, SupplierCategory } from "@/types/erp";

export interface SupplierExposureSummary {
  supplierId: string;
  supplierName?: string;
  totalExposure: number;
  expenseCount: number;
}

export async function fetchSuppliers(params?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<Supplier[]> {
  const response = await apiClient.get<Supplier[]>("/suppliers", { params });
  return Array.isArray(response) ? response : [];
}

export async function getSupplier(
  id: string,
): Promise<Supplier & { totalExposure?: number; expenseCount?: number }> {
  return await apiClient.get<Supplier & { totalExposure?: number; expenseCount?: number }>(
    `/suppliers/${encodeURIComponent(id)}`,
  );
}

export async function createSupplierApi(
  supplier: Partial<Supplier> & { name: string; category: SupplierCategory; contactPerson: string; phone: string },
): Promise<Supplier> {
  return await apiClient.post<Supplier>("/suppliers", {
    name: supplier.name,
    category: supplier.category,
    contact_person: supplier.contactPerson,
    phone: supplier.phone,
    email: supplier.email || null,
    operating_regions: supplier.operatingRegions || [],
    currency: supplier.currency || "PKR",
    bank_details: supplier.bankDetails || null,
    status: supplier.status || "ACTIVE",
    notes: supplier.notes || null,
  });
}

export async function updateSupplierApi(
  id: string,
  updates: Partial<Supplier>,
): Promise<Supplier> {
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.category !== undefined) payload.category = updates.category;
  if (updates.contactPerson !== undefined) payload.contact_person = updates.contactPerson;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.email !== undefined) payload.email = updates.email || null;
  if (updates.operatingRegions !== undefined) payload.operating_regions = updates.operatingRegions;
  if (updates.currency !== undefined) payload.currency = updates.currency;
  if (updates.bankDetails !== undefined) payload.bank_details = updates.bankDetails;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  return await apiClient.patch<Supplier>(`/suppliers/${encodeURIComponent(id)}`, payload);
}

export async function deleteSupplierApi(
  id: string,
): Promise<{ success: boolean; message: string }> {
  return await apiClient.delete<{ success: boolean; message: string }>(
    `/suppliers/${encodeURIComponent(id)}`,
  );
}

export async function getSupplierExposure(
  id: string,
): Promise<SupplierExposureSummary> {
  return await apiClient.get<SupplierExposureSummary>(
    `/suppliers/${encodeURIComponent(id)}/exposure`,
  );
}

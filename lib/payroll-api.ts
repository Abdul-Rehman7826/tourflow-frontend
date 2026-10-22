/**
 * TourFlow ERP - Central Payroll & Compensation API Service
 * Connects frontend monthly payroll engine, salary advances, and employee payslip portal
 * to the live FastAPI backend (/api/v1/payroll).
 */

import { apiClient } from "@/lib/api-client";
import type {
  EmployeePayrollItem,
  MonthlyPayrollRun,
  PersonalPayslipRecord,
  SalaryAdvance,
  PayrollStatus,
} from "@/types/erp";

export interface GeneratePayrollPayload {
  month: number;
  year: number;
  tenant_id?: string;
}

export interface SalaryAdvanceRequestPayload {
  employee_id?: string;
  employeeId?: string;
  amount: number;
  reason: string;
  payroll_month?: string;
  payrollMonth?: string;
}

export interface ReviewAdvancePayload {
  status: "APPROVED" | "REJECTED";
  reviewed_by?: string;
}

/**
 * Normalizes backend snake_case EmployeePayrollItem into dual-compatible frontend structure
 */
export function backendToFrontendPayrollItem(raw: Record<string, unknown>): EmployeePayrollItem {
  return {
    ...(raw as unknown as EmployeePayrollItem),
    id: (raw.id as string) || `item_${crypto.randomUUID()}`,
    employeeId: (raw.employee_id || raw.employeeId || "") as string,
    employeeCode: (raw.employee_code || raw.employeeCode || "") as string,
    employeeName: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    department: (raw.department || "OPERATIONS") as string,
    designation: (raw.designation || "Associate") as string,
    basicSalary: Number(raw.basic_salary ?? raw.basicSalary ?? 0),
    basic_salary: Number(raw.basic_salary ?? raw.basicSalary ?? 0),
    allowances: Number(raw.allowances ?? 0),
    grossPay: Number(raw.gross_pay ?? raw.grossPay ?? 0),
    gross_pay: Number(raw.gross_pay ?? raw.grossPay ?? 0),
    workingDaysInMonth: Number(raw.working_days_in_month ?? raw.workingDaysInMonth ?? 26),
    working_days_in_month: Number(raw.working_days_in_month ?? raw.workingDaysInMonth ?? 26),
    daysPresent: Number(raw.days_present ?? raw.daysPresent ?? 0),
    days_present: Number(raw.days_present ?? raw.daysPresent ?? 0),
    unexcusedAbsences: Number(raw.unexcused_absences ?? raw.unexcusedAbsences ?? 0),
    unexcused_absences: Number(raw.unexcused_absences ?? raw.unexcusedAbsences ?? 0),
    totalLateArrivals: Number(raw.total_late_arrivals ?? raw.totalLateArrivals ?? 0),
    total_late_arrivals: Number(raw.total_late_arrivals ?? raw.totalLateArrivals ?? 0),
    lateArrivalDeduction: Number(raw.late_arrival_deduction ?? raw.lateArrivalDeduction ?? 0),
    late_arrival_deduction: Number(raw.late_arrival_deduction ?? raw.lateArrivalDeduction ?? 0),
    unpaidLeaveDeduction: Number(raw.unpaid_leave_deduction ?? raw.unpaidLeaveDeduction ?? 0),
    unpaid_leave_deduction: Number(raw.unpaid_leave_deduction ?? raw.unpaidLeaveDeduction ?? 0),
    unpaidLeaveDays: Number(raw.unpaid_leave_days ?? raw.unpaidLeaveDays ?? 0),
    unpaid_leave_days: Number(raw.unpaid_leave_days ?? raw.unpaidLeaveDays ?? 0),
    salaryAdvancesDeduction: Number(raw.salary_advances_deduction ?? raw.salaryAdvancesDeduction ?? 0),
    salary_advances_deduction: Number(raw.salary_advances_deduction ?? raw.salaryAdvancesDeduction ?? 0),
    bonusesOrIncentives: Number(raw.bonuses_or_incentives ?? raw.bonusesOrIncentives ?? 0),
    bonuses_or_incentives: Number(raw.bonuses_or_incentives ?? raw.bonusesOrIncentives ?? 0),
    netPayableSalary: Number(raw.net_payable_salary ?? raw.netPayableSalary ?? 0),
    net_payable_salary: Number(raw.net_payable_salary ?? raw.netPayableSalary ?? 0),
    paymentMethod: (raw.payment_method || raw.paymentMethod || "BANK_TRANSFER") as EmployeePayrollItem["paymentMethod"],
    payment_method: (raw.payment_method || raw.paymentMethod || "BANK_TRANSFER") as EmployeePayrollItem["paymentMethod"],
    bankName: (raw.bank_name || raw.bankName || "Meezan Bank Ltd") as string,
    bank_name: (raw.bank_name || raw.bankName || "Meezan Bank Ltd") as string,
    bankAccountNumber: (raw.bank_account_number || raw.bankAccountNumber || "") as string,
    bank_account_number: (raw.bank_account_number || raw.bankAccountNumber || "") as string,
    bankIban: (raw.bank_iban || raw.bankIban || "") as string,
    bank_iban: (raw.bank_iban || raw.bankIban || "") as string,
    paymentStatus: (raw.payment_status || raw.paymentStatus || "UNPAID") as EmployeePayrollItem["paymentStatus"],
    payment_status: (raw.payment_status || raw.paymentStatus || "UNPAID") as EmployeePayrollItem["paymentStatus"],
    paymentReference: (raw.payment_reference || raw.paymentReference) as string | undefined,
    payment_reference: (raw.payment_reference || raw.paymentReference) as string | undefined,
  };
}

/**
 * Normalizes backend snake_case MonthlyPayrollRun into frontend model
 */
export function backendToFrontendPayrollRun(raw: Record<string, unknown>): MonthlyPayrollRun {
  const items: EmployeePayrollItem[] = Array.isArray(raw.items) ? (raw.items as Record<string, unknown>[]).map(backendToFrontendPayrollItem) : [];
  const totalGross = Number(raw.total_gross_liability ?? raw.totalGrossLiability ?? items.reduce((sum: number, it: EmployeePayrollItem) => sum + it.grossPay, 0));
  const totalDeductions = Number(raw.total_deductions ?? raw.totalDeductions ?? items.reduce((sum: number, it: EmployeePayrollItem) => sum + it.lateArrivalDeduction + it.unpaidLeaveDeduction + it.salaryAdvancesDeduction, 0));
  const totalNet = Number(raw.total_net_disbursement ?? raw.totalNetDisbursement ?? items.reduce((sum: number, it: EmployeePayrollItem) => sum + it.netPayableSalary, 0));

  return {
    ...(raw as unknown as MonthlyPayrollRun),
    id: (raw.id as string) || `run_${(raw.month_code || raw.monthCode || Date.now()) as string}`,
    tenantId: (raw.tenant_id || raw.tenantId || "") as string,
    tenant_id: (raw.tenant_id || raw.tenantId || "") as string,
    monthString: (raw.month_string || raw.monthString || "Current Month") as string,
    month_string: (raw.month_string || raw.monthString || "Current Month") as string,
    monthCode: (raw.month_code || raw.monthCode || new Date().toISOString().slice(0, 7)) as string,
    month_code: (raw.month_code || raw.monthCode || new Date().toISOString().slice(0, 7)) as string,
    totalGrossLiability: totalGross,
    total_gross_liability: totalGross,
    totalDeductions,
    total_deductions: totalDeductions,
    totalNetDisbursement: totalNet,
    total_net_disbursement: totalNet,
    status: ((raw.status as PayrollStatus) || "DRAFT"),
    items,
    generatedAt: (raw.generated_at || raw.generatedAt || new Date().toISOString()) as string,
    generated_at: (raw.generated_at || raw.generatedAt || new Date().toISOString()) as string,
    approvedByAdminId: (raw.approved_by_admin_id || raw.approvedByAdminId) as string | undefined,
    approved_by_admin_id: (raw.approved_by_admin_id || raw.approvedByAdminId) as string | undefined,
    approvedAt: (raw.approved_at || raw.approvedAt) as string | undefined,
    approved_at: (raw.approved_at || raw.approvedAt) as string | undefined,
    disbursedAt: (raw.disbursed_at || raw.disbursedAt) as string | undefined,
    disbursed_at: (raw.disbursed_at || raw.disbursedAt) as string | undefined,
  };
}

/**
 * Normalizes backend snake_case SalaryAdvance into frontend model
 */
export function backendToFrontendSalaryAdvance(raw: Record<string, unknown>): SalaryAdvance {
  return {
    ...(raw as unknown as SalaryAdvance),
    id: (raw.id as string) || `adv_${crypto.randomUUID()}`,
    tenantId: (raw.tenant_id || raw.tenantId || "") as string,
    tenant_id: (raw.tenant_id || raw.tenantId || "") as string,
    employeeId: (raw.employee_id || raw.employeeId || "") as string,
    employee_id: (raw.employee_id || raw.employeeId || "") as string,
    employeeName: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    employee_name: (raw.employee_name || raw.employeeName || "Staff Member") as string,
    requestDate: (raw.request_date || raw.requestDate || new Date().toISOString().slice(0, 10)) as string,
    request_date: (raw.request_date || raw.requestDate || new Date().toISOString().slice(0, 10)) as string,
    amount: Number(raw.amount ?? 0),
    reason: (raw.reason || "") as string,
    status: (raw.status || "PENDING") as SalaryAdvance["status"],
    approvedByAdmin: (raw.approved_by_admin || raw.approvedByAdmin) as string | undefined,
    approved_by_admin: (raw.approved_by_admin || raw.approvedByAdmin) as string | undefined,
    reviewedAt: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
    reviewed_at: (raw.reviewed_at || raw.reviewedAt) as string | undefined,
    payrollMonth: (raw.payroll_month || raw.payrollMonth || new Date().toISOString().slice(0, 7)) as string,
    payroll_month: (raw.payroll_month || raw.payrollMonth || new Date().toISOString().slice(0, 7)) as string,
  };
}

/**
 * 1. Generate monthly payroll run from live attendance and approved advances
 */
export async function generatePayrollRun(
  month: number,
  year: number,
  tenantId?: string
): Promise<MonthlyPayrollRun> {
  const payload: GeneratePayrollPayload = { month, year, tenant_id: tenantId };
  const response = await apiClient.post<Record<string, unknown>>("/payroll/generate", payload);
  return backendToFrontendPayrollRun(response);
}

/**
 * 2. Fetch all historical payroll runs
 */
export async function getPayrollRuns(tenantId?: string): Promise<MonthlyPayrollRun[]> {
  try {
    const response = await apiClient.get<Record<string, unknown>[]>("/payroll/runs", {
      params: tenantId ? { tenant_id: tenantId } : undefined,
    });
    if (Array.isArray(response)) {
      return response.map(backendToFrontendPayrollRun);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 3. Fetch specific payroll run detail with itemized employee ledger
 */
export async function getPayrollRunDetail(runId: string): Promise<MonthlyPayrollRun> {
  const response = await apiClient.get<Record<string, unknown>>(`/payroll/runs/${runId}`);
  return backendToFrontendPayrollRun(response);
}

/**
 * 4. Lock & approve a calculated payroll run
 */
export async function approvePayrollRun(runId: string): Promise<MonthlyPayrollRun> {
  const response = await apiClient.post<Record<string, unknown>>(`/payroll/runs/${runId}/approve`, {});
  return backendToFrontendPayrollRun(response);
}

/**
 * 5. Mark payroll run disbursed
 */
export async function disbursePayrollRun(
  runId: string,
  paymentReference?: string
): Promise<MonthlyPayrollRun> {
  const response = await apiClient.post<Record<string, unknown>>(`/payroll/runs/${runId}/disburse`, {
    payment_reference: paymentReference,
  });
  return backendToFrontendPayrollRun(response);
}

/**
 * 6. Get personal payslips for the authenticated staff member
 */
export async function getMyPayslips(employeeId?: string): Promise<PersonalPayslipRecord[]> {
  try {
    const response = await apiClient.get<Record<string, unknown>[]>("/payroll/my-payslips", {
      params: employeeId ? { employee_id: employeeId } : undefined,
    });
    if (Array.isArray(response)) {
      return response.map((item: Record<string, unknown>) => ({
        runId: (item.run_id || item.runId || "") as string,
        run_id: (item.run_id || item.runId || "") as string,
        tenantId: (item.tenant_id || item.tenantId || "") as string,
        tenant_id: (item.tenant_id || item.tenantId || "") as string,
        monthString: (item.month_string || item.monthString || "") as string,
        month_string: (item.month_string || item.monthString || "") as string,
        monthCode: (item.month_code || item.monthCode || "") as string,
        month_code: (item.month_code || item.monthCode || "") as string,
        payrollStatus: (item.payroll_status || item.payrollStatus || "DISBURSED") as PersonalPayslipRecord["payrollStatus"],
        payroll_status: (item.payroll_status || item.payrollStatus || "DISBURSED") as PersonalPayslipRecord["payrollStatus"],
        generatedAt: (item.generated_at || item.generatedAt || new Date().toISOString()) as string,
        generated_at: (item.generated_at || item.generatedAt || new Date().toISOString()) as string,
        approvedAt: (item.approved_at || item.approvedAt) as string | undefined,
        approved_at: (item.approved_at || item.approvedAt) as string | undefined,
        disbursedAt: (item.disbursed_at || item.disbursedAt) as string | undefined,
        disbursed_at: (item.disbursed_at || item.disbursedAt) as string | undefined,
        item: backendToFrontendPayrollItem((item.item || item) as Record<string, unknown>),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * 7. Request a personal salary advance
 */
export async function requestSalaryAdvance(
  payload: SalaryAdvanceRequestPayload
): Promise<SalaryAdvance> {
  const response = await apiClient.post<Record<string, unknown>>("/payroll/advances", {
    employee_id: payload.employeeId || payload.employee_id,
    amount: payload.amount,
    reason: payload.reason,
    payroll_month: payload.payrollMonth || payload.payroll_month,
  });
  return backendToFrontendSalaryAdvance(response);
}

/**
 * 8. Review (Approve/Reject) a pending salary advance
 */
export async function reviewSalaryAdvance(
  advanceId: string,
  status: "APPROVED" | "REJECTED"
): Promise<SalaryAdvance> {
  const response = await apiClient.patch<Record<string, unknown>>(`/payroll/advances/${advanceId}`, {
    status,
  });
  return backendToFrontendSalaryAdvance(response);
}

/**
 * 9. Fetch salary advance requests for a tenant/month
 */
export async function getSalaryAdvances(
  tenantId?: string,
  month?: string
): Promise<SalaryAdvance[]> {
  try {
    const response = await apiClient.get<Record<string, unknown>[]>("/payroll/advances", {
      params: {
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(month ? { payroll_month: month } : {}),
      },
    });
    if (Array.isArray(response)) {
      return response.map(backendToFrontendSalaryAdvance);
    }
    return [];
  } catch {
    return [];
  }
}

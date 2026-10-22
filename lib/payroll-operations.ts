import type {
  AttendanceRecord,
  EmployeePayrollItem,
  EmployeeProfile,
  MonthlyPayrollRun,
  SalaryAdvance,
} from '@/types/erp';

export const PAYROLL_STORAGE_PREFIX = 'tourflow_payroll_runs_';
export const SALARY_ADVANCE_STORAGE_PREFIX = 'tourflow_salary_advances_';
export const DEFAULT_WORKING_DAYS = 26;

export interface PayrollCalculationInput {
  tenantId: string;
  monthCode: string;
  employees: EmployeeProfile[];
  attendanceRecords: AttendanceRecord[];
  salaryAdvances: SalaryAdvance[];
  existingRun?: MonthlyPayrollRun;
  generatedAt?: string;
  createId?: () => string;
}

export function payrollMonthLabel(monthCode: string) {
  const [year, month] = monthCode.split('-').map(Number);
  if (!year || !month) return monthCode;
  return new Intl.DateTimeFormat('en-PK', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function calculatePayrollRun({
  tenantId,
  monthCode,
  employees,
  attendanceRecords,
  salaryAdvances,
  existingRun,
  generatedAt = new Date().toISOString(),
  createId = () => crypto.randomUUID(),
}: PayrollCalculationInput): MonthlyPayrollRun {
  if (existingRun && ['APPROVED', 'DISBURSED', 'LOCKED'].includes(existingRun.status)) {
    throw new Error('Approved or disbursed payroll cannot be recalculated.');
  }

  const items: EmployeePayrollItem[] = employees
    .filter((employee) => employee.tenantId === tenantId && ['ACTIVE', 'PROBATION'].includes(employee.status))
    .map((employee) => {
      const records = attendanceRecords.filter((record) =>
        record.tenantId === tenantId &&
        record.employeeId === employee.id &&
        record.attendanceDate.startsWith(monthCode));
      const grossPay = employee.basicSalary + employee.allowances;
      const dailyWage = grossPay / DEFAULT_WORKING_DAYS;
      const daysPresent = records.reduce((total, record) => {
        if (record.status === 'PRESENT' || record.status === 'LATE') return total + 1;
        if (record.status === 'HALF_DAY') return total + 0.5;
        return total;
      }, 0);
      const unexcusedAbsences = records.filter((record) => record.status === 'ABSENT').length;
      const unpaidLeaveDays = records.filter((record) => record.status === 'ON_LEAVE' && record.leaveType === 'UNPAID').length;
      const totalLateArrivals = records.filter((record) => record.status === 'LATE').length;
      const lateArrivalDeduction = Math.floor(totalLateArrivals / 3) * dailyWage;
      const unpaidLeaveDeduction = (unexcusedAbsences + unpaidLeaveDays) * dailyWage;
      const salaryAdvancesDeduction = salaryAdvances
        .filter((advance) =>
          advance.tenantId === tenantId &&
          advance.employeeId === employee.id &&
          advance.payrollMonth === monthCode &&
          advance.status === 'APPROVED')
        .reduce((sum, advance) => sum + advance.amount, 0);
      const previous = existingRun?.items.find((item) => item.employeeId === employee.id);
      const bonusesOrIncentives = previous?.bonusesOrIncentives ?? 0;
      const totalDeductions = lateArrivalDeduction + unpaidLeaveDeduction + salaryAdvancesDeduction;

      return {
        id: previous?.id || `payitem_${createId()}`,
        employeeId: employee.id,
        employeeCode: employee.employeeCode,
        employeeName: employee.fullName,
        department: employee.department,
        designation: employee.designation,
        basicSalary: employee.basicSalary,
        allowances: employee.allowances,
        grossPay,
        workingDaysInMonth: DEFAULT_WORKING_DAYS,
        daysPresent,
        unexcusedAbsences,
        totalLateArrivals,
        lateArrivalDeduction,
        unpaidLeaveDeduction,
        unpaidLeaveDays,
        salaryAdvancesDeduction,
        bonusesOrIncentives,
        netPayableSalary: Math.max(0, grossPay - totalDeductions + bonusesOrIncentives),
        paymentMethod: previous?.paymentMethod || 'BANK_TRANSFER',
        bankName: employee.bankName,
        bankAccountNumber: employee.bankAccountNumber,
        bankIban: employee.bankIban,
        paymentStatus: previous?.paymentStatus || 'UNPAID',
        paymentReference: previous?.paymentReference,
      };
    });

  return {
    id: existingRun?.id || `payroll_${monthCode}_${createId()}`,
    tenantId,
    monthString: payrollMonthLabel(monthCode),
    monthCode,
    totalGrossLiability: items.reduce((sum, item) => sum + item.grossPay, 0),
    totalDeductions: items.reduce((sum, item) => sum + item.lateArrivalDeduction + item.unpaidLeaveDeduction + item.salaryAdvancesDeduction, 0),
    totalNetDisbursement: items.reduce((sum, item) => sum + item.netPayableSalary, 0),
    status: 'CALCULATED',
    items,
    generatedAt,
  };
}

export function updatePayrollItem(
  run: MonthlyPayrollRun,
  employeeId: string,
  updates: Pick<EmployeePayrollItem, 'bonusesOrIncentives' | 'paymentMethod'>,
) {
  if (['APPROVED', 'DISBURSED', 'LOCKED'].includes(run.status)) {
    throw new Error('Approved or disbursed payroll items cannot be edited.');
  }
  const items = run.items.map((item) => {
    if (item.employeeId !== employeeId) return item;
    const deductions = item.lateArrivalDeduction + item.unpaidLeaveDeduction + item.salaryAdvancesDeduction;
    return {
      ...item,
      ...updates,
      netPayableSalary: Math.max(0, item.grossPay - deductions + updates.bonusesOrIncentives),
    };
  });
  return {
    ...run,
    items,
    totalNetDisbursement: items.reduce((sum, item) => sum + item.netPayableSalary, 0),
  };
}

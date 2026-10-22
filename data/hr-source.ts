import { WorkShift, EmployeeProfile } from "@/types/erp";
import { defaultScreenAccess } from "@/lib/screen-access";

const DEFAULT_EMPLOYEE_RUNTIME = {
  deviceStatus: "UNENROLLED" as const,
};

export const DEFAULT_SHIFTS: WorkShift[] = [
  {
    id: "shift-regular",
    name: "Regular Day Shift",
    startTime: "09:00",
    endTime: "18:00",
    gracePeriodMinutes: 15,
    workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  },
  {
    id: "shift-morning",
    name: "Ramadan / Morning Shift",
    startTime: "08:00",
    endTime: "14:30",
    gracePeriodMinutes: 15,
    workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  },
  {
    id: "shift-evening",
    name: "Airport & Operations Shift",
    startTime: "13:00",
    endTime: "21:30",
    gracePeriodMinutes: 15,
    workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
  },
];

export interface DepartmentRecord {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name: string;
  code?: string;
}

export interface DesignationRecord {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  department_id: string;
  departmentId?: string;
  title: string;
}

export const DEFAULT_DEPARTMENTS: DepartmentRecord[] = [
  { id: "dept-mgmt", tenantId: "tenant-world-class", name: "Management & Executive", code: "MANAGEMENT" },
  { id: "dept-ops", tenantId: "tenant-world-class", name: "Tour Operations", code: "OPERATIONS" },
  { id: "dept-sales", tenantId: "tenant-world-class", name: "Sales & Front Desk", code: "SALES_FRONT_DESK" },
  { id: "dept-visa", tenantId: "tenant-world-class", name: "Visa Consultancy", code: "VISA_CONSULTANCY" },
  { id: "dept-finance", tenantId: "tenant-world-class", name: "Finance & Accounts", code: "ACCOUNTS" },
];

export const DEFAULT_DESIGNATIONS: DesignationRecord[] = [
  { id: "desig-md", tenantId: "tenant-world-class", department_id: "dept-mgmt", title: "Managing Director & Principal" },
  { id: "desig-gm", tenantId: "tenant-world-class", department_id: "dept-mgmt", title: "General Manager" },
  { id: "desig-ops-lead", tenantId: "tenant-world-class", department_id: "dept-ops", title: "Tour Operations & Group Departures Lead" },
  { id: "desig-tour-mgr", tenantId: "tenant-world-class", department_id: "dept-ops", title: "Senior Tour Manager" },
  { id: "desig-sales-spec", tenantId: "tenant-world-class", department_id: "dept-sales", title: "Senior Inbound & Bookings Specialist" },
  { id: "desig-front-desk", tenantId: "tenant-world-class", department_id: "dept-sales", title: "Front Desk Officer" },
  { id: "desig-visa-lead", tenantId: "tenant-world-class", department_id: "dept-visa", title: "Senior Visa & Embassy Case Officer" },
  { id: "desig-visa-doc", tenantId: "tenant-world-class", department_id: "dept-visa", title: "Visa Documentation Specialist" },
  { id: "desig-acc-spec", tenantId: "tenant-world-class", department_id: "dept-finance", title: "Accounts & Payables Specialist" },
  { id: "desig-fin-mgr", tenantId: "tenant-world-class", department_id: "dept-finance", title: "Finance Manager" },
];

export const DEFAULT_EMPLOYEE_PROFILES: EmployeeProfile[] = [
  {
    ...DEFAULT_EMPLOYEE_RUNTIME,
    screenAccess: defaultScreenAccess("AGENCY_ADMIN"),
    id: "emp-001",
    tenantId: "tenant-world-class",
    employeeCode: "WCH-EMP-001",
    userId: "usr-wch-admin",
    fullName: "Nadeem Akhtar",
    email: "admin@worldclass.com",
    phone: "+92 300 8400000",
    cnicNumber: "35201-1234567-1",
    department: "MANAGEMENT",
    designation: "Managing Director & Principal",
    status: "ACTIVE",
    joiningDate: "2024-01-15",
    shiftId: "shift-regular",
    shiftName: "Regular Day Shift",
    basicSalary: 250000,
    allowances: 50000,
    bankName: "Meezan Bank Ltd",
    bankAccountNumber: "01020304050607",
    bankIban: "PK36MEZN0001020304050607",
    annualLeaveAllowance: 20,
    sickLeaveAllowance: 10,
    leavesTaken: 3,
  },
  {
    ...DEFAULT_EMPLOYEE_RUNTIME,
    screenAccess: defaultScreenAccess("FRONT_DESK"),
    id: "emp-002",
    tenantId: "tenant-world-class",
    employeeCode: "WCH-EMP-002",
    userId: "usr-wch-reception",
    fullName: "Fatima Noor",
    email: "reception@worldclass.com",
    phone: "+92 321 4455667",
    cnicNumber: "35202-7654321-2",
    department: "SALES_FRONT_DESK",
    designation: "Senior Inbound & Bookings Specialist",
    status: "ACTIVE",
    joiningDate: "2024-06-01",
    shiftId: "shift-regular",
    shiftName: "Regular Day Shift",
    basicSalary: 85000,
    allowances: 15000,
    bankName: "Habib Bank Limited (HBL)",
    bankAccountNumber: "22334455667788",
    bankIban: "PK12HABB0022334455667788",
    annualLeaveAllowance: 14,
    sickLeaveAllowance: 8,
    leavesTaken: 2,
  },
  {
    ...DEFAULT_EMPLOYEE_RUNTIME,
    screenAccess: defaultScreenAccess("TOUR_MANAGER"),
    id: "emp-003",
    tenantId: "tenant-world-class",
    employeeCode: "WCH-EMP-003",
    userId: "usr-wch-tours",
    fullName: "Shahbaz Ahmed",
    email: "tours@worldclass.com",
    phone: "+92 301 9988776",
    cnicNumber: "35201-9876543-3",
    department: "OPERATIONS",
    designation: "Tour Operations & Group Departures Lead",
    status: "ACTIVE",
    joiningDate: "2024-03-10",
    shiftId: "shift-regular",
    shiftName: "Regular Day Shift",
    basicSalary: 110000,
    allowances: 20000,
    bankName: "Standard Chartered Bank",
    bankAccountNumber: "33445566778899",
    bankIban: "PK90SCBL0033445566778899",
    annualLeaveAllowance: 14,
    sickLeaveAllowance: 8,
    leavesTaken: 4,
  },
  {
    ...DEFAULT_EMPLOYEE_RUNTIME,
    screenAccess: defaultScreenAccess("VISA_CONSULTANT"),
    id: "emp-004",
    tenantId: "tenant-world-class",
    employeeCode: "WCH-EMP-004",
    userId: "usr-wch-visa",
    fullName: "Bilal Rasheed",
    email: "visa@worldclass.com",
    phone: "+92 333 1122334",
    cnicNumber: "35201-5544332-5",
    department: "VISA_CONSULTANCY",
    designation: "Senior Visa & Embassy Case Officer",
    status: "ACTIVE",
    joiningDate: "2024-04-01",
    shiftId: "shift-regular",
    shiftName: "Regular Day Shift",
    basicSalary: 95000,
    allowances: 15000,
    bankName: "MCB Bank Ltd",
    bankAccountNumber: "44556677889900",
    bankIban: "PK45MUCB0044556677889900",
    annualLeaveAllowance: 14,
    sickLeaveAllowance: 8,
    leavesTaken: 1,
  },
  {
    ...DEFAULT_EMPLOYEE_RUNTIME,
    screenAccess: defaultScreenAccess("FRONT_DESK"),
    id: "emp-005",
    tenantId: "tenant-world-class",
    employeeCode: "WCH-EMP-005",
    userId: "staff-front-02",
    fullName: "Zubair Ahmed",
    email: "zubair@worldclass.tourflow.io",
    phone: "+92 333 7891234",
    cnicNumber: "35201-3322110-7",
    department: "ACCOUNTS",
    designation: "Accounts & Payables Specialist",
    status: "ACTIVE",
    joiningDate: "2024-08-01",
    shiftId: "shift-regular",
    shiftName: "Regular Day Shift",
    basicSalary: 75000,
    allowances: 10000,
    bankName: "Faysal Bank Ltd",
    bankAccountNumber: "55667788990011",
    bankIban: "PK78FAYS0055667788990011",
    annualLeaveAllowance: 14,
    sickLeaveAllowance: 8,
    leavesTaken: 0,
  },
];

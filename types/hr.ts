import type {
  EmploymentStatus,
  ScreenAccessLevel,
  ScreenAccessRules,
  Designation,
  Shift,
  WorkShift,
  EmployeeProfile,
  DepartmentItem,
} from "./erp";

export type {
  EmploymentStatus,
  ScreenAccessLevel,
  ScreenAccessRules,
  Designation,
  Shift,
  WorkShift,
  EmployeeProfile,
  DepartmentItem,
};

export interface Department {
  id: string;
  tenant_id?: string;
  tenantId?: string;
  name: string;
  code?: string;
  description?: string;
}

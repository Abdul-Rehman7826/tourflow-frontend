# TourFlow ERP Implementation Progress and Agent Handoff

## Document Purpose

This file is the implementation handoff for the TourFlow ERP prototype for
**World Class Holidays**. It reconstructs the work completed from Step 1 through
Step 19.2, explains how the modules connect, and identifies the exact branch state
that a new AI agent must understand before making changes.

The document describes repository evidence as of **2026-09-16**. It deliberately
distinguishes between:

- functionality present on the current branch;
- functionality completed on a sibling feature branch but not integrated here;
- prototype behavior that is browser-local and still requires production backend work.

## Current Repository Snapshot
### Shared attendance kiosk update (2026-10-04)

- The PHP attendance backend supports multiple named, revocable shared terminals with hashed terminal credentials.
- Employees punch from `/attendance/kiosk` using their employee code and existing four-digit Quick PIN; the backend selects check-in or check-out using Asia/Karachi server time.
- Failed kiosk PIN attempts are isolated by terminal and employee; five failures create a ten-minute lock and an audit event.
- Agency Admins manage terminals and view the immutable attendance audit log. Agency Admins and HR Managers may create or correct tenant-scoped attendance with a mandatory reason.
- Attendance records carry hardware-neutral sources for kiosk PIN, QR, manual entry, RFID, NFC, and future fingerprint integrations. The frontend now uses the shared kiosk only; retired QR URLs redirect to `/attendance/kiosk`, while the legacy PHP QR routes remain dormant for a future migration decision.
- Deployment requires migration `004_attendance_kiosk.sql` before the kiosk APIs are used.

### PHP leave management update (2026-10-04)

- The PHP API now provides an HR-managed, tenant-scoped Leave Register. Employees
  can read only their own history and balance through `/api/v1/leave/history` and
  `/api/v1/leave/balances`; employee request and cancellation routes return `403`.
- HR Managers and Agency Admins can record leave immediately as `APPROVED` through
  `/api/v1/leave/records`, void an approved record with a mandatory reason, manage
  allowances, and resolve pre-existing pending requests once through the legacy route.
- Recorded leave, legacy decisions, voids, and entitlement changes are retained in
  immutable `leave_audit_logs` records. Voiding never rewrites finalized attendance.
- Daily attendance finalization creates an `ON_LEAVE` record for approved leave
  when there is no employee punch, rather than marking the employee absent.
- Migration `005_leave_management.sql` remains required only if it has not already
  been deployed; the HR-managed policy change needs no additional migration.

### Employee portal navigation and theming update (2026-10-04)

- Payslips and Leave now show a clear active tab in the employee portal header.
- Employee self-service primary actions, focus states, and identity accents use
  the configured agency theme instead of fixed green or purple branding.
- The employee-facing bound-phone/device pill was removed from the payslip profile
  card; device state remains available to attendance and administrator workflows.

### Current authentication update (2026-10-02)
### Current agency theming update (2026-10-02)

- The configured agency accent now drives legacy TourFlow teal brand utilities across operational screens, including action buttons, focus rings, hover states, soft accent surfaces, borders, and shadows.
- The header logo reads the same agency action token.
- Primary action colors are darkened automatically when needed so required white button text remains readable.
- Error, warning, and success colors remain semantic and are not repurposed as agency branding.

- Agency email/password authentication now establishes a tenant-scoped terminal session only and routes to `/profiles`.
- Selecting any agency profile, including the Agency Owner, and validating its four-digit PIN is required before a profile-scoped workspace token is issued.
- `SUPER_ADMIN` remains outside the agency terminal and continues directly to `/super-admin/tenants`.
- Completing the forced password reset follows the same terminal-to-profile flow, so it cannot bypass the profile PIN gate.

- Project root: `D:\Projects\travel-erp-app`
- Framework: Next.js `16.3.4`, React `19.2.8`, TypeScript, Tailwind CSS 4
- Current branch: `feature/step-19.1-attendance-finalizer`
- Current branch head: `e9c5a43`
- Current worktree milestone: Step 19.2 HR executive command dashboard
- Full Step 19 leave branch: `feature/step-19-leave-management-engine`
- Full Step 19 leave commit: `a7edde5`
- Operational state: browser `localStorage`; there is no production database or API

### Critical Branch Integration Note

Step 19 and Step 19.1 were completed on sibling branches from the Step 18 base.
The current Step 19.1 branch contains leave contracts/storage only where needed by
attendance finalization, but it does **not** contain the complete leave request and
approval pages.

Step 19.2 is implemented in the current Step 19.1 worktree and reads the leave
contracts/storage already exposed by `DataContext`. Integrate commit `a7edde5`
with `e9c5a43` carefully before treating the leave KPI and approval link as a
complete end-to-end flow. Both commits edit `types/erp.ts`, `context/DataContext.tsx`,
attendance, and leave storage behavior. Do not blindly overwrite either implementation.

## Agent Operating Rules

1. Read the root `AGENTS.md` before editing.
2. Treat the content between the `nextjs-agent-rules` markers in `AGENTS.md` as
   Next.js-managed content. Keep project-specific rules outside those markers.
3. Keep `CLAUDE.md` as the `@AGENTS.md` bridge for Claude Code so all coding
   agents receive the same repository guidance without duplicated rule sets.
4. Read the relevant installed Next.js guide under `node_modules/next/dist/docs/`.
5. Use `npm.cmd` and `npx.cmd` in PowerShell when script execution policy blocks
   `npm.ps1`.
6. Preserve tenant filtering and role checks in both UI and state mutations.
7. Do not treat client-side role guards or `localStorage` as production security.
8. Do not replace the unified ERP snapshot with disconnected component state.
9. Run focused tests, TypeScript, source lint, and `npm.cmd run build` after changes.

## Architecture Overview

### Provider Hierarchy

`app/layout.tsx` mounts the shared providers in this order:

1. `TenantProvider`
2. `RoleProvider`
3. `AuthProvider`
4. `DataProvider`
5. `ThemeProvider`
6. `AgencyThemeProvider`

The application is a multi-tenant front-end prototype. `DataContext` is the
central mutation boundary for CRM, bookings, payments, tours, visa operations,
HR, attendance, payroll, and employee self-service projections.

### Roles

- `SUPER_ADMIN`: platform tenant/subscription administration only.
- `AGENCY_ADMIN`: full World Class Holidays operational and financial access.
- `HR_MANAGER`: attendance, payroll, and HR-related administrative access.
- `FRONT_DESK`: leads, clients, draft booking work, and restricted payment proof flows.
- `TOUR_MANAGER`: group tour operations without financial administration.
- `VISA_CONSULTANT`: visa pipeline and document operations.

### Main Routes

| Route | Purpose | Primary access |
| --- | --- | --- |
| `/login` | Demo authentication and suspended-tenant blocking | Public |
| `/super-admin/tenants` | Tenant KPIs and subscription controls | Super Admin |
| `/dashboard` | Agency executive dashboard | Agency Admin |
| `/leads` | Lead queues, intake, conversion, recovery calls | Admin, Front Desk |
| `/clients` | Permanent CRM clients | Admin, Front Desk, Visa Consultant |
| `/draft-bookings` | Draft quotations/bookings | Admin, Front Desk, Tour Manager |
| `/tours` | Tour package catalog and CRUD | Admin, Tour Manager |
| `/tours/[id]` | Manifest, rooming, itinerary, flights, financials | Role-filtered |
| `/visa-pipeline` | Five-stage visa case pipeline and custody vault | Admin, Front Desk, Visa Consultant |
| `/invoices` | Receivables, proof verification, invoice register | Agency Admin |
| `/invoices/[id]` | Invoice, milestones, payments, cancellation | Role-filtered operations |
| `/attendance` | Daily attendance and reconciliation | Admin, HR Manager |
| `/hr-dashboard` | Workforce telemetry, HR audit feed, compliance exports | Admin, HR Manager |
| `/attendance/kiosk` | Shared Employee ID + Quick PIN attendance terminal | Public terminal flow |
| `/attendance/scan` and `/attendance/success` | Legacy URLs redirect to the shared kiosk | Public redirect |
| `/payroll` | Monthly payroll runs and payslips | Admin, HR Manager |
| `/payslips` | Employee self-service compensation portal | Authenticated employee |
| `/settings/staff` | Employee profiles, credentials, permissions, devices | Agency Admin |
| `/settings` | Agency branding, invoice, notification, security settings | Agency Admin |

## End-to-End Business Flow

The operational lifecycle is:

`Lead -> Client -> Booking -> Invoice -> Payment or Payment Proof -> Operational Allocation`

For group tours, confirmation reserves seats and creates traveler slots. Completing
a traveler slot updates the manifest without increasing booked seats again. For visa
services, confirmation creates a visa case. Repeat bookings reuse the existing client.

The people lifecycle is:

`Employee Profile -> Login and Screen Access -> Device Enrollment -> Attendance -> Payroll -> Personal Payslip`

The Step 19 leave branch extends this to:

`Leave Request -> Admin/HR Approval -> ON_LEAVE Attendance -> Payroll Protection`

## Step-by-Step Progress

## Step 1: Authentication, Tenancy, and Role-Based Access

**Status:** Implemented on the current branch.

Delivered:

- Demo login accounts and tenant-aware authentication.
- Role-specific post-login routing.
- Super Admin redirection to `/super-admin/tenants`.
- Agency Admin redirection to `/dashboard`.
- Staff redirection to the personal portal where applicable.
- Suspended agency authentication blocking with a clear subscription message.
- Dashboard and Super Admin layout guards.
- Sidebar filtering by role and granular `ScreenAccessRules`.
- Manual URL access protection for restricted dashboard routes.
- Tenant isolation in context selectors and mutation handlers.

Primary files:

- `context/AuthContext.tsx`
- `context/TenantContext.tsx`
- `context/RoleContext.tsx`
- `app/login/page.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(super-admin)/layout.tsx`
- `components/layout/Sidebar.tsx`
- `lib/screen-access.ts`

Known production boundary: authentication is simulated in browser storage. Replace
it with server sessions and server-side authorization before production use.

## Step 2: Core Operational Data Flow Foundation

**Status:** Implemented and expanded by later steps.

Delivered:

- Tenant-scoped leads, tours, visa cases, invoices, passengers, expenses, clients,
  bookings, payment proofs, and recovery call data.
- Lead interaction notes and callback tracking.
- Tour occupancy, passenger records, passport expiry indicators, and invoice payments.
- Centralized mutations through `DataContext` rather than page-local copies.
- Operational mock data for World Class Holidays.
- Cross-module references between leads, clients, bookings, invoices, passengers,
  tours, and visa cases.

Primary files:

- `context/DataContext.tsx`
- `types/erp.ts`
- `data/mockData.ts`
- `data/operational-source.ts`
- `lib/mock-data.ts`

## Step 3: Dual Theme and Responsive Application Shell

**Status:** Implemented.

Delivered:

- Dark background `#030712` and light background `#FFFFFF`/light gray surfaces.
- Shared card background `#0B0F19` in dark mode.
- Purple accent token with agency-configurable CSS variables.
- Theme toggle and persistent theme provider.
- Responsive sidebar/mobile navigation.
- Responsive tables, mobile card fallbacks, drawers, and modal viewport constraints.
- Global contrast hardening for green, emerald, and teal solid buttons.
- WebKit scrollbar styling without relying on unsupported `scrollbar-width`.
- Local font stacks, avoiding runtime Google Font download failures.

Primary files:

- `app/globals.css`
- `app/settings.css`
- `components/theme/ThemeProvider.tsx`
- `components/theme/ThemeToggle.tsx`
- `components/layout/Sidebar.tsx`
- `components/layout/MobileNavigation.tsx`
- `components/layout/TopNavbar.tsx`

## Step 4: Multi-Tenant Dashboard Shell

**Status:** Reconstructed foundation milestone; no standalone Step 4 specification
is retained in the repository.

Repository evidence shows this stage established:

- the agency dashboard shell;
- platform-versus-agency layout separation;
- tenant branding in navigation;
- executive KPI surfaces;
- module placeholders that later became real operational pages.

Relevant foundation commit: `caed9b5`.

## Step 5: Initial Tour, Visa, and Invoice Module Surfaces

**Status:** Reconstructed foundation milestone; later superseded by Steps 11-14.

Repository evidence shows the first tour management system, DataContext-backed
module pages, and core UI components were introduced here. These initial surfaces
were subsequently upgraded into transactional booking, operations, visa, and
receivables engines.

Relevant foundation commit: `d711680`.

## Step 6: Agency-Wide Formatting and Currency Simplification

**Status:** Implemented as a stabilization milestone.

Delivered:

- Currency output standardized for the World Class Holidays PKR workflow.
- No user-facing multi-currency selector is required in operational workflows.
- Shared formatting is controlled by agency settings/helpers instead of ad hoc page code.
- Existing persisted display text is sanitized where legacy currency artifacts exist.

Relevant commit: `bf98a6f`.

## Step 7: Theme Accessibility and Hydration Stabilization

**Status:** Implemented as a stabilization milestone.

Delivered:

- Accessible theme toggle behavior.
- Improved theme hydration handling.
- Login email hydration warning mitigation.
- Agency theme provider for branding propagation.

Relevant commits: `84290bd`, `736ec67`, and `f967dd8`.

## Step 8: Cross-Browser CSS and Pre-Step-9 Hardening

**Status:** Implemented as a stabilization milestone.

Delivered:

- Removed the incompatible `scrollbar-width` dependency.
- Corrected print color adjustment prefix ordering.
- Preserved browser-specific thin scrollbar styling.
- Reduced avoidable hydration and local font warnings.

Relevant commit: `bbd88a6`.

## Step 9: Agency Settings and Invoice Theme Controls

**Status:** Implemented.

Delivered:

- Agency identity and logo configuration.
- Accent color and visual theme settings.
- Invoice appearance and payment instruction settings.
- Notification/reminder configuration.
- Security/settings workspace tabs.
- Contrast-aware accent foreground calculations.
- Agency settings persistence by tenant.
- Print-specific invoice styling and payment reminder helpers.
- Passport alert helper shared with travel operations.

Primary files:

- `app/(dashboard)/settings/page.tsx`
- `components/settings/SettingsWorkspace.tsx`
- `components/settings/AgencyLogo.tsx`
- `context/ThemeContext.tsx`
- `lib/agency-settings.ts`
- `app/settings.css`

Product decision: the operational product remains PKR-focused and does not expose
a multi-currency selector throughout the application.

## Step 10: Complete Leads Module Upgrade

**Status:** Implemented.

Delivered:

- Admin-only `All Inquiries`, `Bulk CSV Importer`, and `Duplicate Queue` tabs.
- Front Desk role hides importer and duplicate administration.
- Four operational call queues: Unassigned, Active Sales, Payment Recovery, Archive.
- Multi-select rows, select-all behavior, and floating bulk action dock.
- Bulk representative, interest, and status mutations.
- WhatsApp and click-to-call actions.
- Overdue and due-today callback indicators.
- Lead interaction drawer with notes and follow-up dates.
- Lost reason dialog and optional notes.
- CSV parsing, preview, round-robin distribution, and unassigned import.
- Duplicate phone detection with merge, force-create, and discard actions.
- One-click demo lead reset.
- Conversion entry point into the Step 11 booking engine.

Primary files:

- `app/(dashboard)/leads/page.tsx`
- `components/leads/LeadImportWorkspace.tsx`
- `components/leads/DuplicateQueue.tsx`
- `components/leads/LeadInteractionDrawer.tsx`
- `components/leads/LostReasonDialog.tsx`
- `components/leads/ConvertLeadModal.tsx`
- `lib/lead-operations.ts`

## Step 11: Booking, Milestone Invoicing, and Passenger Allocation

**Status:** Implemented.

Contract compatibility update: `BookingStatus` also accepts the SRS-facing
`DRAFT_QUOTATION` value while retaining persisted `DRAFT` quotations;
booking, milestone, and manifest contracts expose the requested API aliases
without breaking existing local snapshots.

Delivered:

- Strict `Booking`, `InstallmentMilestone`, `TravelerManifestItem`, and refund types.
- Draft quotation flow that does not convert the lead or reserve seats.
- Atomic confirmation flow that:
  - creates or reuses a permanent client;
  - converts the source lead;
  - creates a numbered booking;
  - reserves tour seats;
  - creates traveler slots or visa allocation;
  - generates an invoice and milestones;
  - records an optional token payment.
- Two-column conversion modal with live totals, seat availability, deposit capture,
  payment method, reference, and milestone schedule.
- Booking numbers in `WCH-BK-XXXXXX` format.
- Repeat-client booking support without duplicate client creation.
- Global booking wizard opened from the top navigation using a React portal.
- Existing-client booking with service configuration and seat validation.
- Admin-only cancellation with retention fee, full/partial refund audit, receivable
  waiver, operational de-allocation, and seat release.
- Traveler updates do not double-count reserved seats.

Primary files:

- `lib/booking-operations.ts`
- `components/leads/ConvertLeadModal.tsx`
- `components/bookings/GlobalBookingModal.tsx`
- `components/invoices/BookingCancellation.tsx`
- `context/DataContext.tsx`
- `docs/booking-engine.md`

Persistence note: the unified ERP snapshot is written before publishing React
state, but this is not a database transaction or multi-user lock.

## Step 12: Group Tour Operations and Booking Extensions

**Status:** Implemented, including Steps 12.1 through 12.6.

### Step 12.1: Tour Package Catalog CRUD

- Admin-only create, edit, duplicate, and delete/archive controls.
- Delete is allowed only when no seats are booked.
- Destination country tags and codes.
- Capacity, pricing, supplier cost, margin estimate, airline, PNR, inclusions,
  duration, and departure status fields.
- Updates preserve booked seats and linked operations.

### Step 12.2: Manifest, Rooming, and Traveler Intake

- Five compact operations tabs: Manifest, Rooming, Itinerary, Flights, Financials.
- Financials visible only to Agency Admin.
- Passenger editor and right-side traveler intake drawer.
- Confirmed-booking slot intake, CRM client intake, and manual intake paths.
- Passport six-month validity warning.
- Traveler removal releases the corresponding seat where required.
- Room allocation/unassignment without changing booked seat authority.
- Room capacity enforcement and occupancy states.

### Step 12.3: Repeat Client and Global Re-Booking

- Existing clients can have multiple bookings.
- Global client search wizard from the top navbar.
- Group tour, visa, and custom/Umrah configuration.
- Front Desk pricing restrictions and payment-proof path.

### Step 12.4: Call Center Queues & Inbound Lead Lifecycle

- Leads page restructured into four operational queues:
  - `UNASSIGNED`: Inbound pool with 1-click self-allocation and rep delegation.
  - `ACTIVE_SALES`: Active sales inquiries with overdue/due-today/upcoming callback alert badges, direct WhatsApp/phone actions, and conversion launcher.
  - `PAYMENT_RECOVERY`: Overdue invoices, aging calculations, recovery logging, and payment verification links.
  - `ARCHIVE`: Converted bookings (with revenue and booking refs) and Lost inquiries (with loss reason badges and re-open action).
- 480px width slide-over contextual touchpoint drawer (`<LeadInteractionDrawer />`) with chronological timeline and callback scheduler.
- Floating multi-select bulk action dock (`<BulkActionDock />`) for bulk assignment, stage change, and loss marking.
- Fixed table layouts (`w-full table-fixed`) without desktop horizontal scrollbars.

### Step 12.5: Payment Proof and Recovery Logs

- Front Desk submits image proof and bank transaction reference via `<SubmitPaymentProofModal />`.
- Proof uploads support PNG, JPEG, and WebP images up to 2 MB with live thumbnail previews.
- Claims enter the Admin Verification Desk with status `PENDING_VERIFICATION` without premature ledger settlement.
- Recovery call logs with outcomes (`PROMISED_PAYMENT`, `SENT_WHATSAPP_DETAILS`, `LEFT_VOICEMAIL`, `UNREACHABLE`, `DISPUTED_AMOUNT`) and callback dates are managed via `<RecoveryCallLogModal />`.
- Front Desk Privacy Shield: Front desk staff have access only to `[Log Call / History]` and `[+ Submit Payment Proof]` without direct ledger tampering.

### Step 12.6: Admin Payment Verification Modal & Milestone Settlement (<VerifyPaymentModal />)

- **Status:** Implemented (Backend schemas + Frontend review workspace).
- Component `<VerifyPaymentModal />` located at `components/invoices/VerifyPaymentModal.tsx`:
  - 2-Column Evidence Grid: Column 1 displays large PKR transferred amount (`font-mono font-black text-2xl text-emerald-600`), destination bank, IBM Plex Mono reference badge with 1-click clipboard copy, and Front Desk intake notes callout; Column 2 displays high-fidelity slip screenshot viewer with modal lightbox enlargement.
  - FIFO Milestone Impact Preview: Dynamically computes remaining balance and demonstrates sequential milestone clearance (`PAID`) before admin confirmation.
  - Rejection Reason Workflow: Animated expansion with quick-chips ("Reference not found in bank statement", "Transferred amount mismatch", "Illegible receipt screenshot", "Duplicate submission") and mandatory justification input.
  - Role Guard & Security: Verification controls, `[✓ Approve & Settle Cash]` (`bg-emerald-600`), and `[✕ Reject Proof]` (`bg-rose-600`) restricted exclusively to `AGENCY_ADMIN` / `SUPER_ADMIN` with Front-Desk Privacy Shield warning banner for non-admin viewers.
- Seamless Integration:
  - `<PaymentRecoveryQueueTable />`: Displays the amber `[⚖️ Verify Payment]` button (`bg-amber-600 hover:bg-amber-500 text-white font-medium`) for pending claims when accessed by an agency admin.
  - `/app/(dashboard)/leads/page.tsx`: Wires `selectedClaimIdForVerify` state, table callback, and modal launcher.
  - `/app/(dashboard)/invoices/[id]/page.tsx`: Connects the Two-Step Financial Clearance Gate banner and `[Review & Verify Slip]` trigger directly to `<VerifyPaymentModal />` with toast notifications.
- Pydantic v2 Schemas: `app/schemas/payment_proof.py` delivers backend contracts for proof intake, FIFO milestone settlement, and call logs.

Primary files:

- `components/leads/SubmitPaymentProofModal.tsx`
- `components/leads/RecoveryCallLogModal.tsx`
- `components/leads/PaymentRecoveryQueueTable.tsx`
- `app/(dashboard)/leads/page.tsx`
- `components/leads/LeadQueueTabBar.tsx`
- `components/leads/UnassignedQueueTable.tsx`
- `components/leads/ActiveSalesQueueTable.tsx`
- `components/leads/ArchivedDealsTable.tsx`
- `components/leads/BulkActionDock.tsx`
- `components/leads/LeadInteractionDrawer.tsx`
- `components/leads/LostReasonDialog.tsx`
- `lib/leads-api.ts`
- `app/(dashboard)/tours/page.tsx`
- `app/(dashboard)/tours/[id]/page.tsx`
- `components/tours/TourOperationsWorkspace.tsx`
- `components/tours/TourDrawer.tsx`
- `lib/tour-operations.ts`
- `components/navigation/Header.tsx`
- `components/bookings/GlobalBookingModal.tsx`
- `components/bookings/ClientPickerSection.tsx`
- `components/bookings/ServiceSelector.tsx`
- `components/bookings/MilestonePreview.tsx`
- `lib/bookings-api.ts`
- `components/invoices/PaymentRecoveryActions.tsx`
- `components/invoices/VerifyPaymentModal.tsx`
- `lib/payment-recovery.ts`

## Step 13: Visa Consultancy Pipeline and Passport Custody Vault

**Status:** Implemented.

Delivered:

- Five active stages:
  - `DOCUMENTS_PENDING`
  - `APPOINTMENT_BOOKED`
  - `SUBMITTED_TO_EMBASSY`
  - `DECISION_RECEIVED`
  - `DELIVERED`
- Kanban board and case operations modal.
- Standalone consultancy case creation.
- Automatic group-tour visa bridge for named travelers on confirmed bookings.
- Tour/departure filters and active/archive views.
- Document checklist with separate received and verified states.
- Passport physical custody locations and immutable transfer history.
- Locker reference requirement for office safe custody.
- Courier reference requirement for dispatched passports.
- Delivered cases automatically archive while preserving custody history.
- Legacy stage normalization and migration.

Primary files:

- `app/(dashboard)/visa-pipeline/page.tsx`
- `components/visa/VisaCaseCard.tsx`
- `components/visa/VisaOperationsModal.tsx`
- `components/visa/DocumentChecklistDrawer.tsx`
- `lib/visa-operations.ts`
- `docs/visa-operations.md`

## Step 14: Invoice, Receivables, and Payment Verification Engine

**Status:** Implemented.

Delivered:

- Invoice register and invoice detail page.
- Initial token, intermediate milestone, and final balance schedules.
- `UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, and `CANCELLED` states.
- Accounts receivable aging and overdue prioritization.
- Admin direct payment recording.
- Front Desk proof-of-payment submission without immediate settlement.
- Admin proof verification/rejection and receipt creation.
- Booking, invoice, milestone, traveler payment badge, and client spend synchronization.
- Printable invoice document.
- Booking cancellation and refund audit rendering.

Primary files:

- `app/(dashboard)/invoices/page.tsx`
- `app/(dashboard)/invoices/[id]/page.tsx`
- `components/invoices/InvoiceDocument.tsx`
- `components/invoices/VerifyPaymentModal.tsx`
- `components/invoices/PaymentRecoveryActions.tsx`
- `lib/payment-recovery.ts`
- `lib/booking-operations.ts`

## Step 15: HR Core and Staff Directory

**Status:** Implemented (FastAPI `/api/v1/hr` connected, 3-Stage Intake Drawer & Shift Engine).

Delivered:

- Employee, department, shift, compensation, bank, leave entitlement, device,
  avatar, and screen-access contracts in `types/erp.ts` and `types/hr.ts`.
- Integrated `lib/hr-api.ts` API client connecting to FastAPI `/api/v1/hr` (`fetchDepartments`, `fetchDesignations`, `fetchShifts`, `createShift`, `fetchEmployees`, `createEmployee`, `updateEmployee`, `toggleEmployeeStatus`).
- Top 4-card metric ribbon: Total Headcount, Active Staff, Department Coverage, Authoritative Shift schedule.
- Search and filter toolbar by text query, department dropdown, and employment status.
- Three-stage slide-over intake drawer (`<EmployeeProfileDrawer />`):
  1. Bio & Identity (Legal name, official email, phone, CNIC, joining date, department, designation, and avatar upload).
  2. Shift, Bank & Compensation (Shift assignment, basic salary PKR, allowances, bank account & IBAN, leave pools).
  3. System Credentials & Granular Access Matrix (`NONE`, `READ`, `FULL` for Leads, Bookings, Clients, Tours, Visa Pipeline, Invoices, HR).
- Operational Shift Engine modal (`<ShiftConfigModal />`) allowing custom shift definitions (start/end times, 15m grace limit, 240m half-day threshold, active status).
- Front-Desk Privacy Shield (SRS §1.3, FR-HR-004): Compensation and bank account details masked (`••••••••`) for `FRONT_DESK` / `TOUR_MANAGER` roles.
- Hardware Device Vault & QR Enrollment modal (`<DeviceManagementModal />`).
- Fixed-layout staff directory table (`w-full table-fixed`) with zero desktop horizontal overflow.

Primary files:

- `app/(dashboard)/settings/staff/page.tsx`
- `components/staff/EmployeeProfileDrawer.tsx`
- `components/staff/ShiftConfigModal.tsx`
- `components/staff/DeviceManagementModal.tsx`
- `lib/hr-api.ts`
- `types/hr.ts`
- `types/erp.ts`
- `data/hr-source.ts`
- `context/DataContext.tsx`

## Step 16: Attendance, Device Enrollment, and Mobile Scanner

**Status:** Implemented, including Steps 16.2 and 16.3.

Delivered:

- Daily attendance dashboard with Present, Late, Absent, and On Leave KPIs.
- Employee shift and 15-minute grace calculations.
- Rotating 30-second office QR display.
- Device-bound attendance registration.
- First scan checks in; second scan checks out; third scan is rejected.
- Device mismatch, revoked device, invalid QR, and completed-cycle errors.
- Admin/HR correction drawer requiring an audit reason.
- Device vault with revocation and one-time 15-minute re-enrollment QR.
- Mobile scanner terminal and confetti success screen.
- Cross-tab attendance/device synchronization.

Primary files:

- `app/(dashboard)/attendance/page.tsx`
- `app/attendance/scan/page.tsx`
- `app/attendance/success/page.tsx`
- `lib/attendance-operations.ts`
- `components/staff/DeviceManagementModal.tsx`

## Step 17: Monthly Payroll and Payslip Vault

**Status:** Implemented.

Delivered:

- Monthly payroll run generation for active employees.
- Gross salary from basic salary plus allowances.
- Attendance aggregation.
- Every three late arrivals deduct one gross daily wage.
- Absence/unpaid deduction handling.
- Approved salary advance deductions.
- Incentive and payment method adjustments while the run is editable.
- Payroll lifecycle: Calculated, Approved, Disbursed/Locked.
- Disbursement reference capture.
- Printable employee payslip drawer.
- Salary advance queue with Admin/HR review.

Primary files:

- `app/(dashboard)/payroll/page.tsx`
- `components/payroll/PayslipDrawer.tsx`
- `lib/payroll-operations.ts`
- `context/DataContext.tsx`

## Step 18: Employee Self-Service Portal

**Status:** Implemented.

Delivered:

- Personal `/payslips` workspace for authenticated employees.
- Employee profile ribbon, shift, device status, attendance, lateness, and advance KPIs.
- Strict employee projection by linked user ID/email.
- Personal payslip archive with no organization-wide salary exposure.
- Personal payslip modal with print/save-PDF support.
- Itemized CSV statement export.
- Salary advance request flow feeding the Admin payroll queue.
- HR Manager role support for organization payroll administration.

Primary files:

- `app/(portal)/payslips/page.tsx`
- `app/(portal)/layout.tsx`
- `components/payroll/PersonalPayslipModal.tsx`
- `context/DataContext.tsx`

## Step 19: Leave Management and Payroll Protection

**Status:** Completed on sibling branch `feature/step-19-leave-management-engine`
at commit `a7edde5`; not integrated into the current Step 19.1 branch.

Delivered on that branch:

- `LeaveRequest` and `LeaveBalanceSummary` contracts.
- Employee self-service leave desk at `/leave`.
- Admin/HR approval and entitlement desk at `/leave/admin`.
- Annual, sick, casual, and unpaid leave requests.
- Shift-working-day date calculation.
- Joining-year allowance accrual.
- Overlap and entitlement validation.
- Pending request cancellation.
- Admin/HR approval and mandatory rejection reason.
- Approved leave synchronization into `ON_LEAVE` attendance records.
- Paid leave protection from unexcused absence deductions.
- Unpaid leave deduction support in payroll.
- Tenant and employee isolation.

Branch files include:

- `app/(portal)/leave/page.tsx`
- `app/(dashboard)/leave/admin/page.tsx`
- `lib/leave-operations.ts`
- `tests/leave-operations.test.cjs`

Routing decision: Next.js route groups do not affect URL paths, so two files both
named `(group)/leave/page.tsx` would collide at `/leave`. The Admin page therefore
uses `/leave/admin`.

## Step 19.1: Daily Cutoff Finalization and Absence Resolution

**Status:** Implemented on the current branch at commit `e9c5a43`.

Delivered:

- Tenant-configurable attendance cutoff, default `19:00` Pakistan time.
- PKT-aware cutoff validation for the current date.
- Historical date reconciliation.
- Active employees without a check-in or approved leave become `ABSENT` with
  zero worked and late minutes.
- Approved leave takes precedence and resolves to `ON_LEAVE`.
- Existing no-punch placeholders are updated rather than duplicated.
- Missing check-outs are flagged for manual HR review.
- The engine never fabricates checkout timestamps.
- Idempotent repeated finalization.
- Finalization timestamp and executing staff audit metadata.
- Executive reconciliation modal with impact preview and affected employee lists.
- Admin and HR Manager access only.

Primary files:

- `components/attendance/AttendanceReconciliationModal.tsx`
- `lib/attendance-operations.ts`
- `context/DataContext.tsx`
- `app/(dashboard)/attendance/page.tsx`
- `tests/attendance-operations.test.cjs`

## Step 19.2: HR Executive Command Dashboard and Audit Exports

**Status:** Implemented in the current worktree on top of commit `e9c5a43`.

Delivered:

- Executive HR command center at `/hr-dashboard` for Agency Admin and HR Manager.
- Live office occupancy against the active employee roster with on-time and late counts.
- Pending leave queue KPI linked to the Step 19 Admin/HR approval desk at `/leave/admin`.
- Active-month approved salary advance liability and pending-request count.
- Current or latest payroll status with gross-liability visibility.
- Floor-presence cards with role, shift, device state, punch time, lateness,
  approved leave, and resolved absence states.
- Chronological audit feed for attendance corrections, device revocations,
  approved advances, and leave approvals.
- Persistent audit timestamps and actor/reason metadata for new attendance
  corrections, device revocations, and salary advance reviews.
- Filtered attendance CSV by date range, department, and attendance status.
- Master payroll liability CSV for `AGENCY_ADMIN`.
- Defense-in-depth payroll export redaction for `HR_MANAGER`: salary, allowance,
  deduction, advance, and net-pay columns are stripped at serialization time.
- Sidebar navigation plus `hrAndPayroll` route permission enforcement.
- Pure aggregation/export helpers and focused unit coverage.

Primary files:

- `app/(dashboard)/hr-dashboard/page.tsx`
- `lib/hr-dashboard.ts`
- `tests/hr-dashboard.test.cjs`
- `components/layout/Sidebar.tsx`
- `app/(dashboard)/layout.tsx`
- `context/DataContext.tsx`
- `types/erp.ts`

Integration note: Step 20 merged the employee submission and Admin/HR approval
workspace into the shared attendance, payroll, and HR dashboard state contract.

## Central Persistence Map

| Storage key | Contents |
| --- | --- |
| `tourflow_erp_v3` | Unified CRM, bookings, invoices, tours, passengers, visa, expenses |
| `tourflow_auth_user` and staff user key | Active demo user and provisioned users |
| `tourflow_active_tenant_id` | Active tenant selection |
| `tourflow_tenants_list_v2` | Tenant subscription demo state |
| `tourflow_hr_employees_{tenantId}` | Employee profiles |
| `tourflow_hr_shifts_{tenantId}` | Shift definitions |
| `tourflow_attendance_records_{tenantId}` | Attendance records |
| `tourflow_attendance_devices_{tenantId}` | Registered devices |
| `tourflow_attendance_cutoff_{tenantId}` | Daily cutoff time |
| `tourflow_leave_requests_{tenantId}` | Leave requests where Step 19 is integrated |
| `tourflow_payroll_runs_{tenantId}` | Monthly payroll runs |
| `tourflow_salary_advances_{tenantId}` | Salary advance requests |
| Agency settings key | Tenant branding, invoice, reminder, and security settings |

Check constants in the relevant context/helper before writing migrations. Some old
keys are read only for migration and should not become authoritative again.

## Important Invariants

1. Every operational record must be tenant scoped.
2. Super Admin must not receive agency passengers, clients, or manifests.
3. Front Desk must not receive payroll, supplier-cost, staff, or financial-ledger data.
4. Draft bookings do not convert leads, issue invoices, or reserve seats.
5. Confirmed group-tour bookings reserve seats exactly once.
6. Completing a reserved traveler slot must not increment booked seats.
7. Room allocation changes must not alter booking seat authority.
8. Payment proof submission must not change balances until Admin approval.
9. Payment approval must use the payment engine so invoices and milestones remain aligned.
10. Cancellation must preserve historical receipts and records while releasing active allocations.
11. Visa stage changes must not silently change passport custody.
12. Missing attendance checkout must never be invented by automation.
13. Approved paid leave must not be counted as an unexcused payroll absence.
14. Staff-facing payroll queries must resolve only the logged-in employee.
15. Non-admin payroll exports must omit every compensation and deduction column,
    even if the caller can access HR operational screens.
16. Pending or unverified payment claims must never contribute to realized cash.
17. Direct supplier costs and tour profitability are visible only to Agency Admin
    and Tour Manager; executive cross-tour analytics remain Agency Admin only.
18. Tour ROI is zero when direct vendor expenses are zero and must never return
    `NaN` or infinity.

## Test Coverage

The repository contains focused Node test suites for:

- Phase 1 authentication and RBAC
- Phase 2 operational flows
- Phase 3 theme behavior
- Agency settings
- Leads and CSV/duplicate workflows
- Booking wizard and booking operations
- Operational seed integrity
- Payment recovery and verification
- Tour rooming, itinerary, and flight operations
- Visa pipeline, archive, bridge, and custody rules
- Attendance, QR, device, and daily finalization rules
- Payroll calculations and locking
- HR dashboard telemetry, filtering, CSV quoting, and payroll export redaction
- Leave operations on the Step 19 branch

Recommended verification commands in PowerShell:

```powershell
$tests = (Get-ChildItem tests\*.test.cjs).FullName
node --test $tests
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
```

Most recent Step 19.1 verification:

- Attendance tests: 10 of 10 passed.
- TypeScript: passed.
- Changed application source ESLint: passed.
- `git diff --check`: passed.
- Next.js production build: passed with `/attendance` generated.
- Browser visual QA was not performed because no browser surface was available.

Step 19.2 focused verification:

- HR dashboard helper tests: 6 of 6 passed.
- TypeScript: passed.
- Changed source ESLint: passed after exempting the CommonJS Node test harness.
- `git diff --check`: passed.
- Next.js production build: passed with `/hr-dashboard` statically generated.
- Broad legacy run: 89 of 133 passed; 44 pre-existing failures remain from stale
  RBAC/table assertions and test-harness resolution of `./operational-source`.
- Browser visual QA was not performed because no browser surface was available.

## Step 20 - Integration Hardening and Full-Suite Verification

Status: complete in the current worktree.

Step 20 consolidated the Step 19 leave branch with the Step 19.1 attendance
finalizer and Step 19.2 HR command center. The integration now provides:

- One tenant-scoped leave source under `tourflow_leave_requests_{tenantId}`.
- Shared `LeaveRequest`, `LeaveBalanceSummary`, and attendance reconciliation
  contracts without duplicate context state.
- Employee leave creation, Admin/HR review, cancellation, and balance queries.
- Approved leave synchronization into attendance as `ON_LEAVE` with zero worked
  and late minutes.
- Daily cutoff resolution of unpunched employees without approved leave to
  `ABSENT`.
- Missing checkout audit flags without generated checkout timestamps.
- Paid annual, sick, and casual leave protected from payroll deductions.
- Approved unpaid leave deducted at `grossPay / 26` per leave day.
- One gross daily wage deducted for every three late arrivals.
- Explicit route guards for `/hr-dashboard`, `/leave/admin`, `/attendance`, and
  `/payroll`, limited to `AGENCY_ADMIN` and `HR_MANAGER`.
- A focused leave-attendance-payroll integration test plus repaired legacy test
  harness resolution and current UI assertions.

Step 20 quality gate executed on 2026-09-30:

- Full Node suite: 193 of 193 passed across all 23 test suites.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed with zero errors.
- Production build: `npm.cmd run build` passed with all 29 routes compiled cleanly.
- Next.js generated all 29 routes, including `/hr-dashboard`, `/leave`,
  `/leave/admin`, `/attendance`, and `/payroll`.
- Browser visual QA was not performed as part of the command-line quality gate.

## Step 21 - Executive Analytics, Tour Cost Sheets and Platform Governance

Status: implemented and automated tests passing in the current worktree.

Delivered:

- Canonical `TourExpense` contract with supplier category, fixed ledger currency,
  cost date, creation timestamp, tenant, and departure linkage.
- Tenant-scoped supplier cost create, update, and delete mutations in
  `DataContext`, restricted to `AGENCY_ADMIN` and `TOUR_MANAGER`.
- Financial data privacy at the context boundary: Front Desk, Visa Consultant,
  HR, and employee-facing roles receive no supplier expense records.
- Per-departure Financials & Cost Sheet tab for Admin and Tour Manager with a
  right-side supplier-cost drawer, itemized vendor ledger, cost allocation,
  recognized revenue, overheads, net profit, margin, and zero-safe ROI.
- Shared authoritative formulas in `lib/analytics-governance.ts`:
  recognized invoice revenue minus direct vendor expenses and allocated
  overheads, with ROI divided only by direct vendor expenses.
- Executive dashboard metrics for gross billed invoices, verified realized cash,
  four-bucket receivables aging, net tour profit, ROI, and margin.
- Pending payment-proof claims remain excluded from realized cash because only
  settled invoice `paidAmount` is aggregated.
- Super Admin tenant provisioning modal, canonical ACTIVE / GRACE_PERIOD /
  SUSPENDED controls, and deterministic 30/90/180/365-day renewal extensions.
- Governance mutations require the platform-owner role and preserve the existing
  aggregate-only tenant desk without exposing passenger or staff records.
- Legacy supplier expense categories and paid dates normalize during ERP snapshot
  hydration without introducing a second persistence store.

Primary files:

- `lib/analytics-governance.ts`
- `tests/analytics-governance.test.cjs`
- `types/erp.ts`
- `context/DataContext.tsx`
- `context/TenantContext.tsx`
- `app/(dashboard)/tours/[id]/page.tsx`
- `app/(dashboard)/page.tsx`
- `app/(super-admin)/tenants/page.tsx`

Step 21 verification on 2026-09-30:

- Analytics and governance tests: 6 of 6 passed.
- Full Node suite: 193 of 193 passed across all 23 test suites.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed with zero errors.
- ESLint: `npm.cmd run lint` passed with zero errors and warnings.
- Production build: `npm.cmd run build` passed with all 29 routes generated.
- Browser automation was intentionally not performed per the Step 21 workflow.

## Step 22 - Acceptance Matrix, Error Recovery and Sign-Off Hardening

Status: implemented and automated quality gates passing in the current worktree.

Delivered:

- Dashboard route error recovery in `app/error.tsx` with a themed diagnostic
  card, retry action, and safe return to `/dashboard`.
- Critical root recovery in `app/global-error.tsx`, including its own HTML,
  body, responsive styles, diagnostic digest, retry action, and dashboard link.
- Executive dashboard zero-data guidance when no tours, leads, or invoices are
  available; all financial and occupancy metrics continue to resolve to zero.
- Tour costing zero-state guidance with a direct action to record the first
  supplier expense while retaining finite 0% ROI calculations.
- Existing visa Kanban placeholders verified across every empty pipeline stage.
- Attendance device-vault guidance when no phones are enrolled, plus an empty
  register/search result fallback instead of a blank table.
- One deterministic acceptance suite with individually named `TC-01` through
  `TC-18` cases for lead deduplication, atomic bookings, oversell protection,
  passport expiry, payment verification, cancellation, device attendance,
  cutoff finalization, leave/payroll protection, late and advance deductions,
  privacy, visa custody, zero-cost ROI, tenant isolation, and governance.
- Acceptance tests invoke the production operation modules rather than copied
  formulas, so the suite validates the same mutations used by `DataContext`.

Primary files:

- `app/error.tsx`
- `app/global-error.tsx`
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/attendance/page.tsx`
- `app/(dashboard)/tours/[id]/page.tsx`
- `tests/acceptance-matrix.test.cjs`

Step 22 verification on 2026-09-17:

- Acceptance matrix: 18 of 18 passed.
- Full Node suite: 163 of 163 passed.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed.
- ESLint: `npm.cmd run lint` passed with zero reported diagnostics.
- Production build: `npm.cmd run build` passed with all 28 routes generated.
- Git commands and automated browser sessions were intentionally not used per
  the Step 22 workflow constraints.

## Step 23 - Office Overhead Ledger and Executive P&L Integration

Status: implemented in the current worktree with focused tests, TypeScript,
lint, and production build verification.

Delivered:

- First-class `OfficeExpense` schema for tenant-scoped general overheads,
  including rent, utilities, internet/communication, office supplies, pantry,
  marketing, software, maintenance, and miscellaneous overhead categories.
- Central `DataContext` state and mutations for `officeExpenses`, including
  `addOfficeExpense`, `updateOfficeExpense`, and `deleteOfficeExpense`.
- Backward-compatible ERP snapshot hydration for older localStorage records
  where `officeExpenses` does not exist yet.
- Admin/finance privacy shield for office overheads: the collection and route
  are exposed only to `AGENCY_ADMIN` and `HR_MANAGER`; front-desk, visa,
  tour-manager, and employee roles do not receive this ledger.
- Dedicated `/expenses` workspace with KPI cards, category/payment filters,
  search, CSV export, empty state, delete action, and right-side entry drawer.
- Sidebar and dashboard-layout route linkage for the new Office Expenses
  workspace.
- Executive dashboard P&L integration: general office overheads now subtract
  from net tour profit after recognized revenue, direct vendor expenses, and
  tour-level allocated overheads.
- Deterministic Node tests for office overhead aggregation, tenant isolation,
  P&L integration, zero direct-cost ROI safety, RBAC, and route/context wiring.

Primary files:

- `types/erp.ts`
- `lib/analytics-governance.ts`
- `lib/booking-operations.ts`
- `context/DataContext.tsx`
- `components/layout/Sidebar.tsx`
- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/page.tsx`
- `app/(dashboard)/expenses/page.tsx`
- `tests/office-expenses.test.cjs`

Step 23 verification on 2026-09-17:

- Office expense tests: 5 of 5 passed.
- Full Node suite: 168 of 168 passed.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed.
- ESLint: `npm.cmd run lint` passed with zero reported diagnostics.
- Production build: `npm.cmd run build` passed with `/expenses` included in
  the generated route list.
- Git commands and automated browser sessions were intentionally not used per
  the Step 23 workflow constraints.

## Step 24 - Financial Ledger, Supplier Payables, and Departure ROI

**Status:** Implemented on the current branch.

Delivered:

- Added the tenant-safe `LedgerEntry` contract and a pure ledger projection in
  `lib/ledger.ts`.
- Verified customer installment payments are credits; supplier costs, office
  overheads, disbursed payroll, and refunds are debits with a running balance.
- Added supplier payable aggregation by vendor and per-departure ROI cards with
  the existing zero-direct-cost ROI guard.
- Exposed admin-only `ledgerEntries` through `DataContext`; source collections
  remain filtered by active tenant and pending payment proofs never become
  ledger credits.
- Replaced the `/ledger` placeholder with Cash Ledger, Supplier Payables, and
  Departure ROI views, CSV export, and a right-side supplier cost drawer.
- Added deterministic coverage in `tests/ledger.test.cjs` for cash projection,
  payroll outflows, pending-proof exclusion, tenant isolation, and wiring.

Primary files:

- `types/erp.ts`
- `lib/ledger.ts`
- `context/DataContext.tsx`
- `app/(dashboard)/ledger/page.tsx`
- `tests/ledger.test.cjs`

Step 24 verification on 2026-09-17:

- Focused ledger tests: 5 of 5 passed.
- Full Node suite: 173 of 173 passed.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed.
- ESLint: `npm.cmd run lint` passed with zero reported diagnostics.
- Production build: `npm.cmd run build` passed.

Step 24 ledger type-error fix on 2026-09-17:

- Exported `calculateTourFinancials` from `lib/ledger.ts` with the requested
  array-based `TourFinancialSummary[]` contract.
- Updated the `/ledger` departure cards to consume the new summary fields.
- Full Node suite remained 173 of 173 passed; TypeScript, lint, and production
  build passed after the correction.
- Git commands and automated browser sessions were intentionally not used per
  the Step 24 workflow constraints.

Step 24 ledger typography hardening on 2026-09-17:

- Restyled `/ledger` KPI cards and departure ROI cards for Design System v2.3:
  anti-aliased sans hierarchy, tight monospace financial values, refined
  neutral-green surfaces, stronger light/dark contrast, and cleaner executive
  spacing.
- Preserved all ledger calculations, RBAC, filters, exports, and drawer actions.
- Focused ledger tests: 5 of 5 passed; TypeScript, ESLint, and production build
  passed after the styling refactor.

## Step 25 - Secure Document Vault and Compliance Center

**Status:** Implemented on the current branch.

Delivered:

- Added tenant-scoped `VaultDocument`, document categories, and verification
  lifecycle contracts in `types/erp.ts`.
- Added centralized upload, update, verify, and delete mutations in
  `DataContext.tsx`, with Agency Admin/Visa Consultant access checks and client
  ownership validation.
- Persisted vault records in the ERP snapshot with legacy
  `vault_documents` migration support and tenant filtering.
- Replaced the `/documents` placeholder with a searchable compliance table,
  status/category filters, verification KPIs, expiry detection, upload drawer,
  review drawer, rejection reasons, and admin-only deletion.
- Added a direct `/documents` route guard and the pure compliance helper in
  `lib/document-vault.ts`.
- Added deterministic document vault tests for expiry handling, RBAC, and
  route/context wiring.

Primary files:

- `types/erp.ts`
- `lib/booking-operations.ts`
- `lib/document-vault.ts`
- `context/DataContext.tsx`
- `app/(dashboard)/documents/page.tsx`
- `app/(dashboard)/layout.tsx`
- `tests/documents.test.cjs`

Step 25 verification on 2026-09-17:

- Focused document tests: 3 of 3 passed.
- Full Node suite: 176 of 176 passed.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed.
- ESLint: `npm.cmd run lint` passed with zero reported diagnostics.
- Production build: `npm.cmd run build` passed with `/documents` included in
  the generated route list.
- Git commands and automated browser sessions were intentionally not used per
  the Step 25 workflow constraints.

## Step 26: Suppliers, Partner DMCs & Wholesale Payables Hub

Verified implementation on 2026-09-17:

- Added tenant-scoped `Supplier` and `SupplierCategory` contracts, including
  operational contact, region, currency, status, and settlement account data.
- Extended the shared ERP snapshot with supplier hydration, reset handling, and
  tenant-filtered selectors. Centralized create, update, and delete mutations
  enforce Agency Admin or Tour Manager access.
- Replaced `/suppliers` with a searchable supplier and DMC workspace: executive
  supplier KPIs, category/status filters, payable exposure sourced from direct
  `tour_expenses`, and a right-side create/edit inspection drawer.
- Added direct route protection for `/suppliers`; Front Desk, Visa Consultant,
  HR Manager, and Employee roles receive no supplier records or supplier-cost
  controls. Supplier deletion is Agency Admin-only and blocked if direct tour
  expense records still reference the partner.
- Added `lib/supplier-operations.ts` for role gating, normalized supplier
  matching, and tenant-scoped payable exposure calculations.
- Added deterministic supplier tests for privacy roles, normalized/tenant-scoped
  payable totals, and context/route/page wiring.

Primary files:

- `types/erp.ts`
- `lib/booking-operations.ts`
- `lib/supplier-operations.ts`
- `context/DataContext.tsx`
- `app/(dashboard)/suppliers/page.tsx`
- `app/(dashboard)/layout.tsx`
- `tests/suppliers.test.cjs`

Step 26 verification on 2026-09-17:

- Focused supplier tests: 3 of 3 passed.
- Full Node suite: passed, including the Step 26 suite.
- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed.
- ESLint: `npm.cmd run lint` passed with zero reported diagnostics.
- Production build: `npm.cmd run build` passed with `/suppliers` included in
  the generated route list.
- Git commands and automated browser sessions were intentionally not used per
  the Step 26 workflow constraints.

## Known Limitations and Production Work

- All authoritative-looking state is still client-side demo state.
- Role checks can be bypassed by a malicious browser user without server enforcement.
- There is no database transaction, durable concurrency control, or audit service.
- Payment proof images are stored as browser data URLs and are size constrained.
- Recorded refunds do not transfer money through a bank or card processor.
- QR and device signatures are simulated client-side, not signed by a secure backend.
- File uploads are local previews/data URLs, not object-storage uploads.
- Browser print is used for PDF workflows.
- Multi-tab stale snapshot checks reduce accidental overwrites but are not locking.
- Leave, attendance, payroll, and HR dashboard state remains browser-local demo
  persistence and requires server-side authorization and storage before production.

## Recommended Next Agent Sequence

1. Confirm the current branch and review the Step 20 worktree diff.
2. Read `AGENTS.md` and the relevant installed Next.js docs.
3. Perform browser QA for leave approval followed by attendance finalization and
   payroll calculation for the same employee/date.
4. Verify `/hr-dashboard` updates its leave queue and audit feed after approval.
5. Test both Admin full payroll CSV and HR Manager redacted CSV downloads.
6. Replace browser-local persistence and client-only role checks with server-side
   authorization, durable tenant storage, and transactional mutations.

## Definition of Done for the Step 19 Integration

The combined implementation is complete only when this scenario passes:

1. An employee submits annual leave from `/leave`.
2. Admin or HR approves it from `/leave/admin`.
3. The approved working dates appear as `ON_LEAVE` in attendance.
4. Daily finalization does not convert those dates to `ABSENT`.
5. A missing check-out for a different employee is flagged without a fake time.
6. Payroll excludes approved paid leave from absence deductions.
7. Approved unpaid leave is deducted according to payroll policy.
8. Employee payslips expose only the logged-in employee's payroll item.
9. All state survives reload under the active tenant.
10. The full test suite and production build pass.

All ten integration requirements are implemented and covered by the Step 20
automated quality gate. Interactive browser verification remains the next manual
acceptance step.

## Step 23 - Frontend Auth Bridge & CRM Leads Live Synchronization

Status: implemented and automated quality gates passing in `feature/frontend-step-02-auth-lead-sync`.

Delivered:

- Environment configuration in `.env.local` declaring `NEXT_PUBLIC_API_URL="http://localhost:8000/api/v1"`.
- Central HTTP API client (`lib/api-client.ts`) wrapping `fetch`, managing Bearer JWT authentication headers (`tourflow_access_token`), error extraction, status code handling, and JSON parsing.
- JWT authentication helper (`lib/auth-api.ts`) connecting frontend login to FastAPI `/auth/login` (supporting JSON and OAuth2 password form-data payloads) and user profile hydration via `/auth/me`.
- Auth Context integration (`context/AuthContext.tsx`) with JWT token storage, startup token validation, auto-logout on 401 Unauthorized, and graceful fallback to local preset accounts when offline.
- CRM Lead API client (`lib/lead-api.ts`) providing bidirectional transformation between FastAPI backend snake_case payloads (`full_name`, `follow_up_date`, `interest_type`, etc.) and frontend `Lead` / `Interaction` model types.
- Data Context live CRM lead synchronization (`context/DataContext.tsx`) with live API lead hydration (`fetchLeadsApi`), optimistic UI updates for lead creation (`createLeadApi`), status / rep updates (`updateLeadApi`), and interaction logging (`addInteractionApi`).
- Complete visual fidelity and styling preservation for TourFlow Design System v2.3 tokens (Dark void `#030712`, deep teal `#1B7167`) and visual components (`LeadInteractionDrawer`, status badges, queue tabs, modals).
- Strictly respected repository constraints: no Git commands executed, no automated browser tools launched.

Primary files:

- `.env.local`
- `lib/api-client.ts`
- `lib/auth-api.ts`
- `lib/lead-api.ts`
- `context/AuthContext.tsx`
- `context/DataContext.tsx`
- `app/login/page.tsx`

Step 23 verification on 2026-09-17:

- TypeScript: `npx.cmd tsc --noEmit --incremental false` passed with 0 type errors.
- ESLint: `npx.cmd eslint` passed with 0 lint errors across modified source files.
- Node unit test suite: `leads.test.cjs` (11/11 passed), `phase1.test.cjs` (11/11 passed), `phase2.test.cjs` (42/42 passed).
- Next.js Production Build: `npm.cmd run build` passed with all 29 routes statically/dynamically generated.

## Step 24 - Bearer Token Sanitization, Agency Admin Permissions & Zero-State CRM

Status: implemented and automated quality gates passing.

Delivered:
- Bearer token sanitization in `lib/api-client.ts`: prioritized `tourflow_token` across storage keys, stripping wrapping quotes (`^["']|["']$`) and whitespace to eliminate FastAPI PyJWT 401 validation failures.
- Expanded leads workspace role guards in `app/(dashboard)/leads/page.tsx` and `context/DataContext.tsx` (`requireCRM`): explicitly permitted `AGENCY_ADMIN`, `FRONT_DESK`, `TOUR_MANAGER`, `VISA_CONSULTANT`, and `SUPER_ADMIN`, eliminating false "Access Restricted" locks.
- Clean zero-state onboarding CRM workspace in `app/(dashboard)/leads/page.tsx` when `leads.length === 0`, with a direct `[Register New Lead]` action button adhering to TourFlow Design System v2.3 tokens.
- All automated checks verified (TypeScript 0 errors).

## Step 25 - Live Receivables Workspace, Payment Proof Intake & Admin Verification Desk

Status: implemented and automated quality gates passing in `feature/frontend-step-05-invoicing-payments`.

Delivered:
- Section 5 data contract harmonization (`types/erp.ts`):
  - Aligned `InvoicePaymentStatus` (`UNPAID`, `PARTIAL`, `PAID`, `OVERDUE`, `CANCELLED`), `MilestoneStatus` (`PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`), `PaymentProofStatus` (`PENDING`, `VERIFIED`, `REJECTED`), `PaymentMethod`, `PaymentProofClaim`, `ReceivablesAging`, `RecoveryCallOutcome`, and `RecoveryCallLog`.
  - Maintained bidirectional compatibility between backend snake_case schemas and camelCase frontend representations.
- Central Invoicing API Service (`lib/invoice-api.ts`):
  - Implemented `fetchInvoices()`, `getInvoiceDetail()`, `fetchReceivablesAging()`, `submitPaymentProof()`, `fetchPaymentProofClaims()`, `verifyPaymentClaim()`, `logRecoveryCall()`, and `recordDirectPayment()` using centralized `apiClient`.
- DataContext Live Receivables & Payment Proof Synchronization (`context/DataContext.tsx`):
  - Automated initial live API hydration for invoices and payment proof claims on tenant switch.
  - Multi-tenant relaxed authorization logic allowing `AGENCY_ADMIN` and `SUPER_ADMIN` to operate seamlessly without false "Access Restricted" traps.
  - Wired `submitPaymentProof`, `reviewPaymentProof`, `logRecoveryCall`, and `recordPayment` mutations to execute asynchronous backend synchronization with optimistic local state commits.
- Front-Desk Privacy Shield & Verification Modal (`components/invoices/VerifyPaymentModal.tsx`):
  - Built with TourFlow Design System v2.3 tokens (Deep Teal `#1B7167`, Dark Void `#030712`, IBM Plex Mono numbers).
  - Front Desk staff can inspect pending payment claims, verify receipt attachments, and preview FIFO milestone allocations.
  - Rejection and `[Approve & Settle Milestones]` action buttons are strictly restricted to `AGENCY_ADMIN` and `SUPER_ADMIN` with an informative Privacy Shield banner for operational roles.
- Payment Recovery & Proof Upload Actions (`components/invoices/PaymentRecoveryActions.tsx`):
  - Enabled Front Desk, Tour Managers, and Admins to attach bank transfer receipts / deposit slips (`submitPaymentProof`) and record debtor outreach call logs (`logRecoveryCall`).
- Receivables Aging Workspace & Invoice Register (`app/(dashboard)/invoices/page.tsx` & `app/(dashboard)/invoices/[id]/page.tsx`):
  - Updated KPI summary tiles (Current, 1-30d, 31-60d, 61-90d, 90+d overdue aging brackets), Clearance Gate banners, and ledger inspection views with Design System v2.3 tokens.
## Step 26 - Live Visa Processing Pipeline & Safe Custody Vault

Status: implemented and automated quality gates passing in `feature/frontend-step-06-visa-custody-vault`.

Delivered:
- Section 4 Visa Pipeline & Custody Data Contracts (`types/erp.ts`):
  - Aligned `VisaStage` (`DOCUMENTS_PENDING`, `APPOINTMENT_BOOKED`, `SUBMITTED_TO_EMBASSY`, `DECISION_RECEIVED`, `PASSPORT_READY_FOR_PICKUP`, `COMPLETED`, `DELIVERED`), `VisaDecision`, `PassportCustodyLocation`, `VisaDocumentItem`, `PassportCustodyEvent`, and `VisaCase`.
  - Maintained bidirectional compatibility between backend snake_case schemas and camelCase frontend representations.
- Central Visa Operations & Vault API Client (`lib/visa-api.ts`):
  - Implemented `fetchVisaCases()`, `getVisaCaseDetail()`, `createVisaCase()`, `updateVisaCase()`, `transferPassportCustody()`, `verifyChecklistItem()`, `fetchCustodyEvents()`, and `fetchVaultSummary()` using centralized `apiClient`.
- Context & State Synchronization (`context/DataContext.tsx`):
  - Connected visa pipeline cases with relaxed role authorization permitting `AGENCY_ADMIN`, `VISA_CONSULTANT`, `FRONT_DESK`, and `SUPER_ADMIN`.
  - Asynchronous background synchronization for `saveVisaPipelineCase` and custody actions with optimistic local state commits.
- Visa Case Detail Slide-Over Drawer (`components/visa/VisaCaseDetailDrawer.tsx`):
  - 440–470px width slide-over drawer built with TourFlow Design System v2.3 tokens (Deep Teal `#1B7167`, Dark Void `#030712`, Manrope typography, IBM Plex Mono figures).
  - Four sub-tabs: Logistics, Document Checklist with receive/verify toggles, Physical Custody Vault with locker ID and courier tracking inputs, and Immutable Custody Event Audit Log.
  - Enforced physical custody invariant: moving stages never moves the physical passport automatically.
- Visa Operations Hub & Safe Custody Vault Workspace (`app/(dashboard)/visa-pipeline/page.tsx`):
  - 6-column Kanban board with drag-and-drop / select-to-move stage progression.
  - 48-Hour Urgent Appointment flame badge indicator.
  - Safe Custody Vault ledger table with locker numbers, courier tracking references, and custody audit actions.
  - Archive view for completed and delivered cases.
- Verification & Quality Gates:
  - TypeScript compiler (`tsc --noEmit`): 0 errors across entire workspace.
  - ESLint (`eslint` on all modified/new files): 0 errors, 0 warnings.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.

## Step 27 - Live HR Core, Staff Directory & 3-Stage Intake Drawer

Status: implemented and automated quality gates passing in `feature/frontend-step-07-hr-staff-shifts`.

Delivered:
- Section 7 HR Data Contract Harmonization (`types/erp.ts`):
  - Aligned `EmploymentStatus` (`ACTIVE`, `PROBATION`, `SUSPENDED`, `RESIGNED`, `TERMINATED`), `Department` (`MANAGEMENT`, `OPERATIONS`, `SALES_FRONT_DESK`, `VISA_CONSULTANCY`, `ACCOUNTS`), `Shift` / `WorkShift`, `EmployeeProfile`, `ScreenAccessRules`, and `ScreenAccessLevel`.
  - Maintained camelCase and snake_case dual compatibility across all HR types, ensuring non-optional runtime shift timing and grace period constraints.
- Central HR & Staff API Service (`lib/hr-api.ts`):
  - Implemented `fetchEmployees()`, `getEmployeeDetail()`, `createEmployee()`, `updateEmployee()`, `toggleEmployeeStatus()`, `fetchShifts()`, `createShift()`, and `updateShift()` using centralized `apiClient`.
  - Implemented bidirectional transformations `backendToFrontendEmployee` and `backendToFrontendShift`.
- DataContext Live HR Synchronization (`context/DataContext.tsx`):
  - Initial live hydration of employees and work shifts from backend endpoints on tenant change.
  - Asynchronous background synchronization for `createEmployeeRecord` and `updateEmployeeRecord` with optimistic local state commits.
- Staff Directory & Profile Vault Workspace (`app/(dashboard)/settings/staff/page.tsx`):
  - TourFlow Design System v2.3 tokens: Deep Teal brand palette (`#1B7167`, `#155A52`, `#0F3B35`), Dark Void surfaces (`#030712`, `#121C18`), Manrope typography, and IBM Plex Mono numbers/codes.
  - Enforced solid white text rule across all green/teal buttons and badges (`text-white font-medium [&>svg]:text-white [&>span]:text-white`).
  - Strict responsive table layout (`w-full table-fixed`) with zero horizontal overflow.
  - Front-Desk Privacy Shield (SRS §1.3, FR-HR-004): compensation column masked as `••••••••` for non-admin viewers.
  - 3-Stage Intake Slide-Over Drawer (Stage 1: Bio & Identity, Stage 2: Employment & Payroll, Stage 3: System Access & Role Permissions).
  - Staff Profile Vault (Dossier View Modal) with confidential compensation breakdown and annual leave utilization gauge.
  - Department Shifts view tab displaying timing, late grace cutoff, and working day badges.
- Attendance Device Management Modal (`components/staff/DeviceManagementModal.tsx`):
  - Refactored to TourFlow Deep Teal branding with instant QR generation, single-use enrollment expiration, and device revocation audit logging.
## Step 28 - Daily Attendance Hub, Rotating Office QR & Mobile Scanner Terminal

Status: implemented and automated quality gates passing in `feature/frontend-step-08-attendance-qr`.

Delivered:
- Section 8 Attendance & Hardware Device Data Contracts (`types/erp.ts`):
  - Aligned `AttendanceStatus` (`PRESENT`, `LATE`, `HALF_DAY`, `ABSENT`, `ON_LEAVE`, `WEEKLY_OFF`), `AttendanceSource` (`QR_SCAN`, `MANUAL_HR`, `CORRECTION`), `AttendanceRecord`, `PunchResult`, `DailyAttendanceSummary`, `DeviceBindingStatus`, `AttendanceCutoffStatus`, and `AttendanceReconciliationMetadata`.
  - Maintained camelCase and snake_case dual compatibility across all attendance records, ensuring non-optional runtime shift timing and grace period constraints.
- Central Attendance API Service (`lib/attendance-api.ts`):
  - Implemented `fetchDailyAttendance()`, `fetchAttendanceSummary()`, `recordAttendancePunch()`, `correctAttendanceRecord()`, and `finalizeAttendanceApi()` connecting to FastAPI endpoints at `/api/v1/attendance`.
  - Implemented bidirectional normalization `backendToFrontendAttendanceRecord`.
- Context & State Synchronization (`context/DataContext.tsx`):
  - Automated initial live API hydration for attendance records and devices.
  - Wired `updateManualAttendanceRecord` and `finalizeDailyAttendance` to perform asynchronous backend synchronization with optimistic local state commits.
- Daily Attendance Operations Desk (`app/(dashboard)/attendance/page.tsx`):
  - TourFlow Design System v2.3 tokens: Deep Teal brand palette (`#1B7167`, `#155A52`, `#0F3B35`), Dark Void surfaces (`#030712`), and Crisp White (`#FFFFFF`).
  - Solid white text on green/teal buttons enforced (`text-white font-medium [&>svg]:text-white [&>span]:text-white`).
  - Table layout: `w-full table-fixed` responsive design with zero horizontal overflow on desktop.
  - Live 30-Second Rotating Office QR Modal with dynamic countdown timer and high-contrast rendering.
  - Audited HR Correction Slide-Over Drawer with mandatory explanation requirement and permanent audit logging.
- Executive Reconciliation Desk (`components/attendance/AttendanceReconciliationModal.tsx`):
  - Re-themed to Deep Teal `#1B7167` branding with solid white text on action buttons.
  - Interactive preview of auto-resolutions (absent vs. approved leave) and manual HR audit queue for missing check-outs.
- Mobile Scanner Terminal & Success Celebration (`app/attendance/scan/page.tsx` & `app/attendance/success/page.tsx`):
  - Mobile scanner terminal themed with Deep Teal branding, radial glows, device binding confirmation, and live API punch sync.
  - Success celebration screen with high-energy confetti bursts, vibration haptic feedback, and recorded punch metrics.
- Verification & Quality Gates:
  - TypeScript compiler (`tsc --noEmit`): 0 errors across entire workspace.
  - Attendance & leave test suites (`node --test tests/attendance-operations.test.cjs tests/leave-attendance-integration.test.cjs`): 11/11 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.

## Step 29 - Monthly Payroll Engine, Salary Advance Queue & Payslip Vault

Status: implemented and automated quality gates passing in `feature/frontend-step-09-payroll-engine`.

Delivered:
- Section 9 Payroll Data Contract Harmonization (`types/erp.ts`):
  - Aligned `PayrollStatus` (`DRAFT`, `APPROVED`, `DISBURSED`, `VOID`), `SalaryAdvance`, `EmployeePayrollItem`, `MonthlyPayrollRun`, `EmployeeSelfServiceProfile`, and `PersonalPayslipRecord`.
  - Maintained full bidirectional compatibility between backend snake_case schemas and camelCase frontend representations (`gross_pay`, `net_payable_salary`, `late_arrival_deduction`, `unpaid_leave_deduction`, `salary_advances_deduction`, `bonuses_or_incentives`, etc.).
- Central Payroll API Service (`lib/payroll-api.ts`):
  - Implemented `generatePayrollRun()`, `getPayrollRuns()`, `getPayrollRunDetail()`, `approvePayrollRun()`, `disbursePayrollRun()`, `getMyPayslips()`, `requestSalaryAdvance()`, `reviewSalaryAdvance()`, and `getSalaryAdvances()` connecting to FastAPI endpoints at `/api/v1/payroll`.
  - Implemented bidirectional normalization helpers `backendToFrontendPayrollRun`, `backendToFrontendPayrollItem`, and `backendToFrontendSalaryAdvance`.
- DataContext Live Payroll Synchronization (`context/DataContext.tsx`):
  - Automated initial live API hydration for payroll runs and salary advances from `/api/v1/payroll/runs` and `/api/v1/payroll/advances` on tenant switch.
  - Connected `calculateMonthlyPayroll`, `approvePayrollRun`, `disbursePayrollRun`, `createSalaryAdvance`, `requestPersonalSalaryAdvance`, and `reviewSalaryAdvance` to perform asynchronous backend API synchronization with optimistic local state updates.
- Admin Monthly Payroll Hub (`app/(dashboard)/payroll/page.tsx`):
  - TourFlow Design System v2.3 tokens: Deep Teal brand palette (`#1B7167`, `#155A52`, `#0F3B35`), Dark Void surfaces (`#030712`, `#121C18`), and Crisp White (`#FFFFFF`).
  - Solid white text on green/teal buttons enforced (`text-white font-medium [&>svg]:text-white [&>span]:text-white`).
  - 4-card KPI Top Metric Ribbon: Gross Liability, Late Penalties Deducted (Three-Late Rule), Advances Deducted, Net Total Payable.
  - Control Bar with month selector, status pill, `[⚡ Calculate Monthly Payroll]`, `[🔒 Lock & Approve Payroll]`, `[💸 Record Disbursement]`, `[+ Salary Advance]`.
  - Responsive `w-full table-fixed` itemized payroll register table with zero unwanted horizontal scrollbars on desktop.
  - Front-Desk Privacy Shield active: unauthorized non-admin staff are shielded from company-wide payroll registers with a redirect/link to their personal payslip portal.
- Printable Payslip Drawer (`components/payroll/PayslipDrawer.tsx`):
  - 480–520px slide-over drawer themed with Deep Teal `#1B7167` branding, tenant details, itemized earnings and deductions tables, Net Take-Home Pay in bold `IBM Plex Mono`, and clean `@media print` printing support.
- Employee Self-Service Payslip Vault & Modal (`app/(portal)/payslips/page.tsx` & `components/payroll/PersonalPayslipModal.tsx`):
  - Self-service portal themed with Deep Teal `#1B7167` branding, employee summary header card, attendance and salary advance balance metrics, and historical payslip register.
  - Dedicated salary advance request modal with live repayment schedule estimation.
  - Personal payslip modal supporting statement CSV export and printable pay voucher views.
- Verification & Quality Gates:
  - TypeScript compiler (`tsc --noEmit`): 0 errors across entire workspace.
  - Full test suites (`node --test tests/payroll-operations.test.cjs tests/leave-attendance-integration.test.cjs tests/acceptance-matrix.test.cjs`): 24/24 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.

## Step 30 - Leave Self-Service Portal, Admin Approval Vault & Attendance Payroll Sync

Status: implemented and automated quality gates passing in `feature/frontend-step-10-leave-engine`.

Delivered:
- Section 8 Leave Management Data Contract Harmonization (`types/erp.ts`):
  - Aligned `LeaveType` (`ANNUAL`, `SICK`, `CASUAL`, `UNPAID`), `LeaveStatus` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`), `LeaveRequest`, and `LeaveBalanceSummary`.
  - Maintained full bidirectional compatibility between backend snake_case schemas and camelCase frontend representations (`tenant_id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `total_days`, `annual_total`, `annual_used`, `annual_remaining`, `sick_total`, `sick_used`, `sick_remaining`, `unpaid_days_taken`).
- Central Leave API Service (`lib/leave-api.ts`):
  - Implemented `fetchLeaveRequestsApi()`, `submitLeaveRequestApi()`, `reviewLeaveRequestApi()`, `cancelLeaveRequestApi()`, `fetchLeaveBalancesApi()`, and `updateLeaveEntitlementApi()` connecting to FastAPI endpoints at `/api/v1/leave`.
  - Implemented bidirectional normalization helpers `backendToFrontendLeaveRequest` and `backendToFrontendLeaveBalance`.
- DataContext Live Leave Synchronization (`context/DataContext.tsx`):
  - Automated initial live API hydration for leave requests from `/api/v1/leave/requests` on tenant switch.
  - Connected `submitLeaveRequest`, `reviewLeaveRequest`, `cancelLeaveRequest`, and `updateLeaveEntitlement` to perform asynchronous backend API synchronization with optimistic local state updates.
- Employee Self-Service Desk (`app/(portal)/leave/page.tsx`):
  - TourFlow Design System v2.3 tokens: Deep Teal brand palette (`#1B7167`, `#155A52`, `#0F3B35`), Dark Void surfaces (`#030712`, `#121C18`), and Crisp White (`#FFFFFF`).
  - Purple `#7C3AED` accent CTA button (`[+ Apply for Leave]`) with solid white text (`text-white font-medium [&>svg]:text-white [&>span]:text-white`).
  - 4-card KPI ribbon: Annual Remaining, Sick Remaining, Pending Review, Approved This Year.
  - Responsive `w-full table-fixed` request history table with status badges and cancel action for pending items.
  - Slide-Over Request Leave Drawer with working days calculation, remaining balance badges, date pickers, reason textarea, and error handling.
- Administrative Approval & Entitlement Desk (`app/(dashboard)/leave/admin/page.tsx`):
  - TourFlow Design System v2.3 tokens with Deep Teal `#1B7167` branding and solid white text on buttons.
  - Front-Desk Privacy Shield active: unauthorized non-admin/HR staff are shielded from company-wide leave requests and entitlements with a direct link to their personal leave portal.
  - 4-card KPI ribbon: Pending Decisions, On Leave Today, Approved This Month, Unpaid Days YTD.
  - Segmented toggle between Approval Queue and Entitlements tabs.
  - Responsive `w-full table-fixed` approval table, Review Drawer (`[Reject]` with reason, `[Approve & Sync]`), and Entitlement Drawer.
- Verification & Quality Gates:
  - TypeScript compiler (`tsc --noEmit`): 0 errors across entire workspace.
  - Leave, attendance, payroll, and acceptance test suites (`node --test tests/leave-operations.test.cjs tests/leave-attendance-integration.test.cjs tests/acceptance-matrix.test.cjs tests/attendance-operations.test.cjs tests/payroll-operations.test.cjs`): 38/38 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.
  - Git diff check (`git diff --check`): clean with 0 whitespace or formatting errors.

## Step 31 - Live Booking Engine, Quotations & Milestone Allocation Hub

Status: implemented and automated quality gates passing in `feature/backend-step-11-booking-engine`.

Delivered:
- Section 3 & 4 Booking Engine Data Contract Harmonization (`types/booking.ts` & `types/erp.ts`):
  - Created dedicated `types/booking.ts` exporting Pydantic-aligned schema definitions: `BookingStatus` (`DRAFT`, `DRAFT_QUOTATION`, `CONFIRMED`, `CANCELLED`, `COMPLETED`), `ServiceType` (`GROUP_TOUR`, `VISA_CONSULTANCY`, `UMRAH`, `CUSTOM_PACKAGE`), `InstallmentMilestone`, `Booking`, and `TravelerManifestItem`.
  - Re-exported and aligned interfaces in `types/erp.ts` with bidirectional compatibility for camelCase and snake_case properties (`booking_number`, `client_id`, `client_name`, `client_phone`, `service_type`, `package_id`, `pax_count`, `agreed_price_per_pax`, `total_agreed_amount`, `assigned_rep`, `cancellation_reason`, `retention_fee`, `refund_amount`, `slot_number`, `full_name`, `passport_no`, `passport_expiry`, `room_preference`, `is_complete`).
- Central Booking API Service (`lib/booking-api.ts`):
  - Implemented `createQuotation()`, `confirmBooking()` (with `Idempotency-Key` header injection), `fetchBookings()`, `getBookingDetail()`, `updateBookingTraveler()`, and `cancelBooking()` connecting to live FastAPI endpoints at `/api/v1/bookings`.
- Booking Detail & Inspection Drawer (`components/bookings/BookingDetailDrawer.tsx`):
  - Contextual right-side slide-over drawer with smooth transition, backdrop blur, and keyboard ESC handling.
  - 3-tab layout: Overview (client contacts, commercial summary, cancellation history), Milestones (due dates, amounts, status pills), and Manifest Slots (passenger list, passport info, room preferences).
  - Administrative cancellation modal for `AGENCY_ADMIN` with reason taxonomy, retention fee computation, refund method, and seat inventory release.
  - Front-Desk Privacy Shield active: non-admin roles cannot trigger cancellation or view wholesale cost structures.
- Draft Bookings & Quotation Workspace (`app/(dashboard)/draft-bookings/page.tsx`):
  - Upgraded to TourFlow Design System v2.3 with Deep Teal brand palette (`#1B7167`), Dark Void surfaces (`#030712`), and Crisp White (`#FFFFFF`).
  - 3-card KPI ribbon: Active Quotations, Potential Pipeline Value, Avg Group Size.
  - Filter bar supporting text search (client name, phone, booking ref, tour title) and service category dropdown.
  - Inspection drawer and fast-track review modal triggers with capacity preview.
- Global Conversion & Booking Modals (`components/bookings/GlobalBookingModal.tsx` & `components/leads/ConvertLeadModal.tsx`):
  - Connected to live `confirmBooking` API with idempotency key generation and automatic fallback to resilient local transactional store.
  - Solid white text on green/teal/purple buttons enforced (`text-white font-medium [&>svg]:text-white [&>span]:text-white`).
- DataContext Live Synchronization (`context/DataContext.tsx`):
  - Connected `cancelBooking` and `updateTraveler` to perform asynchronous live API updates.
- Verification & Quality Gates:
  - TypeScript compiler (`tsc --noEmit`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Booking test suites (`node --test tests/booking-engine.test.cjs tests/booking-wizard.test.cjs`): 9/9 tests passing.
  - Production Next.js build (`npm.cmd run build`): clean build with 0 errors.

## Step 32 - Frontend Session Expiration, 401 Auto-Redirect & RBAC Guard Isolation

Status: implemented and automated quality gates passing in `frontend-modifications-for-backend`.

Delivered:
- Central API Client 401 Interception (`lib/api-client.ts`):
  - Updated `clearStoredTokens()` to purge all stored auth credentials (`tourflow_token`, `tourflow_auth_user`, `tourflow_session`, `access_token`, `token`, `tourflow_refresh_token`) from `localStorage`.
  - Invalidate browser session and token cookies with `max-age=0` and `SameSite=Lax`.
  - `apiFetch` intercepts HTTP `401 Unauthorized` responses: purges credentials, performs an immediate hard redirect to `/login?reason=expired` when triggered in the browser (unless already on `/login`), and throws a structured `ApiError` with `status: 401`.
  - Attached HTTP status code to all thrown `ApiError` instances for downstream handler inspections.
- Background Auth Context Invalidation (`context/AuthContext.tsx`):
  - Enhanced `logout(reason?: string)` callback to clear tokens, reset auth state, and navigate to `/login${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`.
  - Background session validation (`validateSession`) triggers `logout('expired')` upon receiving a 401 status.
- Login Session Expiration Notification (`app/login/page.tsx`):
  - Wrapped `LoginForm` in a React `<Suspense>` boundary to safely read `useSearchParams` during Next.js SSR/prerendering.
  - Detected `reason === 'expired'` and displayed the TourFlow Design System v2.3 Amber warning banner (`#FFFBEB` background, `#B45309` text, `#FDE68A` border) informing users: *"Your session has expired due to inactivity. Please sign in again."*
- RBAC Dashboard Guard Isolation (`app/(dashboard)/leads/page.tsx`, `clients/page.tsx`, `visa-pipeline/page.tsx`):
  - Ensured "Access Restricted" is rendered ONLY on authentic HTTP 403 / role mismatches after context hydration.
  - Loading states display accessible loading status indicators (`<p role="status">...</p>`) while the session is restoring rather than false-positive restriction screens.
- Verification & Quality Gates:
  - TypeScript compiler (`npx.cmd tsc --noEmit`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Acceptance and booking test suites (`node --test tests/booking-engine.test.cjs tests/booking-wizard.test.cjs tests/acceptance-matrix.test.cjs`): 27/27 tests passing.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes built cleanly in static/dynamic configuration.

## Step 33 - Group Tour Operations, 5-Tab Workspace & Rooming Matrix

Status: implemented and automated quality gates passing in `feature/step-12-tour-operations-frontend`.

Delivered:
- Section 4 & 7 Group Tour Operations Layer (`lib/tours-api.ts`):
  - Implemented 10 core API methods: `getTourPackages`, `getTourDetail`, `createTourPackage`, `updateTourPackage`, `deleteTourPackage`, `getTourManifest`, `updateManifestTraveler` (with `updateManifestItem` alias), `assignRooms`, `getTourFinancials`, and `downloadManifestCSV`.
  - Harmonized data contracts for `Passenger["roomAllocation"]` supporting uppercase RoomType mappings to avoid type drift.
  - Implemented client-side CSV generator extracting verified traveler manifests with compliance flags for export.
- Departures Catalog Hub (`app/(dashboard)/tours/page.tsx`):
  - TourFlow Design System v2.3 tokens applied: Deep Teal (`#1B7167`), Dark Void (`#030712`), IBM Plex Mono for figures and PNRs.
  - 4-card KPI ribbon: Active Departures, Guaranteed Groups, Blocked Capacity, and Global Occupancy Rate (%).
  - Search and filter bar supporting free-text search (title, destination, group PNR, leader) and departure status pills (`ALL`, `PLANNING`, `OPEN`, `GUARANTEED`, `FULL`, `DEPARTED`).
  - Departure cards displaying destination flag, capacity utilization progress bar, seat metrics, Group PNR badges, and quick link to the 5-tab Operations Workspace.
  - Departure creation modal with real-time capacity and pricing setup.
- 5-Tab Departure Operations Workspace (`app/(dashboard)/tours/[id]/page.tsx`):
  - Tab 1: Traveler Manifest Hub
    - 6-Month Passport Rule Auditor calculating validity relative to `tour.departureDate`.
    - Readiness flags (`PP`, `VISA`, `TKT`) and status pills.
    - Quick-action `[📥 Export CSV Manifest]` button.
    - Contextual `<TravelerIntakeDrawer />` (480px width) for updating passenger name, DOB, passport details, room preference, and dietary/medical requirements.
  - Tab 2: Visual Rooming Matrix (`components/tours/RoomingMatrixGrid.tsx`)
    - Unassigned passenger pool with drag/quick-place interaction.
    - Room cards organized by category (`SINGLE`, `DOUBLE`, `TRIPLE`, `FAMILY SUITE`).
    - Occupancy badges: `Available`, `Partially Filled`, `Full`.
    - Interactive occupant pairing and unassignment with instant capacity recalculation.
    - Add Room Slot modal with customizable room number, type, and hotel selection.
  - Tab 3: Daily Timeline & Itinerary Planner
    - Timeline milestones showing day number, date, city, title, hotel, included meals (`BREAKFAST`, `LUNCH`, `DINNER`), and activities list.
    - Dynamic add/edit day modal.
  - Tab 4: Flight & Group PNR Manager
    - Airline badge, Group PNR reference, departure/arrival timestamps, terminal, baggage allowance, and ticketing deadline timer.
    - Seat utilization progress bar with ticketed vs blocked inventory metrics.
  - Tab 5: Tour Financials & P&L Analysis (Strict Front-Desk Privacy Shield)
    - Tab is completely hidden from `FRONT_DESK` users in the tab navigation.
    - Accessible only to `AGENCY_ADMIN` and `TOUR_MANAGER`.
    - 4-card commercial KPI ribbon: Gross Booking Revenue, Committed Direct Costs, Net Realized Margin, and Margin / ROI (%).
    - Itemized Wholesale Cost Breakdown table with vendor category, supplier name, cost per pax, total cost, and payment status.
- Verification & Quality Gates:
  - TypeScript compiler (`npx.cmd tsc --noEmit`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Acceptance & Tour Operations test suites (`node --test tests/tour-operations.test.cjs tests/booking-engine.test.cjs tests/booking-wizard.test.cjs tests/acceptance-matrix.test.cjs`): 34/34 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.
  - Git diff check (`git diff --check`): clean with 0 formatting or whitespace errors.

## Step 34 - Visa Consultancy Pipeline & Physical Passport Custody Vault

Status: implemented and automated quality gates passing in `feature/step-13-visa-pipeline-vault`.

Delivered:
- Section 4 & 5 Visa Operations & Safe Custody Contracts (`types/erp.ts` & `lib/visa-operations.ts`):
  - Harmonized and exported `VisaStage` (`DOCUMENTS_PENDING`, `APPOINTMENT_BOOKED`, `SUBMITTED_TO_EMBASSY`, `DECISION_RECEIVED`, `PASSPORT_READY_FOR_PICKUP`, `COMPLETED`, `DELIVERED`), `VisaDecision` (`PENDING`, `APPROVED`, `REFUSED`, `ADDITIONAL_DOCS_REQUESTED`), `PassportCustodyLocation` (`CLIENT_HOLDING`, `OFFICE_SAFE`, `WITH_CASE_OFFICER`, `SUBMITTED_TO_VFS_GERRYS`, `AT_EMBASSY`, `DISPATCHED_COURIER`), `VisaDocumentItem`, `PassportCustodyEvent`, and `VisaCase`.
  - Configured 5 operational stages in `VISA_STAGES` (`DOCUMENTS_PENDING`, `APPOINTMENT_BOOKED`, `SUBMITTED_TO_EMBASSY`, `DECISION_RECEIVED`, `DELIVERED`) with backward-compatible normalizers for legacy six-stage cases.
  - Enforced immutable custody pattern in `saveVisaCase`: required Safe Locker ID (`custodySafeLockerId`) when storing in `OFFICE_SAFE`, required Courier Tracking Code (`courierTrackingCode`) when in `DISPATCHED_COURIER`, and recorded an append-only actor audit trail (`custodyHistory`).
- Case Intake Modal (`components/visa/CreateVisaCaseModal.tsx`):
  - Centered modal adhering to TourFlow Design System v2.3 tokens.
  - Features: CRM client linkage, applicant details, popular destination presets (UK, Germany, France, USA, Canada, Saudi Arabia/Umrah, UAE, Turkey), visa category, passport number, passport expiry, appointment date/time, consultant assignment, consultancy and embassy fees, and standard 6-document checklist initialization.
- Slide-Over Case Inspection Drawer (`components/visa/VisaCaseDetailDrawer.tsx`):
  - Contextual right-side slide-over drawer with 440–480px width (`w-full max-w-[480px]`).
  - 4 sub-tabs:
    - **Logistics**: Applicant profile, country, category, stage transition stepper, appointment date, biometrics center, and tracking reference.
    - **Checklist**: Interactive verification checklist with received/verified states, document note editing, and custom document addition.
    - **Passport Vault**: Physical custody handover controller enforcing Safe Locker ID / Courier Code validation and physical inspection confirmation.
    - **Audit Log**: Chronological immutable handover log displaying each transfer event, staff actor, timestamp, and reference note.
- Visa Processing & Custody Hub (`app/(dashboard)/visa-pipeline/page.tsx`):
  - 4-card KPI ribbon: Active Pipeline Cases, In Office Safe, At Embassy / VFS, and Custody Unconfirmed / In Transit.
  - 3-way view switcher:
    - **Pipeline Kanban Board**: 5-column stage progression with drag-and-drop / single-click stage transitions, document verification count, and 48h urgent appointment badges.
    - **Passport Custody Vault Table**: Physical passport custody table featuring passport numbers in IBM Plex Mono, physical location badges, safe locker IDs, courier tracking numbers, pipeline stages, and quick transfer triggers.
    - **Archive**: Historical view of delivered/completed visa records with one-click restore capabilities.
  - Search & Filters: Search by name, phone, passport #, case #, and destination; combined with Departure Group and Custody Location filters.
  - Strict RBAC: Accessible to `SUPER_ADMIN`, `AGENCY_ADMIN`, `FRONT_DESK`, and `VISA_CONSULTANT`.
- Verification & Quality Gates:
  - TypeScript compiler (`npx.cmd tsc --noEmit`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Unit & Acceptance test suites (`node --test tests/visa-operations.test.cjs tests/acceptance-matrix.test.cjs tests/booking-engine.test.cjs tests/booking-wizard.test.cjs tests/tour-operations.test.cjs`): 45/45 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.
  - Git diff check (`git diff --check`): clean with 0 formatting or whitespace errors.

## Step 35 - Tour Package Catalog & Capacity Dashboard (/tours)

Status: implemented and automated quality gates passing in `feature/step-12-1-tour-catalog`.

Delivered:
- API Services Layer (`lib/tours-api.ts`):
  - Verified and enhanced tour package methods: `getTourPackages(params?: { status?: string; search?: string })`, `createTourPackage(payload: Partial<TourPackage>)`, `updateTourPackage(tourId: string, updates: Partial<TourPackage>)`, and `deleteTourPackage(tourId: string)`.
  - Maintained camelCase / snake_case bidirectional serialization between frontend and backend contracts.
- Route Implementation (`app/(dashboard)/tours/page.tsx`):
  - Top Metric Ribbon (4 KPI Cards):
    - **Total Active Departures**: Count of tours with status not CANCELLED and not COMPLETED.
    - **Guaranteed Groups**: Count of tours with `status === 'GUARANTEED'`.
    - **Total Capacity Blocked**: Sum of `maxCapacity` across active packages.
    - **Overall Occupancy %**: Aggregated `(totalBookedSeats / totalCapacity) * 100`.
  - Search & Filter Action Bar:
    - Search input indexing Tour Title, Destination tags, and Group PNR codes.
    - Filter pills: `ALL`, `PLANNING`, `OPEN_FOR_BOOKING`, `GUARANTEED`, `FULL`, `DEPARTED`.
    - Primary Action: `[+ Create Tour Departure]` styled with `bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl shadow-sm`, restricted to `AGENCY_ADMIN` and `TOUR_MANAGER`.
  - Departure Cards Grid:
    - Destination flags and tags (e.g. `🇹🇷 Turkey`, `🇸🇦 Saudi Arabia`).
    - Tour Title and Duration pill (`8 Days / 7 Nights`).
    - Departure and Return dates formatted in IBM Plex Mono.
    - Visual Capacity Progress Bar (`components/tours/TourCapacityBar.tsx`) color-coded by thresholds: Green `< 75%`, Amber `75%–94%`, Rose `95%–100%`, with subtext `${bookedSeats} / ${maxCapacity} Seats Booked (${percentage}%)`.
    - Flight & PNR badge displaying airline name and group PNR code.
    - Base price per pax in IBM Plex Mono (`PKR [Amount]`).
    - Direct navigation CTA: `[Manage Departure →]` leading to `/tours/[id]`.
    - 3-dots action menu with `Manage Workspace`, `Edit Details`, `Duplicate Departure`, and `Delete Departure`.
    - Delete safety guard preventing deletion of departures with `bookedSeats > 0`.
- Departure Modal Component (`components/tours/CreateTourModal.tsx`):
  - Mode support for `CREATE`, `EDIT`, and `DUPLICATE` operations with clean keyed mounting avoiding synchronous effect renders.
  - Inputs: Title, Destination tags, Departure Date, Return Date (validating `returnDate >= departureDate`), Max Capacity (validating `maxCapacity > 0`), Base Price per Pax (PKR), Airline Name, Group PNR code, and Inclusions list.
- Verification & Quality Gates:
  - TypeScript compiler (`npx.cmd tsc --noEmit`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Test suites (`node --test tests/tour-operations.test.cjs tests/acceptance-matrix.test.cjs tests/booking-engine.test.cjs tests/booking-wizard.test.cjs tests/visa-operations.test.cjs`): 45/45 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.
  - Git diff check (`git diff --check`): clean with 0 formatting or whitespace errors.

## Step 36 - 5-Tab Tour Operations Workspace, Rooming Matrix & Manifest Drawer (/tours/[id])

Status: implemented and automated quality gates passing in `feature/step-12-1-tour-catalog`.

Delivered:
- 5-Tab Tour Operations Workspace Architecture (`components/tours/` & `app/(dashboard)/tours/[id]/page.tsx`):
  - Modularized and organized 7 dedicated components fulfilling SRS Module 4 (FR-TOUR-003 through FR-TOUR-007) and Module 7 (FR-AN-001 through FR-AN-003).
  - Main Departure Banner & Controller (`components/tours/TourOperationsWorkspace.tsx`):
    - Top breadcrumb and departure banner hero card showing Tour ID, status badge, duration, title, route flag pills, quick CSV export & print actions.
    - 4-metric quick stats ribbon: Departure & Return dates in IBM Plex Mono, Base Price / Pax in PKR, Confirmed Manifest / Capacity ratio with occupancy %, and 6M Passport compliance warning count.
    - 5-Tab switcher with icons, labels, and badges (`Passenger Manifest`, `Rooming Matrix`, `Daily Itinerary`, `Group Flights & PNR`, and `Financials & Costing`).
- Tab 1: Passenger Manifest Table (`components/tours/PassengerManifestTab.tsx`):
  - 6-Month Passport Rule auditor (`checkPassport6MWarning`) displaying an alert banner and per-passenger warning badges if expiring within 6 months of tour departure date.
  - Search input for passenger name, passport #, and booking code (`WCH-BK-XXXXXX`).
  - Room preference filter and "6M Warnings Only" checkbox toggle.
  - Passenger table displaying slot #, booking code, passenger name, contact phone, passport # and expiry date, room setup, payment status badge (`PAID`, `PARTIAL`, `UNPAID`), and document readiness indicators (`Passport Uploaded`, `Visa Granted`, `Ticket Issued`).
  - `[Edit Intake]` action button triggering `<TravelerIntakeDrawer />`.
  - Action buttons for CSV export and manifest printing.
- Slide-Over Traveler Intake Drawer (`components/tours/TravelerIntakeDrawer.tsx`):
  - Right-side slide-over drawer with exact 480px width (`w-full max-w-[480px]`).
  - Clean keyed sub-component mounting preventing cascading renders and state synchronization issues.
  - Intake form with full name, passport number, passport expiry, contact phone, date of birth, room preference buttons (`SINGLE`, `DOUBLE`, `TRIPLE`, `FAMILY`), travel readiness checkpoints (`Passport Scan Uploaded`, `Visa Granted / Approved`, `Flight Ticket Issued`), and dietary/medical notes textarea.
  - Dynamic 6-Month Passport Expiry warning alert when client passport is expiring within 6 months of departure.
- Tab 2: Visual Hotel Rooming Matrix (`components/tours/RoomingMatrixTab.tsx`):
  - Left column: Unassigned travelers queue displaying confirmed passengers pending room allocation with room preferences.
  - Right column: Hotel rooming cards displaying room number, hotel name, room type badge (`SINGLE`, `DOUBLE`, `TRIPLE`, `FAMILY`), and occupancy progress (`Occupied` vs `Needs Roommate`).
  - Assigned occupants list with contact details and one-click unassign action.
  - Dropdown selector in empty room slots to assign passengers directly from the unassigned queue.
  - `+ Add Hotel Room` modal with room number, hotel name, room type, and notes.
- Tab 3: Daily Timeline & Itinerary Planner (`components/tours/ItineraryTab.tsx`):
  - Vertical timeline with scheduled milestones for each day of the tour.
  - Displays day number, date, scheduled city, day title, overnight hotel stay, and activities list.
  - Included meals pills (`🍳 Breakfast`, `🥗 Lunch`, `🍲 Dinner`) with toggle functionality.
  - Quick-add activity input and `+ Add Itinerary Day` modal.
  - Day reordering controls (Move Up / Down) and deletion.
- Tab 4: Group Flights & PNR Manager (`components/tours/FlightBlocksTab.tsx`):
  - Airline reservation summary: Airline name, flight number, Group PNR reference code in IBM Plex Mono, routing (Origin → Destination), baggage allowance, and departure time.
  - Seat utilization progress bar displaying ticketed vs blocked seats with percentage and overcapacity alerts.
  - GDS and flight block configuration form for `AGENCY_ADMIN` and `TOUR_MANAGER`.
- Tab 5: Tour Financials & Costing (`components/tours/TourFinancialsTab.tsx`):
  - **Strict Front-Desk Privacy Shield**: Users with `FRONT_DESK` role are barred with an Access Restricted card explaining governance restrictions under SRS Module 7.
  - Accessible only to `AGENCY_ADMIN` and `TOUR_MANAGER`.
  - 4-Card Commercial KPI Ribbon: Gross Recognized Revenue, Committed Direct Costs, Net Tour Profit, and Realized Margin / ROI %.
  - Itemized Wholesale Supplier Cost Breakdown table with category icons (Flight, Hotel, Transport, Guide, Visa), vendor name, allocation notes, committed amount (PKR), and settlement status.
- Verification & Quality Gates:
  - TypeScript compiler (`npx.cmd tsc --noEmit`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Test suites (`node --test tests/tour-operations.test.cjs tests/acceptance-matrix.test.cjs tests/booking-engine.test.cjs tests/booking-wizard.test.cjs tests/visa-operations.test.cjs`): 45/45 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.
  - Git diff check (`git diff --check`): clean with 0 formatting or whitespace errors.

## Step 16 - Attendance Operations Hub, Rotating Office QR & Mobile Scan Terminal

Status: implemented and automated quality gates passing in `feature/step-16-attendance-operations-hub`.

Delivered:
- **Central Attendance API Service (`lib/attendance-api.ts`) & Types (`types/attendance.ts`)**:
  - Connected to live FastAPI attendance endpoints (`/api/v1/attendance`).
  - Methods: `getTodayAttendance()`, `getOfficeRotatingQR()`, `submitPunch()`, `revokeDevice()`, `issueEnrollmentToken()`, `correctAttendanceRecord()`, and `finalizeAttendanceApi()`.
  - Full dual-compatibility model normalizing backend `snake_case` fields and frontend `camelCase` representations.
- **Attendance Operations Hub (`app/(dashboard)/attendance/page.tsx`)**:
  - 4-Card Top Metric Ribbon: Total Headcount, Present (On-Time within 15m grace), Late Arrivals, and Unpunched / Missing roster members.
  - Interactive Action Toolbar: Date navigator (`[◀ Prev]`, `[Today]`, `[Next ▶]`), search input, department filter, and status filter (`ALL`, `PRESENT`, `LATE`, `HALF_DAY`, `ON_LEAVE`, `UNPUNCHED`).
  - Daily Attendance Table (`w-full table-fixed`): Staff Member (28%), Shift & Grace (18%), Check-In (14%), Check-Out (14%), Net Worked (12%), and Status & Action (14%).
  - Row action `[✎]` to open audited adjustment drawer with mandatory justification reasoning.
- **Rotating Office QR Modal (`components/attendance/OfficeQRModal.tsx`)**:
  - High-contrast anti-proxy reception display with 30-second token rotation.
  - High-resolution dynamic QR code generation encoding rotating token and office metadata.
  - Animated circular SVG countdown ring tracking remaining seconds in current rotation cycle.
  - Deep Teal theme with Dark Void contrast and anti-spoofing security badges.
- **Mobile Scanner Terminal (`app/attendance/scan/page.tsx`)**:
  - Viewport-locked mobile interface (`max-w-md mx-auto`) with HTML5 camera viewfinder via `navigator.mediaDevices.getUserMedia`.
  - Target reticle scanning animation with pulsing laser line and corner brackets.
  - Desktop Dev Simulator Bar with `[⚡ Simulate Check-In Scan]` and `[⚡ Simulate Check-Out Scan]` for development and QA verification without physical cameras.
  - Haptic feedback pattern (`navigator.vibrate?.([100, 50, 100])`) and error alerts on unauthorized device or completed punch cycle.
- **Punch Celebration Screen (`app/attendance/success/page.tsx`)**:
  - High-energy celebratory view with multi-stage `canvas-confetti` cannon explosions on mount.
  - Spring-scale animated checkmark icon, punch confirmation badge (`CHECK-IN RECORDED` or `CHECK-OUT RECORDED`), server timestamp in IBM Plex Mono (`font-mono`), and device verification badge (`🟢 Device Verified & Matched`).
  - Action button: `[← Back to Dashboard]`.
- **Hardware Device Vault Modal (`components/staff/DeviceManagementModal.tsx`)**:
  - Device binding management, active device inspection, audited revocation with mandatory reason, and single-use enrollment QR generation with 15-minute expiry.
## Step 17 - Monthly Payroll Workspace, Salary Advance Desk & Printable Payslip Drawer

Status: implemented and automated quality gates passing in `feature/frontend-step-17-payroll-engine`.

Delivered:
- **Payroll Types & API Services (`types/payroll.ts`, `lib/payroll-api.ts`)**:
  - Exported canonical `PayrollStatus`, `SalaryAdvance`, `EmployeePayrollItem`, and `MonthlyPayrollRun` interfaces with full dual-compatibility normalization between FastAPI snake_case and client camelCase representations.
  - Connected endpoints: `generatePayrollRun()` (`POST /api/v1/payroll/generate`), `getPayrollRuns()` (`GET /api/v1/payroll/runs`), `getPayrollRunDetail()` (`GET /api/v1/payroll/runs/{id}`), `approvePayrollRun()` (`POST /api/v1/payroll/runs/{id}/approve`), `disbursePayrollRun()` (`POST /api/v1/payroll/runs/{id}/disburse`), `getMyPayslips()` (`GET /api/v1/payroll/my-payslips`), `requestSalaryAdvance()` (`POST /api/v1/payroll/advances`), `reviewSalaryAdvance()` (`PATCH /api/v1/payroll/advances/{id}`), and `getSalaryAdvances()` (`GET /api/v1/payroll/advances`).
- **Monthly Payroll Workspace (`app/(dashboard)/payroll/page.tsx`)**:
  - **Front-Desk Privacy Shield**: Rendered high-security unauthorized access barrier for non-HR/Admin roles with direct link to personal self-service payslips (`/payslips`).
  - **4-Card KPI Top Ribbon**: Total Gross Liability, Late Penalties Deducted, Advances Deducted, and Net Total Payable with numbers formatted in IBM Plex Mono (`font-mono tracking-tight font-black`).
  - **Itemized Payroll Ledger Table (`w-full table-fixed`)**: Comprehensive columns: Employee (24%), Base Pay (14%), Allowances (10%), Late Punches (12%), Deductions (16%), Net Payable (14%), and Slip Actions (10%).
  - **Workflow Controls**: One-click Calculate/Recalculate, Lock & Approve with confirmation state, and Record Disbursement with bank batch reference tracking.
- **Salary Advance Sub-Desk & Intake Modal**:
  - Interactive advance request drawer with employee selector, PKR amount validation, and mandatory reason notes.
  - Advance approval/rejection review controls feeding directly into monthly payroll net pay deduction formulas.
- **Printable Salary Voucher Drawer (`components/payroll/PayslipDrawer.tsx`)**:
  - Slide-over right drawer displaying company header, employee metadata, itemized earnings, attendance penalties, advance recoveries, net payable amount in IBM Plex Mono, bank account/IBAN details, and print-ready layout with `[Print Payslip]` button.
- **Verification & Quality Gates**:
  - TypeScript compiler (`npx.cmd tsc --noEmit --incremental false`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Unit/acceptance test suites (`tests/payroll-operations.test.cjs`, `tests/acceptance-matrix.test.cjs`): 23/23 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): 29/29 routes compiled cleanly with 0 errors.

## Step 18 - Employee Self-Service Portal & Personal Payslip Vault

Status: implemented and automated quality gates passing in `feature/frontend-step-18-portal-payslips`.

Delivered:
- **Portal API Service Layer (`lib/portal-api.ts`)**:
  - Connected to live FastAPI self-service endpoints (`/api/v1/portal`).
  - Methods: `getPortalProfile()` (`GET /api/v1/portal/me`), `getPersonalPayslips()` (`GET /api/v1/portal/payslips`), `getPayslipDetail(id)` (`GET /api/v1/portal/payslips/{id}`), `getAttendanceSummary()` (`GET /api/v1/portal/attendance-summary`), `getPersonalAdvances()` (`GET /api/v1/portal/advances`), and `requestAdvance()` (`POST /api/v1/portal/advances`).
  - Dual-compatibility model normalizing FastAPI `snake_case` payloads and frontend `camelCase` data structures with fallback to `DataContext`.
- **Employee Self-Service Workspace (`app/(portal)/payslips/page.tsx`)**:
  - **Employee Profile Ribbon**: Executive profile banner rendering initials badge, full name, employee code in IBM Plex Mono (`font-mono text-xs`), designation, department pill, assigned shift pill (e.g., "Regular Day Shift (09:00 - 18:00 • 15m Grace)"), and hardware-bound mobile device indicator (`🟢 Bound Phone: iPhone 15 Pro` or `⚪ Unenrolled`).
  - **4-Card Personal KPI Top Ribbon**:
    1. Latest Net Disbursed Salary in PKR (`font-mono font-bold text-xl`) with payment status badge (`PAID` in emerald, `PROCESSING` in amber).
    2. Current Month Attendance metrics ("X / Y Days Present") with standing badge (`🟢 Good Standing` or `⚠️ Review Needed`).
    3. Lateness / Penalty Tracker recording active month late punches with policy notice ("3 late punches past 15m grace deduct 1 gross daily wage").
    4. Active Advance Balance showing approved outstanding advance balance with `[+ Request Advance]` action button.
  - **Personal Payslip Vault Archive Table (`w-full table-fixed`)**:
    - Columns: Pay Period (15%), Issue Date (11%), Gross Earnings (13%), Policy Deductions (12%), Net Take-Home Salary (14%), Payment & Bank (14%), Status Badge (10%), and Action (11%).
    - Responsive, zero horizontal scrollbar design with empty state placeholder and action `[View]` opening printable salary voucher modal.
  - **Personal History Panels**:
    - Current Month Attendance Ledger displaying date, day, shift hours, check-in, check-out, and status badge.
    - Salary Advance History Ledger displaying request date, target payroll month, requested PKR amount, reason notes, and approval status badge (`APPROVED`, `PENDING`, `REJECTED`).
- **Printable Salary Voucher Modal (`components/portal/PersonalPayslipModal.tsx`)**:
  - Centered modal / slide-over dialog optimized for single-page print output via `@media print` CSS rules hiding navigation, action buttons, modals backdrop, and backgrounds.
  - Corporate header ("World Class Holidays (Pvt) Ltd." + "Confidential Employee Salary Voucher").
  - Comprehensive metadata grid: Employee Name, Code, CNIC, Department, Designation, Shift, Bank, and IBAN.
  - Two-column itemized breakdown: Gross Earnings (Basic Salary, Allowances, Bonuses/Incentives) vs Policy Deductions (Late arrivals penalty, Unpaid days deduction, Recouped advance).
  - Bottom summary banner displaying large Net Take-Home Salary in IBM Plex Mono (`font-mono`) and system verification stamp.
  - Footer actions: `[Close]`, `[📥 Export CSV]`, and `[🖨️ Print / Save as PDF]` invoking native `window.print()`.
- **Salary Advance Request Modal (`components/portal/RequestAdvanceModal.tsx`)**:
  - Modal form with numeric advance amount input in PKR, quick chips (+PKR 5,000, +PKR 10,000, +PKR 20,000, +PKR 30,000), target payroll month picker, mandatory reason text area, and policy acknowledgement checkbox ("I authorize recovery from my net salary in the selected payroll cycle").
  - High-contrast action button `[Submit Advance Request]` with explicit `text-white font-medium` styling.
- **Verification & Quality Gates**:
  - TypeScript compiler (`npx.cmd tsc --noEmit --incremental false`): 0 errors across workspace.
  - ESLint (`npm.cmd run lint`): 0 errors, 0 warnings.
  - Unit/acceptance test suites (`tests/payroll-operations.test.cjs`, `tests/acceptance-matrix.test.cjs`): 23/23 tests passing with 100% success.
  - Production Next.js build (`npm.cmd run build`): Clean compilation across all routes.

## Step 19.1 - Daily Cutoff Finalization & Absence Auto-Resolution Engine

Status: implemented and automated quality gates passing in `feature/forentend-step-19.1-attendance-finalizer`.

Delivered:
- **Reconciliation Engine & State Mutations (`context/DataContext.tsx`, `lib/attendance-operations.ts`)**:
  - Fulfills SRS §4.9.6 (FR-ATT-022) and §4.9.2 (FR-ATT-006) for automated daily cutoff reconciliation.
  - Scans all active employees (`status === 'ACTIVE'`) on the selected date:
    - **Case A (Checked in, missing check-out)**: Flags record with `notes: '... | MISSING_CHECKOUT: Pending HR review'`, preserving `checkInAt` and strictly never fabricating `checkOutAt` (FR-ATT-006).
    - **Case B (Unpunched, approved leave exists)**: Resolves to `status: 'ON_LEAVE'`, `workedMinutes: 0`, `lateMinutes: 0`, `source: 'MANUAL_HR'`, `notes: 'Auto-resolved from approved {leaveType} leave'`.
    - **Case C (Sunday weekly day off)**: Resolves to `status: 'WEEKLY_OFF'`, `workedMinutes: 0`, `lateMinutes: 0`, `source: 'AUTO_FINALIZER'`, `notes: 'Scheduled weekly day off'`.
    - **Case D (Unexcused absence)**: Resolves to `status: 'ABSENT'`, `workedMinutes: 0`, `lateMinutes: 0`, `source: 'AUTO_FINALIZER'`, `notes: 'Unexcused absence logged by Daily Finalization Engine'`.
  - Idempotent mutations stored directly into tenant localStorage key `tourflow_attendance_records_{tenantId}`.
- **Executive Reconciliation Modal (`components/attendance/AttendanceReconciliationModal.tsx`)**:
  - 5-Card Operational Impact Grid displaying live pre-run metrics:
    1. Active Roster Headcount (`Building2`, Slate)
    2. Present Today (`UserCheck`, Emerald)
    3. Approved Leave (`CheckCircle2`, Sky)
    4. Mark Absent (`UserMinus`, Rose)
    5. Missing Check-out (`ClockAlert`, Amber)
  - Automatic resolution preview and manual HR audit queue breakdown lists.
  - Time cutoff picker and date selector enforcing PKT cutoff rules.
  - High-contrast action CTA `[Confirm & Lock Daily Cutoff]` in purple `#7C3AED` with shadow and toast notifications.
- **Header Action Toolbar Integration (`app/(dashboard)/attendance/page.tsx`)**:
  - Guarded strictly for `AGENCY_ADMIN` and `HR_MANAGER` roles.
  - Added button `[⚡ Finalize Day Attendance]` adjacent to `[Manual Override]`.
- **Automated Test Suite & Quality Gates**:
  - Full suite run across all 23 test suites (`node --test tests/*.test.cjs`): **188/188 PASS (100%)**, 0 failures, 0 skipped.
  - TypeScript compiler (`npx.cmd tsc --noEmit`): 0 errors across workspace.
  - `git diff --check`: 0 formatting or whitespace errors.
  - Production Next.js build (`npm.cmd run build`): Clean compilation and static generation across all 29 routes.

## Step 19.2 - HR Executive Command Dashboard & Compliance Export Center

Status: implemented and verified on branch `feature/forentend-step-19.2-hr-executive-dashboard`.

Delivered:
- **Workforce Telemetry Ribbon (`app/(dashboard)/hr-dashboard/page.tsx`, `lib/hr-dashboard.ts`)**:
  - Office Occupancy Today KPI with on-duty ratio, on-time, late, and on-leave subtext.
  - Pending Leave Queue KPI with direct navigation to `/leave/admin`.
  - Outstanding Salary Advances liability KPI in PKR with pending cycle count.
  - Active Payroll Run status pill with Gross Outflow PKR and `/payroll` link.
- **Floor Presence Grid & Security Audit Feed**:
  - Live employee cards with avatar, department, work shift, device status (Bound/Revoked/Unenrolled), and punch state (Present, Late, On Leave, Absent, Awaiting Punch).
  - Chronological audit feed aggregating manual attendance adjustments, device token revocations, approved/rejected leaves, and salary advance reviews with actor & timestamp attribution.
- **Compliance & Audit Export Center**:
  - Attendance Ledger CSV export with date range, department, and status filters (includes Notes/justifications).
  - Master Payroll Summary CSV export with complete compensation, deductions, net payable, and Bank IBAN breakdown for `AGENCY_ADMIN` (sanitized status-only export for `HR_MANAGER`).
- **Sidebar Integration & Access Control**:
  - Added "HR Dashboard" item under HR category with `<LayoutDashboard />` icon in `components/layout/Sidebar.tsx`, guarded for `AGENCY_ADMIN` and `HR_MANAGER`.
## Step 21 - Executive Analytics, Departure Cost Sheets & Super Admin Governance

Status: implemented and verified on branch `feature/frontend-step-21-analytics-platform-governance`.

Delivered:
- **Departure Supplier Costing Tab & Margin Calculator (`components/tours/TourFinancialsTab.tsx`, `lib/analytics-governance.ts`)**:
  - Live margin and profitability ribbon: Gross Revenue, Direct Costs, Net Margin, ROI %.
  - Expense breakdown by category: Flight, Hotel, Transport, Visa, Activity, Misc.
  - Interactive "Add Expense" drawer with real-time recalculation and zero-cost margin safety guards.
- **Executive Financial Analytics Ribbon & Receivables Aging (`app/(dashboard)/dashboard/page.tsx`)**:
  - Executive financial KPIs: Gross Revenue, Collected Revenue, Direct Vendor Expenses, Net Profit Margin.
  - Receivables Aging breakdown: Current (0-30d), 31-60d, 61-90d, 90+d overdue.
  - Front-Desk Privacy Shield hiding sensitive margin data from non-admin roles.
- **Super Admin Tenant & License Management Desk (`app/(super-admin)/super-admin/tenants/page.tsx`)**:
  - Tenant directory with subscription status toggles (`ACTIVE`, `GRACE_PERIOD`, `SUSPENDED`).
  - License duration calculator and plan tier management (`STARTER`, `PROFESSIONAL`, `ENTERPRISE`).
- **Automated Test Suite (`tests/analytics-governance.test.cjs`)**:
  - 10/10 tests passing covering cost math, aging buckets, license duration, and multi-tenant scoping.

## Step 22 - Full-Suite Acceptance Matrix (TC-01 to TC-18), Error Boundary Hardening & Client Sign-Off Readiness

Status: implemented and verified on branch `feature/frontend-step-22-acceptance-matrix-hardening`.

Delivered:
- **Global & Route-Level Error Boundaries (`app/error.tsx`, `app/global-error.tsx`)**:
  - `app/error.tsx`: Root route boundary with TourFlow Design System card (`#030712` void / `#FFFFFF` surface / `#1B7167` deep teal), diagnostic error digest/stack tracking, and recovery actions (`[🔄 Try Again]` with `reset()`, `[🏠 Return to Dashboard]`).
  - `app/global-error.tsx`: Root HTML/body error boundary with inline resilient styles and diagnostic error tracking for fatal root crashes.
- **Empty States & Defensive UI Safeguards**:
  - `/dashboard`: Zero-activity guidance banner when tours, invoices, and leads are empty.
  - `/tours/[id]`: Tab 5 (Costing & Profitability) zero-cost guidance banner (`tourExpenses.length === 0`) preserving safe `0.0%` ROI math without `NaN` or `Infinity`.
  - `/visa-pipeline`: Empty Kanban column placeholders ("No cases").
  - `/attendance`: Defensive fallback for empty search/date attendance records.
- **18-Point Client Acceptance Test Suite (`tests/acceptance-matrix.test.cjs`)**:
  - Deterministic Node test suite using `node:test` and `node:assert/strict` covering all formal test cases (TC-01 to TC-18) specified in SRS §12:
    - **TC-01 (Lead Deduplication)**: Duplicate phone submission flags existing client match.
    - **TC-02 (Atomic Booking Conversion)**: Locks seats, allocates `WCH-BK-XXXXXX`, and generates invoice.
    - **TC-03 (Inventory Concurrency / Oversell Guard)**: Rejects booking requests exceeding available departure seats.
    - **TC-04 (6-Month Passport Rule)**: Passports expiring within 6 months of departure flag `⚠️ EXPIRING SOON`.
    - **TC-05 (Two-Step Payment Verification Gate)**: Submission sets `PENDING_VERIFICATION`; invoice paid balance only increments upon Admin approval.
    - **TC-06 (Cancellation Inventory Release)**: Admin cancellation releases seat count back to available inventory.
    - **TC-07 (Device-Bound QR Enrollment)**: Hardware token bound to employee; secondary phone cannot spoof attendance.
    - **TC-08 (Dual-Scan Attendance Lifecycle)**: 1st scan = `CHECK-IN`, 2nd scan = `CHECK-OUT`, 3rd scan = rejected.
    - **TC-09 (Attendance Shift Grace Period)**: Check-ins after 09:15 AM calculate correct `lateMinutes`.
    - **TC-10 (Cutoff Sweep Resolution)**: Unpunched employees without leave resolve to `ABSENT`.
    - **TC-11 (Leave Payroll Protection)**: Approved paid leave resolves to `ON_LEAVE` and incurs 0 absence deduction.
    - **TC-12 (3-Late Rule Deduction)**: Every 3 late arrivals incur exactly 1 gross daily wage deduction (Gross / 26).
    - **TC-13 (Approved Salary Advance Deduction)**: Approved advances decrement `netPayableSalary` in the active payroll run.
    - **TC-14 (Front-Desk Privacy Shield)**: Role checks verify `FRONT_DESK` cannot read supplier vendor costs, executive net profit, or staff compensation.
    - **TC-15 (Visa Safe-Custody Transfer History)**: Moving passport location writes immutable custody event log.
    - **TC-16 (Division-by-Zero Margin Guard)**: 0 direct expenses safely returns 0% ROI without `NaN` or `Infinity`.
    - **TC-17 (Multi-Tenant Isolation)**: Data queries for `tenantA` never return records matching `tenantB`.
    - **TC-18 (Super Admin Lifecycle Controls)**: Tenant subscription status toggles (`ACTIVE`, `GRACE_PERIOD`, `SUSPENDED`) and license days math.
- **Verification & Automated Quality Gates**:
  - Acceptance Matrix Suite (`node --test tests/acceptance-matrix.test.cjs`): **18/18 PASS (100%)**.
  - Complete Test Suite (`node --test tests/*.test.cjs`): **193/193 PASS (100%)** across 23 test suites.
  - TypeScript compiler (`npx.cmd tsc --noEmit`): **0 errors**.
  - ESLint (`npm.cmd run lint`): **0 errors, 0 warnings**.
  - Production Next.js build (`npm.cmd run build`): **Compiled successfully (29/29 routes statically generated)**.

## Step 23 - SaaS Growth Engine & Governance Plane

Status: implemented and verified without Git operations or browser automation.

Delivered:
- **Public growth funnel**: Added the `/` marketing site, interactive product previews, plan cards, security positioning, FAQ, and `/signup` 14-day demo onboarding.
- **Demo tenant provisioning**: Added `POST /api/v1/auth/signup-demo` to create an isolated `AGENCY_ADMIN`, issue a JWT, and provision a 14-day Starter license with default modules and limits.
- **Persistent governance model**: Added demo metadata, plan expiry, feature entitlements, staff/departure limits, tenant branding, owner phone, and a governance audit table with an idempotent MySQL migration.
- **Super Admin control plane**: Replaced mock tenant controls with API-backed telemetry, tenant provisioning, license extension, audited status changes, and module/limit management at `/super-admin/tenants`.
- **License enforcement**: Expired tenants receive a structured `TENANT_LICENSE_EXPIRED` response, are redirected to `/upgrade`, and receive a two-day trial banner before expiry.
- **Module entitlements**: Dashboard routes enforce the tenant's CRM, tours, visa, attendance, and payroll flags in addition to existing employee screen permissions.
- **Safe API errors**: Unhandled backend failures always use the standard JSON error envelope instead of returning local debug tracebacks.

Verification:
- Backend full pytest suite: PASS.
- Frontend acceptance and governance suite: **21/21 PASS**.
- TypeScript (`npx.cmd tsc --noEmit --incremental false`): PASS.
- ESLint (`npm.cmd run lint`): PASS.
- Next.js production build: PASS, with **31/31 routes generated**, including `/`, `/signup`, `/dashboard`, `/upgrade`, and `/super-admin/tenants`.

## Step 23.1 - Exact SaaS Contract Alignment & Operator Portal

Status: implemented and verified without Git commands or automated browser tools.

Delivered:
- Added the isolated `/admin/login` Platform Operator portal with strict `SUPER_ADMIN` rejection messaging and session hydration.
- Updated the Next.js 16 proxy with public marketing, signup, operator-login, attendance-scan, and attendance-success routes; unauthenticated governance traffic now redirects to `/admin/login`, while agency roles are redirected to their own workspace.
- Moved the landing, signup, and governance pages to the exact requested `app/` filesystem paths and removed the obsolete `/tenants` alias.
- Added `subscription_status` to tenants and `old_value` to governance audit logs through the idempotent live-database migration.
- Added the exact `schemas/super_admin.py` request/response contracts and `deps.get_current_super_admin` guard.
- Aligned demo signup with `owner_password`, `base_currency`, `subdomain`, and `expires_at`; the trial provisions 10 staff slots and a 14-day `STARTER` license.
- Updated the governance console with Platform MRR, uppercase lifecycle states, fixed-table layout, +14/+30/+90/+180/+365 extensions, mandatory suspension reasons, module flags, and staff/departure limits.
- Added deterministic role-route and Super Admin utility coverage.

Verification:
- Complete backend pytest suite: PASS.
- Focused governance suite: **5/5 PASS**.
- Frontend acceptance and governance suites: **22/22 PASS**.
- TypeScript and ESLint: PASS.
- Production build: PASS, **31/31 routes generated**, including `/admin/login`.

## Step 23.2 - Login Cleanup & Landing-Page Logout Recovery

Status: implemented and verified.

Delivered:
- Removed the complete Quick Demo Presets / one-click-login section and all preset credential handlers from `/login`.
- Explicit sign-out now clears every session token and returns to the public landing page at `/` from agency, employee portal, and Super Admin layouts.
- Centralized public-route matching in `lib/route-access.ts` for the Next.js proxy, authentication context, and API client.
- Expired tokens encountered on public pages are cleared without forcing visitors back to `/login?reason=expired`; protected workspaces still show the expired-session login notice.
- Added deterministic checks proving public routes remain public without widening protected route prefixes.

Verification:
- Frontend acceptance and route-governance suites: **23/23 PASS**.
- TypeScript and ESLint: PASS.
- Production build: PASS, **31/31 routes generated**.



## Step 24 - Internal Credential Provisioning, Forced Reset & Staff PIN Vault

Status: implemented and verified without Git commands, external gateways, or automated browser tools.

Delivered:
- Added must_change_password, bcrypt-only temporary OTP storage, and 24-hour OTP expiry to Agency Admin accounts, with a non-destructive startup schema check for existing MySQL installations.
- Added Super Admin credential reissue from /super-admin/tenants; the API generates a high-entropy temporary password and single-use 6-digit OTP, returns plaintext only in the one-time response, and writes a secret-free governance audit record.
- Forced-reset accounts receive no workspace or terminal token at login. Existing profile tokens are rejected from the database state, and a forced-reset Agency Admin cannot bypass the gate through a workstation PIN.
- Added /reset-password with 6-digit OTP validation, permanent password confirmation, one-time OTP clearing, audited completion, and a new seven-day terminal session.
- Restricted staff roles, screen permissions, login credentials, and PIN changes to Agency Admin governance. Removed Super Admin from the agency staff-role selector.
- Added secure Web Crypto generation plus reveal/copy/reset controls for 4-digit staff PINs. Existing PINs remain bcrypt hash-only and are replaced when forgotten.
- Updated stale document and supplier route assertions to validate the current centralized permission table.

Verification:
- Complete backend pytest suite: PASS.
- Complete deterministic frontend suite: **202/202 PASS**.
- Focused frontend profile and governance suite: **9/9 PASS**.
- TypeScript (node_modules/.bin/tsc.cmd --noEmit): PASS.
- ESLint (npm.cmd run lint): PASS.
- Next.js production build: PASS, **33/33 static pages generated**, including /reset-password.

## Step 24.1 - Credential Login Verification UI

Status: implemented and verified.

Delivered:
- Added a show/hide password control to the login password field and removed the inactive forgot-password affordance.
- Added one-click copying for the exact Agency Admin email, temporary password, and temporary OTP in the Super Admin credential panel.
- Confirmed the regenerated World Class Agency Admin account is in forced-reset state with a bcrypt password hash and an active temporary OTP; the observed 401 is a password-value mismatch rather than a missing credential-reset record.

Verification:
- Backend credential and authentication tests: PASS.
- Focused frontend login and governance tests: **16/16 PASS**.
- ESLint and TypeScript: PASS.
- Production build artifacts generated successfully after compilation.

## Step 24.2 - Agency Owner Profile PIN at Forced Reset

Status: implemented and verified.

Delivered:
- Added a required 4-digit Profile PIN to the Agency Admin forced-reset contract.
- The successful reset now bcrypt-hashes the PIN, activates owner terminal-profile access, clears any prior PIN lock, and records the reset audit without storing a secret.
- Restyled the reset page from the dark terminal presentation to the light primary-color application theme.

Verification:
- Forced reset, profile unlock, and credential-governance backend tests: PASS.
- Focused frontend login/reset tests: **12/12 PASS**.
- ESLint and TypeScript: PASS.

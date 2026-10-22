import { conversionTotal } from "@/lib/lead-operations";
import type { CRMState } from "@/lib/lead-operations";
import type {
  Booking,
  RefundRecord,
  InstallmentMilestone,
  Invoice,
  OfficeExpense,
  Passenger,
  Payment,
  PaymentMethod,
  TourExpense,
  TourPackage,
  TravelerManifestItem,
  LegacyVisaCase as VisaCase,
  VaultDocument,
  Supplier,
} from "@/types/erp";

export interface ERPState extends CRMState {
  paymentProofClaims?: import("@/types/erp").PaymentProofClaim[];
  recoveryCallLogs?: import("@/types/erp").RecoveryCallLog[];
  bookings: Booking[];
  tours: TourPackage[];
  passengers: Passenger[];
  visaCases: VisaCase[];
  invoices: Invoice[];
  expenses: TourExpense[];
  officeExpenses?: OfficeExpense[];
  vaultDocuments?: VaultDocument[];
  suppliers?: Supplier[];
}

export interface BookingDraftInput {
  clientId: string;
  conversion?: import("@/lib/lead-operations").Conversion;
  assignedRep?: string;
  milestones: (Pick<InstallmentMilestone, "amount" | "dueDate"> & { name?: string; title?: string })[];
}

export interface BookingPaymentInput {
  amount: number;
  method: PaymentMethod;
  paymentDate: string;
  reference?: string;
}

export type CancellationInput = Pick<RefundRecord,
  "cancellationFeeRetained" | "refundMethod" | "refundReference" | "reasonCategory" | "notes">;

export function cancelBookingTransaction(
  state: ERPState, tenantId: string, id: string, input: CancellationInput,
  actor: { id: string; role: string; tenantId?: string | null }, now: string, uuid: () => string,
): ERPState {
  if (actor.role !== "AGENCY_ADMIN" || actor.tenantId !== tenantId)
    throw new Error("Access restricted: only agency admins can cancel bookings.");
  const booking = findBooking(state, tenantId, id);
  if (booking.status !== "CONFIRMED" || booking.refund)
    throw new Error("Only a confirmed booking can be cancelled once.");
  const invoice = state.invoices.find(i => i.id === booking.invoiceId && i.bookingId === id && i.tenantId === tenantId);
  if (!invoice || invoice.status === "CANCELLED" || invoice.refund)
    throw new Error("An active linked invoice is required.");
  const paid = cents(invoice.paidAmount);
  const retained = cents(input.cancellationFeeRetained);
  if (retained > paid) throw new Error("Retained fee cannot exceed the amount paid.");
  if (!["CASH", "BANK_WIRE", "ORIGINAL_PAYMENT"].includes(input.refundMethod) ||
      !["CLIENT_REQUEST", "VISA_REJECTION", "MEDICAL_EMERGENCY", "TOUR_POSTPONED", "OTHER"].includes(input.reasonCategory))
    throw new Error("Select a valid refund method and cancellation reason.");
  const refund: RefundRecord = {
    id: uuid(), bookingId: id, invoiceId: invoice.id,
    totalPaidBeforeCancellation: paid / 100, cancellationFeeRetained: retained / 100,
    refundAmountIssued: (paid - retained) / 100, refundMethod: input.refundMethod,
    refundReference: input.refundReference?.trim(), reasonCategory: input.reasonCategory,
    notes: input.notes?.trim(), processedBy: actor.id, processedAt: now,
  };
  let tours = state.tours;
  if (booking.serviceType === "GROUP_TOUR") {
    const tour = tours.find(t => t.id === booking.packageId && t.tenantId === tenantId);
    if (!tour || !Number.isInteger(booking.paxCount) || booking.paxCount <= 0 || tour.bookedSeats < booking.paxCount)
      throw new Error("Tour seat allocation is inconsistent; cancellation was not saved.");
    if (["IN_PROGRESS", "COMPLETED"].includes(tour.status))
      throw new Error("Cannot release seats on an in-progress or completed tour.");
    const bookedSeats = tour.bookedSeats - booking.paxCount;
    tours = tours.map(t => t.id === tour.id && t.tenantId === tenantId ? {
      ...t, bookedSeats, status: bookedSeats / t.maxCapacity >= 0.8 ? "FILLING_FAST" : "OPEN",
    } : t);
  }
  // Preserve commercial documents and receipts; remove only active allocations.
  return {
    ...state, tours,
    bookings: state.bookings.map(b => b.id === id && b.tenantId === tenantId ? {
      ...b, status: "CANCELLED", cancellationReason: input.reasonCategory,
      cancelledAt: now, cancelledBy: actor.id, refund,
    } : b),
    invoices: state.invoices.map(i => i.id === invoice.id && i.tenantId === tenantId ? {
      ...i, status: "CANCELLED", dueAmount: 0, refund,
    } : i),
    passengers: state.passengers.filter(p => !(p.bookingId === id && p.tourId === booking.packageId)),
    visaCases: state.visaCases.map(v => v.bookingId === id && v.tenantId === tenantId ? {
      ...v, cancelledAt: now, updatedAt: now,
    } : v),
  };
}

export type TravelerUpdate = Pick<
  TravelerManifestItem,
  "fullName" | "phone" | "passportNo" | "passportExpiry" | "dateOfBirth" | "roomPreference" | "assignedRoomId" | "roommateId" | "documents" | "notes"
>;

function cents(amount: number): number {
  const units = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(units))
    throw new Error(
      "Enter a valid non-negative amount within the supported range.",
    );
  return units;
}

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function numberFor(prefix: string, numbers: string[]): string {
  const maximum = numbers.reduce((max, number) => {
    const match = number.match(new RegExp(`^${prefix}-(\\d{6})$`));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  if (maximum >= 999999) throw new Error("Document number range exhausted.");
  return `${prefix}-${String(maximum + 1).padStart(6, "0")}`;
}

function findBooking(state: ERPState, tenantId: string, id: string): Booking {
  const booking = state.bookings.find(
    (b) => b.id === id && b.tenantId === tenantId,
  );
  if (!booking) throw new Error("Booking not found in this agency.");
  return booking;
}

export function createBookingDraft(
  state: ERPState,
  tenantId: string,
  input: BookingDraftInput,
  now: string,
  uuid: () => string,
): { state: ERPState; booking: Booking } {
  const client = state.clients.find(
    (c) => c.id === input.clientId && c.tenantId === tenantId,
  );
  if (!client) throw new Error("Client not found in this agency.");
  if (
    !input.conversion && state.bookings.some(
      (b) =>
        b.tenantId === tenantId &&
        b.leadId === client.leadId &&
        b.status !== "CANCELLED",
    )
  )
    throw new Error("This conversion already has a booking.");
  const conversion = input.conversion ?? client.conversion;
  const total = conversionTotal(conversion, state.tours, tenantId);
  const totalUnits = cents(total);
  if (!input.milestones.length || input.milestones.length > 20)
    throw new Error("Provide between 1 and 20 installment milestones.");
  let scheduled = 0;
  let previousDate = "";
  const milestones = input.milestones.map((ms) => {
    const milestoneName = (ms.name || ms.title || "").trim();
    if (!milestoneName || !validDate(ms.dueDate) || ms.dueDate < previousDate)
      throw new Error(
        "Milestones need a name and valid dates in chronological order.",
      );
    previousDate = ms.dueDate;
    scheduled += cents(ms.amount);
    if (!Number.isSafeInteger(scheduled))
      throw new Error("Milestone total is too large.");
    return {
      id: uuid(),
      name: milestoneName,
      title: milestoneName,
      amount: cents(ms.amount) / 100,
      dueDate: ms.dueDate,
      isPaid: false,
    };
  });
  if (scheduled !== totalUnits)
    throw new Error("Milestones must equal the agreed booking total.");
  const tour =
    conversion.kind === "GROUP_TOUR"
      ? state.tours.find(
          (t) => t.id === conversion.tourId && t.tenantId === tenantId,
        )
      : undefined;
  const lead = state.leads.find(
    (l) => l.id === client.leadId && l.tenantId === tenantId,
  );
  const id = uuid();
  // Visa fees in the existing conversion model are for one applicant; custom rates are package totals.
  const paxCount = conversion.kind === "GROUP_TOUR" ? conversion.pax : 1;
  const booking: Booking = {
    id,
    bookingNumber: numberFor(
      "WCH-BK",
      state.bookings
        .filter((b) => b.tenantId === tenantId)
        .map((b) => b.bookingNumber),
    ),
    tenantId,
    leadId: input.conversion ? undefined : client.leadId,
    quoteConversion: conversion,
    clientId: client.id,
    clientName: client.fullName,
    clientPhone: client.phone,
    serviceType:
      conversion.kind === "VISA" ? "VISA_CONSULTANCY" : conversion.kind,
    packageId: tour?.id,
    packageTitle:
      tour?.title ??
      (conversion.kind === "VISA"
        ? `${conversion.country} - ${conversion.category}`
        : "description" in conversion
          ? conversion.description
          : "Group Tour"),
    paxCount,
    agreedPricePerPax:
      conversion.kind === "GROUP_TOUR"
        ? cents(conversion.pricePerPerson) / 100
        : undefined,
    totalAgreedAmount: totalUnits / 100,
    assignedRep: input.assignedRep || lead?.assignedTo || "Unassigned",
    status: "DRAFT",
    milestones,
    createdAt: now,
    travelers: Array.from({ length: paxCount }, (_, index) => ({
      id: uuid(),
      bookingId: id,
      slotNumber: index + 1,
      fullName: index === 0 ? client.fullName : "",
      documents: { passportCopyUploaded: false, visaGranted: false, ticketIssued: false },
      isComplete: false,
    })),
  };
  return {
    state: { ...state, bookings: [booking, ...state.bookings] },
    booking,
  };
}

export function payInvoice(
  state: ERPState,
  tenantId: string,
  invoiceId: string,
  input: BookingPaymentInput,
  actor: string,
  uuid: () => string,
): ERPState {
  const invoice = state.invoices.find(
    (i) => i.id === invoiceId && i.tenantId === tenantId,
  );
  if (!invoice) throw new Error("Invoice not found in this agency.");
  if (invoice.status === "CANCELLED") throw new Error("Cancelled invoices cannot accept payments.");
  if (
    !validDate(input.paymentDate) ||
    ![
      "Cash",
      "Bank Transfer",
      "Credit Card",
      "Cheque",
      "Online Portal",
    ].includes(input.method)
  )
    throw new Error("Select a valid payment date and method.");
  const booking = invoice.bookingId
    ? findBooking(state, tenantId, invoice.bookingId)
    : undefined;
  if (booking && booking.status !== "CONFIRMED")
    throw new Error("Only confirmed bookings accept payments.");
  const amount = cents(input.amount);
  const paid = cents(invoice.paidAmount) + amount;
  const total = cents(invoice.totalAmount);
  if (amount <= 0 || paid > total)
    throw new Error(
      "Payment must be positive and cannot exceed the remaining balance.",
    );
  const payment: Payment = {
    id: uuid(),
    invoiceId,
    amount: amount / 100,
    paymentDate: input.paymentDate,
    method: input.method,
    reference: input.reference?.trim(),
    receiptNo: numberFor(
      "WCH-REC",
      state.invoices
        .filter((i) => i.tenantId === tenantId)
        .flatMap((i) => i.installments.map((p) => p.receiptNo)),
    ),
    recordedBy: actor,
  };
  let accumulated = 0;
  const milestones = invoice.milestones?.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((ms) => {
    accumulated += cents(ms.amount);
    return accumulated <= paid
      ? {
          ...ms,
          status: "Paid" as const,
          paidAt: ms.paidAt || payment.paymentDate,
          receiptNo: ms.receiptNo || payment.receiptNo,
        }
      : ms;
  });
  const updated: Invoice = {
    ...invoice,
    paidAmount: paid / 100,
    dueAmount: (total - paid) / 100,
    status: paid === total ? "PAID" : "PARTIALLY_PAID",
    milestones,
    installments: [...invoice.installments, payment],
  };
  return {
    ...state,
    invoices: state.invoices.map((i) => (i.id === invoice.id ? updated : i)),
    bookings: state.bookings.map((b) =>
      b.id === booking?.id
        ? {
            ...b,
            paymentStatus: paid === total ? "PAID" as const : "PARTIALLY_PAID" as const,
            milestones: b.milestones.map((ms) => {
              const match = milestones?.find((m) => m.id === ms.id);
              return {
                ...ms,
                isPaid: match?.status === "Paid",
                paidAt: match?.paidAt,
              };
            }),
          }
        : b,
    ),
    passengers: state.passengers.map((p) =>
      booking && p.bookingId === booking.id
        ? { ...p, paymentStatus: paid === total ? "PAID" : "PARTIAL" }
        : p,
    ),
  };
}

export function confirmBookingTransaction(
  state: ERPState,
  tenantId: string,
  id: string,
  actor: string,
  now: string,
  uuid: () => string,
  token?: BookingPaymentInput,
): ERPState {
  const booking = findBooking(state, tenantId, id);
  if (booking.status !== "DRAFT" || booking.invoiceId)
    throw new Error(
      "Only a draft can be confirmed; this booking may already be confirmed.",
    );
  const client = state.clients.find(
    (c) => c.id === booking.clientId && c.tenantId === tenantId,
  );
  if (!client) throw new Error("The booking client no longer exists.");
  let tours = state.tours;
  let passengers = state.passengers;
  let visaCases = state.visaCases;
  if (booking.serviceType === "GROUP_TOUR") {
    const tour = tours.find(
      (t) => t.id === booking.packageId && t.tenantId === tenantId,
    );
    if (!tour || !["OPEN", "FILLING_FAST", "GUARANTEED"].includes(tour.status))
      throw new Error("Tour is not open for bookings.");
    if (tour.bookedSeats + booking.paxCount > tour.maxCapacity)
      throw new Error("Not enough seats available for this booking.");
    tours = tours.map((t) =>
      t.id === tour.id
        ? {
            ...t,
            bookedSeats: t.bookedSeats + booking.paxCount,
            status:
              t.bookedSeats + booking.paxCount === t.maxCapacity
                ? "SOLD_OUT"
                : t.status,
          }
        : t,
    );
    passengers = [
      ...passengers,
      ...booking.travelers.map((traveler) => ({
        id: uuid(),
        bookingId: id,
        travelerId: traveler.id,
        tourId: tour.id,
        name: traveler.fullName || "Traveler details pending",
        familyGroup: booking.bookingNumber,
        passportNo: traveler.passportNo || "",
        passportExpiryDate: traveler.passportExpiry || "",
        roomAllocation: roomAllocation(traveler.roomPreference),
        paymentStatus:
          booking.totalAgreedAmount === 0
            ? ("PAID" as const)
            : ("UNPAID" as const),
        contactPhone: booking.clientPhone,
      })),
    ];
  } else if (booking.serviceType === "VISA_CONSULTANCY") {
    const conversion = booking.quoteConversion ?? client.conversion;
    if (conversion.kind !== "VISA")
      throw new Error("Visa conversion details are missing.");
    visaCases = [
      ...visaCases,
      ...booking.travelers.map((traveler) => ({
        id: uuid(),
        tenantId,
        bookingId: id,
        travelerId: traveler.id,
        clientName: traveler.fullName || "Applicant details pending",
        passportNo: traveler.passportNo || "",
        country: conversion.country,
        flagEmoji: "",
        visaType: conversion.category,
        stage: "Document Collection" as const,
        appointmentDate: "",
        consultantName: booking.assignedRep,
        feeAmount: booking.totalAgreedAmount,
        updatedAt: now,
        documents: [
          "Passport Copy",
          "Bank Statements",
          "Photos",
          "Application Form",
        ].map((name) => ({
          id: uuid(),
          name,
          required: true,
          status: "Pending" as const,
        })),
      })),
    ];
  }
  const invoiceId = uuid();
  const invoice: Invoice = {
    id: invoiceId,
    bookingId: id,
    clientId: client.id,
    tenantId,
    invoiceNumber: numberFor(
      "WCH-INV",
      state.invoices
        .filter((i) => i.tenantId === tenantId)
        .map((i) => i.invoiceNumber),
    ),
    clientName: booking.clientName,
    clientPhone: booking.clientPhone,
    clientEmail: client.email,
    tourId: booking.packageId,
    serviceDescription: booking.packageTitle,
    totalAmount: booking.totalAgreedAmount,
    paidAmount: 0,
    dueAmount: booking.totalAgreedAmount,
    status: booking.totalAgreedAmount === 0 ? "PAID" : "UNPAID",
    dueDate: booking.milestones.at(-1)!.dueDate,
    createdAt: now.slice(0, 10),
    installments: [],
    milestones: booking.milestones.map((ms) => ({
      id: ms.id,
      title: ms.name,
      percentage: booking.totalAgreedAmount
        ? (ms.amount / booking.totalAgreedAmount) * 100
        : 0,
      amount: ms.amount,
      dueDate: ms.dueDate,
      status: ms.amount === 0 ? "Paid" : "Pending",
      paidAt: ms.amount === 0 ? now.slice(0, 10) : undefined,
    })),
    lineItems: [
      {
        id: uuid(),
        description: booking.packageTitle,
        category:
          booking.serviceType === "VISA_CONSULTANCY"
            ? "Visa Fee"
            : "Tour Package",
        quantity:
          booking.agreedPricePerPax === undefined ? 1 : booking.paxCount,
        unitPrice: booking.agreedPricePerPax ?? booking.totalAgreedAmount,
        totalPrice: booking.totalAgreedAmount,
      },
    ],
  };
  const confirmed: Booking = {
    ...booking,
    status: "CONFIRMED",
    invoiceId,
    confirmedAt: now,
    confirmedBy: actor,
    milestones: booking.milestones.map((ms) => ({
      ...ms,
      isPaid: ms.amount === 0,
      paidAt: ms.amount === 0 ? now.slice(0, 10) : undefined,
    })),
  };
  const next: ERPState = {
    ...state,
    tours,
    passengers,
    visaCases,
    bookings: state.bookings.map((b) => (b.id === id ? confirmed : b)),
    invoices: [invoice, ...state.invoices],
  };
  // A quoted deposit is not a receipt: only explicit payment input posts money.
  return token
    ? payInvoice(next, tenantId, invoiceId, token, actor, uuid)
    : next;
}

function roomAllocation(
  room?: TravelerManifestItem["roomPreference"],
): Passenger["roomAllocation"] {
  return room === "SINGLE"
    ? "Single Room"
    : room === "DOUBLE"
      ? "Double Room"
      : room === "TRIPLE"
        ? "Triple Room"
        : room === "FAMILY"
          ? "Family Suite"
          : undefined;
}

export function updateBookingTraveler(
  state: ERPState,
  tenantId: string,
  bookingId: string,
  travelerId: string,
  input: TravelerUpdate,
  now: string,
): ERPState {
  const booking = findBooking(state, tenantId, bookingId);
  if (!["DRAFT", "CONFIRMED"].includes(booking.status))
    throw new Error("This booking cannot be edited.");
  if (!booking.travelers.some((t) => t.id === travelerId))
    throw new Error("Traveler not found in this booking.");
  if (input.passportExpiry && !validDate(input.passportExpiry))
    throw new Error("Enter a valid passport expiry date.");
  if (
    input.roomPreference &&
    !["SINGLE", "DOUBLE", "TRIPLE", "FAMILY"].includes(input.roomPreference)
  )
    throw new Error("Select a valid room preference.");
  const existing = booking.travelers.find((t) => t.id === travelerId)!;
  const traveler: TravelerManifestItem = {
    ...existing,
    ...input,
    id: travelerId,
    bookingId,
    fullName: input.fullName?.trim() || "",
    passportNo: input.passportNo?.trim() || undefined,
    passportExpiry: input.passportExpiry || undefined,
    isComplete: Boolean(input.fullName?.trim() && input.passportNo?.trim() && input.passportExpiry),
  };
  return {
    ...state,
    bookings: state.bookings.map((b) =>
      b.id === bookingId
        ? {
            ...b,
            travelers: b.travelers.map((t) =>
              t.id === travelerId ? traveler : t,
            ),
          }
        : b,
    ),
    passengers: state.passengers.map((p) =>
      p.bookingId === bookingId && p.travelerId === travelerId
        ? {
            ...p,
            name: traveler.fullName || "Traveler details pending",
            passportNo: traveler.passportNo || "",
            passportExpiryDate: traveler.passportExpiry || "",
            roomAllocation: roomAllocation(traveler.roomPreference),
          }
        : p,
    ),
    visaCases: state.visaCases.map((v) =>
      v.tenantId === tenantId &&
      v.bookingId === bookingId &&
      v.travelerId === travelerId
        ? {
            ...v,
            clientName: traveler.fullName || "Applicant details pending",
            passportNo: traveler.passportNo || "",
            updatedAt: now,
          }
        : v,
    ),
  };
}

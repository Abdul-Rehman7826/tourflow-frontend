import * as source from './operational-source';
import type { Booking, Invoice, Lead, Passenger, PaymentProofClaim, RecoveryCallLog, TourPackage } from '@/types/erp';
import type { Client, Conversion } from '@/lib/lead-operations';

export const OPERATIONAL_TENANT_ID = 'tenant-world-class';
export const mockStaff = source.mockStaff;
const tenantId = OPERATIONAL_TENANT_ID;

export const mockTours: TourPackage[] = source.mockTours.map(tour => ({
  ...tour, tenantId, pricePerPerson: tour.basePricePerPax,
  bookedSeats: source.mockBookings.filter(b => b.packageId === tour.id).reduce((n, b) => n + b.paxCount, 0),
  // The supplied first three return dates include one day beyond the advertised duration.
  returnDate: new Date(Date.parse(tour.departureDate) + (tour.durationDays - 1) * 86400000).toISOString().slice(0, 10),
  durationNights: tour.durationDays - 1,
  destinations: tour.destinations.map(d => ({ ...d })), inclusions: [],
  itinerary: tour.itinerary.map(day => ({ ...day, activities: [...day.activities], mealsIncluded: [...day.mealsIncluded] })),
  flightBlock: { ...tour.flightBlock }, rooms: [],
}));

export const mockBookings: Booking[] = source.mockBookings.map(booking => {
  const tour = mockTours.find(t => t.id === booking.packageId)!;
  const rawInvoice = source.mockInvoices.find(i => i.bookingId === booking.id);
  const invoiceId = rawInvoice?.id || `inv-${booking.id}`;
  const schedule = rawInvoice?.milestones.map(ms => ({ id: ms.id, name: ms.title, amount: ms.amount, dueDate: ms.dueDate, isPaid: ms.status === 'PAID', paidAt: ms.status === 'PAID' ? ms.dueDate : undefined })) || [
    { id: `ms-${booking.id}`, name: 'Full Payment', amount: booking.totalAmount, dueDate: booking.createdAt.slice(0, 10), isPaid: booking.paymentStatus === 'PAID', paidAt: booking.createdAt.slice(0, 10) },
  ];
  return {
    id: booking.id, bookingNumber: booking.bookingReference, tenantId,
    clientId: booking.clientId, clientName: booking.clientName, clientPhone: booking.clientPhone,
    serviceType: 'GROUP_TOUR', packageId: tour.id, packageTitle: tour.title,
    paxCount: booking.paxCount, agreedPricePerPax: booking.totalAmount / booking.paxCount,
    totalAgreedAmount: booking.totalAmount, assignedRep: 'Fatima Noor', status: booking.status,
    invoiceId, milestones: schedule,
    travelers: booking.travelers.map(t => ({ ...t, documents: { ...t.documents } })),
    createdAt: booking.createdAt, confirmedAt: booking.createdAt, confirmedBy: 'Nadeem Akhtar',
    quoteConversion: { kind: 'GROUP_TOUR', tourId: tour.id, pax: booking.paxCount, pricePerPerson: booking.totalAmount / booking.paxCount, deposit: 0 },
  };
});

// Rebuild room records referenced by the supplied traveler slots.
for (const tour of mockTours) {
  for (const booking of mockBookings.filter(b => b.packageId === tour.id)) {
    for (const traveler of booking.travelers) {
      if (!traveler.assignedRoomId) continue;
      let room = tour.rooms!.find(r => r.id === traveler.assignedRoomId);
      if (!room) {
        room = { id: traveler.assignedRoomId, tourId: tour.id, roomNumber: traveler.assignedRoomId.replace('room-', 'Room '), roomType: traveler.roomPreference || 'DOUBLE', hotelName: tour.itinerary?.[0]?.hotelName || 'Hotel pending', assignedTravelerIds: [] };
        tour.rooms!.push(room);
      }
      room.assignedTravelerIds.push(traveler.id);
    }
  }
}

export const mockClients: Client[] = source.mockClients.map(client => {
  const history = mockBookings.filter(b => b.clientId === client.id);
  const conversion: Conversion = history[0]?.quoteConversion || { kind: 'CUSTOM_PACKAGE', description: 'Imported client profile; service details pending', rate: 0 };
  const totalLifetimeSpend = history.reduce((sum, booking) => sum + booking.totalAgreedAmount, 0);
  return { ...client, tenantId, leadId: source.mockLeads.find(l => l.status === 'CONVERTED' && l.phone === client.phone)?.id || '', conversion,
    total: history[0]?.totalAgreedAmount || 0, interactions: [], bookingIds: history.map(b => b.id), totalLifetimeSpend,
    clientTier: history.length >= 3 || totalLifetimeSpend > 2000000 ? 'VIP' : history.length > 1 ? 'REGULAR' : 'NEW',
    savedTravelers: client.savedTravelers.map(t => ({ ...t })),
  };
});

export const mockInvoices: Invoice[] = source.mockInvoices.map(invoice => {
  const booking = mockBookings.find(b => b.id === invoice.bookingId);
  const client = mockClients.find(c => c.phone === invoice.clientPhone)!;
  const proof = source.mockPaymentProofClaims.find(c => c.invoiceId === invoice.id && c.status === 'VERIFIED_APPROVED');
  return {
    id: invoice.id, invoiceNumber: invoice.invoiceNumber, tenantId, bookingId: booking?.id,
    bookingRef: booking?.bookingNumber || (invoice.bookingId ? `WCH-BK-${invoice.bookingId.replace('booking-', '').padStart(6, '0')}` : undefined),
    clientId: client.id,
    clientName: invoice.clientName, clientPhone: invoice.clientPhone, clientEmail: client.email, tourId: booking?.packageId,
    serviceCategory: booking?.serviceType || 'GROUP_TOUR',
    packageTitle: booking?.packageTitle || invoice.clientName + ' Travel Package',
    serviceDescription: booking?.packageTitle || `Imported invoice; original booking ${invoice.bookingId} was not supplied`,
    subtotal: invoice.totalAmount, taxAmount: 0, discountAmount: 0,
    totalAmount: invoice.totalAmount, paidAmount: invoice.paidAmount,
    outstandingAmount: invoice.totalAmount - invoice.paidAmount,
    dueAmount: invoice.totalAmount - invoice.paidAmount,
    status: Number(invoice.paidAmount) === Number(invoice.totalAmount) ? 'PAID' : invoice.paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
    dueDate: invoice.dueDate, issueDate: invoice.milestones[0]?.dueDate || invoice.dueDate, finalDueDate: invoice.dueDate,
    createdAt: invoice.milestones[0].dueDate,
    milestones: invoice.milestones.map(ms => ({
      ...ms,
      name: ms.title,
      paidAmount: ms.status === 'PAID' ? ms.amount : 0,
      percentage: ms.amount / invoice.totalAmount * 100,
      status: ms.status === 'PAID' ? 'Paid' : ms.status === 'OVERDUE' ? 'Overdue' : 'Pending',
      paidAt: ms.status === 'PAID' ? ms.dueDate : undefined
    })),
    installments: invoice.paidAmount > 0 ? [{ id: `payment-${invoice.id}`, invoiceId: invoice.id, receiptNo: `SEED-${invoice.id}`, amount: invoice.paidAmount, method: 'Bank Transfer', recordedBy: 'Imported demo receipt', paymentDate: invoice.milestones[0].dueDate, reference: proof?.bankReference || `Imported opening receipt ${invoice.id}` }] : [],
  };
});
// Paid bookings also need a linked invoice for cancellation and refund testing.
for (const booking of mockBookings.filter(b => !mockInvoices.some(i => i.id === b.invoiceId))) {
  mockInvoices.push({
    id: booking.invoiceId!, invoiceNumber: `WCH-INV-${booking.bookingNumber.slice(-6)}`,
    tenantId, bookingId: booking.id, bookingRef: booking.bookingNumber,
    clientId: booking.clientId, clientName: booking.clientName, clientPhone: booking.clientPhone,
    tourId: booking.packageId, serviceCategory: booking.serviceType,
    packageTitle: booking.packageTitle, serviceDescription: booking.packageTitle,
    subtotal: booking.totalAgreedAmount, taxAmount: 0, discountAmount: 0,
    totalAmount: booking.totalAgreedAmount, paidAmount: booking.totalAgreedAmount,
    outstandingAmount: 0, dueAmount: 0, status: 'PAID',
    issueDate: booking.createdAt.slice(0, 10), finalDueDate: booking.createdAt.slice(0, 10),
    dueDate: booking.createdAt.slice(0, 10), createdAt: booking.createdAt.slice(0, 10),
    milestones: booking.milestones.map(ms => ({
      id: ms.id, name: ms.name, title: ms.name, percentage: 100,
      amount: ms.amount, paidAmount: ms.amount, dueDate: ms.dueDate, status: 'Paid', paidAt: ms.paidAt
    })),
    installments: [{ id: `payment-${booking.id}`, invoiceId: booking.invoiceId!, receiptNo: `SEED-${booking.id}`, amount: booking.totalAgreedAmount, method: 'Bank Transfer', recordedBy: 'Imported demo receipt', paymentDate: booking.createdAt.slice(0, 10), reference: 'Imported paid booking' }],
  });
}

const sources: Record<string, Lead['source']> = { WHATSAPP: 'WhatsApp', WALK_IN: 'Walk-in', PHONE_INBOUND: 'Phone Call', WEB_FORM: 'Web Form' };
export const mockLeads: Lead[] = source.mockLeads.map(lead => ({
  id: lead.id, tenantId, fullName: lead.fullName, phone: lead.phone, email: lead.email,
  source: sources[lead.source], interestType: lead.interest, destinationInterest: lead.destinationOrPackage,
  groupSize: lead.paxCount, budget: lead.budget, status: lead.status, assignedTo: lead.assignedStaffName || 'Unassigned',
  followUpDate: 'scheduledCallbackDate' in lead ? lead.scheduledCallbackDate : '', notes: lead.notes,
  clientId: mockClients.find(c => c.phone === lead.phone)?.id,
  interactions: [{ id: `interaction-${lead.id}`, leadId: lead.id, note: lead.notes, author: lead.assignedStaffName || 'Imported inquiry', channel: lead.source === 'WHATSAPP' ? 'WhatsApp' : lead.source === 'WALK_IN' ? 'Walk-in' : lead.source === 'WEB_FORM' ? 'Email' : 'Phone Call', createdAt: lead.createdAt }],
  createdAt: lead.createdAt,
}));

export const mockPassengers: Passenger[] = mockBookings.flatMap(booking => booking.travelers.map(traveler => {
  const invoice = mockInvoices.find(i => i.id === booking.invoiceId)!;
  return { id: `passenger-${traveler.id}`, bookingId: booking.id, travelerId: traveler.id, tourId: booking.packageId!,
    name: traveler.fullName || 'Traveler details pending', familyGroup: booking.bookingNumber, passportNo: traveler.passportNo || '', passportExpiryDate: traveler.passportExpiry || '',
    roomAllocation: traveler.roomPreference === 'FAMILY' ? 'Family Suite' : traveler.roomPreference === 'DOUBLE' ? 'Double Room' : traveler.roomPreference === 'TRIPLE' ? 'Triple Room' : traveler.roomPreference === 'SINGLE' ? 'Single Room' : undefined,
    paymentStatus: invoice.dueAmount === 0 ? 'PAID' : invoice.paidAmount > 0 ? 'PARTIAL' : 'UNPAID', contactPhone: traveler.phone || booking.clientPhone,
  };
}));
export const mockPaymentProofClaims: PaymentProofClaim[] = source.mockPaymentProofClaims.map(c => ({ ...c }));
export const mockRecoveryCallLogs: RecoveryCallLog[] = source.mockRecoveryCallLogs.map(c => ({ ...c }));

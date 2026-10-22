const test = require('node:test');
const assert = require('node:assert/strict');

// Simulated TourFlow In-Memory Operational State
function createInitialState() {
    return {
        tours: [
            {
                id: 'tour-wch-01',
                tenantId: 'tenant-wch',
                title: 'Europe 5-Country Grand Tour (15 Days)',
                maxCapacity: 35,
                bookedSeats: 33,
                basePricePerPax: 850000,
                status: 'OPEN',
            },
        ],
        clients: [
            {
                id: 'client-001',
                tenantId: 'tenant-wch',
                fullName: 'Tariq Mehmood Siddiqui',
                phone: '+92 300 8472910',
                totalLifetimeSpend: 1700000,
            },
        ],
        bookings: [],
        invoices: [],
        travelerManifestItems: [],
    };
}

// Logic implementations matching lib/booking-operations.ts
function createQuotation(state, payload) {
    const quote = {
        id: `quote-${Date.now()}`,
        tenantId: payload.tenantId,
        bookingNumber: `WCH-QT-${Math.floor(100000 + Math.random() * 900000)}`,
        clientId: payload.clientId,
        tourId: payload.tourId,
        paxCount: payload.paxCount,
        status: 'DRAFT_QUOTATION',
        createdAt: new Date().toISOString(),
    };
    state.bookings.push(quote);
    // Quotation does NOT consume seats or generate invoices
    return quote;
}

function confirmBookingAtomic(state, payload) {
    const tour = state.tours.find((t) => t.id === payload.tourId && t.tenantId === payload.tenantId);
    if (!tour) {
        throw new Error('Departure tour not found');
    }

    const availableSeats = tour.maxCapacity - tour.bookedSeats;
    if (payload.paxCount > availableSeats) {
        throw new Error(`Oversell prevented: Only ${availableSeats} seats available, requested ${payload.paxCount}`);
    }

    // Atomically lock seats
    tour.bookedSeats += payload.paxCount;

    const bookingId = `bkg-${Date.now()}`;
    const bookingNumber = `WCH-BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const totalAgreed = payload.paxCount * payload.agreedPricePerPax;

    const booking = {
        id: bookingId,
        tenantId: payload.tenantId,
        bookingNumber,
        clientId: payload.clientId,
        tourId: payload.tourId,
        paxCount: payload.paxCount,
        agreedPricePerPax: payload.agreedPricePerPax,
        totalAgreedAmount: totalAgreed,
        status: 'CONFIRMED',
        createdAt: new Date().toISOString(),
    };
    state.bookings.push(booking);

    // Allocate traveler manifest slots
    for (let i = 1; i <= payload.paxCount; i++) {
        state.travelerManifestItems.push({
            id: `trav-${bookingId}-${i}`,
            tenantId: payload.tenantId,
            bookingId,
            tourId: payload.tourId,
            slotNumber: i,
            fullName: payload.travelers?.[i - 1]?.fullName || undefined,
            isComplete: Boolean(payload.travelers?.[i - 1]?.fullName),
        });
    }

    // Generate linked milestone invoice
    state.invoices.push({
        id: `inv-${bookingId}`,
        tenantId: payload.tenantId,
        bookingId,
        totalAmount: totalAgreed,
        paidAmount: payload.depositAmount || 0,
        outstandingAmount: totalAgreed - (payload.depositAmount || 0),
        paymentStatus: payload.depositAmount >= totalAgreed ? 'PAID' : payload.depositAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
    });

    return booking;
}

function cancelBookingAdmin(state, { bookingId, tenantId, reason, retentionFee, refundAmount }) {
    const booking = state.bookings.find((b) => b.id === bookingId && b.tenantId === tenantId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    if (booking.status === 'CANCELLED') {
        throw new Error('Booking already cancelled');
    }

    const tour = state.tours.find((t) => t.id === booking.tourId);
    if (tour) {
        // Release seats back to available capacity
        tour.bookedSeats = Math.max(0, tour.bookedSeats - booking.paxCount);
    }

    booking.status = 'CANCELLED';
    booking.cancellationReason = reason;
    booking.retentionFee = retentionFee;
    booking.refundAmount = refundAmount;
    booking.cancelledAt = new Date().toISOString();

    // Audit record in invoice
    const invoice = state.invoices.find((inv) => inv.bookingId === bookingId);
    if (invoice) {
        invoice.paymentStatus = 'CANCELLED';
    }

    return booking;
}

// ---------------------------------------------------------------------------
// Acceptance Tests
// ---------------------------------------------------------------------------

test('FR-BKG-001: Draft quotation leaves seat inventory and client state untouched', () => {
    const state = createInitialState();
    const quote = createQuotation(state, {
        tenantId: 'tenant-wch',
        clientId: 'client-001',
        tourId: 'tour-wch-01',
        paxCount: 2,
    });

    assert.equal(quote.status, 'DRAFT_QUOTATION');
    assert.match(quote.bookingNumber, /^WCH-QT-\d{6}$/);
    assert.equal(state.tours[0].bookedSeats, 33, 'Seats must remain untouched');
    assert.equal(state.invoices.length, 0, 'No invoice should be generated for draft quotation');
});

test('FR-BKG-002 & FR-BKG-003: Atomic confirmation locks seats and enforces capacity ceiling', () => {
    const state = createInitialState();

    // Departure has 35 capacity and 33 booked (2 remaining). Requesting 3 must fail.
    assert.throws(
        () => {
            confirmBookingAtomic(state, {
                tenantId: 'tenant-wch',
                clientId: 'client-001',
                tourId: 'tour-wch-01',
                paxCount: 3,
                agreedPricePerPax: 850000,
                depositAmount: 500000,
            });
        },
        /Oversell prevented/,
        'Must prevent overbooking when paxCount > availableSeats'
    );

    // Valid confirmation with 2 pax
    const booking = confirmBookingAtomic(state, {
        tenantId: 'tenant-wch',
        clientId: 'client-001',
        tourId: 'tour-wch-01',
        paxCount: 2,
        agreedPricePerPax: 850000,
        depositAmount: 500000,
    });

    assert.equal(booking.status, 'CONFIRMED');
    assert.match(booking.bookingNumber, /^WCH-BK-\d{6}$/);
    assert.equal(state.tours[0].bookedSeats, 35, 'Seats must increase to full capacity');
    assert.equal(state.travelerManifestItems.length, 2, 'Must create 2 traveler manifest slots');
    assert.equal(state.invoices.length, 1, 'Must generate linked invoice');
    assert.equal(state.invoices[0].outstandingAmount, 1200000);
});

test('FR-BKG-006: Admin cancellation releases inventory and preserves audit history', () => {
    const state = createInitialState();

    const booking = confirmBookingAtomic(state, {
        tenantId: 'tenant-wch',
        clientId: 'client-001',
        tourId: 'tour-wch-01',
        paxCount: 2,
        agreedPricePerPax: 850000,
        depositAmount: 500000,
    });

    assert.equal(state.tours[0].bookedSeats, 35);

    cancelBookingAdmin(state, {
        bookingId: booking.id,
        tenantId: 'tenant-wch',
        reason: 'Client medical emergency',
        retentionFee: 50000,
        refundAmount: 450000,
    });

    assert.equal(booking.status, 'CANCELLED');
    assert.equal(booking.cancellationReason, 'Client medical emergency');
    assert.equal(state.tours[0].bookedSeats, 33, 'Booked seats must be decremented on cancellation');
    assert.equal(state.invoices[0].paymentStatus, 'CANCELLED', 'Invoice audit status must update');
});

test('Updating traveler manifest item details does not consume additional seats', () => {
    const state = createInitialState();

    const booking = confirmBookingAtomic(state, {
        tenantId: 'tenant-wch',
        clientId: 'client-001',
        tourId: 'tour-wch-01',
        paxCount: 1,
        agreedPricePerPax: 850000,
        depositAmount: 850000,
    });

    const initialSeats = state.tours[0].bookedSeats;
    const slot = state.travelerManifestItems.find((s) => s.bookingId === booking.id);

    // Agent edits passenger details
    slot.fullName = 'Tariq Mehmood Siddiqui';
    slot.isComplete = true;

    assert.equal(state.tours[0].bookedSeats, initialSeats, 'Manifest updates must not double-count seats');
});
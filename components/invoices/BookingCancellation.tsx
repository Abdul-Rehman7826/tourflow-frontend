"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { LeadDialog, leadInput, leadButton } from "@/components/leads/LeadDialog";
import { cancelBooking as cancelBookingApi } from "@/lib/booking-api";
import type { Invoice, RefundRecord } from "@/types/erp";

export function BookingCancellation({ invoice }: { invoice: Invoice }) {
  const { user } = useAuth();
  const { bookings, cancelBooking } = useData();
  const { formatMoney } = useAgencySettings();
  const [open, setOpen] = useState(false);
  const [fee, setFee] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const booking = bookings.find(b => b.id === invoice.bookingId);
  if (user?.role !== "AGENCY_ADMIN" || user.tenantId !== invoice.tenantId || !booking) return null;
  if (booking.status === "CANCELLED") return (
    <p role="status" className="text-sm text-rose-600 dark:text-rose-400">
      Booking cancelled. Refund recorded: {formatMoney(booking.refund?.refundAmountIssued ?? 0)}.
    </p>
  );
  if (booking.status !== "CONFIRMED") return null;
  const refund = (Math.round(invoice.paidAmount * 100) - Math.round(fee * 100)) / 100;
  const invalid = !Number.isFinite(fee) || fee < 0 || refund < 0;
  return <>
    <button type="button" onClick={() => { setOpen(true); setError(""); setFee(0); }}
      className="rounded-xl border border-rose-500/30 px-4 py-2.5 text-xs font-semibold text-rose-600 dark:text-rose-400 print:hidden">
      Cancel Booking / Refund
    </button>
    {open && <LeadDialog title={`Cancel ${booking.bookingNumber}`} onClose={() => { if (!saving.current) setOpen(false); }}>
      <form className="space-y-3" onSubmit={async e => {
        e.preventDefault();
        if (saving.current || invalid) return;
        const data = new FormData(e.currentTarget);
        saving.current = true;
        setBusy(true);
        setError("");
        try {
          const reasonCategory = String(data.get("reason") || "OTHER");
          const refundMethod = String(data.get("method") || "CASH");
          const notesStr = String(data.get("notes") || "");

          try {
            await cancelBookingApi(booking.id, reasonCategory, fee, refundMethod, notesStr);
          } catch (apiErr) {
            console.warn("Live booking cancellation API fallback to local storage:", apiErr);
          }

          cancelBooking(booking.id, {
            cancellationFeeRetained: fee,
            refundMethod: refundMethod as RefundRecord["refundMethod"],
            reasonCategory: reasonCategory as RefundRecord["reasonCategory"],
            refundReference: String(data.get("reference") || ""),
            notes: notesStr,
          });
          setOpen(false);
        } catch (err) { setError(err instanceof Error ? err.message : "Cancellation could not be saved."); }
        finally { saving.current = false; setBusy(false); }
      }}>
        <p className="text-sm text-gray-500">Cancels the booking, releases active allocations and waives the unpaid balance. Original receipts are preserved. This records a refund already handled externally; it does not transfer money.</p>
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">Reason
            <select required name="reason" className={leadInput}>
              <option value="CLIENT_REQUEST">Client request</option><option value="VISA_REJECTION">Visa rejection</option>
              <option value="MEDICAL_EMERGENCY">Medical emergency</option><option value="TOUR_POSTPONED">Tour postponed</option><option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block text-sm">Cancellation fee retained
            <input type="number" required min="0" max={invoice.paidAmount} step="0.01" value={fee} onChange={e => setFee(e.target.valueAsNumber)} className={leadInput} />
          </label>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-sm">
            <p>Total paid: {formatMoney(invoice.paidAmount)}</p>
            <p>Refund to client: {invalid ? "Invalid retained fee" : formatMoney(refund)}</p>
            <p>Unpaid balance waived: {formatMoney(invoice.dueAmount)}</p>
          </div>
          <label className="block text-sm">Refund method
            <select name="method" className={leadInput}><option value="CASH">Cash</option><option value="BANK_WIRE">Bank wire</option><option value="ORIGINAL_PAYMENT">Original payment method</option></select>
          </label>
          <label className="block text-sm">Refund reference<input name="reference" maxLength={200} className={leadInput} /></label>
          <label className="block text-sm">Notes<textarea name="notes" maxLength={2000} rows={2} className={leadInput} /></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" required />I confirm the refund amount and permanent cancellation.</label>
          {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
          <button disabled={busy || invalid} className={leadButton}>{busy ? "Saving cancellation..." : "Confirm Cancellation & Record Refund"}</button>
        </fieldset>
      </form>
    </LeadDialog>}
  </>;
}

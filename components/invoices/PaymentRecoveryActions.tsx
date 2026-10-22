"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { LeadDialog, leadInput } from "@/components/leads/LeadDialog";
import { RECOVERY_OUTCOMES } from "@/lib/payment-recovery";
import { VerifyPaymentModal } from "@/components/invoices/VerifyPaymentModal";
import type { Invoice, PaymentProofClaim, RecoveryCallLog } from "@/types/erp";
import { UploadCloud, PhoneCall, ShieldCheck, CheckCircle2 } from "lucide-react";

export function PaymentRecoveryActions({ invoice }: { invoice: Invoice }) {
  const { user } = useAuth();
  const { formatMoney } = useAgencySettings();
  const {
    paymentProofClaims,
    recoveryCallLogs,
    submitPaymentProof,
    logRecoveryCall,
  } = useData();
  const [mode, setMode] = useState<"PROOF" | "CALL" | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState("");
  const [reading, setReading] = useState(false);
  const uploadVersion = useRef(0);

  const claims = paymentProofClaims.filter((c) => c.invoiceId === invoice.id);
  const calls = recoveryCallLogs
    .filter((c) => c.invoiceId === invoice.id)
    .sort((a, b) => (b.timestamp || b.created_at || "").localeCompare(a.timestamp || a.created_at || ""));

  const isPermitted =
    user &&
    [
      "FRONT_DESK",
      "AGENCY_ADMIN",
      "SUPER_ADMIN",
      "TOUR_MANAGER",
      "VISA_CONSULTANT",
    ].includes(user.role);

  if (!isPermitted) return null;

  const open = (next: "PROOF" | "CALL") => {
    setMode(next);
    setError("");
    setImage("");
    setMessage("");
  };

  const close = () => {
    uploadVersion.current++;
    setReading(false);
    setMode(null);
  };

  const outstanding = invoice.dueAmount ?? invoice.outstandingAmount ?? 0;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap gap-2">
        {outstanding > 0 && invoice.status !== "CANCELLED" && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B7167] hover:bg-[#155A52] px-3 py-1.5 text-xs text-white font-semibold shadow-sm transition-all"
            onClick={() => open("PROOF")}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Submit Payment Proof
          </button>
        )}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
          onClick={() => open("CALL")}
        >
          <PhoneCall className="w-3.5 h-3.5" />
          Log Recovery Call
        </button>
      </div>

      {claims.length > 0 && (
        <div className="space-y-1 pt-1">
          {claims.map((c) => (
            <div
              key={c.id}
              className={`text-[11px] font-mono flex items-center gap-1.5 ${
                c.status === "REJECTED"
                  ? "text-red-500"
                  : c.status === "VERIFIED_APPROVED"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>
                {formatMoney(c.amount)} - {c.status.replaceAll("_", " ")}
                {c.rejectionReason && ` (${c.rejectionReason})`}
              </span>
            </div>
          ))}
        </div>
      )}

      {calls[0] && (
        <p className="text-gray-500 text-[11px]">
          Last call: <strong className="text-gray-700 dark:text-gray-300">{calls[0].outcome.replaceAll("_", " ")}</strong>
          {calls[0].callbackDate && ` | Callback: ${calls[0].callbackDate}`}
        </p>
      )}

      {message && (
        <p role="status" className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {message}
        </p>
      )}

      {mode && (
        <LeadDialog
          title={mode === "PROOF" ? "Submit Bank Payment Proof" : "Log Debt Recovery Call"}
          subtitle={
            <p className="text-xs text-gray-500 font-mono">
              {invoice.invoiceNumber} &bull; {invoice.clientName}
            </p>
          }
          onClose={close}
        >
          <form
            className="space-y-3.5 text-xs"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              try {
                if (mode === "PROOF") {
                  if (reading) return;
                  submitPaymentProof({
                    invoiceId: invoice.id,
                    amount: Number(form.get("amount")),
                    bankReference: String(form.get("reference")),
                    screenshotUrl: image,
                    notes: String(form.get("notes") || ""),
                  });
                  setMessage(
                    "Proof submitted for Admin verification. Invoice balance will settle upon Admin approval."
                  );
                } else {
                  logRecoveryCall({
                    invoiceId: invoice.id,
                    outcome: String(form.get("outcome")) as RecoveryCallLog["outcome"],
                    notes: String(form.get("notes")),
                    callbackDate:
                      String(form.get("callback") || "") || undefined,
                  });
                  setMessage("Recovery call note logged successfully.");
                }
                close();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Unable to save.");
              }
            }}
          >
            {mode === "PROOF" ? (
              <>
                <div className="p-3 rounded-xl bg-[#1B7167]/10 border border-[#1B7167]/20 text-gray-800 dark:text-gray-200 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1B7167] shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Proof submitted by Front Desk will be placed in the Admin Verification Desk queue. Invoice balance remains unchanged until an Agency Admin verifies the bank reference.
                  </p>
                </div>
                <label className="block space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Claimed Payment Amount (PKR):
                  </span>
                  <input
                    name="amount"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    max={outstanding}
                    defaultValue={outstanding}
                    className={leadInput}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Bank / Raast / Cheque Reference Number:
                  </span>
                  <input
                    name="reference"
                    required
                    placeholder="e.g. TXN-948275821"
                    className={leadInput}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Receipt Attachment (PNG, JPEG, WebP; max 2 MB):
                  </span>
                  <input
                    required
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className={leadInput}
                    onChange={async (e) => {
                      const version = ++uploadVersion.current;
                      setImage("");
                      setError("");
                      setReading(false);
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (
                        !["image/png", "image/jpeg", "image/webp"].includes(
                          file.type
                        ) ||
                        file.size > 2 * 1024 * 1024
                      ) {
                        setError("Choose a PNG, JPEG or WebP image up to 2 MB.");
                        return;
                      }
                      setReading(true);
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (version === uploadVersion.current) {
                          setImage(String(reader.result));
                          setReading(false);
                        }
                      };
                      reader.onerror = () => {
                        if (version === uploadVersion.current) {
                          setError("Image could not be read.");
                          setReading(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                {image && <ProofImage url={image} />}
              </>
            ) : (
              <>
                <label className="block space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Call / Outreach Outcome:
                  </span>
                  <select name="outcome" required className={leadInput}>
                    {RECOVERY_OUTCOMES.map((outcome) => (
                      <option key={outcome} value={outcome}>
                        {outcome.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Agreed Next Follow-up / Callback Date:
                  </span>
                  <input name="callback" type="date" className={leadInput} />
                </label>
              </>
            )}

            <label className="block space-y-1">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Notes & Client Response {mode === "CALL" ? "(required)" : "(optional)"}:
              </span>
              <textarea
                name="notes"
                required={mode === "CALL"}
                placeholder={mode === "CALL" ? "e.g. Client promised to deposit remaining 50,000 via online transfer by Friday noon" : "Additional transaction details or branch name"}
                className={leadInput}
                rows={3}
              />
            </label>

            {error && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400 font-semibold">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-200 dark:border-white/10">
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-[#1B7167] hover:bg-[#155A52] text-xs text-white font-semibold shadow-md shadow-[#1B7167]/25 transition-all disabled:opacity-50"
                disabled={reading || (mode === "PROOF" && !image)}
              >
                {reading
                  ? "Reading proof..."
                  : mode === "PROOF"
                  ? "Submit for Verification"
                  : "Save Recovery Note"}
              </button>
            </div>
          </form>

          {mode === "CALL" && calls.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-gray-200 dark:border-white/10 pt-3">
              <h3 className="font-bold text-xs text-gray-900 dark:text-white">
                Prior Recovery Interaction History
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {calls.map((call) => (
                  <article
                    key={call.id}
                    className="rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-2.5 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <strong className="text-gray-900 dark:text-white">
                        {call.outcome.replaceAll("_", " ")}
                      </strong>
                      <span className="text-[10px] font-mono text-gray-500">
                        {call.staffName} &bull; {call.timestamp || call.created_at}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 text-[11px]">
                      {call.notes}
                    </p>
                    {call.callbackDate && (
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-mono">
                        Callback Scheduled: {call.callbackDate}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          )}
        </LeadDialog>
      )}
    </div>
  );
}

export function PaymentVerificationQueue() {
  const { user } = useAuth();
  const { formatMoney } = useAgencySettings();
  const { paymentProofClaims, invoices } = useData();
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

  if (user?.role !== "AGENCY_ADMIN" && user?.role !== "SUPER_ADMIN") {
    return null;
  }

  const pending = paymentProofClaims.filter(
    (c) => c.status === "PENDING_VERIFICATION"
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <span>Admin Payment Verification Queue</span>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-mono font-bold">
              {pending.length} Pending
            </span>
          )}
        </h2>
      </div>

      {pending.length === 0 ? (
        <div className="p-6 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-center text-xs text-gray-500">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
          All payment proofs have been reviewed and verified.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.map((claim) => {
            const linkedInvoice = invoices.find((i) => i.id === claim.invoiceId);
            return (
              <ProofReview
                key={claim.id}
                claim={claim}
                invoice={linkedInvoice}
                formatMoney={formatMoney}
                onReview={() => setSelectedClaim(claim.id)}
              />
            );
          })}
        </div>
      )}

      {selectedClaim && (
        <VerifyPaymentModal
          key={selectedClaim}
          claimId={selectedClaim}
          onClose={() => setSelectedClaim(null)}
        />
      )}
    </section>
  );
}

function ProofReview({
  claim,
  invoice,
  formatMoney,
  onReview,
}: {
  claim: PaymentProofClaim;
  invoice?: Invoice;
  formatMoney: (val: number) => string;
  onReview: () => void;
}) {
  return (
    <article className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B0F19] shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-bold text-gray-900 dark:text-white">
          {invoice?.invoiceNumber || "INVOICE"}
        </span>
        <span className="font-mono font-bold text-xs text-[#1B7167] dark:text-emerald-400">
          {formatMoney(claim.amount)}
        </span>
      </div>
      <div className="text-xs text-gray-500 space-y-0.5">
        <p>Client: <strong className="text-gray-900 dark:text-white">{invoice?.clientName || "Unknown"}</strong></p>
        <p>Submitted By: {claim.staffName} ({claim.createdAt})</p>
        <p className="font-mono text-[11px]">Bank Ref: <strong>{claim.bankReference}</strong></p>
      </div>
      {claim.notes && (
        <p className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/5 p-2 rounded-lg">
          {claim.notes}
        </p>
      )}
      <button
        type="button"
        className="w-full py-2 rounded-xl bg-[#1B7167] hover:bg-[#155A52] text-xs text-white font-semibold transition-all shadow-sm"
        onClick={onReview}
      >
        Review & Settle Milestones
      </button>
    </article>
  );
}

function ProofImage({ url }: { url: string }) {
  if (
    !/^data:image\/(png|jpeg|webp);base64,/.test(url) &&
    !/^https:\/\//.test(url)
  )
    return <p className="text-xs text-gray-400">Proof image unavailable.</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt="Submitted payment receipt"
      className="max-h-60 max-w-full rounded-xl border border-gray-200 object-contain dark:border-white/10 mx-auto"
    />
  );
}

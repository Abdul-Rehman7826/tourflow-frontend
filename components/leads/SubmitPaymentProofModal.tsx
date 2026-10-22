"use client";

import React, { useState, useRef } from "react";
import { Invoice } from "@/types/erp";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData } from "@/context/DataContext";
import {
  UploadCloud,
  X,
  ShieldCheck,
  Trash2,
  AlertCircle,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

interface SubmitPaymentProofModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

const DESTINATION_BANKS = [
  "Meezan Bank - Main Operations (PKR)",
  "Standard Chartered Bank - Corporate (PKR)",
  "Habib Bank Limited (HBL) - Central (PKR)",
  "Bank Alfalah - Commercial (PKR)",
  "Meezan Bank - Foreign Currency (USD)",
];

export function SubmitPaymentProofModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: SubmitPaymentProofModalProps) {
  if (!isOpen || !invoice) return null;

  return (
    <SubmitPaymentProofDialog
      key={invoice.id}
      invoice={invoice}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function SubmitPaymentProofDialog({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: Invoice;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}) {
  const { submitPaymentProof } = useData();
  const { formatMoney } = useAgencySettings();

  const outstanding = invoice.dueAmount ?? invoice.outstandingAmount ?? 0;

  const [amount, setAmount] = useState<number>(outstanding);
  const [bankAccount, setBankAccount] = useState<string>(DESTINATION_BANKS[0]);
  const [bankReference, setBankReference] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [screenshotUrl, setScreenshotUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isReadingImage, setIsReadingImage] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Image File Upload & Conversion to base64 Data URL
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (.png, .jpg, .jpeg, or .webp).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image file size must be less than 2 MB.");
      return;
    }

    setError("");
    setIsReadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
      setIsReadingImage(false);
    };
    reader.onerror = () => {
      setError("Failed to read image file. Please try another image.");
      setIsReadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setScreenshotUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Please enter a valid positive payment amount.");
      return;
    }
    if (amount > outstanding) {
      setError(`Amount cannot exceed the outstanding balance of ${formatMoney(outstanding)}.`);
      return;
    }
    if (!bankReference.trim()) {
      setError("Please enter a valid Bank / Raast reference or Transaction ID.");
      return;
    }
    if (!screenshotUrl) {
      setError("Please upload a bank payment receipt or transfer screenshot.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const fullNotes = `Bank: ${bankAccount}${notes ? ` | Notes: ${notes.trim()}` : ""}`;
      submitPaymentProof({
        invoiceId: invoice.id,
        amount,
        bankReference: bankReference.trim(),
        screenshotUrl,
        notes: fullNotes,
      });

      onSuccess?.("Payment proof submitted. Admin notified for account verification.");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment proof.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#0B0F19] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 bg-gray-50/80 dark:bg-[#080C14]/80 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1B7167]/10 text-[#1B7167] dark:text-teal-400 border border-[#1B7167]/20">
                Front Desk Intake
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {invoice.invoiceNumber}
              </span>
            </div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Submit Payment Proof — {invoice.clientName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              Outstanding Balance: <strong className="text-rose-600 dark:text-rose-400">{formatMoney(outstanding)}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Privacy & Two-Step Verification Alert */}
          <div className="p-3.5 rounded-xl bg-[#1B7167]/10 border border-[#1B7167]/20 text-gray-800 dark:text-gray-200 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#1B7167] dark:text-teal-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-300">
              Payment proof submitted by Front Desk enters the <strong>Admin Verification Desk</strong>. The invoice balance and installment milestones will not be marked settled until an Agency Admin audits the bank statement.
            </p>
          </div>

          {/* Amount & Destination Bank Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Amount Transferred (PKR) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={outstanding}
                step={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Destination Bank Account *
              </label>
              <select
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              >
                {DESTINATION_BANKS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Bank Reference / Txn ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. MZN-789123490 or RAAST-9021"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none placeholder-gray-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
              />
            </div>
          </div>

          {/* Proof Attachment Dropzone & Live Preview */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Proof Attachment Slip (Image) *
            </label>

            {!screenshotUrl ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-white/15 hover:border-[#1B7167] dark:hover:border-teal-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-white/[0.02]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                  {isReadingImage ? "Loading image..." : "Click to upload bank transfer slip / screenshot"}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 font-mono">
                  PNG, JPEG, WebP up to 2 MB
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 truncate">
                  {/* Image Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={screenshotUrl}
                    alt="Payment Slip Preview"
                    className="w-14 h-14 object-cover rounded-lg border border-gray-200 dark:border-white/10"
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      Receipt Attached
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono truncate">
                      Ref: {bankReference || "Pending submission"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Front Desk Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Front Desk Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client transferred via Raast; receipt verified on WhatsApp chat."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-xl text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none placeholder-gray-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isReadingImage}
              className="bg-[#1B7167] text-white font-medium hover:bg-[#155a52] disabled:opacity-50 px-4 py-2 rounded-xl shadow-sm text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer [&>svg]:text-white [&>span]:text-white"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin text-white" />
                  <span className="text-white">Submitting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 text-white" />
                  <span className="text-white font-semibold">Submit for Admin Approval</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

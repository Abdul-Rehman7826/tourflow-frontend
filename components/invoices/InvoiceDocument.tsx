"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { Invoice } from "@/types/erp";
import { AgencySettings, formatAmount } from "@/lib/agency-settings";
import { resolveAssetUrl } from "@/lib/asset-url";

export const INVOICE_TEMPLATES = [
  {
    id: "minimal",
    name: "Modern Minimalist",
    description: "Hairline borders. Confident, uncluttered billing.",
  },
  {
    id: "corporate",
    name: "Executive Corporate",
    description: "Navy letterhead and a formal signature block.",
  },
  {
    id: "luxury",
    name: "Luxury Travel",
    description: "Warm gold details and elegant editorial type.",
  },
  {
    id: "thermal",
    name: "Compact Thermal / Voucher",
    description: "A narrow receipt for quick print and sharing.",
  },
] as const;

function InvoiceQr({ id, preview }: { id: string; preview: boolean }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    import("qrcode")
      .then((qr) =>
        qr.toDataURL(
          preview
            ? "TourFlow invoice template preview - not a valid invoice"
            : `${window.location.origin}/invoices/${encodeURIComponent(id)}`,
          { width: 128, margin: 4, errorCorrectionLevel: "M" },
        ),
      )
      .then((url) => {
        if (active) setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id, preview]);
  return (
    <div className="invoice-qr">
      {src && (
        <Image
          unoptimized
          width={96}
          height={96}
          src={src}
          alt={
            preview
              ? "Sample QR code, not a valid invoice"
              : "Scan to open this invoice"
          }
        />
      )}
      <small>
        {failed
          ? "QR unavailable"
          : preview
            ? "Sample verification badge"
            : "Open invoice - staff sign-in required"}
      </small>
    </div>
  );
}

export function InvoiceDocument({
  invoice,
  settings,
  preview = false,
}: {
  invoice: Invoice;
  settings: AgencySettings;
  preview?: boolean;
}) {
  const money = (value: number) => formatAmount(value, settings);
  const items = invoice.lineItems?.length
    ? invoice.lineItems
    : [
        {
          id: "service",
          description: invoice.serviceDescription,
          category: "Travel",
          quantity: 1,
          unitPrice: invoice.totalAmount,
          totalPrice: invoice.totalAmount,
        },
      ];
  return (
    <article
      aria-label={preview ? "Sample invoice preview" : "Printable invoice"}
      className={`invoice-document invoice-${settings.invoiceTemplate} ${preview ? "invoice-preview" : "invoice-print-target"}`}
    >
      <header className="invoice-letterhead">
        <div>
          {Boolean(settings.lightLogo || settings.darkLogo || (settings as unknown as { logoUrl?: string }).logoUrl) && (
            <Image
              unoptimized
              src={resolveAssetUrl(settings.lightLogo || settings.darkLogo || (settings as unknown as { logoUrl?: string }).logoUrl)}
              width={140}
              height={56}
              className="invoice-logo object-contain max-h-14 w-auto mb-2"
              alt={`${settings.name} logo`}
            />
          )}
          <h2>{settings.name}</h2>
          <p>{settings.address}</p>
          <p>
            {settings.license && `DTS: ${settings.license}`}{" "}
            {settings.taxId && ` | NTN: ${settings.taxId}`}
          </p>
          <p>
            {settings.email} {settings.whatsapp && ` | ${settings.whatsapp}`}
          </p>
        </div>
        <div>
          <p className="invoice-eyebrow">
            {preview ? "Sample invoice" : "Invoice"}
          </p>
          <h3>#{invoice.invoiceNumber}</h3>
          <p>Issued: {invoice.createdAt}</p>
          <p>Due: {invoice.dueDate}</p>
          <strong>{invoice.status.replaceAll("_", " ")}</strong>
        </div>
      </header>
      <section className="invoice-trip">
        <div>
          <p className="invoice-eyebrow">Prepared for</p>
          <h3>{invoice.clientName}</h3>
          <p>{invoice.clientAddress}</p>
          <p>
            {invoice.clientPhone} {invoice.clientEmail}
          </p>
        </div>
        <div>
          <p className="invoice-eyebrow">Travel arrangements</p>
          <h3>{invoice.serviceDescription}</h3>
          {invoice.tourId && <p>Reference: {invoice.tourId}</p>}
        </div>
      </section>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitPrice)}</td>
                <td>{money(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="invoice-totals">
        <p>
          <span>Total invoiced</span>
          <strong>{money(invoice.totalAmount)}</strong>
        </p>
        <p>
          <span>Payments received</span>
          <strong>{money(invoice.paidAmount)}</strong>
        </p>
        <p className="invoice-balance">
          <span>Balance due</span>
          <strong>{money(invoice.dueAmount)}</strong>
        </p>
      </section>
      {invoice.refund && <section>
        <h3>Cancellation &amp; Refund</h3>
        <p>Refund issued: {money(invoice.refund.refundAmountIssued)} | Retained fee: {money(invoice.refund.cancellationFeeRetained)}</p>
        <p>{invoice.refund.refundMethod.replaceAll("_", " ")} | {invoice.refund.refundReference || "No reference"} | {invoice.refund.processedAt}</p>
        <p>Booking cancelled. Unpaid installments are waived; original payments are preserved for audit.</p>
      </section>}
      {invoice.status !== "CANCELLED" && !!invoice.milestones?.length && (
        <section>
          <h3>Milestone installment schedule</h3>
          <div className="invoice-milestones">
            {invoice.milestones.map((ms) => (
              <div key={ms.id}>
                <strong>{ms.title}</strong>
                <p>
                  {ms.dueDate} / {ms.status}
                </p>
                <b>{money(ms.amount)}</b>
              </div>
            ))}
          </div>
        </section>
      )}
      {!!invoice.installments.length && (
        <section>
          <h3>Payment receipts</h3>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Receipt / date</th>
                  <th>Method / reference</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {invoice.installments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      {payment.receiptNo}
                      <br />
                      {payment.paymentDate}
                    </td>
                    <td>
                      {payment.method}
                      <br />
                      {payment.reference}
                    </td>
                    <td>{money(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {settings.showBank && (
        <section className="invoice-bank">
          <h3>Bank wire details</h3>
          <p>
            {settings.bankDetails ||
              "Contact the agency for verified bank instructions."}
          </p>
        </section>
      )}
      <footer>
        <div>
          <h3>Terms &amp; conditions</h3>
          <p className="whitespace-pre-wrap">{settings.terms}</p>
          {settings.invoiceTemplate === "corporate" && (
            <div className="invoice-signature">
              Authorized signature ____________________
            </div>
          )}
          <p className="invoice-contact">
            {settings.name} | {settings.email} {settings.whatsapp}
          </p>
        </div>
        {settings.showQr && (
          <InvoiceQr
            key={`${invoice.id}-${preview}`}
            id={invoice.id}
            preview={preview}
          />
        )}
      </footer>
    </article>
  );
}

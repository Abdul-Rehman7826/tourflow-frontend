"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import NextImage from "next/image";
import {
  Building2,
  Palette,
  FileText,
  Hash,
  SlidersHorizontal,
  ShieldCheck,
  Save,
  Check,
  Upload,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTenant } from "@/context/TenantContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { AgencySettings, isHexColor } from "@/lib/agency-settings";
import {
  InvoiceDocument,
  INVOICE_TEMPLATES,
} from "@/components/invoices/InvoiceDocument";
import type { Invoice } from "@/types/erp";
import { apiClient } from "@/lib/api-client";
import { updateTerminalSessionExpiryApi } from "@/lib/settings-api";

const TABS = [
  { title: "Agency Profile", icon: Building2 },
  { title: "Theme & Appearance", icon: Palette },
  { title: "Invoice Templates & Styling", icon: FileText },
  { title: "Currency & Regional Formats", icon: Hash },
  { title: "Operational Rules", icon: SlidersHorizontal },
  { title: "Subscription Plan", icon: ShieldCheck },
];
const PALETTE = [
  ["Electric Violet", "#7C3AED"],
  ["Royal Sapphire", "#2563EB"],
  ["Emerald Travel", "#059669"],
  ["Rose Coral", "#E11D48"],
  ["Luxury Gold", "#D97706"],
  ["Cyan Sky", "#0284C7"],
];
const SAMPLE: Invoice = {
  id: "preview",
  tenantId: "preview",
  invoiceNumber: "WCH-2026-0142",
  clientName: "Tariq Mehmood & Family",
  serviceDescription: "European Highlights / 4 travelers",
  createdAt: "2026-09-07",
  dueDate: "2026-10-01",
  totalAmount: 250000,
  paidAmount: 50000,
  dueAmount: 200000,
  status: "PARTIALLY_PAID",
  installments: [],
  lineItems: [
    {
      id: "tour",
      description: "European Highlights - tour package",
      category: "Tour Package",
      quantity: 4,
      unitPrice: 60000,
      totalPrice: 240000,
    },
    {
      id: "transfer",
      description: "Private airport transfers",
      category: "Tour Package",
      quantity: 1,
      unitPrice: 10000,
      totalPrice: 10000,
    },
  ],
  milestones: [
    {
      id: "token",
      title: "Initial Token Deposit",
      percentage: 20,
      amount: 50000,
      dueDate: "2026-09-07",
      status: "Paid",
    },
    {
      id: "interim",
      title: "Intermediate Installment",
      percentage: 30,
      amount: 75000,
      dueDate: "2026-09-20",
      status: "Pending",
    },
    {
      id: "final",
      title: "Final Pre-Departure Balance",
      percentage: 50,
      amount: 125000,
      dueDate: "2026-10-01",
      status: "Pending",
    },
  ],
};

function Field({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="settings-field">
      <span>{title}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Toggle({
  title,
  checked,
  onChange,
}: {
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-toggle">
      <span>{title}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function SettingsWorkspace() {
  const { user, isHydrated } = useAuth();
  const { isReady } = useAgencySettings();
  if (!isHydrated) return <p role="status">Restoring agency settings...</p>;
  if (user?.role !== "AGENCY_ADMIN")
    return (
      <div className="settings-card">
        <ShieldCheck />
        <h1>Access Restricted</h1>
        <p>Agency settings are reserved for your agency administrator.</p>
      </div>
    );
  if (!isReady) return <p role="status">Loading saved preferences...</p>;
  return <SettingsEditor />;
}

function SettingsEditor() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const {
    settings: s,
    update,
    save,
    dirty,
    discard,
    formatMoney,
  } = useAgencySettings();
  const [tab, setTab] = useState(0);
  const [hex, setHex] = useState(s.accent);
  const hasChanges = dirty || hex !== s.accent;
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [terminalDays, setTerminalDays] = useState(user?.tenant?.terminal_session_expiry_days || 7);
  const [savingTerminal, setSavingTerminal] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  useEffect(() => {
    if (!notice || notice.error) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const change = <K extends keyof AgencySettings>(
    key: K,
    value: AgencySettings[K],
  ) => update({ [key]: value });
  const textField = (
    key:
      | "name"
      | "license"
      | "taxId"
      | "whatsapp"
      | "email"
      | "address"
      | "symbol"
      | "code"
      | "customLabel",
    title: string,
    type = "text",
  ) => (
    <Field title={title}>
      <input
        type={type}
        maxLength={key === "address" ? 500 : 160}
        value={s[key]}
        onChange={(event) => change(key, event.target.value)}
      />
    </Field>
  );

  async function upload(file: File | undefined, key: "darkLogo" | "lightLogo") {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 500 * 1024
    ) {
      setNotice({
        error: true,
        text: "Choose a PNG, JPEG or WebP logo no larger than 500 KB.",
      });
      return;
    }
    setUploading(true);
    try {
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () =>
          img.width > 0 && img.width <= 4096 && img.height <= 4096
            ? resolve()
            : reject();
        img.onerror = reject;
        img.src = url;
      });
      change(key, url);
      setNotice(null);
    } catch {
      setNotice({
        error: true,
        text: "This logo could not be read. Choose a valid image up to 4096 x 4096 pixels.",
      });
    } finally {
      setUploading(false);
    }
  }
  function saveChanges() {
    if (
      !s.name.trim() ||
      (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))
    ) {
      setTab(0);
      setNotice({
        error: true,
        text: "Enter the registered agency name and a valid inquiry email.",
      });
      return;
    }
    if (!isHexColor(hex)) {
      setTab(1);
      setNotice({
        error: true,
        text: "Enter six hex digits, such as #2563EB.",
      });
      return;
    }
    const label =
      s.currencyMode === "custom"
        ? s.customLabel
        : s.currencyMode === "code"
          ? s.code
          : s.currencyMode === "symbol"
            ? s.symbol
            : s.currencyMode === "standard"
              ? s.code && s.symbol
              : "none";
    if (!label.trim()) {
      setTab(3);
      setNotice({
        error: true,
        text: "Enter the selected currency label, or choose None (Numbers Only).",
      });
      return;
    }
    const result = save();
    setNotice({
      text: result.success
        ? "Agency settings saved and synchronized."
        : result.error || "Could not save settings.",
      error: !result.success,
    });
  }

  async function saveTerminalDuration() {
    setSavingTerminal(true);
    try {
      await updateTerminalSessionExpiryApi(terminalDays);
      setNotice({ text: `Terminal sessions will remain authorized for ${terminalDays} day${terminalDays === 1 ? "" : "s"}.` });
    } catch (caught) {
      setNotice({ error: true, text: caught instanceof Error ? caught.message : "Could not update terminal security." });
    } finally {
      setSavingTerminal(false);
    }
  }

  return (
    <div className="settings-workspace space-y-6 pb-28">
      <header className="settings-hero">
        <div>
          <p className="settings-eyebrow">Workspace / Configuration</p>
          <h1>Make it your agency.</h1>
          <p>Your identity, your documents, your way of working.</p>
        </div>
        <div className="settings-agency-stamp">
          <Building2 size={20} />
          <span>
            {s.name}
            <small>Agency &amp; System Settings</small>
          </span>
        </div>
      </header>
      <div
        role="tablist"
        aria-label="Agency settings"
        className="settings-tabs"
      >
        {TABS.map(({ title, icon: Icon }, index) => (
          <button
            key={title}
            type="button"
            role="tab"
            id={`${id}-tab-${index}`}
            aria-controls={`${id}-panel-${index}`}
            aria-selected={tab === index}
            tabIndex={tab === index ? 0 : -1}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % TABS.length
                  : event.key === "ArrowLeft"
                    ? (index + TABS.length - 1) % TABS.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? TABS.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setTab(next);
                tabRefs.current[next]?.focus();
              }
            }}
          >
            <Icon size={16} />
            <span>{title}</span>
          </button>
        ))}
      </div>
      {TABS.map(({ title }, index) => (
        <section
          key={title}
          role="tabpanel"
          id={`${id}-panel-${index}`}
          aria-labelledby={`${id}-tab-${index}`}
          hidden={tab !== index}
          tabIndex={0}
        >
          {index === 0 && (
            <div className="settings-grid">
              <div className="settings-card space-y-6">
                <div>
                  <p className="settings-eyebrow">01 / Identity</p>
                  <h2>Agency profile &amp; branding</h2>
                  <p>These details appear in the workspace and on invoices.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {textField("name", "Agency Registered Name")}
                  {textField("license", "Tourism / DTS License No.")}
                  {textField("taxId", "NTN / Tax Registration")}
                  {textField(
                    "whatsapp",
                    "Official WhatsApp Support Number",
                    "tel",
                  )}
                  {textField("email", "Booking Inquiry Email", "email")}
                  {textField("address", "Physical Head Office Address")}
                </div>
              </div>
              <aside className="settings-card space-y-5">
                <h2>Brand assets</h2>
                <p>PNG, JPEG or WebP. Up to 500 KB each.</p>
                {(["darkLogo", "lightLogo"] as const).map((key) => (
                  <div key={key} className="space-y-2">
                    <div
                      className={`settings-logo-preview ${key === "darkLogo" ? "logo-dark" : "logo-light"}`}
                    >
                      {s[key] ? (
                        <NextImage
                          unoptimized
                          width={180}
                          height={80}
                          src={s[key]}
                          alt={`${key === "darkLogo" ? "Dark" : "Light"} mode logo preview`}
                        />
                      ) : (
                        <Upload size={24} />
                      )}
                    </div>
                    <Field
                      title={`${key === "darkLogo" ? "Dark" : "Light"}-mode logo`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={uploading}
                        onChange={(event) => {
                          void upload(event.target.files?.[0], key);
                          event.target.value = "";
                        }}
                      />
                    </Field>
                    {s[key] && (
                      <button
                        type="button"
                        className="settings-link"
                        onClick={() => change(key, "")}
                      >
                        Remove logo
                      </button>
                    )}
                  </div>
                ))}
              </aside>
            </div>
          )}
          {index === 1 && (
            <div className="settings-grid">
              <div className="settings-card space-y-6">
                <div>
                  <p className="settings-eyebrow">02 / Atmosphere</p>
                  <h2>Theme &amp; appearance</h2>
                  <p>
                    Your accent follows you through the entire agency workspace.
                  </p>
                </div>
                <fieldset>
                  <legend>Base mode</legend>
                  <div className="settings-choices">
                    {[
                      ["dark", "Dark Void (Pitch Black)"],
                      ["light", "Pure White Light"],
                      ["system", "Sync with System"],
                    ].map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="base-mode"
                          value={value}
                          checked={s.mode === value}
                          onChange={() =>
                            change("mode", value as AgencySettings["mode"])
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>System accent color</legend>
                  <div className="settings-swatches">
                    {PALETTE.map(([name, color]) => (
                      <label key={color} title={name}>
                        <input
                          type="radio"
                          name="accent"
                          checked={s.accent.toUpperCase() === color}
                          onChange={() => {
                            change("accent", color);
                            setHex(color);
                          }}
                        />
                        <span style={{ background: color }}>
                          {s.accent.toUpperCase() === color && (
                            <Check size={18} color="white" />
                          )}
                        </span>
                        <small>{name}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Field
                  title="Custom Hex Color"
                  hint="Use six hex digits, for example #2563EB."
                >
                  <input
                    value={hex}
                    maxLength={7}
                    aria-invalid={!isHexColor(hex)}
                    onChange={(event) => {
                      setHex(event.target.value);
                      if (isHexColor(event.target.value))
                        change("accent", event.target.value);
                    }}
                  />
                </Field>
              </div>
              <aside className="settings-card settings-live-preview space-y-5">
                <p className="settings-eyebrow">Live system preview</p>
                <div className="settings-preview-nav">
                  <Building2 size={16} /> Agency Dashboard
                </div>
                <div className="flex justify-between items-center">
                  <span className="settings-badge">Upcoming departure</span>
                  <ArrowUpRight size={20} />
                </div>
                <h2>Good journeys begin here.</h2>
                <p>
                  Buttons, navigation, badges and hover rings adapt to your
                  accent.
                </p>
                <button
                  className="settings-primary"
                  onClick={() =>
                    setNotice({
                      text: "This is your new primary action style.",
                    })
                  }
                >
                  Preview action <ArrowUpRight size={16} />
                </button>
                <small>
                  Preview updates instantly. Save to keep it after reload.
                </small>
              </aside>
            </div>
          )}
          {index === 2 && (
            <div className="space-y-6">
              <div className="settings-card space-y-5">
                <div>
                  <p className="settings-eyebrow">03 / Documents</p>
                  <h2>A signature look for every invoice.</h2>
                  <p>
                    Your preview uses the same renderer as printed invoices.
                  </p>
                </div>
                <fieldset>
                  <legend className="sr-only">Invoice layout</legend>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {INVOICE_TEMPLATES.map((template, i) => (
                      <label
                        key={template.id}
                        className={`settings-template ${s.invoiceTemplate === template.id ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="invoice-template"
                          checked={s.invoiceTemplate === template.id}
                          onChange={() =>
                            change("invoiceTemplate", template.id)
                          }
                        />
                        <div
                          aria-hidden="true"
                          className={`template-mini mini-${template.id}`}
                        >
                          <div />
                          <i />
                          <i />
                          <i />
                          <b>{String(i + 1).padStart(2, "0")}</b>
                        </div>
                        <strong>{template.name}</strong>
                        <small>{template.description}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="settings-grid">
                <div className="settings-card space-y-4">
                  <h2>Document details</h2>
                  <Toggle
                    title="Show agency bank wire details"
                    checked={s.showBank}
                    onChange={(v) => change("showBank", v)}
                  />
                  <Field
                    title="Bank Wire Instructions"
                    hint="Use verified agency bank details."
                  >
                    <textarea
                      rows={4}
                      maxLength={2000}
                      value={s.bankDetails}
                      onChange={(e) => change("bankDetails", e.target.value)}
                    />
                  </Field>
                  <Toggle
                    title="Show QR code verification badge"
                    checked={s.showQr}
                    onChange={(v) => change("showQr", v)}
                  />
                  <p className="text-xs">
                    QR codes open this app and require staff sign-in. They are
                    not public authenticity certificates.
                  </p>
                  <Field title="Custom Invoice Terms">
                    <textarea
                      rows={6}
                      maxLength={4000}
                      value={s.terms}
                      onChange={(e) => change("terms", e.target.value)}
                    />
                  </Field>
                </div>
                <div className="min-w-0">
                  <p className="settings-eyebrow mb-3">
                    Live mock invoice / Sample data
                  </p>
                  <InvoiceDocument settings={s} invoice={SAMPLE} preview />
                </div>
              </div>
            </div>
          )}
          {index === 3 && (
            <div className="settings-grid">
              <div className="settings-card space-y-5">
                <div>
                  <p className="settings-eyebrow">04 / Numbers</p>
                  <h2>Currency &amp; regional formats</h2>
                  <p>
                    Display labels only. These preferences never convert amounts
                    or exchange rates.
                  </p>
                </div>
                <Field title="Currency Format Mode">
                  <select
                    value={s.currencyMode}
                    onChange={(e) =>
                      change(
                        "currencyMode",
                        e.target.value as AgencySettings["currencyMode"],
                      )
                    }
                  >
                    <option value="none">None (Numbers Only)</option>
                    <option value="standard">Standard Symbol + Code</option>
                    <option value="symbol">Symbol Only</option>
                    <option value="code">Currency Code Only</option>
                    <option value="custom">Custom Label</option>
                  </select>
                </Field>
                <div className="grid sm:grid-cols-2 gap-4">
                  {["standard", "symbol"].includes(s.currencyMode) &&
                    textField("symbol", "Currency Symbol")}
                  {["standard", "code"].includes(s.currencyMode) &&
                    textField("code", "Currency Code")}
                  {s.currencyMode === "custom" &&
                    textField("customLabel", "Custom Prefix / Suffix")}
                </div>
                <Field title="Label Placement">
                  <select
                    disabled={s.currencyMode === "none"}
                    value={s.placement}
                    onChange={(e) =>
                      change(
                        "placement",
                        e.target.value as AgencySettings["placement"],
                      )
                    }
                  >
                    <option value="before">Before Amount</option>
                    <option value="after">After Amount</option>
                  </select>
                </Field>
                <Field title="Decimal Precision">
                  <select
                    value={s.decimals}
                    onChange={(e) =>
                      change("decimals", Number(e.target.value) as 0 | 2)
                    }
                  >
                    <option value={0}>0 Decimals</option>
                    <option value={2}>2 Decimals</option>
                  </select>
                </Field>
              </div>
              <aside className="settings-card space-y-6">
                <p className="settings-eyebrow">Live amount preview</p>
                <h2 className="break-words font-mono">{formatMoney(250000)}</h2>
                <div className="settings-amount-row">
                  <span>Token deposit</span>
                  <strong>{formatMoney(50000)}</strong>
                </div>
                <div className="settings-amount-row">
                  <span>Remaining balance</span>
                  <strong>{formatMoney(200000)}</strong>
                </div>
                <p>
                  Applies to agency financial displays, invoices and payment
                  messages. Precision changes presentation only.
                </p>
              </aside>
            </div>
          )}
          {index === 4 && (
            <div className="space-y-6">
            <div className="settings-grid">
              <div className="settings-card space-y-5">
                <div>
                  <p className="settings-eyebrow">05 / Operations</p>
                  <h2>Stay a step ahead.</h2>
                  <p>Set the default rules your team works with.</p>
                </div>
                <Field
                  title="Passport Expiry Alert Window"
                  hint="Flag passports with less than this validity after departure. Destination requirements may differ."
                >
                  <select
                    value={s.passportMonths}
                    onChange={(e) =>
                      change(
                        "passportMonths",
                        Number(e.target.value) as 3 | 6 | 9,
                      )
                    }
                  >
                    {[3, 6, 9].map((v) => (
                      <option key={v} value={v}>
                        {v} Months
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  title="Payment Due Reminder Window"
                  hint="Show unpaid milestones and overdue balances in the dashboard. Reminders are sent manually."
                >
                  <select
                    value={s.reminderDays}
                    onChange={(e) =>
                      change(
                        "reminderDays",
                        Number(e.target.value) as 3 | 7 | 14,
                      )
                    }
                  >
                    {[3, 7, 14].map((v) => (
                      <option key={v} value={v}>
                        {v} Days
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  title="Default Visa Service Markup"
                  hint="Flat fee added to embassy costs for new visa cases. Existing cases are unchanged."
                >
                  <input
                    type="number"
                    min={0}
                    max={1000000000}
                    step="0.01"
                    value={s.visaMarkup}
                    onChange={(e) =>
                      change("visaMarkup", Number(e.target.value))
                    }
                  />
                </Field>
              </div>
              <aside className="settings-card space-y-5">
                <span className="settings-badge">Your current rules</span>
                <h2>
                  Small defaults.
                  <br />
                  Smoother departures.
                </h2>
                <p>
                  Passport checks: {s.passportMonths} months after departure.
                </p>
                <p>
                  Payment alerts: {s.reminderDays} days before each milestone.
                </p>
                <p>New visa service fee: {formatMoney(s.visaMarkup)}.</p>
                <small>
                  These are local workspace rules, not background email or
                  WhatsApp automation.
                </small>
              </aside>
            </div>
            <div className="settings-card space-y-5">
              <div>
                <p className="settings-eyebrow">Workstation Security</p>
                <h2>Workstation &amp; Terminal Security</h2>
                <p>Choose how long this agency terminal remains authorized after password sign-in. Staff profiles still lock after 30 minutes of inactivity.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field title="Terminal Session Duration" hint="Applies to new terminal sessions. Choose up to 90 days through the API.">
                  <select value={terminalDays} onChange={(event) => setTerminalDays(Number(event.target.value))}>
                    {[1, 3, 7, 14, 30].map((days) => <option key={days} value={days}>{days} Day{days === 1 ? "" : "s"}{days === 7 ? " (Default)" : ""}</option>)}
                  </select>
                </Field>
                <button type="button" disabled={savingTerminal} onClick={() => void saveTerminalDuration()} className="settings-primary text-white font-medium [&>span]:text-white">{savingTerminal ? "Saving..." : "Save Terminal Security"}</button>
              </div>
            </div>
            </div>
          )}
          {index === 5 && (
            <div className="settings-card settings-subscription space-y-6">
              <p className="settings-eyebrow">06 / TourFlow License</p>
              <div className="flex flex-wrap gap-3">
                <span className="settings-badge">{tenant.plan} Tier</span>
                <span
                  className={`rounded-full px-3 py-1 text-sm ${tenant.subscriptionStatus === "Active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}
                >
                  {tenant.subscriptionStatus}
                </span>
              </div>
              <h2>Room for your next chapter.</h2>
              <p>
                Your subscription is managed by the TourFlow platform owner.
              </p>
              <div className="settings-amount-row">
                <span>Renewal date</span>
                <strong>
                  {new Date(
                    `${tenant.renewalDate}T00:00:00Z`,
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    timeZone: "UTC",
                  })}
                </strong>
              </div>
              <h3>Included capabilities</h3>
              <ul className="space-y-3">
                {(tenant.plan === "Enterprise"
                  ? [
                      "Unlimited Manifests",
                      "Custom Invoice Themes",
                      "Full Financial Ledger",
                    ]
                  : [
                      "Travel operations workspace",
                      "Contact TourFlow for plan-specific limits",
                    ]
                ).map((capability) => (
                  <li key={capability} className="flex items-center gap-2">
                    <Check size={16} />
                    {capability}
                  </li>
                ))}
              </ul>
              <small>
                Read-only. Contact your platform owner for billing, renewal or
                plan changes.
              </small>
            </div>
          )}
        </section>
      ))}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          className={`settings-toast ${notice.error ? "is-error" : ""}`}
        >
          <span>{notice.text}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            Close
          </button>
        </div>
      )}
      <div className="settings-savebar">
        <span aria-live="polite">
          <i className={hasChanges ? "is-dirty" : ""} />
          {uploading
            ? "Reading logo..."
            : hasChanges
              ? "Unsaved changes"
              : "All changes saved"}
        </span>
        {hasChanges && (
          <button
            type="button"
            className="settings-link"
            onClick={() => {
              const restored = discard();
              setHex(restored.accent);
              setNotice(null);
            }}
          >
            Discard
          </button>
        )}
        <button
          type="button"
          className="settings-primary"
          disabled={!hasChanges || uploading}
          onClick={saveChanges}
        >
          <Save size={16} /> Save Changes
        </button>
      </div>
    </div>
  );
}

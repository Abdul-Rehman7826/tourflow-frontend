import type { Invoice } from "@/types/erp";

export type AgencySettings = {
  name: string;
  license: string;
  taxId: string;
  whatsapp: string;
  email: string;
  address: string;
  logoUrl?: string;
  darkLogo: string;
  lightLogo: string;
  bankDetails: string;
  mode: "dark" | "light" | "system";
  accent: string;
  invoiceTemplate: "minimal" | "corporate" | "luxury" | "thermal";
  showBank: boolean;
  showQr: boolean;
  terms: string;
  currencyMode: "standard" | "symbol" | "code" | "custom" | "none";
  symbol: string;
  code: string;
  customLabel: string;
  placement: "before" | "after";
  decimals: 0 | 2;
  passportMonths: 3 | 6 | 9;
  reminderDays: 3 | 7 | 14;
  visaMarkup: number;
};

export function defaultSettings(
  name = "World Class Holidays",
  email = "info@worldclassholidays.pk",
): AgencySettings {
  return {
    name,
    email,
    license: "",
    taxId: "",
    whatsapp: "",
    address: "",
    logoUrl: "",
    darkLogo: "",
    lightLogo: "",
    bankDetails: "",
    mode: "light",
    accent: "#7C3AED",
    invoiceTemplate: "minimal",
    showBank: true,
    showQr: true,
    terms:
      "Visas are subject to embassy approval. All dues must be cleared prior to ticket issuance.",
    currencyMode: "none",
    symbol: "Rs.",
    code: "PKR",
    customLabel: "",
    placement: "before",
    decimals: 2,
    passportMonths: 6,
    reminderDays: 7,
    visaMarkup: 0,
  };
}

export const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
export function normalizeSettings(
  value: unknown,
  defaults = defaultSettings(),
): AgencySettings {
  const result = { ...defaults };
  if (!value || typeof value !== "object" || Array.isArray(value))
    return result;
  const input = value as Record<string, unknown>;
  const choices = {
    mode: ["dark", "light", "system"],
    invoiceTemplate: ["minimal", "corporate", "luxury", "thermal"],
    currencyMode: ["standard", "symbol", "code", "custom", "none"],
    placement: ["before", "after"],
    decimals: [0, 2],
    passportMonths: [3, 6, 9],
    reminderDays: [3, 7, 14],
  };
  for (const key of Object.keys(defaults) as (keyof AgencySettings)[]) {
    const next = input[key];
    if (
      key in choices &&
      !(choices[key as keyof typeof choices] as readonly unknown[]).includes(
        next,
      )
    )
      continue;
    if (typeof next !== typeof defaults[key]) continue;
    if (key === "accent" && !isHexColor(next as string)) continue;
    if (
      key === "visaMarkup" &&
      (!Number.isFinite(next) || (next as number) < 0 || (next as number) > 1e9)
    )
      continue;
    if (
      (key === "darkLogo" || key === "lightLogo" || (key as string) === "logoUrl") &&
      typeof next === "string" &&
      next !== ""
    ) {
      const isDataUri = /^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(next);
      const isUrl = next.startsWith("/") || next.startsWith("http://") || next.startsWith("https://");
      if (!isDataUri && !isUrl) {
        continue;
      }
    }
    if (
      typeof next === "string" &&
      next.length > (key.endsWith("Logo") ? 700000 : 4000)
    )
      continue;
    Object.assign(result, { [key]: next });
  }
  return result;
}

export function formatAmount(amount: number, settings: AgencySettings): string {
  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: settings.decimals,
    maximumFractionDigits: settings.decimals,
  }).format(amount);
  const labels = {
    none: "",
    standard: `${settings.symbol} ${settings.code}`.trim(),
    symbol: settings.symbol,
    code: settings.code,
    custom: settings.customLabel,
  };
  const label = labels[settings.currencyMode].trim();
  return !label
    ? number
    : settings.placement === "before"
      ? `${label} ${number}`
      : `${number} ${label}`;
}

export function accentForeground(hex: string) {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const luminance =
    0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return luminance > 0.179 ? "#030712" : "#FFFFFF";
}

export function accentText(hex: string, dark = false) {
  let rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let attempt = 0; attempt < 25; attempt++) {
    const linear = rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    const luminance =
      0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    if (dark ? luminance >= 0.25 : luminance <= 0.17) break;
    rgb = rgb.map((v) => Math.round(dark ? v + (255 - v) * 0.12 : v * 0.88));
  }
  return `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function paymentReminders<
  T extends { dueDate: string; amount: number; status: string },
>(milestones: T[], days: number, today = new Date()) {
  const start = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  return milestones.filter(
    (item) =>
      item.status !== "Paid" &&
      item.amount > 0 &&
      Date.parse(item.dueDate) <= start + days * 86400000,
  );
}

export function unpaidMilestones(invoice: Invoice) {
  if (invoice.status === "CANCELLED") return [];
  if (!invoice.milestones?.length)
    return [
      {
        id: invoice.id,
        title: invoice.serviceDescription,
        dueDate: invoice.dueDate,
        amount: invoice.dueAmount,
        status: "Pending",
      },
    ];
  let paid = Math.round(invoice.paidAmount * 100);
  return invoice.milestones.map((milestone) => {
    const total = Math.round(milestone.amount * 100);
    const covered = Math.min(paid, total);
    paid -= covered;
    return { ...milestone, amount: (total - covered) / 100 };
  });
}

export function passportNeedsAlert(
  expiry: string,
  departure: string,
  months: number,
) {
  const date = new Date(`${departure}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return Date.parse(expiry) < date.getTime();
}

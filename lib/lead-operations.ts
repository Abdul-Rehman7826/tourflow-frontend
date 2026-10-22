import type {
  Lead,
  LeadInterestType,
  LeadSource,
  LeadStatus,
  Interaction,
  TourPackage,
  SavedTravelerProfile,
} from "@/types/erp";

export const INTERESTS: LeadInterestType[] = [
  "GROUP_TOUR",
  "VISA",
  "UMRAH",
  "CUSTOM_PACKAGE",
];
export const OPEN_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUOTE_SENT",
  "FOLLOW_UP",
];
export const LOSS_REASONS = [
  "Price / Budget Too High",
  "Chose Competitor / Another Agency",
  "Visa Eligibility / Documentation Weak",
  "Travel Cancelled / Postponed",
  "Unresponsive to Callbacks",
  "Other",
] as const;
export type LossReason = (typeof LOSS_REASONS)[number];
export type Conversion =
  | {
      kind: "GROUP_TOUR";
      tourId: string;
      pricePerPerson: number;
      pax: number;
      deposit: number;
    }
  | {
      kind: "VISA";
      country: string;
      category: string;
      serviceFee: number;
      embassyCharges: number;
    }
  | { kind: "UMRAH" | "CUSTOM_PACKAGE"; description: string; rate: number };
export interface Client {
  id: string;
  tenantId: string;
  leadId: string;
  fullName: string;
  phone: string;
  email?: string;
  conversion: Conversion;
  total: number;
  createdAt: string;
  interactions: Interaction[];
  cnicOrPassport?: string;
  city?: string;
  clientTier?: "NEW" | "REGULAR" | "VIP";
  totalLifetimeSpend?: number;
  bookingIds?: string[];
  savedTravelers?: SavedTravelerProfile[];
}
export interface ImportRow {
  fullName: string;
  phone: string;
  email: string;
  interestType: LeadInterestType;
  source: LeadSource;
  groupSize: number;
  budget?: number;
}
export interface Duplicate {
  id: string;
  tenantId: string;
  existingLeadId?: string;
  existingClientId?: string;
  incoming: ImportRow;
  assignedTo: string;
  createdAt: string;
}
export interface CRMState {
  leads: Lead[];
  clients: Client[];
  duplicates: Duplicate[];
}
export type BulkChange =
  | { assignedTo: string }
  | { interestType: LeadInterestType }
  | { status: LeadStatus; lossReason?: LossReason; lossNote?: string };

export function cleanPhone(phone: string) {
  let value = phone.replace(/\D/g, "");
  if (value.startsWith("00")) value = value.slice(2);
  // World Class Holidays local mobile numbers use Pakistan's country code.
  if (/^03\d{9}$/.test(value)) value = `92${value.slice(1)}`;
  if (/^3\d{9}$/.test(value)) value = `92${value}`;
  return value;
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function callbackBadge(lead: Lead, today: string) {
  if (
    ["LOST", "CONVERTED"].includes(lead.status) ||
    !lead.followUpDate ||
    !today
  )
    return "";
  const day = lead.followUpDate.slice(0, 10);
  return day < today ? "OVERDUE" : day === today ? "Due Today" : "";
}

// CSV tokenizer supports quoted commas/newlines, escaped quotes, CRLF and BOM.
export function parseLeadCsv(text: string): ImportRow[] {
  const table: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === undefined) throw new Error("Unclosed quoted CSV field.");
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("Unexpected quote in CSV field.");
      quoted = true;
    } else if (c === "," || c === "\n" || c === "\r" || c === undefined) {
      row.push(field.trim());
      field = "";
      closed = false;
      if (c !== ",") {
        if (row.some(Boolean)) table.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else {
      if (closed && c.trim())
        throw new Error("Unexpected text after CSV quote.");
      if (!closed) field += c;
    }
  }
  const header = table.shift()?.map((v) => v.toLowerCase());
  const names = [
    "name",
    "phone",
    "email",
    "interest",
    "source",
    "pax",
    "budget",
  ];
  if (!header || header.length !== 7 || names.some((n) => !header.includes(n)))
    throw new Error(
      "CSV headers must be Name, Phone, Email, Interest, Source, Pax, Budget (any order).",
    );
  if (!table.length || table.length > 5000)
    throw new Error("Upload between 1 and 5,000 rows.");
  return table.map((cells, i) => {
    const fail = (message: string): never => {
      throw new Error(`Row ${i + 2}: ${message}`);
    };
    if (cells.length !== header.length)
      fail("column count does not match header.");
    const get = (name: string) => cells[header.indexOf(name)];
    const fullName = get("name"),
      phone = cleanPhone(get("phone")),
      email = get("email");
    const interestType = get("interest")
      .toUpperCase()
      .replace(/[ /-]+/g, "_") as LeadInterestType;
    const sources: LeadSource[] = [
      "Walk-in",
      "WhatsApp",
      "Phone Call",
      "Meta Ad",
      "Referral",
    ];
    const source = sources.find(
      (s) => s.toLowerCase() === get("source").toLowerCase(),
    );
    const groupSize = get("pax") ? Number(get("pax")) : 1;
    const budget = get("budget") ? Number(get("budget")) : undefined;
    if (!fullName || fullName.length > 200)
      fail("Name is required (maximum 200 characters).");
    if (!/^\d{7,15}$/.test(phone)) fail("Phone must contain 7-15 digits.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      fail("invalid email.");
    if (!INTERESTS.includes(interestType)) fail("unknown Interest.");
    if (!source)
      fail(
        "Source must be Walk-in, WhatsApp, Phone Call, Meta Ad or Referral.",
      );
    if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 1000)
      fail("Pax must be a whole number from 1 to 1,000.");
    if (
      budget !== undefined &&
      (!Number.isFinite(budget) || budget < 0 || budget > 1e12)
    )
      fail("Budget must be a non-negative amount up to 1 trillion.");
    return {
      fullName,
      phone,
      email,
      interestType,
      source: source!,
      groupSize,
      budget,
    };
  });
}

export function conversionTotal(
  value: Conversion,
  tours: TourPackage[],
  tenantId: string,
) {
  const money = (n: number) => {
    if (!Number.isFinite(n) || n < 0 || n > 1e12)
      throw new Error("Enter valid non-negative amounts up to 1 trillion.");
    return Math.round(n * 100);
  };
  if (value.kind === "GROUP_TOUR") {
    const tour = tours.find(
      (t) => t.id === value.tourId && t.tenantId === tenantId,
    );
    if (!tour) throw new Error("Select an existing agency tour.");
    if (!["OPEN", "FILLING_FAST", "GUARANTEED"].includes(tour.status))
      throw new Error("This tour is not open for new bookings.");
    if (!Number.isInteger(value.pax) || value.pax < 1 || value.pax > 1000)
      throw new Error("Enter a whole pax count from 1 to 1,000.");
    const total = money(value.pricePerPerson) * value.pax;
    if (money(value.deposit) > total)
      throw new Error("Token deposit cannot exceed the agreed total.");
    return total / 100;
  }
  if (value.kind === "VISA") {
    if (!value.country.trim() || !value.category.trim())
      throw new Error("Country and visa category are required.");
    return (money(value.serviceFee) + money(value.embassyCharges)) / 100;
  }
  if (
    !["UMRAH", "CUSTOM_PACKAGE"].includes(value.kind) ||
    !value.description.trim()
  )
    throw new Error("Package description is required.");
  return money(value.rate) / 100;
}

export function applyBulk(
  state: CRMState,
  tenantId: string,
  ids: string[],
  change: BulkChange,
  author: string,
  now: string,
  id: () => string,
): CRMState {
  if ("status" in change) {
    if (change.status === "CONVERTED")
      throw new Error(
        "Convert each lead individually to capture the agreed package and pricing.",
      );
    if (![...OPEN_STATUSES, "LOST"].includes(change.status))
      throw new Error("Invalid status.");
    if (change.status === "LOST" && !LOSS_REASONS.includes(change.lossReason!))
      throw new Error("Select a reason for loss.");
  }
  if ("interestType" in change && !INTERESTS.includes(change.interestType))
    throw new Error("Invalid interest.");
  const selected = state.leads.filter(
    (l) => l.tenantId === tenantId && ids.includes(l.id),
  );
  if (!selected.length) throw new Error("Select at least one lead.");
  if ("status" in change && selected.some((l) => l.status === "CONVERTED"))
    throw new Error("Converted clients cannot be reopened or marked lost.");
  if (
    "interestType" in change &&
    selected.some((l) => l.status === "CONVERTED")
  )
    throw new Error(
      "Converted package details cannot be changed through bulk interest updates.",
    );
  return {
    ...state,
    leads: state.leads.map((l) => {
      if (!selected.includes(l)) return l;
      if (!("status" in change)) return { ...l, ...change };
      const note =
        change.status === "LOST"
          ? `Lost: ${change.lossReason}${change.lossNote?.trim() ? ` - ${change.lossNote.trim()}` : ""}`
          : `Status changed to ${change.status}`;
      return {
        ...l,
        status: change.status,
        lossReason: change.status === "LOST" ? change.lossReason : undefined,
        lossNote:
          change.status === "LOST" ? change.lossNote?.trim() : undefined,
        notes: note,
        interactions: [
          {
            id: id(),
            leadId: l.id,
            channel: "Office Visit",
            note,
            author,
            createdAt: now,
          },
          ...l.interactions,
        ],
      };
    }),
  };
}

export function convertCRM(
  state: CRMState,
  tenantId: string,
  leadId: string,
  conversion: Conversion,
  tours: TourPackage[],
  author: string,
  now: string,
  id: () => string,
): CRMState {
  const lead = state.leads.find(
    (l) => l.id === leadId && l.tenantId === tenantId,
  );
  if (!lead) throw new Error("Lead not found in this agency.");
  if (
    lead.status === "CONVERTED" ||
    state.clients.some((c) => c.leadId === leadId && c.tenantId === tenantId)
  )
    throw new Error("This lead has already been converted.");
  const total = conversionTotal(conversion, tours, tenantId);
  const entry: Interaction = {
    id: id(),
    leadId,
    note: `Converted to ${conversion.kind}. Agreed total: ${total}.`,
    author,
    channel: "Office Visit",
    createdAt: now,
  };
  const client: Client = {
    id: id(),
    tenantId,
    leadId,
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    conversion,
    total,
    createdAt: now,
    interactions: [entry, ...lead.interactions],
    clientTier: "NEW",
    totalLifetimeSpend: 0,
    bookingIds: [],
    savedTravelers: [],
  };
  return {
    ...state,
    clients: [client, ...state.clients],
    leads: state.leads.map((l) =>
      l === lead
        ? {
            ...l,
            status: "CONVERTED",
            interestType: conversion.kind,
            clientId: client.id,
            lossReason: undefined,
            lossNote: undefined,
            notes: entry.note,
            interactions: client.interactions,
          }
        : l,
    ),
  };
}

export function importedLead(
  row: ImportRow,
  tenantId: string,
  assignedTo: string,
  now: string,
  id: () => string,
): Lead {
  return {
    ...row,
    id: id(),
    tenantId,
    assignedTo,
    status: "NEW",
    notes: "Imported from CSV",
    interactions: [],
    followUpDate: "",
    createdAt: now,
  };
}
export function importCRM(
  state: CRMState,
  tenantId: string,
  rows: ImportRow[],
  reps: string[],
  now: string,
  id: () => string,
): CRMState {
  const leads = [...state.leads],
    duplicates = [...state.duplicates];
  let next = 0;
  for (const row of rows) {
    const existing = leads.find(
      (l) =>
        l.tenantId === tenantId &&
        cleanPhone(l.phone) === cleanPhone(row.phone),
    );
    const client = state.clients.find(
      (c) =>
        c.tenantId === tenantId &&
        cleanPhone(c.phone) === cleanPhone(row.phone),
    );
    if (existing || client)
      duplicates.push({
        id: id(),
        tenantId,
        existingLeadId: existing?.id,
        existingClientId: client?.id,
        incoming: row,
        assignedTo: "Unassigned",
        createdAt: now,
      });
    else
      leads.unshift(
        importedLead(
          row,
          tenantId,
          reps.length ? reps[next++ % reps.length] : "Unassigned",
          now,
          id,
        ),
      );
  }
  return { ...state, leads, duplicates };
}
export function resolveCRM(
  state: CRMState,
  tenantId: string,
  duplicateId: string,
  action: "merge" | "create" | "discard",
  author: string,
  now: string,
  id: () => string,
): CRMState {
  const item = state.duplicates.find(
    (d) => d.id === duplicateId && d.tenantId === tenantId,
  );
  if (!item)
    throw new Error("Duplicate has already been resolved or is unavailable.");
  let leads = state.leads,
    clients = state.clients;
  if (action === "create")
    leads = [
      importedLead(item.incoming, tenantId, item.assignedTo, now, id),
      ...leads,
    ];
  else if (action === "merge") {
    const lead = leads.find(
      (l) => l.id === item.existingLeadId && l.tenantId === tenantId,
    );
    const client = clients.find(
      (c) =>
        c.tenantId === tenantId &&
        (c.id === item.existingClientId || c.leadId === lead?.id),
    );
    if (!lead && !client)
      throw new Error(
        "Original record no longer exists. Create a new lead or discard instead.",
      );
    const r = item.incoming;
    const note = `CSV inquiry: ${r.fullName}; ${r.phone}; ${r.email || "No email"}; ${r.interestType}; ${r.source}; ${r.groupSize} pax; budget ${r.budget ?? "not supplied"}.`;
    const entry: Interaction = {
      id: id(),
      leadId: lead?.id || client!.leadId,
      note,
      author,
      channel: "Office Visit",
      createdAt: now,
    };
    leads = leads.map((l) =>
      l === lead
        ? { ...l, notes: note, interactions: [entry, ...l.interactions] }
        : l,
    );
    clients = clients.map((c) =>
      c === client ? { ...c, interactions: [entry, ...c.interactions] } : c,
    );
  } else if (action !== "discard") throw new Error("Invalid duplicate action.");
  return {
    leads,
    clients,
    duplicates: state.duplicates.filter((d) => d !== item),
  };
}

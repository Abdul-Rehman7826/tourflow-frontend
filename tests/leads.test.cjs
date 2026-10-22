const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const ts = require("typescript");
const source = ts.transpileModule(
  fs.readFileSync("lib/lead-operations.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
new Function("exports", source)(loaded.exports);
const {
  parseLeadCsv,
  cleanPhone,
  callbackBadge,
  applyBulk,
  convertCRM,
  importCRM,
  resolveCRM,
  LOSS_REASONS,
  conversionTotal,
} = loaded.exports;
let count = 0;
const id = () => `record-${++count}`;
const now = "2026-09-08T10:00:00.000Z";
const row = {
  fullName: "Tariq Mehmood",
  phone: "923001234567",
  email: "tariq@example.com",
  interestType: "GROUP_TOUR",
  source: "WhatsApp",
  groupSize: 4,
  budget: 500000,
};
const empty = () => ({ leads: [], clients: [], duplicates: [] });
const seeded = () => importCRM(empty(), "agency-a", [row], [], now, id);
const headers = "Name,Phone,Email,Interest,Source,Pax,Budget\r\n";
const tours = [
  { id: "tour-a", tenantId: "agency-a", status: "OPEN" },
  { id: "tour-b", tenantId: "agency-b", status: "OPEN" },
];

test("CSV accepts reordered headers, BOM, quoted commas, escaped quotes and multiline fields", () => {
  const result = parseLeadCsv(
    '\uFEFFPhone,Name,Email,Source,Interest,Budget,Pax\r\n03001234567,"Tariq, ""Family""\nMehmood",tariq@example.com,WhatsApp,Group Tour,500000,4',
  );
  assert.equal(result[0].fullName, 'Tariq, "Family"\nMehmood');
  assert.equal(result[0].phone, row.phone);
  assert.equal(result[0].interestType, "GROUP_TOUR");
  assert.equal(result[0].groupSize, 4);
});
test("CSV rejects invalid headers, malformed quoting and invalid numeric or contact fields", () => {
  for (const value of [
    "Name,Phone\nA,123",
    headers + '"Unclosed',
    headers + '"Name"bad,03001234567,,VISA,WhatsApp,1,20',
    headers + "A,abc,,VISA,WhatsApp,1,20",
    headers + "A,03001234567,bad,VISA,WhatsApp,1,20",
    headers + "A,03001234567,,UNKNOWN,WhatsApp,1,20",
    headers + "A,03001234567,,VISA,Unknown,1,20",
    headers + "A,03001234567,,VISA,WhatsApp,1.5,20",
    headers + "A,03001234567,,VISA,WhatsApp,1,-1",
    headers + "A,03001234567,,VISA,WhatsApp,1,Infinity",
  ])
    assert.throws(() => parseLeadCsv(value));
  assert.equal(
    parseLeadCsv(headers + "A,03001234567,,VISA,WhatsApp,,")[0].groupSize,
    1,
  );
});
test("phone normalization matches local, international and punctuated forms", () => {
  for (const value of [
    "0300-1234567",
    "+92 300 1234567",
    "0092 300 1234567",
    "3001234567",
  ])
    assert.equal(cleanPhone(value), row.phone);
  assert.equal(cleanPhone("+44 7700 900123"), "447700900123");
});
test("callback badges distinguish overdue, today, future and closed leads", () => {
  const lead = seeded().leads[0];
  assert.equal(
    callbackBadge({ ...lead, followUpDate: "2026-09-07" }, "2026-09-08"),
    "OVERDUE",
  );
  assert.equal(
    callbackBadge({ ...lead, followUpDate: "2026-09-08" }, "2026-09-08"),
    "Due Today",
  );
  assert.equal(
    callbackBadge({ ...lead, followUpDate: "2026-09-09" }, "2026-09-08"),
    "",
  );
  assert.equal(callbackBadge(lead, "2026-09-08"), "");
  for (const status of ["LOST", "CONVERTED"])
    assert.equal(
      callbackBadge(
        { ...lead, status, followUpDate: "2026-09-01" },
        "2026-09-08",
      ),
      "",
    );
});
test("round robin is even and duplicate rows do not consume assignments", () => {
  const rows = Array.from({ length: 9 }, (_, i) => ({
    ...row,
    phone: `92300123456${i}`,
  }));
  const state = importCRM(
    empty(),
    "agency-a",
    [...rows, rows[0]],
    ["Fatima", "Aiza", "Bilal", "Zubair"],
    now,
    id,
  );
  assert.equal(state.leads.length, 9);
  assert.equal(state.duplicates.length, 1);
  assert.deepEqual(
    ["Fatima", "Aiza", "Bilal", "Zubair"].map(
      (rep) => state.leads.filter((l) => l.assignedTo === rep).length,
    ),
    [3, 2, 2, 2],
  );
  assert.equal(new Set(state.leads.map((l) => l.id)).size, 9);
});
test("imports detect existing and within-file phones only in the current tenant", () => {
  const state = seeded();
  const next = importCRM(
    state,
    "agency-a",
    [{ ...row, phone: "03001234567" }],
    [],
    now,
    id,
  );
  assert.equal(next.leads.length, 1);
  assert.equal(next.duplicates.length, 1);
  const other = importCRM(next, "agency-b", [row], [], now, id);
  assert.equal(other.leads.length, 2);
  assert.equal(other.duplicates.length, 1);
  assert.equal(state.duplicates.length, 0);
});
test("bulk changes are scoped and loss requires reason, preserving an audit note", () => {
  let state = importCRM(seeded(), "agency-b", [row], [], now, id);
  const ids = state.leads.map((l) => l.id);
  state = applyBulk(
    state,
    "agency-a",
    ids,
    { assignedTo: "Aiza" },
    "Admin",
    now,
    id,
  );
  assert.equal(
    state.leads.find((l) => l.tenantId === "agency-b").assignedTo,
    "Unassigned",
  );
  assert.throws(
    () =>
      applyBulk(state, "agency-a", ids, { status: "LOST" }, "Admin", now, id),
    /reason/,
  );
  state = applyBulk(
    state,
    "agency-a",
    ids,
    {
      status: "LOST",
      lossReason: LOSS_REASONS[0],
      lossNote: "Client budget lower",
    },
    "Admin",
    now,
    id,
  );
  const lost = state.leads.find((l) => l.tenantId === "agency-a");
  assert.equal(lost.lossReason, LOSS_REASONS[0]);
  assert.match(lost.interactions[0].note, /Client budget lower/);
  assert.throws(
    () =>
      applyBulk(
        state,
        "agency-a",
        ids,
        { status: "CONVERTED" },
        "Admin",
        now,
        id,
      ),
    /individually/,
  );
});
test("all conversion paths produce a structured client and converted lead atomically", () => {
  for (const [conversion, total] of [
    [
      {
        kind: "GROUP_TOUR",
        tourId: "tour-a",
        pricePerPerson: 25000.25,
        pax: 4,
        deposit: 10000,
      },
      100001,
    ],
    [
      {
        kind: "VISA",
        country: "Canada",
        category: "Tourist",
        serviceFee: 10000,
        embassyCharges: 20000,
      },
      30000,
    ],
    [{ kind: "UMRAH", description: "14 days", rate: 180000 }, 180000],
    [
      { kind: "CUSTOM_PACKAGE", description: "Family package", rate: 250000 },
      250000,
    ],
  ]) {
    const state = seeded(),
      leadId = state.leads[0].id;
    const next = convertCRM(
      state,
      "agency-a",
      leadId,
      conversion,
      tours,
      "Admin",
      now,
      id,
    );
    assert.equal(next.leads[0].status, "CONVERTED");
    assert.equal(next.clients.length, 1);
    assert.equal(next.clients[0].total, total);
    assert.equal(next.clients[0].leadId, leadId);
    assert.deepEqual(next.clients[0].conversion, conversion);
    assert.equal(state.clients.length, 0);
    assert.throws(
      () =>
        convertCRM(
          next,
          "agency-a",
          leadId,
          conversion,
          tours,
          "Admin",
          now,
          id,
        ),
      /already/,
    );
    assert.throws(
      () =>
        applyBulk(
          next,
          "agency-a",
          [leadId],
          { status: "NEW" },
          "Admin",
          now,
          id,
        ),
      /cannot/,
    );
  }
});
test("conversion rejects foreign tours, invalid amounts, over-deposit and fractional pax", () => {
  const base = {
    kind: "GROUP_TOUR",
    tourId: "tour-a",
    pricePerPerson: 10,
    pax: 1,
    deposit: 0,
  };
  for (const changes of [
    { tourId: "tour-b" },
    { pricePerPerson: -1 },
    { pricePerPerson: NaN },
    { pax: 0 },
    { pax: 1.2 },
    { deposit: 11 },
  ])
    assert.throws(() =>
      conversionTotal({ ...base, ...changes }, tours, "agency-a"),
    );
  assert.throws(() =>
    conversionTotal(
      {
        kind: "VISA",
        country: "",
        category: "Tourist",
        serviceFee: 1,
        embassyCharges: 1,
      },
      tours,
      "agency-a",
    ),
  );
  const state = seeded();
  assert.throws(
    () =>
      convertCRM(
        state,
        "agency-b",
        state.leads[0].id,
        base,
        tours,
        "Admin",
        now,
        id,
      ),
    /not found/,
  );
});
test("duplicate merge appends to lead and permanent client without changing identity", () => {
  let state = seeded();
  state = convertCRM(
    state,
    "agency-a",
    state.leads[0].id,
    { kind: "CUSTOM_PACKAGE", description: "Trip", rate: 100 },
    tours,
    "Admin",
    now,
    id,
  );
  state = importCRM(
    state,
    "agency-a",
    [{ ...row, fullName: "New inquiry name", interestType: "VISA" }],
    [],
    now,
    id,
  );
  const next = resolveCRM(
    state,
    "agency-a",
    state.duplicates[0].id,
    "merge",
    "Admin",
    now,
    id,
  );
  assert.equal(next.duplicates.length, 0);
  assert.equal(next.leads.length, 1);
  assert.equal(next.clients.length, 1);
  assert.equal(next.clients[0].fullName, row.fullName);
  assert.match(next.clients[0].interactions[0].note, /New inquiry name.*VISA/);
  assert.equal(
    next.leads[0].interactions[0].id,
    next.clients[0].interactions[0].id,
  );
});
test("duplicate force-create, discard and foreign-tenant denial", () => {
  const state = importCRM(seeded(), "agency-a", [row], [], now, id),
    duplicateId = state.duplicates[0].id;
  assert.throws(() =>
    resolveCRM(state, "agency-b", duplicateId, "discard", "Admin", now, id),
  );
  const created = resolveCRM(
    state,
    "agency-a",
    duplicateId,
    "create",
    "Admin",
    now,
    id,
  );
  assert.equal(created.leads.length, 2);
  assert.equal(created.duplicates.length, 0);
  const discarded = resolveCRM(
    state,
    "agency-a",
    duplicateId,
    "discard",
    "Admin",
    now,
    id,
  );
  assert.equal(discarded.leads.length, 1);
  assert.equal(discarded.duplicates.length, 0);
  assert.throws(() =>
    resolveCRM(discarded, "agency-a", duplicateId, "create", "Admin", now, id),
  );
});

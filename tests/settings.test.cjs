const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "..");

function load(file, mocks = {}, globals = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", ...Object.keys(globals), source)(
    (id) => {
      if (id in mocks) return mocks[id];
      if (id.startsWith("@/")) {
        const target = id.slice(2);
        const ext = [".ts", ".tsx"].find((ext) =>
          fs.existsSync(path.join(root, target + ext)),
        );
        return load(target + ext, mocks, globals);
      }
      return require(id);
    },
    module,
    module.exports,
    ...Object.values(globals),
  );
  return module.exports;
}
const {
  defaultSettings,
  normalizeSettings,
  formatAmount,
  accentForeground,
  passportNeedsAlert,
  paymentReminders,
  unpaidMilestones,
} = load("lib/agency-settings.ts");

test("currency modes, label placement and precision format without changing amounts", () => {
  const s = defaultSettings();
  assert.equal(s.currencyMode, "none");
  assert.equal(formatAmount(250000, s), "250,000.00");
  for (const [currencyMode, label] of [
    ["standard", "Rs. PKR"],
    ["symbol", "Rs."],
    ["code", "PKR"],
    ["custom", "Travel credits"],
  ]) {
    for (const placement of ["before", "after"]) {
      const options = {
        ...s,
        currencyMode,
        customLabel: "Travel credits",
        placement,
      };
      assert.equal(
        formatAmount(1200.5, options),
        placement === "before" ? `${label} 1,200.50` : `1,200.50 ${label}`,
      );
    }
  }
  assert.equal(formatAmount(250000.75, { ...s, decimals: 0 }), "250,001");
  assert.equal(formatAmount(0, s), "0.00");
  assert.equal(formatAmount(-0.2, s), "-0.20");
});

test("stored settings validate enums, colors, images and finite non-negative markup", () => {
  const restored = normalizeSettings({
    mode: "invalid",
    accent: "url(evil)",
    currencyMode: "other",
    visaMarkup: -2,
    decimals: 7,
    darkLogo: "javascript:alert(1)",
    showBank: "yes",
    name: "New Agency",
  });
  assert.equal(restored.name, "New Agency");
  assert.equal(restored.mode, "light");
  assert.equal(restored.accent, "#7C3AED");
  assert.equal(restored.darkLogo, "");
  assert.equal(restored.decimals, 2);
  assert.equal(restored.visaMarkup, 0);
  assert.equal(normalizeSettings({ visaMarkup: Infinity }).visaMarkup, 0);
  assert.equal(accentForeground("#FFFFFF"), "#030712");
  assert.equal(accentForeground("#000000"), "#FFFFFF");
});

// Isolated provider harness exercises state and storage, not browser rendering or React scheduling.
function agencyStore(
  storage = new Map(),
  agencyId = "agency-a",
  canEdit = true,
  storageFails = false,
) {
  const states = [],
    dependencies = [],
    effects = [];
  let cursor = 0,
    effectIndex = 0;
  const hooks = {
    ...React,
    useState(initial) {
      const i = cursor++;
      if (!(i in states))
        states[i] = typeof initial === "function" ? initial() : initial;
      return [
        states[i],
        (value) => {
          states[i] = typeof value === "function" ? value(states[i]) : value;
        },
      ];
    },
    useEffect(fn, deps) {
      const i = effectIndex++;
      if (!dependencies[i] || deps.some((v, j) => v !== dependencies[i][j])) {
        dependencies[i] = deps;
        effects.push(fn);
      }
    },
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useRef: (initial) => ({ current: initial }),
  };
  const css = new Map();
  let mode;
  const { AgencyThemeProvider } = load(
    "context/ThemeContext.tsx",
    {
      react: hooks,
      "@/context/TenantContext": {
        useTenant: () => ({
          tenant: {
            id: agencyId,
            name: agencyId,
            contactEmail: "agency@example.com",
          },
        }),
      },
      "@/context/AuthContext": {
        useAuth: () => ({
          user: {
            tenantId: agencyId,
            role: canEdit ? "AGENCY_ADMIN" : "FRONT_DESK",
          },
        }),
      },
      "next-themes": {
        useTheme: () => ({
          setTheme: (value) => {
            mode = value;
          },
        }),
      },
    },
    {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => {
          if (storageFails) throw Error("QuotaExceededError");
          storage.set(key, value);
        },
      },
      document: {
        documentElement: {
          style: {
            setProperty: (key, value) => css.set(key, value),
            removeProperty: (key) => css.delete(key),
          },
        },
      },
      window: { addEventListener() {}, removeEventListener() {} },
    },
  );
  const render = () => {
    cursor = 0;
    effectIndex = 0;
    return AgencyThemeProvider({ children: null }).props.value;
  };
  const read = () => {
    render();
    effects.splice(0).forEach((fn) => fn());
    return render();
  };
  return { read, storage, css, mode: () => mode };
}

test("settings preview, save, reload and discard are agency scoped", () => {
  const store = agencyStore();
  assert.equal(store.read().isReady, true);
  store.read().update({
    name: "World Class Revised",
    accent: "#2563EB",
    mode: "system",
    currencyMode: "custom",
    customLabel: "AED",
    invoiceTemplate: "luxury",
  });
  assert.equal(store.read().dirty, true);
  assert.equal(store.storage.size, 0);
  assert.equal(store.css.get("--agency-accent"), "#2563EB");
  assert.equal(store.read().settings.mode, "system");
  assert.equal(store.read().save().success, true);
  assert.equal(store.read().dirty, false);
  const restored = agencyStore(store.storage).read();
  assert.equal(restored.settings.name, "World Class Revised");
  assert.equal(restored.settings.invoiceTemplate, "luxury");
  assert.equal(restored.formatMoney(50), "AED 50.00");
  assert.equal(
    agencyStore(store.storage, "agency-b").read().settings.currencyMode,
    "none",
  );
  store.read().update({ accent: "#E11D48" });
  assert.equal(store.read().discard().accent, "#2563EB");
  assert.equal(store.read().dirty, false);
});

test("staff cannot write settings and failed saves retain the unsaved draft", () => {
  const staff = agencyStore(new Map(), "agency-a", false);
  staff.read().update({ name: "Unauthorized" });
  assert.equal(staff.read().settings.name, "agency-a");
  assert.equal(staff.read().save().success, false);
  const failing = agencyStore(new Map(), "agency-a", true, true);
  failing.read().update({ name: "New name" });
  assert.equal(failing.read().save().success, false);
  assert.equal(failing.read().dirty, true);
  assert.equal(failing.read().settings.name, "New name");
});

test("malformed settings recover without preventing the workspace from loading", () => {
  const store = agencyStore(
    new Map([["tourflow_agency_settings_v1:agency-a", "{broken"]]),
  );
  assert.equal(store.read().isReady, true);
  assert.equal(store.read().settings.currencyMode, "none");
});

test("passport windows handle exact boundaries and month-end departures", () => {
  assert.equal(passportNeedsAlert("2027-03-06", "2026-09-07", 6), true);
  assert.equal(passportNeedsAlert("2027-03-07", "2026-09-07", 6), false);
  assert.equal(passportNeedsAlert("2027-03-06", "2026-09-07", 3), false);
  assert.equal(passportNeedsAlert("2027-03-07", "2026-09-07", 9), true);
  assert.equal(passportNeedsAlert("2027-02-28", "2026-08-31", 6), false);
  assert.equal(passportNeedsAlert("2027-02-27", "2026-08-31", 6), true);
});

test("cancelled invoices never generate installment reminders", () => {
  assert.deepEqual(unpaidMilestones({ status: "CANCELLED", paidAmount: 20, dueAmount: 0,
    milestones: [{ amount: 100, status: "Pending", dueDate: "2026-09-01" }] }), []);
});

test("reminders include overdue and upcoming unpaid milestones with partial amounts", () => {
  const invoice = {
    id: "i",
    paidAmount: 65,
    dueAmount: 185,
    milestones: [
      {
        id: "a",
        title: "Token",
        amount: 50,
        status: "Paid",
        dueDate: "2026-09-01",
      },
      {
        id: "b",
        title: "Interim",
        amount: 75,
        status: "Pending",
        dueDate: "2026-09-10",
      },
      {
        id: "c",
        title: "Final",
        amount: 125,
        status: "Pending",
        dueDate: "2026-09-21",
      },
    ],
  };
  const unpaid = unpaidMilestones(invoice);
  assert.deepEqual(
    unpaid.map((m) => m.amount),
    [0, 60, 125],
  );
  assert.equal(
    paymentReminders(unpaid, 3, new Date("2026-09-07T12:00:00")).length,
    1,
  );
  assert.equal(
    paymentReminders(unpaid, 14, new Date("2026-09-07T12:00:00")).length,
    2,
  );
  assert.equal(
    paymentReminders(unpaid, 3, new Date("2026-10-01T12:00:00")).length,
    2,
  );
});

test("all four invoice layouts render real values, terms, bank and QR toggle states", () => {
  const { InvoiceDocument, INVOICE_TEMPLATES } = load(
    "components/invoices/InvoiceDocument.tsx",
  );
  const invoice = {
    id: "i",
    invoiceNumber: "TEST-42",
    clientName: "Test Client",
    serviceDescription: "Test Journey",
    totalAmount: 250000,
    paidAmount: 50000,
    dueAmount: 200000,
    status: "PARTIALLY_PAID",
    createdAt: "2026-09-07",
    dueDate: "2026-10-01",
    installments: [],
    milestones: [
      {
        id: "m",
        title: "Final Balance",
        amount: 200000,
        dueDate: "2026-10-01",
        status: "Pending",
      },
    ],
  };
  for (const template of INVOICE_TEMPLATES) {
    const settings = {
      ...defaultSettings(),
      invoiceTemplate: template.id,
      bankDetails: "Verified bank instructions",
      terms: "Custom terms <script>safe text</script>",
    };
    const html = renderToStaticMarkup(
      React.createElement(InvoiceDocument, { invoice, settings }),
    );
    assert.ok(html.includes(`invoice-${template.id}`));
    for (const text of [
      "TEST-42",
      "200,000.00",
      "Final Balance",
      "Verified bank instructions",
      "staff sign-in required",
      "&lt;script&gt;",
    ])
      assert.ok(html.includes(text), text);
    const hidden = renderToStaticMarkup(
      React.createElement(InvoiceDocument, {
        invoice,
        settings: { ...settings, showBank: false, showQr: false },
      }),
    );
    assert.ok(!hidden.includes("Verified bank instructions"));
    assert.ok(!hidden.includes("invoice-qr"));
  }
});

test("settings has six associated tabs and blocks front desk access", () => {
  const settings = defaultSettings();
  const baseMocks = {
    "@/context/ThemeContext": {
      useAgencySettings: () => ({
        settings,
        isReady: true,
        dirty: false,
        formatMoney: (v) => formatAmount(v, settings),
      }),
    },
    "@/context/TenantContext": {
      useTenant: () => ({
        tenant: {
          name: settings.name,
          plan: "Enterprise",
          subscriptionStatus: "Active",
          renewalDate: "2026-11-30",
        },
      }),
    },
  };
  for (const role of ["AGENCY_ADMIN", "FRONT_DESK"]) {
    const { SettingsWorkspace } = load(
      "components/settings/SettingsWorkspace.tsx",
      {
        ...baseMocks,
        "@/context/AuthContext": {
          useAuth: () => ({ isHydrated: true, user: { role } }),
        },
      },
    );
    const html = renderToStaticMarkup(React.createElement(SettingsWorkspace));
    if (role === "FRONT_DESK") {
      assert.match(html, /Access Restricted/);
      assert.doesNotMatch(html, /role="tab"/);
    } else {
      assert.equal((html.match(/role="tab"/g) || []).length, 6);
      assert.equal((html.match(/role="tabpanel"/g) || []).length, 6);
      assert.match(html, /November 30, 2026/);
      assert.match(html, /None \(Numbers Only\)/);
    }
  }
});

test("new visa cases add the configured markup once and reject invalid embassy costs", () => {
  for (const embassyCost of [100, 0, -1, NaN]) {
    let cursor = 0,
      created;
    const settings = { ...defaultSettings(), visaMarkup: 25.5 };
    const { NewVisaCaseModal } = load("components/visa/NewVisaCaseModal.tsx", {
      react: {
        ...React,
        useState: (initial) => {
          const values = { 0: "Test Traveler", 1: "PK123456", 7: embassyCost };
          const i = cursor++;
          return [i in values ? values[i] : initial, () => {}];
        },
      },
      "@/context/DataContext": {
        useData: () => ({
          addVisaCase: (value) => {
            created = value;
          },
        }),
      },
      "@/context/TenantContext": {
        useTenant: () => ({ tenant: { id: "agency-a" } }),
      },
      "@/context/ThemeContext": {
        useAgencySettings: () => ({
          settings,
          formatMoney: (v) => formatAmount(v, settings),
        }),
      },
    });
    const element = NewVisaCaseModal({
      isOpen: true,
      onClose() {},
      onSuccess() {},
    });
    function findForm(node) {
      if (!node || typeof node !== "object") return;
      if (node.type === "form") return node;
      return React.Children.toArray(node.props?.children)
        .map(findForm)
        .find(Boolean);
    }
    findForm(element).props.onSubmit({ preventDefault() {} });
    if (Number.isFinite(embassyCost) && embassyCost >= 0) {
      assert.equal(created.feeAmount, embassyCost + 25.5);
      assert.equal(created.tenantId, "agency-a");
    } else assert.equal(created, undefined);
  }
});

test("invoice QR encoder generates a local PNG without a remote image service", async () => {
  const qr = require("qrcode");
  const data = await qr.toDataURL(
    "http://localhost:3000/invoices/test-invoice",
    { width: 128, errorCorrectionLevel: "M" },
  );
  assert.match(data, /^data:image\/png;base64,/);
  assert.ok(Buffer.from(data.split(",")[1], "base64").length > 100);
});

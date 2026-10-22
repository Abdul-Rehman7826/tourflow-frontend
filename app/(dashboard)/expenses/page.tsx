"use client";

import React, { useMemo, useState } from "react";
import { Banknote, Download, Plus, ReceiptText, Search, Trash2, X } from "lucide-react";
import { useAgencySettings } from "@/context/ThemeContext";
import { useData, type OfficeExpenseInput } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { useTenant } from "@/context/TenantContext";
import { canManageOfficeExpenses, calculateOfficeExpenseSummary } from "@/lib/analytics-governance";
import type { ExpensePaymentMethod, OfficeExpenseCategory } from "@/types/erp";

const CATEGORIES: { value: OfficeExpenseCategory; label: string }[] = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "INTERNET_COMMUNICATION", label: "Internet & Communication" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "PANTRY_TEA", label: "Pantry & Tea" },
  { value: "MARKETING_ADS", label: "Marketing Ads" },
  { value: "SOFTWARE_LICENSES", label: "Software Licenses" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MISC_OVERHEAD", label: "Misc Overhead" },
];

const PAYMENT_METHODS: { value: ExpensePaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "PETTY_CASH", label: "Petty Cash" },
];

const emptyForm = (): OfficeExpenseInput => ({
  category: "RENT",
  vendorName: "",
  amount: 0,
  paymentMethod: "BANK_TRANSFER",
  paidAt: new Date().toISOString().slice(0, 10),
  receiptRef: "",
  notes: "",
});

function csvEscape(value: string | number | undefined) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function ExpensesPage() {
  const { formatMoney } = useAgencySettings();
  const { role } = useRole();
  const { tenant } = useTenant();
  const { officeExpenses, addOfficeExpense, deleteOfficeExpense } = useData();
  const [category, setCategory] = useState<OfficeExpenseCategory | "ALL">("ALL");
  const [method, setMethod] = useState<ExpensePaymentMethod | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<OfficeExpenseInput>(emptyForm);
  const [error, setError] = useState("");

  const canAccess = canManageOfficeExpenses(role);
  const filteredExpenses = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return officeExpenses.filter((expense) => {
      const matchesCategory = category === "ALL" || expense.category === category;
      const matchesMethod = method === "ALL" || expense.paymentMethod === method;
      const matchesQuery = !needle ||
        expense.vendorName.toLowerCase().includes(needle) ||
        expense.receiptRef?.toLowerCase().includes(needle) ||
        expense.notes?.toLowerCase().includes(needle);
      return matchesCategory && matchesMethod && matchesQuery;
    });
  }, [category, method, officeExpenses, query]);
  const summary = useMemo(
    () => calculateOfficeExpenseSummary(tenant.id, filteredExpenses),
    [filteredExpenses, tenant.id],
  );
  const currentMonthTotal = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7);
    return filteredExpenses
      .filter((expense) => expense.paidAt.startsWith(month))
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);
  const topCategory = useMemo(() => {
    const entries = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0]?.replace(/_/g, " ") || "No Overheads";
  }, [summary.byCategory]);

  if (!canAccess) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-amber-500/20 bg-white p-8 text-center shadow-xl dark:bg-[#0B0F19]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <Banknote className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-black">Office Ledger Restricted</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
          General overheads feed the executive P&amp;L and are available only to Admin and Finance-authorized users.
        </p>
      </div>
    );
  }

  const openDrawer = () => {
    setForm(emptyForm());
    setError("");
    setDrawerOpen(true);
  };

  const submitExpense = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      addOfficeExpense(form);
      setDrawerOpen(false);
      setForm(emptyForm());
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save office expense.");
    }
  };

  const exportRows = () => {
    const header = ["Paid At", "Category", "Vendor", "Amount", "Payment Method", "Receipt Ref", "Notes"];
    const rows = filteredExpenses.map((expense) => [
      expense.paidAt,
      expense.category,
      expense.vendorName,
      expense.amount,
      expense.paymentMethod,
      expense.receiptRef,
      expense.notes,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "world-class-office-expenses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-[#1B7167]/20 bg-[#1B7167]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#1B7167]">
            Executive P&amp;L Input
          </span>
          <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-950 dark:text-white">
            Office &amp; Overhead Expense Ledger
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Record rent, utilities, software, marketing and other office overheads that reduce executive net profit.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportRows}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-white/10 dark:bg-[#0B0F19] dark:text-gray-200 dark:hover:bg-white/[0.04]"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={openDrawer}
            className="inline-flex items-center gap-2 rounded-xl bg-[#1B7167] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#155b53] [&>svg]:text-white [&>span]:text-white"
          >
            <Plus className="h-4 w-4" />
            <span>Add Office Expense</span>
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric title="Total Overheads" value={formatMoney(summary.total)} note={`${summary.count} ledger rows`} />
        <Metric title="Current Month" value={formatMoney(currentMonthTotal)} note="Paid this month" />
        <Metric title="Top Category" value={topCategory} note="Largest filtered overhead bucket" />
        <Metric title="P&L Treatment" value="Allocated" note="Deducted after direct vendor expenses" />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0B0F19]">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search vendor, receipt or notes"
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select value={category} onChange={(event) => setCategory(event.target.value as OfficeExpenseCategory | "ALL")} className={filterClass}>
              <option value="ALL">All Categories</option>
              {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <select value={method} onChange={(event) => setMethod(event.target.value as ExpensePaymentMethod | "ALL")} className={filterClass}>
              <option value="ALL">All Methods</option>
              {PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs">
            <thead className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-gray-400">
              <tr>
                <th className="w-[12%] px-4 py-3">Date</th>
                <th className="w-[18%] px-4 py-3">Category</th>
                <th className="w-[24%] px-4 py-3">Vendor</th>
                <th className="w-[15%] px-4 py-3">Method</th>
                <th className="w-[13%] px-4 py-3 text-right">Amount</th>
                <th className="w-[13%] px-4 py-3">Receipt</th>
                <th className="w-[5%] px-4 py-3 text-right"> </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/10">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <ReceiptText className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-3 text-sm font-bold text-gray-950 dark:text-white">No office overheads found</p>
                    <p className="mt-1 text-xs text-gray-500">Add the first rent, utility, software or petty cash entry to begin P&amp;L allocation.</p>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/70 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-mono text-gray-500">{expense.paidAt}</td>
                    <td className="px-4 py-3"><CategoryPill category={expense.category} /></td>
                    <td className="px-4 py-3">
                      <p className="truncate font-bold text-gray-950 dark:text-white">{expense.vendorName}</p>
                      {expense.notes && <p className="mt-0.5 truncate text-[11px] text-gray-500">{expense.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{expense.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-gray-950 dark:text-white">{formatMoney(expense.amount)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{expense.receiptRef || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteOfficeExpense(expense.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 transition-colors hover:bg-rose-500/10"
                        aria-label={`Delete ${expense.vendorName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {drawerOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/40 backdrop-blur-[3px]" onClick={() => setDrawerOpen(false)} aria-label="Close office expense drawer" />
          <aside className="absolute inset-y-0 right-0 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0B0F19]">
            <div className="flex items-start justify-between border-b border-gray-200 p-5 dark:border-white/10">
              <div>
                <h2 className="text-lg font-black text-gray-950 dark:text-white">Add Office Expense</h2>
                <p className="mt-1 text-xs text-gray-500">Recorded as tenant overhead for executive P&amp;L.</p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/10 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitExpense} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {error && <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{error}</div>}
                <Field label="Category"><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as OfficeExpenseCategory })} className={inputClass}>{CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Vendor / Payee"><input value={form.vendorName} onChange={(event) => setForm({ ...form, vendorName: event.target.value })} className={inputClass} placeholder="Landlord, WAPDA, ISP, Meta Ads" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount"><input type="number" min="0" step="1" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className={inputClass} /></Field>
                  <Field label="Paid At"><input type="date" value={form.paidAt} onChange={(event) => setForm({ ...form, paidAt: event.target.value })} className={inputClass} /></Field>
                </div>
                <Field label="Payment Method"><select value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value as ExpensePaymentMethod })} className={inputClass}>{PAYMENT_METHODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                <Field label="Receipt / Voucher Reference"><input value={form.receiptRef || ""} onChange={(event) => setForm({ ...form, receiptRef: event.target.value })} className={inputClass} placeholder="Voucher # or bill reference" /></Field>
                <Field label="Notes"><textarea value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={`${inputClass} min-h-24 resize-none`} placeholder="Optional internal note" /></Field>
              </div>
              <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-[#030712]">
                <button type="button" onClick={() => setDrawerOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white">Cancel</button>
                <button type="submit" className="rounded-xl bg-[#1B7167] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#155b53] [&>span]:text-white">
                  <span>Save Expense</span>
                </button>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}

const filterClass = "rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none transition-colors focus:border-[#1B7167] dark:border-white/10 dark:bg-[#0B0F19] dark:text-gray-200";
const inputClass = "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1B7167] dark:border-white/10 dark:bg-[#030712] dark:text-white";

function Metric({ title, value, note }: { title: string; value: string | number; note: string }) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0B0F19]">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{title}</p>
      <p className="mt-2 truncate text-xl font-black text-gray-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function CategoryPill({ category }: { category: OfficeExpenseCategory }) {
  return (
    <span className="inline-flex max-w-full rounded-full border border-[#1B7167]/20 bg-[#1B7167]/10 px-2.5 py-1 text-[10px] font-black text-[#1B7167]">
      <span className="truncate">{category.replace(/_/g, " ")}</span>
    </span>
  );
}

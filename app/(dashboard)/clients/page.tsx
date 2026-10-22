"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { cleanPhone } from "@/lib/lead-operations";
import { leadInput } from "@/components/leads/LeadDialog";

export default function ClientsPage() {
  const { user, isHydrated } = useAuth();
  const { clients, tours, leads } = useData();
  const { settings, formatMoney } = useAgencySettings();
  const [search, setSearch] = useState("");
  if (!isHydrated || !user) return <p role="status">Loading clients...</p>;
  if (!["AGENCY_ADMIN", "FRONT_DESK", "VISA_CONSULTANT"].includes(user.role))
    return <p role="alert">Access Restricted</p>;
  const filtered = clients.filter((c) =>
    `${c.fullName} ${c.phone} ${c.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-purple-600 dark:text-purple-400">
          {settings.name}
        </p>
        <h1 className="text-3xl font-bold">Clients</h1>
        <p className="mt-2 text-sm text-gray-500">
          Saved client profiles and agreed package details from converted
          inquiries.
        </p>
      </header>
      <input
        aria-label="Search clients"
        placeholder="Search by name, phone or email"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={leadInput}
      />
      {!filtered.length && (
        <p className="rounded-xl border border-gray-200 dark:border-white/10 p-8 text-gray-500">
          No client profiles found. Convert an inquiry in Leads to create one.
        </p>
      )}
      {filtered.map((client) => {
        const c = client.conversion;
        const timeline =
          leads.find((l) => l.id === client.leadId)?.interactions ||
          client.interactions;
        return (
          <article
            key={client.id}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-5 space-y-4"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{client.fullName}</h2>
                <a
                  href={`tel:+${cleanPhone(client.phone)}`}
                  className="text-sm text-purple-600 dark:text-purple-400"
                >
                  {client.phone}
                </a>
                <p className="text-sm text-gray-500">{client.email}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600">
                {c.kind}
              </span>
            </div>
            <div className="rounded-xl bg-gray-100 dark:bg-white/5 p-4 text-sm space-y-1">
              {c.kind === "GROUP_TOUR" ? (
                <>
                  <p>
                    {tours.find((t) => t.id === c.tourId)?.title || c.tourId}
                  </p>
                  <p>
                    {c.pax} pax at {formatMoney(c.pricePerPerson)} each
                  </p>
                  <p>Recorded token deposit: {formatMoney(c.deposit)}</p>
                </>
              ) : c.kind === "VISA" ? (
                <>
                  <p>
                    {c.country} / {c.category}
                  </p>
                  <p>
                    Service fee: {formatMoney(c.serviceFee)} / Embassy charges:{" "}
                    {formatMoney(c.embassyCharges)}
                  </p>
                </>
              ) : (
                <p className="whitespace-pre-wrap">{c.description}</p>
              )}
              <p className="font-semibold">
                Agreed total: {formatMoney(client.total)}
              </p>
            </div>
            <details>
              <summary className="cursor-pointer text-sm font-semibold">
                Interaction timeline ({timeline.length})
              </summary>
              <ol className="mt-3 space-y-3">
                {timeline.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l border-purple-500/30 pl-4"
                  >
                    <p className="text-sm whitespace-pre-wrap">{entry.note}</p>
                    <p className="text-xs text-gray-500">
                      {entry.author} /{" "}
                      {entry.createdAt.replace("T", " ").slice(0, 16)}
                    </p>
                  </li>
                ))}
              </ol>
            </details>
          </article>
        );
      })}
    </div>
  );
}

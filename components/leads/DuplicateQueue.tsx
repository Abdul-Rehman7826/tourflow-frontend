"use client";
import { useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { leadButton } from "@/components/leads/LeadDialog";

export function DuplicateQueue() {
  const { user } = useAuth();
  const { leads, clients, duplicates, resolveDuplicate } = useData();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  if (user?.role !== "AGENCY_ADMIN") return null;
  function resolve(id: string, action: "merge" | "create" | "discard") {
    try {
      resolveDuplicate(id, action);
      setError("");
      setNotice(
        action === "merge"
          ? "Inquiry merged into the existing timeline."
          : action === "create"
            ? "Separate lead created."
            : "Incoming duplicate discarded.",
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <section aria-label="Duplicate Queue" className="space-y-4">
      <h2 className="text-lg font-bold">Review matching phone numbers</h2>
      <p className="text-sm text-gray-500">
        Merging preserves existing contact details and appends the incoming
        inquiry to its timeline.
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="text-sm text-purple-600 dark:text-purple-400"
        >
          {notice}
        </p>
      )}
      {!duplicates.length && (
        <p className="rounded-xl border border-gray-200 dark:border-white/10 p-8 text-center text-gray-500">
          No duplicates awaiting review.
        </p>
      )}
      {duplicates.map((d) => {
        const existing =
          leads.find((l) => l.id === d.existingLeadId) ||
          clients.find((c) => c.id === d.existingClientId);
        return (
          <article
            key={d.id}
            className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-5 space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-gray-100 dark:bg-white/5 p-4 space-y-1">
                <h3 className="text-xs uppercase tracking-wider text-gray-500">
                  Existing Record
                </h3>
                <p className="font-semibold">
                  {existing?.fullName || "Original record unavailable"}
                </p>
                <p className="text-sm">{existing?.phone}</p>
                <p className="text-sm">{existing?.email || "No email"}</p>
                <p className="text-xs text-gray-500">
                  {existing && "status" in existing
                    ? `${existing.status} / ${existing.interestType}`
                    : "Client profile"}
                </p>
                {existing && "notes" in existing && (
                  <p className="text-sm">{existing.notes}</p>
                )}
              </div>
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-1">
                <h3 className="text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Incoming CSV Record
                </h3>
                <p className="font-semibold">{d.incoming.fullName}</p>
                <p className="text-sm">{d.incoming.phone}</p>
                <p className="text-sm">{d.incoming.email || "No email"}</p>
                <p className="text-sm">
                  {d.incoming.interestType} / {d.incoming.source}
                </p>
                <p className="text-sm">
                  {d.incoming.groupSize} pax / Budget:{" "}
                  {d.incoming.budget ?? "Not supplied"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                disabled={!existing}
                className={leadButton}
                onClick={() => resolve(d.id, "merge")}
              >
                Merge into Timeline
              </button>
              <button
                className="rounded-xl border border-purple-500/40 px-4 py-2 text-sm"
                onClick={() => resolve(d.id, "create")}
              >
                Create as New Lead
              </button>
              <button
                className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-600"
                onClick={() => resolve(d.id, "discard")}
              >
                Discard
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}

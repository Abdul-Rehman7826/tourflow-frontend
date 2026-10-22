"use client";
import { useRef, useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { parseLeadCsv, type ImportRow } from "@/lib/lead-operations";
import { leadButton } from "@/components/leads/LeadDialog";

export function LeadImportWorkspace() {
  const { user } = useAuth();
  const { activeReps, importLeads, distributeUnassigned, crmReady } = useData();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  if (user?.role !== "AGENCY_ADMIN") return null;
  const reps = selected.filter((r) => activeReps.includes(r));
  async function read(file?: File) {
    if (!file) return;
    const request = ++generation.current;
    setRows([]);
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (!/\.csv$/i.test(file.name) || file.size > 2 * 1024 * 1024)
        throw new Error("Choose a .csv file up to 2 MB.");
      const parsed = parseLeadCsv(await file.text());
      if (request === generation.current) {
        setRows(parsed);
        setNotice(
          `${parsed.length} rows ready for review. Nothing imported yet.`,
        );
      }
    } catch (err) {
      if (request === generation.current) setError((err as Error).message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  function importRows(distribute: boolean) {
    try {
      if (distribute && !reps.length)
        throw new Error("Select at least one representative.");
      const result = importLeads(rows, distribute ? reps : []);
      setRows([]);
      setError("");
      setNotice(
        `${result.imported} leads imported. ${result.flagged} matches moved to Duplicate Queue.`,
      );
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <section aria-label="Bulk CSV Importer" className="space-y-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void read(e.dataTransfer.files[0]);
        }}
        className="rounded-xl border-2 border-dashed border-purple-500/40 bg-purple-500/5 p-8 text-center"
      >
        <h2 className="text-lg font-bold">
          Drop a CSV to build your inquiry queue
        </h2>
        <p className="my-2 text-sm text-gray-500">
          Name, Phone, Email, Interest, Source, Pax, Budget
        </p>
        <p className="mb-4 text-xs text-gray-500">
          Up to 5,000 rows / 2 MB. Review before importing. Existing phone
          matches go to Duplicate Queue.
        </p>
        <label className="inline-block cursor-pointer rounded-xl border border-purple-500/40 px-4 py-2 text-sm">
          Choose CSV
          <input
            aria-label="Choose CSV"
            className="block mt-2 max-w-full text-xs"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              void read(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        <details className="mt-4 text-left text-xs text-gray-500">
          <summary className="cursor-pointer">
            Supported values and sample
          </summary>
          <p className="my-2">
            Interest: GROUP_TOUR, VISA, UMRAH, CUSTOM_PACKAGE. Source: Walk-in,
            WhatsApp, Phone Call, Meta Ad, Referral. Blank Pax defaults to 1;
            Email and Budget may be blank. Local 03 mobile numbers are
            normalized to +92.
          </p>
          <pre className="overflow-x-auto rounded-xl bg-gray-100 dark:bg-white/5 p-3">{`Name,Phone,Email,Interest,Source,Pax,Budget\nTariq Mehmood,03001234567,tariq@example.com,GROUP_TOUR,WhatsApp,4,500000`}</pre>
        </details>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-5 space-y-4">
        <h3 className="font-semibold">Distribution</h3>
        <p className="text-xs text-gray-500">
          Assignment roster only; these labels do not create login accounts.
          Disabled matching staff accounts are excluded.
        </p>
        <fieldset className="flex flex-wrap gap-5">
          <legend className="sr-only">Active representatives</legend>
          {activeReps.map((rep) => (
            <label key={rep} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={reps.includes(rep)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...reps, rep]
                      : reps.filter((r) => r !== rep),
                  )
                }
              />
              {rep}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!rows.length || loading || !crmReady}
            className={leadButton}
            onClick={() => importRows(false)}
          >
            Import as Unassigned
          </button>
          <button
            disabled={!rows.length || !reps.length || loading || !crmReady}
            className={leadButton}
            onClick={() => importRows(true)}
          >
            Import &amp; Auto-Distribute (Round Robin)
          </button>
          <button
            disabled={!reps.length || !crmReady}
            className="rounded-xl border border-purple-500/40 px-4 py-2 text-sm disabled:opacity-40"
            onClick={() => {
              try {
                const count = distributeUnassigned(reps);
                setError("");
                setNotice(`${count} existing unassigned leads distributed.`);
              } catch (err) {
                setError((err as Error).message);
              }
            }}
          >
            Auto-Distribute Existing Unassigned
          </button>
        </div>
      </div>
      {loading && <p role="status">Reading CSV...</p>}
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
      {!!rows.length && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <caption className="p-3 text-left">
              Preview: first {Math.min(rows.length, 100)} of {rows.length} rows.
              All {rows.length} rows will be processed.
            </caption>
            <thead className="bg-gray-100 dark:bg-white/5">
              <tr>
                {[
                  "Name",
                  "Phone",
                  "Email",
                  "Interest",
                  "Source",
                  "Pax",
                  "Budget",
                ].map((h) => (
                  <th key={h} className="p-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 100).map((r, i) => (
                <tr
                  key={i}
                  className="border-t border-gray-200 dark:border-white/10"
                >
                  {[
                    r.fullName,
                    r.phone,
                    r.email,
                    r.interestType,
                    r.source,
                    r.groupSize,
                    r.budget ?? "",
                  ].map((value, j) => (
                    <td key={j} className="p-3 whitespace-nowrap">
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

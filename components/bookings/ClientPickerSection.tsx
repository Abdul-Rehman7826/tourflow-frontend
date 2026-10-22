"use client";

import React, { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import {
  Search,
  User,
  Phone,
  Mail,
  Repeat,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface ClientPickerSectionProps {
  selectedClientId: string;
  onSelectClient: (clientId: string) => void;
}

export function ClientPickerSection({
  selectedClientId,
  onSelectClient,
}: ClientPickerSectionProps) {
  const { clients, bookings } = useData();
  const { formatMoney } = useAgencySettings();
  const [searchQuery, setSearchQuery] = useState("");

  // Aggregate prior booking stats for each client
  const clientStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { bookingCount: number; totalSpend: number; lastBookingDate?: string }
    >();

    clients.forEach((c) => {
      const clientBookings = bookings.filter(
        (b) => b.clientId === c.id && b.status !== "CANCELLED"
      );
      const totalSpend = clientBookings.reduce((sum, b) => sum + (b.totalAgreedAmount || 0), 0);
      const lastBookingDate = clientBookings.at(-1)?.createdAt;

      map.set(c.id, {
        bookingCount: clientBookings.length,
        totalSpend,
        lastBookingDate,
      });
    });

    return map;
  }, [clients, bookings]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients.slice(0, 8); // show top 8 recent clients if no search query

    return clients.filter((c) => {
      const name = (c.fullName || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [clients, searchQuery]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedStats = selectedClient ? clientStatsMap.get(selectedClient.id) : null;

  return (
    <div className="space-y-4 text-gray-900 dark:text-white">
      {/* Selected Client Card */}
      {selectedClient ? (
        <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border-2 border-[#1B7167] flex items-center justify-between gap-4 transition-all shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B7167] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              {selectedClient.fullName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white font-sans">
                  {selectedClient.fullName}
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-teal-500/20 text-[#1B7167] dark:text-teal-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Selected
                </span>
                {selectedStats && selectedStats.bookingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> {selectedStats.bookingCount} Prior Bookings
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-300 mt-1 font-mono">
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#1B7167]" />
                  {selectedClient.phone || "No phone"}
                </span>
                {selectedClient.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-gray-400" />
                    {selectedClient.email}
                  </span>
                )}
                {selectedStats && selectedStats.totalSpend > 0 && (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Lifetime Spend: {formatMoney(selectedStats.totalSpend)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelectClient("")}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
          >
            Change Client
          </button>
        </div>
      ) : (
        /* Client Search & Result List */
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search existing clients by name, phone (+92...), or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:border-[#1B7167] focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 font-sans shadow-inner"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredClients.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl space-y-1">
                <User className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <p className="text-xs font-semibold">No existing clients found matching &quot;{searchQuery}&quot;.</p>
                <p className="text-[11px] text-gray-400">Please check the spelling or search by contact phone number.</p>
              </div>
            ) : (
              filteredClients.map((client) => {
                const stats = clientStatsMap.get(client.id);
                const hasPrior = stats && stats.bookingCount > 0;

                return (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client.id)}
                    className="p-3.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] hover:border-[#1B7167] dark:hover:border-teal-400/60 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 group-hover:bg-[#1B7167] group-hover:text-white text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                        {client.fullName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs text-gray-900 dark:text-white font-sans truncate">
                            {client.fullName}
                          </h4>
                          {hasPrior && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center gap-1 shrink-0">
                              <Repeat className="w-2.5 h-2.5" /> {stats.bookingCount} Bookings
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[#1B7167]" />
                            {client.phone || "No phone"}
                          </span>
                          {client.email && (
                            <span className="hidden sm:flex items-center gap-1 truncate max-w-[180px]">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {client.email}
                            </span>
                          )}
                          {stats && stats.totalSpend > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Spend: {formatMoney(stats.totalSpend)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-1.5 text-xs font-semibold text-[#1B7167] dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 group-hover:bg-[#1B7167] group-hover:text-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
                    >
                      <span>Select</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

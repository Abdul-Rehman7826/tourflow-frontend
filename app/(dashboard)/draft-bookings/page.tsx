"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { useAgencySettings } from "@/context/ThemeContext";
import { ConvertLeadModal } from "@/components/leads/ConvertLeadModal";
import { BookingDetailDrawer } from "@/components/bookings/BookingDetailDrawer";
import { useMounted } from "@/lib/use-mounted";
import { Booking } from "@/types/erp";
import {
  FileText,
  Search,
  Users,
  TrendingUp,
  Sparkles,
  Eye,
  Compass,
  Filter,
} from "lucide-react";

export default function DraftBookingsPage() {
  const mounted = useMounted();
  const { user } = useAuth();
  const { bookings, leads, crmReady, crmError, tours } = useData();
  const { formatMoney } = useAgencySettings();

  const [leadId, setLeadId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<string>("ALL");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  const drafts = useMemo(() => {
    return bookings.filter(
      (b) => b.status === "DRAFT" || b.status === "DRAFT_QUOTATION"
    );
  }, [bookings]);

  const filteredDrafts = useMemo(() => {
    return drafts.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (b.bookingNumber && b.bookingNumber.toLowerCase().includes(q)) ||
        (b.booking_number && b.booking_number.toLowerCase().includes(q)) ||
        (b.clientName && b.clientName.toLowerCase().includes(q)) ||
        (b.client_name && b.client_name.toLowerCase().includes(q)) ||
        (b.clientPhone && b.clientPhone.toLowerCase().includes(q)) ||
        (b.packageTitle && b.packageTitle.toLowerCase().includes(q)) ||
        (b.tourTitle && b.tourTitle.toLowerCase().includes(q));

      const matchService =
        serviceFilter === "ALL" ||
        b.serviceType === serviceFilter ||
        b.service_type === serviceFilter;

      return matchQuery && matchService;
    });
  }, [drafts, searchQuery, serviceFilter]);

  const totalPipelineValue = useMemo(() => {
    return drafts.reduce(
      (acc, d) => acc + (d.totalAgreedAmount || d.total_agreed_amount || 0),
      0
    );
  }, [drafts]);

  const avgPax = useMemo(() => {
    if (!drafts.length) return 0;
    const totalPax = drafts.reduce(
      (acc, d) => acc + (d.paxCount || d.pax_count || 1),
      0
    );
    return Math.round((totalPax / drafts.length) * 10) / 10;
  }, [drafts]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-[#1B7167] border-t-transparent rounded-full animate-spin" />
          <span>Loading quotations...</span>
        </div>
      </div>
    );
  }

  if (
    !user ||
    !["AGENCY_ADMIN", "FRONT_DESK", "TOUR_MANAGER", "VISA_CONSULTANT"].includes(
      user.role
    )
  ) {
    return (
      <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 max-w-lg mx-auto my-12">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
          Access Restricted: Operational authorization required.
        </p>
      </div>
    );
  }

  if (crmError) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm">
        {crmError}
      </div>
    );
  }

  if (!crmReady) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="w-5 h-5 border-2 border-[#1B7167] border-t-transparent rounded-full animate-spin" />
          <span>Loading quotations...</span>
        </div>
      </div>
    );
  }

  const selectedLead = leads.find((l) => l.id === leadId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#030712] dark:bg-white text-white dark:text-[#030712] text-sm font-medium shadow-2xl flex items-center gap-3 border border-white/10 animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 dark:text-[#1B7167]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#1B7167]/10 text-[#1B7167] dark:text-emerald-400">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Draft Bookings &amp; Custom Quotes
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pre-conversion quotes and custom packages. Quotations do not lock seat inventory until confirmation.
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Active Quotations</span>
            <FileText className="w-4 h-4 text-[#1B7167] dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
            {drafts.length}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Awaiting client confirmation
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Potential Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatMoney(totalPipelineValue)}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Estimated unconfirmed revenue
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Avg. Group Size</span>
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
            {avgPax} <span className="text-sm font-sans font-normal text-gray-500">pax</span>
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Per quotation inquiry
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712]">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by client, phone, quote number, or package..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B7167]/30"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 ml-1" />
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="py-2 px-3 text-sm rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1B7167]/30"
          >
            <option value="ALL">All Services</option>
            <option value="GROUP_TOUR">Group Tours</option>
            <option value="VISA_CONSULTANCY">Visa Consultancy</option>
            <option value="UMRAH">Umrah</option>
            <option value="CUSTOM_PACKAGE">Custom Packages</option>
          </select>
        </div>
      </div>

      {/* Quotations List */}
      {!filteredDrafts.length ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-[#030712]/50 space-y-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto text-gray-400">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              No Draft Quotations Found
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {searchQuery || serviceFilter !== "ALL"
                ? "Try adjusting your search criteria or filter."
                : "Create a quotation from Leads to generate initial draft proposals."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDrafts.map((b) => {
            const bookingNum = b.bookingNumber || b.booking_number || "WCH-BK-000000";
            const clientName = b.clientName || b.client_name || "Valued Client";
            const clientPhone = b.clientPhone || b.client_phone || "—";
            const packageTitle = b.packageTitle || b.package_title || b.tourTitle || b.tour_title || "Custom Package";
            const pax = b.paxCount || b.pax_count || 1;
            const total = b.totalAgreedAmount || b.total_agreed_amount || 0;

            // Tour Capacity Check if group tour
            const linkedTour = b.packageId ? tours.find((t) => t.id === b.packageId) : null;
            const availableSeats = linkedTour ? linkedTour.maxCapacity - linkedTour.bookedSeats : null;

            return (
              <article
                key={b.id}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-[#1B7167] dark:text-emerald-400">
                          {bookingNum}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50">
                          DRAFT QUOTE
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-gray-900 dark:text-white mt-1">
                        {clientName}
                      </h3>
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {clientPhone}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                        {formatMoney(total)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {pax} {pax === 1 ? "passenger" : "passengers"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-1">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {packageTitle}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>Service: {b.serviceType || b.service_type || "TOUR"}</span>
                      {availableSeats !== null && (
                        <span
                          className={`font-medium ${
                            availableSeats < pax
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {availableSeats < pax
                            ? `Over capacity (${availableSeats} left)`
                            : `${availableSeats} seats available`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={() => {
                      setSelectedBooking(b);
                      setIsDrawerOpen(true);
                    }}
                    className="py-2 px-3 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Inspect Details
                  </button>

                  {b.leadId && user.role !== "TOUR_MANAGER" && (
                    <button
                      onClick={() => setLeadId(b.leadId!)}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#1B7167] to-[#13534C] hover:from-[#13534C] hover:to-[#0E3E39] text-white text-xs font-medium shadow-md shadow-[#1B7167]/20 flex items-center gap-1.5 transition [&>svg]:text-white [&>span]:text-white"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span className="text-white">Review &amp; Confirm</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lead Conversion Decision Modal */}
      {selectedLead && (
        <ConvertLeadModal
          key={selectedLead.id}
          lead={selectedLead}
          onClose={() => setLeadId(null)}
          onConverted={(msg) => {
            showToast(msg);
            setLeadId(null);
          }}
        />
      )}

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedBooking(null);
        }}
        onConfirmDraft={(b) => {
          if (b.leadId) {
            setLeadId(b.leadId);
          }
        }}
        onRefresh={() => {
          showToast("Booking updated successfully.");
        }}
      />
    </div>
  );
}

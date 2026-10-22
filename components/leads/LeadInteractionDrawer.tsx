"use client";

import { useAgencySettings } from "@/context/ThemeContext";

import React, { useState } from "react";
import { Lead } from "@/types/erp";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { addLeadInteractionApi } from "@/lib/crm-api";
import {
  X,
  Phone,
  MessageSquare,
  Clock,
  Send,
  CheckCircle,
  Building,
  Mail,
  ExternalLink,
} from "lucide-react";

interface LeadInteractionDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenConvertModal?: (lead: Lead) => void;
}

export function LeadInteractionDrawer({
  lead,
  isOpen,
  onClose,
  onOpenConvertModal,
}: LeadInteractionDrawerProps) {
  const { addInteraction } = useData();
  const { formatMoney } = useAgencySettings();
  const { roleMeta } = useRole();

  const [noteText, setNoteText] = useState("");
  const [channel, setChannel] = useState<"WhatsApp" | "Walk-in" | "Phone Call" | "Email" | "Office Visit">("WhatsApp");
  const [callbackDate, setCallbackDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !lead) return null;

  // Clean phone number for WhatsApp wa.me links (remove +, spaces, dashes)
  const cleanPhone = lead.phone.replace(/[^0-9]/g, "");

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    try {
      addInteraction(
        lead.id,
        noteText.trim(),
        channel,
        roleMeta.title || "Front Desk Rep",
        callbackDate || undefined
      );

      const interactionType = channel === "WhatsApp" ? "WHATSAPP"
        : channel === "Phone Call" ? "PHONE_CALL"
        : channel === "Email" ? "EMAIL"
        : "OFFICE_VISIT";

      void addLeadInteractionApi(lead.id, {
        interaction_type: interactionType,
        notes: noteText.trim(),
        scheduled_callback: callbackDate || undefined,
      }).catch(() => {});
    } catch (err) { setError((err as Error).message); setIsSubmitting(false); return; }
    setError("");
    setNoteText("");
    setCallbackDate("");
    setIsSubmitting(false);
  };

  // Helper for channel styling
  const getChannelBadge = (ch: string) => {
    switch (ch) {
      case "WhatsApp":
        return {
          icon: <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />,
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
        };
      case "Phone Call":
        return {
          icon: <Phone className="w-3.5 h-3.5 text-sky-400" />,
          badge: "bg-sky-500/15 text-sky-400 border-sky-500/30",
        };
      case "Walk-in":
      case "Office Visit":
        return {
          icon: <Building className="w-3.5 h-3.5 text-amber-400" />,
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
        };
      case "Email":
      default:
        return {
          icon: <Mail className="w-3.5 h-3.5 text-indigo-400" />,
          badge: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
        };
    }
  };

  // Format date readable
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel from Right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-[480px] bg-white dark:bg-[#0B0F19] border-l border-gray-200 dark:border-white/10 shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-5 bg-gray-50/80 dark:bg-[#080C14]/80 border-b border-gray-100 dark:border-white/10 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  {lead.interestType}
                </span>
                {lead.source && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 font-mono">
                    via {lead.source}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    lead.status === "CONVERTED"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : lead.status === "NEW"
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                      : "bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {lead.status}
                </span>
              </div>

              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{lead.fullName}</h2>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                <a
                  href={`tel:${lead.phone}`}
                  className="font-mono text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {lead.phone}
                </a>

                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Strip: Prominent Conversion Button & Info */}
          <div className="p-4 bg-gray-50/50 dark:bg-[#030712]/50 border-b border-gray-100 dark:border-white/10 flex items-center justify-between gap-3">
            <div className="text-xs">
              <span className="text-gray-500 dark:text-gray-400">Scheduled Callback:</span>
              <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                {lead.followUpDate}
              </div>
            </div>

            {lead.status !== "CONVERTED" ? (
              <button
                onClick={() => {
                  if (onOpenConvertModal) onOpenConvertModal(lead);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Convert to Booking</span>
              </button>
            ) : (
              <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Confirmed Booking</span>
              </div>
            )}
          </div>

          {/* Scrollable Center: Lead Details & Chronological Timeline */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            
            {/* Traveler Profile Snapshot */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                  Target Destination
                </span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {lead.destinationInterest || "General Inquiry"}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                  Passengers
                </span>
                <p className="font-semibold text-gray-900 dark:text-white mt-0.5">
                  {lead.groupSize || 1} Travelers
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                  Budget Target
                </span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {lead.budget
                    ? formatMoney(lead.budget)
                    : "Not specified"}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
                  Assigned Staff
                </span>
                <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {lead.assignedTo}
                </p>
              </div>
            </div>

            {/* Chronological Timeline History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Chronological Call Log ({lead.interactions.length})
                </h3>
                <span className="text-[10px] text-gray-500">Newest first</span>
              </div>

              {lead.interactions.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/10">
                  No previous communication recorded yet. Log your first note below.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-gray-200 dark:before:bg-white/10">
                  {lead.interactions.map((item) => {
                    const channelInfo = getChannelBadge(item.channel);
                    return (
                      <div key={item.id} className="relative pl-8 space-y-1.5">
                        {/* Timeline marker icon */}
                        <div className="absolute left-1.5 -translate-x-1/2 top-1.5 w-6 h-6 rounded-full bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                          {channelInfo.icon}
                        </div>

                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#030712] border border-gray-200 dark:border-white/10 space-y-1.5 shadow-sm">
                          <div className="flex items-center justify-between text-[11px]">
                            <span
                              className={`px-2 py-0.5 rounded border font-semibold text-[10px] ${channelInfo.badge}`}
                            >
                              {item.channel}
                            </span>
                            <span className="text-gray-400 font-mono text-[10px]">
                              {formatTime(item.createdAt)}
                            </span>
                          </div>

                          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                            {item.note}
                          </p>

                          <div className="text-[10px] text-gray-500 text-right pt-0.5">
                            Logged by: <span className="text-gray-700 dark:text-gray-300 font-medium">{item.author}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Bottom Quick Logging Form */}
          <div className="p-4 bg-gray-50/80 dark:bg-[#080C14] border-t border-gray-200 dark:border-white/10">
            <form onSubmit={handleAddNote} className="space-y-3 text-xs">
              {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  Log Discussion Note
                </span>

                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-gray-500">Channel:</label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as typeof channel)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-[#0B0F19] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-[11px] focus:outline-none focus:border-purple-500"
                  >
                    <option value="WhatsApp">WhatsApp Chat</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="Walk-in">In-Person Visit</option>
                    <option value="Email">Email Follow-up</option>
                  </select>
                </div>
              </div>

              <textarea
                required
                rows={2}
                placeholder="Write discussion notes, traveler requirements, visa queries, objections..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 placeholder-gray-400"
              />

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 whitespace-nowrap">Next Callback:</span>
                  <input
                    type="date"
                    value={callbackDate}
                    onChange={(e) => setCallbackDate(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-[#030712] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-[11px] focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !noteText.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[#1B7167] hover:bg-[#155a52] disabled:opacity-50 text-white font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer [&>svg]:text-white [&>span]:text-white"
                >
                  <Send className="w-3 h-3 text-white" />
                  <span className="text-white">Log Note</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

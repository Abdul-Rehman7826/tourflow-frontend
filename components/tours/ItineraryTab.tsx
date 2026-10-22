"use client";

import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { TourDrawer } from "./TourDrawer";
import type { TourPackage, ItineraryDay, LegacyItineraryDay } from "@/types/erp";
import {
  CalendarDays,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit,
  Utensils,
  MapPin,
  Hotel,
  Clock,
} from "lucide-react";

interface ItineraryTabProps {
  tour: TourPackage;
  showToast: (message: string) => void;
}

const MEALS = ["BREAKFAST", "LUNCH", "DINNER"] as const;

export function ItineraryTab({ tour, showToast }: ItineraryTabProps) {
  const data = useData();
  const { role } = useRole();
  const canManageItinerary = role === "AGENCY_ADMIN" || role === "TOUR_MANAGER";

  const [editor, setEditor] = useState<ItineraryDay | LegacyItineraryDay | "NEW" | null>(null);

  const days = tour.itinerary ?? [];

  const handleMoveDay = (dayNumber: number, direction: -1 | 1) => {
    try {
      data.moveItineraryDay(tour.id, dayNumber, direction);
      showToast(`Moved Day ${dayNumber} ${direction === -1 ? "up" : "down"}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to reorder day.");
    }
  };

  const handleDeleteDay = (dayNumber: number) => {
    if (confirm(`Delete Day ${dayNumber}? Subsequent days will be automatically renumbered.`)) {
      try {
        data.deleteItineraryDay(tour.id, dayNumber);
        showToast(`Deleted Day ${dayNumber}.`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete day.");
      }
    }
  };

  const handleToggleMeal = (day: ItineraryDay | LegacyItineraryDay, meal: "BREAKFAST" | "LUNCH" | "DINNER") => {
    if (!canManageItinerary) return;
    const currentMeals = (day.mealsIncluded || []).map((m) => m.toUpperCase());
    const nextMeals = currentMeals.includes(meal)
      ? currentMeals.filter((m) => m !== meal)
      : [...currentMeals, meal];

    try {
      data.updateItineraryDay(tour.id, day.dayNumber, {
        mealsIncluded: nextMeals as ("BREAKFAST" | "LUNCH" | "DINNER")[],
      });
      showToast(`Updated meals for Day ${day.dayNumber}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update meals.");
    }
  };

  const handleAddActivity = (dayNumber: number, existingActivities: string[], newActivity: string) => {
    if (!newActivity.trim()) return;
    try {
      data.updateItineraryDay(tour.id, dayNumber, {
        activities: [...existingActivities, newActivity.trim()],
      });
      showToast(`Added activity to Day ${dayNumber}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add activity.");
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-[#030712] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
        <div>
          <h2 className="font-bold text-sm text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-[#1B7167]" />
            Trip Timeline &amp; Daily Operations
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
            {tour.durationDays} Days / {tour.durationNights ?? tour.durationDays - 1} Nights · {days.length} Itinerary Milestones Scheduled
          </p>
        </div>

        {canManageItinerary && (
          <button
            type="button"
            onClick={() => setEditor("NEW")}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Itinerary Day</span>
          </button>
        )}
      </div>

      {/* Days Timeline */}
      {days.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-8 text-center space-y-2 text-gray-500 dark:text-gray-400 shadow-sm">
          <CalendarDays className="w-8 h-8 mx-auto text-gray-400" />
          <p className="font-semibold text-xs">No daily itinerary scheduled yet.</p>
          <p className="text-[11px] text-gray-400">Click &quot;+ Add Itinerary Day&quot; to build the trip timeline.</p>
        </div>
      ) : (
        <div className="space-y-4 border-l-2 border-teal-600/30 pl-4 md:pl-6 ml-2 md:ml-4">
          {days.map((day, index) => {
            const hotel = day.hotelName || ("hotelStay" in day && day.hotelStay) || "Not set";
            const includedMeals = (day.mealsIncluded || []).map((m) => m.toUpperCase());

            return (
              <article
                key={`${day.dayNumber}-${day.title}`}
                className="relative rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-3 shadow-sm transition-all"
              >
                {/* Milestone Node on timeline */}
                <div className="absolute -left-[25px] md:-left-[33px] top-4 w-4 h-4 rounded-full bg-[#1B7167] border-2 border-white dark:border-[#030712] flex items-center justify-center text-[8px] font-bold text-white">
                  {day.dayNumber}
                </div>

                {/* Day Header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-xs font-mono font-bold text-[#1B7167] dark:text-teal-400">
                        Day {day.dayNumber}
                      </span>
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {day.date || "Date unassigned"}
                      </span>
                    </div>
                    <h3 className="mt-1.5 font-bold text-sm text-gray-900 dark:text-white font-sans">
                      {day.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#1B7167]" />
                        {day.city || "Destination"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Hotel className="w-3 h-3 text-amber-500" />
                        Overnight: <strong className="text-gray-700 dark:text-gray-300 ml-0.5">{hotel}</strong>
                      </span>
                    </div>
                  </div>

                  {canManageItinerary && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditor(day)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Move day ${day.dayNumber} up`}
                        disabled={index === 0}
                        onClick={() => handleMoveDay(day.dayNumber, -1)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move day ${day.dayNumber} down`}
                        disabled={index === days.length - 1}
                        onClick={() => handleMoveDay(day.dayNumber, 1)}
                        className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDay(day.dayNumber)}
                        className="p-1 text-rose-500 hover:text-rose-700 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title="Delete Day"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Activities List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400">
                    Scheduled Program &amp; Activities:
                  </span>
                  {day.activities && day.activities.length > 0 ? (
                    <ul className="space-y-1 text-xs text-gray-700 dark:text-gray-300 pl-4 list-disc">
                      {day.activities.map((activity, i) => (
                        <li key={i} className="leading-relaxed">
                          {activity}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No specific activities listed for this day.</p>
                  )}
                </div>

                {/* Quick Add Activity form */}
                {canManageItinerary && (
                  <QuickActivityInput
                    onAdd={(act) => handleAddActivity(day.dayNumber, day.activities || [], act)}
                  />
                )}

                {/* Included Meals Pills */}
                <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold text-gray-400 flex items-center gap-1 mr-1">
                    <Utensils className="w-3 h-3 text-[#1B7167]" />
                    Meals:
                  </span>
                  {MEALS.map((meal) => {
                    const isIncluded = includedMeals.some((m) => m.includes(meal));
                    return (
                      <button
                        key={meal}
                        type="button"
                        disabled={!canManageItinerary}
                        onClick={() => handleToggleMeal(day, meal)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all ${
                          isIncluded
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                            : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-white/10 hover:border-gray-300"
                        }`}
                      >
                        {meal === "BREAKFAST" ? "🍳 Breakfast" : meal === "LUNCH" ? "🥗 Lunch" : "🍲 Dinner"}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Add / Edit Day Modal */}
      {editor && canManageItinerary && (
        <ItineraryDayModal
          key={editor === "NEW" ? "new" : editor.dayNumber}
          day={editor === "NEW" ? undefined : editor}
          nextDay={days.length + 1}
          onClose={() => setEditor(null)}
          onSave={(dayInput) => {
            try {
              if (editor === "NEW") {
                data.addItineraryDay(tour.id, dayInput);
                showToast(`Added Day ${dayInput.dayNumber}: ${dayInput.title}`);
              } else {
                data.updateItineraryDay(tour.id, editor.dayNumber, dayInput);
                showToast(`Updated Day ${dayInput.dayNumber}.`);
              }
              setEditor(null);
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Failed to save itinerary day.");
            }
          }}
        />
      )}
    </div>
  );
}

function QuickActivityInput({ onAdd }: { onAdd: (value: string) => void }) {
  const [val, setVal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
      <input
        type="text"
        placeholder="+ Add quick activity (e.g. 02:00 PM - Bosphorus Sunset Cruise)"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="flex-1 px-3 py-1.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
      />
      <button
        type="submit"
        className="px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg transition-colors shrink-0"
      >
        Add
      </button>
    </form>
  );
}

function ItineraryDayModal({
  day,
  nextDay,
  onClose,
  onSave,
}: {
  day?: ItineraryDay | LegacyItineraryDay;
  nextDay: number;
  onClose: () => void;
  onSave: (day: ItineraryDay) => void;
}) {
  const [form, setForm] = useState<ItineraryDay>({
    dayNumber: day?.dayNumber ?? nextDay,
    date: day?.date ?? "",
    city: day?.city ?? "",
    title: day?.title ?? "",
    hotelName: day?.hotelName || (day && "hotelStay" in day ? day.hotelStay : "") || "",
    activities: day?.activities ?? [],
    mealsIncluded: MEALS.filter((m) =>
      day?.mealsIncluded ? (day.mealsIncluded as string[]).some((val) => val.toUpperCase().includes(m)) : false
    ),
  });

  const [activitiesText, setActivitiesText] = useState(form.activities.join("\n"));
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Day title is required.");
      return;
    }
    if (!form.city.trim()) {
      setError("City/Location is required.");
      return;
    }

    try {
      onSave({
        ...form,
        activities: activitiesText.split("\n").map((s) => s.trim()).filter(Boolean),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save itinerary day.");
    }
  };

  return (
    <TourDrawer
      title={day ? `Edit Itinerary Day ${day.dayNumber}` : "Add Itinerary Day"}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm transition-colors"
          >
            Save Itinerary Day
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Day Number
            </label>
            <input
              required
              type="number"
              min={1}
              max={day ? nextDay - 1 : nextDay}
              value={form.dayNumber}
              onChange={(e) => setForm({ ...form, dayNumber: Number(e.target.value) })}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date (Optional)
            </label>
            <input
              type="date"
              value={form.date || ""}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Day Title
          </label>
          <input
            required
            type="text"
            placeholder="e.g. Arrival in Istanbul & Bosphorus Sunset Cruise"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              City / Location
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Istanbul, Antalya"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Overnight Hotel
            </label>
            <input
              type="text"
              placeholder="e.g. Grand Palace Hotel"
              value={form.hotelName}
              onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Activities (One per line)
          </label>
          <textarea
            rows={4}
            placeholder="09:00 AM - Hotel breakfast and orientation&#10;11:00 AM - Guided Blue Mosque & Hagia Sophia tour&#10;06:00 PM - Welcome dinner at traditional Ottoman restaurant"
            value={activitiesText}
            onChange={(e) => setActivitiesText(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none font-sans"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Included Meals
          </label>
          <div className="flex gap-4">
            {MEALS.map((meal) => (
              <label key={meal} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.mealsIncluded.includes(meal)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      mealsIncluded: e.target.checked
                        ? [...form.mealsIncluded, meal]
                        : form.mealsIncluded.filter((m) => m !== meal),
                    })
                  }
                  className="rounded text-[#1B7167] focus:ring-[#1B7167]"
                />
                <span>{meal[0] + meal.slice(1).toLowerCase()}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-400">
            {error}
          </div>
        )}
      </div>
    </TourDrawer>
  );
}

"use client";

import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { useRole } from "@/context/RoleContext";
import { ROOM_CAPACITY } from "@/lib/tour-operations";
import { TourDrawer } from "./TourDrawer";
import type { TourPackage, RoomAllocation, RoomType } from "@/types/erp";
import {
  BedDouble,
  Users,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
} from "lucide-react";

interface RoomingMatrixTabProps {
  tour: TourPackage;
  showToast: (message: string) => void;
}

export function RoomingMatrixTab({ tour, showToast }: RoomingMatrixTabProps) {
  const data = useData();
  const { role } = useRole();
  const canManageRooms = role === "AGENCY_ADMIN" || role === "TOUR_MANAGER";

  const [editor, setEditor] = useState<RoomAllocation | "NEW" | null>(null);

  // Get all confirmed travelers for this package
  const travelers = data.bookings
    .filter((b) => b.packageId === tour.id && b.status === "CONFIRMED")
    .flatMap((b) => b.travelers.map((t) => ({ ...t, bookingNumber: b.bookingNumber })));

  const unassignedTravelers = travelers.filter((t) => !t.assignedRoomId);

  const handleAssign = (roomId: string, travelerId: string) => {
    try {
      data.assignTravelerToRoom(tour.id, roomId, travelerId);
      showToast("Traveler assigned to room successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to assign traveler.");
    }
  };

  const handleUnassign = (roomId: string, travelerId: string) => {
    try {
      data.unassignTravelerFromRoom(tour.id, roomId, travelerId);
      showToast("Traveler unassigned from room.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unassign traveler.");
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (confirm("Delete this hotel room? Any occupants will be returned to the unassigned queue.")) {
      try {
        data.deleteRoom(tour.id, roomId);
        showToast("Hotel room deleted.");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete room.");
      }
    }
  };

  return (
    <div className="space-y-6 text-gray-900 dark:text-white">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Unassigned Queue */}
        <aside className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-3 self-start shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm font-sans flex items-center gap-2 text-gray-900 dark:text-white">
              <Users className="w-4 h-4 text-[#1B7167]" />
              Unassigned Travelers
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-500/10 text-[#1B7167] dark:text-teal-400">
              {unassignedTravelers.length}
            </span>
          </div>

          {unassignedTravelers.length === 0 ? (
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>All confirmed passengers are assigned to hotel rooms.</span>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {unassignedTravelers.map((t) => {
                return (
                  <div
                    key={t.id}
                    className="rounded-xl border border-gray-200 dark:border-white/10 p-3 space-y-1 bg-gray-50/50 dark:bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-gray-900 dark:text-white font-sans">
                        {t.fullName || `Unnamed Slot ${t.slotNumber ?? ""}`}
                      </p>
                      <span className="text-[10px] font-mono text-[#1B7167] dark:text-teal-400 font-semibold">
                        {t.bookingNumber}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                      {t.phone || "No phone recorded"}
                    </p>
                    <div className="pt-1 flex items-center gap-1.5">
                      <span className="inline-block rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] font-mono text-[#1B7167] dark:text-teal-400 font-medium">
                        Pref: {t.roomPreference || "DOUBLE"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Right Columns: Hotel Rooming Matrix */}
        <section className="space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#030712] p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
            <div>
              <h2 className="font-bold text-sm text-gray-900 dark:text-white font-sans flex items-center gap-2">
                <BedDouble className="w-4 h-4 text-[#1B7167]" />
                Hotel Rooming Matrix
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                Single: 1 Pax | Double: 2 Pax | Triple: 3 Pax | Family: 4 Pax
              </p>
            </div>
            {canManageRooms && (
              <button
                type="button"
                onClick={() => setEditor("NEW")}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Hotel Room</span>
              </button>
            )}
          </div>

          {(!tour.rooms || tour.rooms.length === 0) ? (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-8 text-center space-y-2 text-gray-500 dark:text-gray-400 shadow-sm">
              <BedDouble className="w-8 h-8 mx-auto text-gray-400" />
              <p className="font-semibold text-xs">No hotel rooms configured for this departure.</p>
              <p className="text-[11px] text-gray-400">Click &quot;+ Add Hotel Room&quot; to initialize room blocks.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tour.rooms.map((room) => {
                const capacity = ROOM_CAPACITY[room.roomType] || 2;
                const full = room.assignedTravelerIds.length >= capacity;
                const emptySlots = Math.max(0, capacity - room.assignedTravelerIds.length);

                return (
                  <article
                    key={room.id}
                    className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#030712] p-4 space-y-3 shadow-sm"
                  >
                    {/* Room Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-white/10 pb-2.5">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 dark:text-white font-sans flex items-center gap-1.5">
                          <span>Room #{room.roomNumber}</span>
                          <span className="text-gray-400 font-normal">·</span>
                          <span className="text-xs text-gray-600 dark:text-gray-300 font-normal font-sans truncate max-w-[150px]">
                            {room.hotelName}
                          </span>
                        </h3>
                        <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                          {room.roomType === "DOUBLE" ? "Double / Twin" : room.roomType === "FAMILY" ? "Family Suite" : room.roomType}
                        </p>
                      </div>

                      {canManageRooms && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditor(room)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                            title="Edit Room"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRoom(room.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Occupancy Indicator */}
                    <div
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-semibold flex items-center justify-between ${
                        full
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      <span>
                        {room.assignedTravelerIds.length} / {capacity} Occupied
                      </span>
                      <span>{full ? "Full" : "Needs Roommate"}</span>
                    </div>

                    {/* Assigned Occupants List */}
                    <div className="space-y-2">
                      {room.assignedTravelerIds.map((id) => {
                        const t = travelers.find((trav) => trav.id === id);
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 dark:bg-white/5 p-2 border border-gray-100 dark:border-white/5"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                {t?.fullName || "Inactive traveler"}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono truncate">
                                {t?.bookingNumber || "No booking #"} {t?.phone ? `· ${t.phone}` : ""}
                              </p>
                            </div>
                            {canManageRooms && (
                              <button
                                type="button"
                                aria-label={`Unassign ${t?.fullName || "traveler"}`}
                                onClick={() => handleUnassign(room.id, id)}
                                className="px-2 py-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors shrink-0"
                              >
                                Unassign ×
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Assign from Queue Dropdowns for Empty Slots */}
                    {canManageRooms &&
                      Array.from({ length: emptySlots }, (_, slot) => (
                        <div key={slot} className="pt-1">
                          <select
                            aria-label={`Assign empty slot ${slot + 1} in ${room.roomNumber}`}
                            className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-gray-300 focus:border-[#1B7167] focus:outline-none font-medium"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) handleAssign(room.id, e.target.value);
                            }}
                          >
                            <option value="">+ Assign Passenger from Queue</option>
                            {unassignedTravelers
                              .filter((t) => t.fullName?.trim())
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.fullName} ({t.bookingNumber})
                                </option>
                              ))}
                          </select>
                        </div>
                      ))}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Add / Edit Hotel Room Modal */}
      {editor && canManageRooms && (
        <RoomModal
          key={editor === "NEW" ? "new" : editor.id}
          room={editor === "NEW" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSave={(input) => {
            try {
              if (editor === "NEW") {
                data.addRoom(tour.id, input);
                showToast("Added new hotel room.");
              } else {
                data.updateRoom(tour.id, editor.id, input);
                showToast("Updated hotel room details.");
              }
              setEditor(null);
            } catch (err) {
              showToast(err instanceof Error ? err.message : "Failed to save room.");
            }
          }}
        />
      )}
    </div>
  );
}

type RoomInput = Omit<RoomAllocation, "id" | "tourId" | "assignedTravelerIds">;

function RoomModal({
  room,
  onClose,
  onSave,
}: {
  room?: RoomAllocation;
  onClose: () => void;
  onSave: (input: RoomInput) => void;
}) {
  const [form, setForm] = useState<RoomInput>({
    roomNumber: room?.roomNumber ?? "",
    hotelName: room?.hotelName ?? "Grand Palace Hotel",
    roomType: room?.roomType ?? "DOUBLE",
    notes: room?.notes ?? "",
  });
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.roomNumber.trim()) {
      setError("Room number is required.");
      return;
    }
    if (!form.hotelName.trim()) {
      setError("Hotel name is required.");
      return;
    }
    try {
      onSave(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save room.");
    }
  };

  return (
    <TourDrawer
      title={room ? "Edit Hotel Room" : "Add Hotel Room"}
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
            Save Hotel Room
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Room Number / Identifier
          </label>
          <input
            required
            type="text"
            placeholder="e.g. 204, Suite A, 501"
            value={form.roomNumber}
            onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
            className="w-full px-3 py-2 text-xs font-mono bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Hotel Name
          </label>
          <input
            required
            type="text"
            placeholder="e.g. Grand Palace Hotel, Swissotel"
            value={form.hotelName}
            onChange={(e) => setForm({ ...form, hotelName: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Room Type &amp; Capacity
          </label>
          <select
            value={form.roomType}
            onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomType })}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
          >
            <option value="SINGLE">Single Room (1 Pax)</option>
            <option value="DOUBLE">Double / Twin Room (2 Pax)</option>
            <option value="TRIPLE">Triple Room (3 Pax)</option>
            <option value="FAMILY">Family Suite (4 Pax)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes / Bed Configuration
          </label>
          <textarea
            rows={2}
            placeholder="e.g. 2 Twin single beds, Non-smoking, High floor"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:border-[#1B7167] focus:outline-none"
          />
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

"use client";

import React, { useState, useMemo } from "react";
import { TravelerManifestItem, RoomType } from "@/types/erp";
import { Bed, Users, CheckCircle2, Plus, X, DoorOpen, Home } from "lucide-react";

interface HotelRoomItem {
  id: string;
  roomNumber: string;
  hotelName: string;
  roomType: RoomType;
  maxCapacity: number;
  assignedTravelerIds: string[];
}

interface RoomingMatrixGridProps {
  manifestItems: TravelerManifestItem[];
  onAssignRoom?: (travelerId: string, roomType: RoomType, roomId?: string) => void;
}

export function RoomingMatrixGrid({
  manifestItems,
  onAssignRoom,
}: RoomingMatrixGridProps) {
  // Initialize default hotel rooms if none provided
  const [rooms, setRooms] = useState<HotelRoomItem[]>([
    { id: "rm-101", roomNumber: "101", hotelName: "Grand Palace Hotel", roomType: "SINGLE", maxCapacity: 1, assignedTravelerIds: [] },
    { id: "rm-102", roomNumber: "102", hotelName: "Grand Palace Hotel", roomType: "SINGLE", maxCapacity: 1, assignedTravelerIds: [] },
    { id: "rm-201", roomNumber: "201", hotelName: "Grand Palace Hotel", roomType: "DOUBLE", maxCapacity: 2, assignedTravelerIds: [] },
    { id: "rm-202", roomNumber: "202", hotelName: "Grand Palace Hotel", roomType: "DOUBLE", maxCapacity: 2, assignedTravelerIds: [] },
    { id: "rm-301", roomNumber: "301", hotelName: "Grand Palace Hotel", roomType: "TRIPLE", maxCapacity: 3, assignedTravelerIds: [] },
    { id: "rm-401", roomNumber: "401", hotelName: "Grand Palace Hotel", roomType: "FAMILY", maxCapacity: 4, assignedTravelerIds: [] },
  ]);

  const [selectedUnassignedId, setSelectedUnassignedId] = useState<string | null>(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [newHotelName, setNewHotelName] = useState("Grand Palace Hotel");
  const [newRoomType, setNewRoomType] = useState<RoomType>("DOUBLE");

  // Track assignments from manifest items
  const assignedMap = useMemo(() => {
    const map = new Map<string, string>(); // travelerId -> roomId
    manifestItems.forEach((m) => {
      if (m.assignedRoomId) {
        map.set(m.id, m.assignedRoomId);
      }
    });
    return map;
  }, [manifestItems]);

  const unassigned = useMemo(() => {
    return manifestItems.filter((m) => !m.assignedRoomId && !assignedMap.has(m.id));
  }, [manifestItems, assignedMap]);

  // Merge manifest assignments with room occupancy
  const roomsWithOccupants = useMemo(() => {
    return rooms.map((room) => {
      const occupants = manifestItems.filter(
        (m) => m.assignedRoomId === room.id || m.assignedRoomId === room.roomNumber
      );
      return {
        ...room,
        occupants,
        isFull: occupants.length >= room.maxCapacity,
        isPartiallyFilled: occupants.length > 0 && occupants.length < room.maxCapacity,
        isAvailable: occupants.length === 0,
      };
    });
  }, [rooms, manifestItems]);

  const roomCategories: { type: RoomType; label: string; icon: string; capacity: number }[] = [
    { type: "SINGLE", label: "SINGLE (1 Pax)", icon: "👤", capacity: 1 },
    { type: "DOUBLE", label: "DOUBLE / TWIN (2 Pax)", icon: "👥", capacity: 2 },
    { type: "TRIPLE", label: "TRIPLE (3 Pax)", icon: "👥👤", capacity: 3 },
    { type: "FAMILY", label: "FAMILY SUITE (4–5 Pax)", icon: "👨‍👩‍👧‍👦", capacity: 4 },
  ];

  const handleAssignToRoom = (roomId: string, roomType: RoomType) => {
    if (!selectedUnassignedId) return;
    if (onAssignRoom) {
      onAssignRoom(selectedUnassignedId, roomType, roomId);
    }
    setSelectedUnassignedId(null);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;
    const capacity = newRoomType === "SINGLE" ? 1 : newRoomType === "DOUBLE" ? 2 : newRoomType === "TRIPLE" ? 3 : 4;
    const newRoom: HotelRoomItem = {
      id: `rm-${Date.now()}`,
      roomNumber: newRoomNumber.trim(),
      hotelName: newHotelName.trim() || "Grand Palace Hotel",
      roomType: newRoomType,
      maxCapacity: capacity,
      assignedTravelerIds: [],
    };
    setRooms((prev) => [...prev, newRoom]);
    setNewRoomNumber("");
    setShowAddRoomModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Unassigned Pool Banner */}
      <div className="p-5 bg-white dark:bg-[#121C18] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-[#1B7167] border border-teal-200 dark:border-teal-800">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white font-sans">
                Rooming Allocation &amp; Pairing Matrix
              </h3>
              <p className="text-xs text-gray-500">
                Pair travelers into Single, Double/Twin, Triple, and Family room allocations.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddRoomModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B7167] text-white text-xs font-semibold hover:bg-[#155a52] transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Hotel Room
          </button>
        </div>

        {/* Unassigned Pool */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 font-sans">
              <Users className="w-4 h-4 text-amber-600" />
              Unassigned Passengers Pool ({unassigned.length} Remaining)
            </span>
            <span className="text-[11px] font-mono text-amber-700 dark:text-amber-400">
              {selectedUnassignedId ? "👉 Click a room card below to assign" : "Select a traveler below to pair with a room"}
            </span>
          </div>

          {unassigned.length === 0 ? (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 font-medium py-1">
              <CheckCircle2 className="w-4 h-4" /> All manifest passengers are allocated to hotel rooms!
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {unassigned.map((pax) => {
                const isSelected = selectedUnassignedId === pax.id;
                return (
                  <button
                    key={pax.id}
                    type="button"
                    onClick={() => setSelectedUnassignedId(isSelected ? null : pax.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                      isSelected
                        ? "bg-[#1B7167] text-white border-[#1B7167] ring-2 ring-[#1B7167]/40 shadow-sm font-semibold"
                        : "bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-amber-200 dark:border-amber-800 hover:border-[#1B7167]"
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-70">#{pax.slotNumber || 1}</span>
                    <span>{pax.fullName}</span>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 uppercase">
                      {pax.roomPreference || "DOUBLE"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Room Categories Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roomCategories.map((cat) => {
          const categoryRooms = roomsWithOccupants.filter((r) => r.roomType === cat.type);

          return (
            <div
              key={cat.type}
              className="p-5 bg-white dark:bg-[#121C18] border border-gray-200 dark:border-gray-800 rounded-xl space-y-4 shadow-sm"
            >
              {/* Category Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{cat.icon}</span>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white font-sans">
                      {cat.label}
                    </h4>
                    <span className="text-[11px] text-gray-500 font-mono">
                      Max {cat.capacity} Guests / Room • {categoryRooms.length} Rooms Configured
                    </span>
                  </div>
                </div>
              </div>

              {/* Room Cards Grid */}
              <div className="space-y-3">
                {categoryRooms.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-4 text-center">
                    No {cat.label.toLowerCase()} rooms configured yet.
                  </p>
                ) : (
                  categoryRooms.map((room) => {
                    let badgeClass = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
                    let badgeText = "Available";
                    if (room.isFull) {
                      badgeClass = "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700";
                      badgeText = "Full";
                    } else if (room.isPartiallyFilled) {
                      badgeClass = "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
                      badgeText = "Partially Filled";
                    }

                    return (
                      <div
                        key={room.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          selectedUnassignedId && !room.isFull
                            ? "hover:border-[#1B7167] cursor-pointer ring-1 ring-teal-500/20"
                            : ""
                        } bg-gray-50/70 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 space-y-2.5`}
                        onClick={() => {
                          if (selectedUnassignedId && !room.isFull) {
                            handleAssignToRoom(room.id, room.roomType);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DoorOpen className="w-4 h-4 text-[#1B7167]" />
                            <span className="font-bold text-xs text-gray-900 dark:text-white font-mono">
                              Room {room.roomNumber}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ({room.hotelName})
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}>
                              {badgeText} ({room.occupants.length}/{room.maxCapacity})
                            </span>

                            {selectedUnassignedId && !room.isFull && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignToRoom(room.id, room.roomType);
                                }}
                                className="px-2 py-0.5 rounded bg-[#1B7167] text-white text-[10px] font-semibold hover:bg-[#155a52] transition-colors"
                              >
                                + Place Here
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Occupants list */}
                        {room.occupants.length === 0 ? (
                          <div className="p-2 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 text-center text-[11px] text-gray-400">
                            Empty room slot. Assign traveler from pool.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {room.occupants.map((pax) => (
                              <div
                                key={pax.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-[#121C18] border border-gray-200/80 dark:border-gray-700/80 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <Bed className="w-3.5 h-3.5 text-[#1B7167]" />
                                  <div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                      {pax.fullName}
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400 ml-2">
                                      {pax.bookingId}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onAssignRoom) {
                                      onAssignRoom(pax.id, "DOUBLE", "");
                                    }
                                  }}
                                  className="text-[10px] font-medium text-rose-600 dark:text-rose-400 hover:underline"
                                >
                                  Unassign &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Room Modal */}
      {showAddRoomModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#121C18] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-gray-900/40">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white font-sans">
                Add Hotel Room Slot
              </h3>
              <button
                type="button"
                onClick={() => setShowAddRoomModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room Number / Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 201, 304B"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Hotel Accommodation Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Palace Hotel"
                  value={newHotelName}
                  onChange={(e) => setNewHotelName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Room Category
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value as RoomType)}
                  className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-[#1B7167]"
                >
                  <option value="SINGLE">Single (1 Pax)</option>
                  <option value="DOUBLE">Double / Twin (2 Pax)</option>
                  <option value="TRIPLE">Triple (3 Pax)</option>
                  <option value="FAMILY">Family Suite (4 Pax)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddRoomModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1B7167] hover:bg-[#155a52] transition-colors"
                >
                  Create Room Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

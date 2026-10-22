"use client";

import React, { useState, useEffect } from "react";
import { TopNavbar } from "@/components/layout/TopNavbar";
import { GlobalBookingModal } from "@/components/bookings/GlobalBookingModal";

export function Header({
  onOpenNavigation,
  navigationOpen,
}: {
  onOpenNavigation?: () => void;
  navigationOpen?: boolean;
}) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener to trigger Global Booking Wizard
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsBookingModalOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <TopNavbar
        onOpenNavigation={onOpenNavigation || (() => {})}
        navigationOpen={navigationOpen}
      />
      <GlobalBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />
    </>
  );
}

export default Header;

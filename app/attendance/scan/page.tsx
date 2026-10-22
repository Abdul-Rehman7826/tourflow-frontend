import { redirect } from "next/navigation";

/**
 * Kept for existing bookmarks. QR scanning has been retired in favor of the
 * shared Employee ID and Quick PIN kiosk.
 */
export default function RetiredQrAttendanceRoute() {
  redirect("/attendance/kiosk");
}

import { redirect } from "next/navigation";

/** Redirect legacy QR completion URLs to the shared kiosk. */
export default function RetiredQrAttendanceResultRoute() {
  redirect("/attendance/kiosk");
}

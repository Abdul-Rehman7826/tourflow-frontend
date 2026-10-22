export const PUBLIC_ROUTES = [
  "/",
  "/setup",
  "/login",
  "/reset-password",
  "/profiles",
  // Retired QR URLs stay public only so old bookmarks can redirect to the kiosk.
  "/attendance/scan",
  "/attendance/success",
  "/attendance/kiosk",
  "/api",
] as const;

export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((path) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`),
  );
}

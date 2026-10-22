/**
 * Asset URL Resolver for TourFlow ERP.
 * 
 * Safely resolves relative upload paths (e.g. /uploads/branding/...)
 * against the backend API host, while passing through data URIs
 * and full external URLs intact.
 */

export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "";

  const trimmed = url.trim();
  if (!trimmed) return "";

  // Data URIs, Blobs, and Absolute URLs are already fully qualified
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  // Resolve relative API upload path
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.worldclassholidays.org/api/v1";
  const apiOrigin = rawApiUrl.replace(/\/api\/v1\/?$/, "");

  if (trimmed.startsWith("/")) {
    return `${apiOrigin}${trimmed}`;
  }

  return `${apiOrigin}/${trimmed}`;
}

import type { DocumentVerificationStatus, VaultDocument } from "@/types/erp";

export function canAccessDocumentVault(role: string) {
  return role === "AGENCY_ADMIN" || role === "VISA_CONSULTANT";
}

export function getVaultDocumentStatus(
  document: Pick<VaultDocument, "expiryDate" | "verificationStatus">,
  today: string,
): DocumentVerificationStatus {
  if (document.expiryDate && document.expiryDate < today && document.verificationStatus !== "REJECTED") return "EXPIRED";
  return document.verificationStatus;
}

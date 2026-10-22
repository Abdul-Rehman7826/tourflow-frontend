"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useAgencySettings } from "@/context/ThemeContext";
import { resolveAssetUrl } from "@/lib/asset-url";

export function AgencyLogo({
  initials,
  className = "w-full h-full object-contain rounded-lg",
  fallbackClassName,
}: {
  initials: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const { settings } = useAgencySettings();
  const [hasError, setHasError] = useState(false);

  const rawLogo =
    settings.lightLogo ||
    settings.darkLogo ||
    (settings as { logoUrl?: string }).logoUrl ||
    "";

  const resolvedLogo = resolveAssetUrl(rawLogo);

  if (!resolvedLogo || hasError) {
    return (
      <span className={fallbackClassName || "font-black tracking-tight"}>
        {initials || "WCH"}
      </span>
    );
  }

  return (
    <Image
      unoptimized
      width={128}
      height={128}
      src={resolvedLogo}
      alt={`${settings.name || "Agency"} logo`}
      className={className}
      onError={() => setHasError(true)}
      priority
    />
  );
}

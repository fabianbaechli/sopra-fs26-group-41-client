"use client";

import { useEffect, useState } from "react";
import { getApiDomain } from "@/utils/domain";

interface GroupPictureProps {
  url: string | null | undefined;
  alt: string;
  className?: string;
  fallback: React.ReactNode;
}

export default function GroupPicture({ url, alt, className, fallback }: GroupPictureProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!url) { setSrc(null); return; }

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(`${getApiDomain()}${url}`, {
      headers: { "Authorization": `Bearer ${token}` },
    })
      .then(r => r.ok ? r.blob() : null)
      .then(blob => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} />;
}

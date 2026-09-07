"use client";

import { useLinkStatus } from "next/link";
import { useEffect } from "react";

// Reports whether the <Link> it's nested in is still navigating, so the
// parent can surface a loading toast instead of the filter silently doing
// nothing for however long the fetch takes.
export function LinkPendingWatcher({
  id,
  onPendingChange,
}: {
  id: string;
  onPendingChange: (id: string, pending: boolean) => void;
}) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onPendingChange(id, pending);
    return () => onPendingChange(id, false);
  }, [id, pending, onPendingChange]);
  return null;
}

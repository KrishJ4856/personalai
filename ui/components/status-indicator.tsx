"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";

import type { IntelligenceStatus } from "@/lib/types";

function relativeUpdate(value: string | null, now: number) {
  if (!value) return "No updates yet";

  const elapsedSeconds = Math.max(0, Math.round((now - Date.parse(value)) / 1000));
  if (elapsedSeconds < 45) return "Updated just now";

  const minutes = Math.floor(elapsedSeconds / 60);
  if (minutes < 60) return `Updated ${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr${hours === 1 ? "" : "s"} ago`;

  return `Updated ${new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
  }).format(new Date(value))}`;
}

function exactUpdate(value: string | null) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StatusIndicator({ status }: { status: IntelligenceStatus }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const title = useMemo(
    () =>
      `Cards updated ${exactUpdate(status.cardsUpdatedAt)} · Memory updated ${exactUpdate(status.memoryUpdatedAt)}`,
    [status.cardsUpdatedAt, status.memoryUpdatedAt],
  );

  return (
    <div className="status-indicator" title={title}>
      <Clock3 aria-hidden="true" className="size-3.5" />
      <time dateTime={status.latestUpdateAt ?? undefined}>
        {relativeUpdate(status.latestUpdateAt, now)}
      </time>
    </div>
  );
}

import { formatKstTime } from "@/lib/format";

/** When the server rendered this page, so a refresh (manual or automatic) is visible. */
export function RenderedAt({ at, className = "" }: { at: Date; className?: string }) {
  return (
    <p className={`text-xs text-sub ${className}`}>
      <time dateTime={at.toISOString()} className="font-num tabular-nums">
        {formatKstTime(at)}
      </time>{" "}
      기준
    </p>
  );
}

import Link from "next/link";

/** Pill segmented control whose options are links (state lives in the URL). */
export function Segment({
  items,
  className = "",
  stretch = false,
}: {
  items: Array<{ label: string; href: string; active: boolean }>;
  className?: string;
  stretch?: boolean;
}) {
  return (
    <nav className={`flex gap-0.5 rounded-[10px] bg-surface p-[3px] ${className}`}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          scroll={false}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-lg px-3.5 py-1.5 text-center text-[13px] transition ${stretch ? "flex-1" : ""} ${
            item.active ? "bg-bg font-semibold text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "font-medium text-sub"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Bottom sheet under 768px, centered dialog above. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/60 [animation:fade-in_.15s_ease-out]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-bg px-5 pb-8 pt-2.5 [animation:sheet-up_.22s_ease-out] md:max-w-[440px] md:rounded-3xl md:pb-6 md:pt-6 md:[animation:fade-in_.15s_ease-out]"
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-line md:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="text-sub">
            <X size={22} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

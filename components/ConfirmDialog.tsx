"use client";

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-7">
      <button type="button" aria-label="취소" onClick={onCancel} className="absolute inset-0 bg-ink/60" />
      <div role="alertdialog" aria-modal="true" aria-label={title} className="relative w-full max-w-[334px] rounded-[20px] bg-bg px-6 pb-5 pt-7 [animation:fade-in_.15s_ease-out]">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-sub">{body}</p>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-xl bg-surface text-[15px] font-semibold">
            취소
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="h-12 flex-1 rounded-xl bg-red text-[15px] font-bold text-white disabled:opacity-60"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

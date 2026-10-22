import type { ReactNode } from "react";

export const inputClass =
  "h-[50px] w-full rounded-xl border border-line bg-bg px-3.5 text-[15px] font-medium text-ink outline-none placeholder:text-[#b5b5bc] focus:border-ink focus:border-[1.5px] aria-invalid:border-red aria-invalid:border-[1.5px] read-only:bg-surface read-only:text-sub read-only:border-transparent";

export function Field({
  label,
  htmlFor,
  help,
  error,
  aside,
  children,
}: {
  label: string;
  htmlFor: string;
  help?: string;
  error?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-sub">
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red">
          {error}
        </p>
      ) : help ? (
        <p className="text-xs text-sub">{help}</p>
      ) : null}
    </div>
  );
}

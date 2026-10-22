import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "soft" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  primary: "bg-red text-white font-bold hover:brightness-95",
  secondary: "bg-surface text-ink font-semibold hover:bg-line",
  soft: "bg-red-soft text-red font-bold hover:brightness-97",
  ghost: "text-sub hover:bg-surface",
  danger: "bg-surface text-red font-semibold hover:bg-line",
};

const sizes = {
  lg: "h-[52px] px-5 text-base rounded-[14px]",
  md: "h-10 px-4 text-sm rounded-[10px]",
  sm: "h-8 px-3 text-[13px] rounded-lg",
};

export function buttonClass(variant: Variant = "primary", size: keyof typeof sizes = "lg") {
  return `inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]}`;
}

export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button {...props} className={`${buttonClass(variant, size)} ${className}`} />;
}

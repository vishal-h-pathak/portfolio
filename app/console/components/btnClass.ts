/**
 * btnClass — the pure class-string builder behind the Btn/BtnLink
 * components (./Button.tsx). Split into its own directive-free module
 * so server components (the /console/login form, which can't pull in
 * a "use client" file) can render the exact canonical button classes
 * without hand-copying the variant strings.
 */

export type Size = "sm" | "md";
export type BtnVariant =
  | "primary"
  | "approve"
  | "submit"
  | "secondary"
  | "danger"
  | "ghost";

const BASE =
  "relative inline-flex items-center justify-center gap-1.5 border " +
  "font-mono uppercase tracking-btn select-none " +
  "transition-colors duration-150 active:duration-0 " +
  "disabled:opacity-40 disabled:pointer-events-none";

const SIZES: Record<Size, string> = {
  sm: "text-[10px] px-3 py-1.5",
  md: "text-[11px] px-4 py-2",
};

const VARIANTS: Record<BtnVariant, string> = {
  primary:
    "border-amber text-amber hover:bg-amber hover:text-bg " +
    "active:bg-amber active:text-bg",
  approve:
    "border-green text-green hover:bg-green hover:text-bg " +
    "active:bg-green active:text-bg",
  submit:
    "border-blue text-blue hover:bg-blue hover:text-bg " +
    "active:bg-blue active:text-bg",
  secondary:
    "border-rule text-ink-dim hover:border-amber hover:text-amber " +
    "active:border-amber active:text-amber",
  danger:
    "border-red-dim text-red hover:border-red hover:bg-red/10 " +
    "active:bg-red/20",
  ghost:
    "border-transparent text-ink-faint hover:text-ink active:text-ink",
};

export function btnClass(
  variant: BtnVariant,
  size: Size,
  extra?: string,
): string {
  return [BASE, SIZES[size], VARIANTS[variant], extra ?? ""].join(" ").trim();
}

/** Class string for Next.js <Link> elements that must look like a Btn. */
export function btnLinkClass(
  variant: BtnVariant = "secondary",
  size: Size = "sm",
  extra?: string,
): string {
  return btnClass(variant, size, extra);
}

"use client";

/**
 * Re-export shim — the canonical Btn/BtnLink primitives now live in
 * app/console/components/Button.tsx (shared across every console tab,
 * not just the job pipeline). Kept here so existing `./components/Button`
 * imports across jobs/* don't all need rewriting.
 */
export { Btn, BtnLink, btnLinkClass } from "../../components/Button";
export type { BtnVariant, BtnProps } from "../../components/Button";

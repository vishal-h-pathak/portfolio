"use client";

/**
 * Button primitives — the unified action language for the dashboard.
 *
 * Five variants cover every existing dashboard button:
 *   - PrimaryButton      one per screen; the main CTA
 *   - SecondaryButton    alternate actions; neutral outline
 *   - DestructiveButton  loses or undoes work; red
 *   - InflightButton     async dispatch; states: idle | queueing | running
 *   - GhostButton        inline text-only (e.g. Undo)
 *
 * Two sizes — "sm" (default; matches the existing card-action footprint
 * `text-xs px-3 py-1.5`) and "md" (cockpit action-bar footprint
 * `text-sm px-4 py-2`).
 *
 * Anchor variants (`PrimaryAnchor`, `SecondaryAnchor`) exist for places
 * where the visual must look like a button but the semantic must
 * remain an anchor (e.g. Next.js Link children, target="_blank").
 *
 * Focus rings are deliberately included via `focus-visible:` so
 * keyboard users get the §1 focus-states accessibility win even
 * though the rest of the dashboard hasn't adopted them yet.
 */

import type { ComponentProps, ReactNode } from "react";

type Size = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded border " +
  "transition-colors transition-opacity " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-black " +
  "disabled:cursor-not-allowed";

const SIZES: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5",
  md: "text-sm px-4 py-2",
};

const VARIANTS = {
  primary:
    "border-emerald-700 bg-emerald-900/40 text-emerald-100 " +
    "hover:bg-emerald-800/60 focus-visible:ring-emerald-500 " +
    "disabled:opacity-50",
  secondary:
    "border-neutral-700 bg-neutral-900 text-neutral-300 " +
    "hover:border-neutral-500 hover:text-neutral-100 " +
    "focus-visible:ring-neutral-500 disabled:opacity-50",
  destructive:
    "border-red-800/60 bg-red-950/40 text-red-200 " +
    "hover:bg-red-900/60 focus-visible:ring-red-500 " +
    "disabled:opacity-50",
  inflight:
    "border-violet-800/60 bg-violet-900/30 text-violet-200 " +
    "hover:bg-violet-800/50 focus-visible:ring-violet-500 " +
    "disabled:opacity-50",
  ghost:
    "border-transparent bg-transparent text-neutral-500 " +
    "hover:text-neutral-200 focus-visible:ring-neutral-500 " +
    "disabled:opacity-50",
} as const;

type Variant = keyof typeof VARIANTS;

function buildClass(variant: Variant, size: Size, extra?: string): string {
  return [BASE, SIZES[size], VARIANTS[variant], extra ?? ""].join(" ").trim();
}

// ── Plain buttons ────────────────────────────────────────────────────────

type ButtonProps = ComponentProps<"button"> & {
  size?: Size;
  className?: string;
};

export function PrimaryButton({
  size = "sm",
  className,
  ...rest
}: ButtonProps) {
  return <button {...rest} className={buildClass("primary", size, className)} />;
}

export function SecondaryButton({
  size = "sm",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} className={buildClass("secondary", size, className)} />
  );
}

export function DestructiveButton({
  size = "sm",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button {...rest} className={buildClass("destructive", size, className)} />
  );
}

export function GhostButton({ size = "sm", className, ...rest }: ButtonProps) {
  return <button {...rest} className={buildClass("ghost", size, className)} />;
}

// ── Inflight (async-dispatch) button ─────────────────────────────────────

export type InflightState = "idle" | "queueing" | "running";

type InflightProps = Omit<ButtonProps, "children"> & {
  state?: InflightState;
  idleLabel: string;
  queueingLabel?: string;
  runningLabel?: string;
};

/**
 * Wraps a button whose label and disabled state are driven by an
 * external async lifecycle. While `state !== "idle"`, an inline
 * spinner replaces the leading whitespace and the button is disabled.
 * Mirrors the dispatch-button pattern that lived inline in three places
 * before this primitive landed.
 */
export function InflightButton({
  state = "idle",
  idleLabel,
  queueingLabel,
  runningLabel,
  size = "sm",
  className,
  ...rest
}: InflightProps) {
  const busy = state !== "idle";
  const label =
    state === "queueing"
      ? queueingLabel ?? `${idleLabel}…`
      : state === "running"
      ? runningLabel ?? `${idleLabel}…`
      : idleLabel;
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={buildClass("inflight", size, className)}
    >
      {busy && <Spinner />}
      {label}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ── Anchor variants ──────────────────────────────────────────────────────

type AnchorProps = ComponentProps<"a"> & {
  size?: Size;
  className?: string;
  children?: ReactNode;
};

export function PrimaryAnchor({
  size = "sm",
  className,
  ...rest
}: AnchorProps) {
  return <a {...rest} className={buildClass("primary", size, className)} />;
}

export function SecondaryAnchor({
  size = "sm",
  className,
  ...rest
}: AnchorProps) {
  return <a {...rest} className={buildClass("secondary", size, className)} />;
}

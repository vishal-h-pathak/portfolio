"use client";

/**
 * Button primitives — the register's single action language, shared by
 * every console tab (job pipeline, credits, soliton, agent runbooks).
 *
 * Visually these are the notebook's .btn spec (mono, small, tracked,
 * 1px hairline, square corners, transparent fill) with dashboard
 * semantics layered on:
 *
 *   - primary    amber — the bench/build accent; main CTA, hover fills
 *   - approve    green — live/positive accent; approve/confirm actions
 *   - submit     blue — the third lane action; enqueue a tailored row
 *                for the local submit runner (approve→tailor→submit)
 *   - secondary  hairline + dim ink; hover warms to amber
 *   - danger     red — destructive / loses work
 *   - ghost      borderless text action (Undo, Restore, dismiss)
 *
 * Interaction contract (the "no dead clicks" fix):
 *   - pressed state applies within one frame (`active:duration-0`)
 *   - `pending` dims the label under a centered pulsing dot — same box,
 *     zero layout shift — and disables the button
 *   - `flash` overlays a green tick for ~1.2s after success
 *   Drive pending/flash from useOptimisticAction.
 *
 * The class-string logic lives in ./btnClass.ts (no "use client") so a
 * server component (e.g. /console/login) can build the identical
 * classes without needing this client boundary.
 */

import type { ComponentProps, ReactNode } from "react";
import { btnClass, btnLinkClass, type BtnVariant, type Size } from "./btnClass";

export type { BtnVariant };
export { btnLinkClass };

function StateOverlay({
  pending,
  flash,
}: {
  pending?: boolean;
  flash?: boolean;
}) {
  if (!pending && !flash) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
    >
      {pending ? (
        <span className="h-1.5 w-1.5 bg-current motion-safe:animate-pulse" />
      ) : (
        <span className="text-green">✓</span>
      )}
    </span>
  );
}

export type BtnProps = ComponentProps<"button"> & {
  variant?: BtnVariant;
  size?: Size;
  /** Request in flight — dims label, shows pulsing dot, disables. */
  pending?: boolean;
  /** Brief success tick (drive from useOptimisticAction.isFlashing). */
  flash?: boolean;
};

export function Btn({
  variant = "secondary",
  size = "sm",
  pending,
  flash,
  className,
  children,
  disabled,
  ...rest
}: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={btnClass(variant, size, className)}
    >
      <span className={pending || flash ? "opacity-25" : undefined}>
        {children}
      </span>
      <StateOverlay pending={pending} flash={flash} />
    </button>
  );
}

/** Anchor with identical visuals, for href actions (PDFs, postings). */
export function BtnLink({
  variant = "secondary",
  size = "sm",
  className,
  children,
  ...rest
}: ComponentProps<"a"> & {
  variant?: BtnVariant;
  size?: Size;
  children?: ReactNode;
}) {
  return (
    <a {...rest} className={btnClass(variant, size, className)}>
      {children}
    </a>
  );
}

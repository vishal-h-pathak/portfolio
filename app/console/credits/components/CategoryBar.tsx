"use client";

/**
 * Captured-by-category bar — horizontal, one bar per category, tinted from
 * the console palette.
 *
 * Recharts paints SVG `fill` attributes which can't resolve var(), so the
 * token hexes are mirrored here verbatim (same family the insights page
 * uses — two accents + cockpit red/blue + ink steps; no new hues). If the
 * tokens in globals.css / _internal.css change, update PALETTE below.
 *
 * Mirrors the insights chart conventions: a mount gate around
 * ResponsiveContainer (Recharts measures on first paint, which under
 * Turbopack/Next 16 can fire before layout) and sharp-cornered tooltips.
 */

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Category } from "../lib/types";
import { CHART, CHART_TICK, CHART_TOOLTIP } from "@/lib/tokens";

// Category → console-palette hue. Stays within the two accents + cockpit
// red/blue + ink steps; widened (v2/M0) categories reuse a dimmed accent.
const PALETTE: Record<Category, string> = {
  travel: CHART.blue,
  dining: CHART.amber,
  wellness: CHART.green,
  retail: CHART.inkDim,
  entertainment: CHART.red,
  offers: CHART.inkFaint,
  transit: CHART.blueDim,
  grocery: CHART.greenDim,
  rideshare: CHART.redDim,
  subscription: CHART.amberDim,
};



type Row = { category: Category; label: string; cents: number };

export function CategoryBar({ data }: { data: Row[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rows = data.map((r) => ({ ...r, dollars: r.cents / 100 }));
  const height = Math.max(160, rows.length * 34 + 16);

  return (
    <section className="border border-rule bg-bg-raised p-4">
      <h3 className="mb-1 font-mono text-meta uppercase tracking-kicker text-ink-dim">
        Captured by category
      </h3>
      <p className="mb-3 text-label text-ink-faint">
        Where the recovered value landed, year-to-date.
      </p>
      <div style={{ height }}>
        {mounted && (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART.ruleSoft}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={CHART_TICK}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tick={CHART_TICK}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: CHART.ruleSoft }}
                contentStyle={CHART_TOOLTIP}
                labelStyle={{ color: CHART.ink }}
                formatter={(v) =>
                  [`$${Number(v).toFixed(0)}`, "Captured"] as [string, string]
                }
              />
              <Bar dataKey="dollars" name="Captured" isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.category} fill={PALETTE[r.category]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

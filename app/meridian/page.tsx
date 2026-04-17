"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer, ComposedChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ReferenceLine, Cell,
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════
// DATA — Curated snapshots from MERIDIAN logs.
// Structure is designed so a future API route can hydrate these from
// trades.jsonl / reasoning.jsonl / geo_situation_history.jsonl.
// ═══════════════════════════════════════════════════════════════════════

const DECISIONS = [
  { ts: "Mar 31 14:07", action: "HOLD", symbol: null, confidence: "LOW", theme: "none", cycle: "INGEST", reasoning: "Insufficient signal strength across all themes." },
  { ts: "Mar 31 14:12", action: "HOLD", symbol: null, confidence: "LOW", theme: "semiconductors", cycle: "INGEST", reasoning: "Semiconductor signals detected but below action threshold." },
  { ts: "Mar 31 15:57", action: "BUY", symbol: "ZIM", instrument: "equity", qty: 381, price: 26.22, confidence: "MEDIUM", theme: "iran", cycle: "STANDARD", reasoning: "Iran/Hormuz escalation creating shipping disruption premium. ZIM undervalued relative to freight rate surge." },
  { ts: "Mar 31 16:07", action: "HOLD", symbol: null, confidence: "LOW", theme: "none", cycle: "INGEST", reasoning: "No new actionable signals from ingest cycle." },
  { ts: "Mar 31 16:12", action: "HOLD", symbol: null, confidence: "MEDIUM", theme: "semiconductors", cycle: "INGEST", reasoning: "Taiwan Strait monitoring elevated but no confirmed escalation." },
  { ts: "Mar 31 16:34", action: "BUY", symbol: "NVDA", instrument: "option", qty: 50, price: 170.96, confidence: "MEDIUM", theme: "semiconductors", cycle: "STANDARD", reasoning: "RSI oversold at 41.8, Z-score -1.22. Narrative override: semiconductor supply chain fears creating buying opportunity." },
  { ts: "Mar 31 17:01", action: "BUY", symbol: "XOM", instrument: "equity", qty: 73, price: 171.0, confidence: "MEDIUM", theme: "iran", cycle: "STANDARD", reasoning: "Hormuz disruption narrative strong. Bear researcher flagged overbought RSI (78.3) — overridden by narrative conviction." },
  { ts: "Mar 31 17:07", action: "HOLD", symbol: null, confidence: "LOW", theme: "none", cycle: "INGEST", reasoning: "Routine ingest, no change in thesis." },
  { ts: "Mar 31 17:12", action: "HOLD", symbol: null, confidence: "MEDIUM", theme: "semiconductors", cycle: "INGEST", reasoning: "Semiconductor situation stable, maintaining watch." },
  { ts: "Mar 31 18:07", action: "HOLD", symbol: null, confidence: "LOW", theme: "none", cycle: "INGEST", reasoning: "No new signals." },
  { ts: "Mar 31 18:10", action: "BUY", symbol: "NVDA", instrument: "equity", qty: 289, price: 173.07, confidence: "MEDIUM", theme: "semiconductors", cycle: "STANDARD", reasoning: "Adding to NVDA position. Supply chain thesis strengthening, price still below 50-day MA." },
  { ts: "Mar 31 18:12", action: "HOLD", symbol: null, confidence: "MEDIUM", theme: "semiconductors", cycle: "INGEST", reasoning: "Semiconductor theme holding steady." },
  { ts: "Mar 31 19:07", action: "HOLD", symbol: null, confidence: "LOW", theme: "none", cycle: "INGEST", reasoning: "End of day approaching, reducing risk appetite." },
  { ts: "Mar 31 19:12", action: "HOLD", symbol: null, confidence: "LOW", theme: "semiconductors", cycle: "INGEST", reasoning: "No new semiconductor catalysts." },
  { ts: "Mar 31 19:32", action: "HOLD", symbol: null, confidence: "MEDIUM", theme: "semiconductors", cycle: "EOD_REVIEW", reasoning: "End-of-day review: semiconductor thesis intact, positions held overnight." },
  { ts: "Apr 01 19:07", action: "HOLD", symbol: null, confidence: "LOW", theme: "none", cycle: "INGEST", reasoning: "Agent dormant Apr 1-8. Single heartbeat detected." },
  { ts: "Apr 09 00:48", action: "HOLD", symbol: null, confidence: "MEDIUM", theme: "semiconductors", cycle: "STANDARD", reasoning: "Agent resumed. Massive price moves during dormancy — INTC +36.6%, MU +26.5%. Missed opportunities." },
];

const QUANT_SNAPSHOTS = [
  { ts: "Mar 31 15:57", NVDA: { rsi: 41.3, z: -1.27, mom: 16.8, price: 170.45 }, INTC: { rsi: 44.4, z: -1.38, mom: 28.3, price: 42.61 }, XOM: { rsi: 78.3, z: 1.92, mom: 85.8, price: 173.39 }, ZIM: { rsi: 52.0, z: -0.50, mom: 14.6, price: 26.23 }, MU: { rsi: 31.3, z: -1.98, mom: 2.4, price: 319.19 } },
  { ts: "Mar 31 16:34", NVDA: { rsi: 41.8, z: -1.22, mom: 18.0, price: 170.85 }, INTC: { rsi: 45.1, z: -1.26, mom: 30.5, price: 42.84 }, XOM: { rsi: 78.5, z: 1.95, mom: 87.9, price: 173.72 }, ZIM: { rsi: 52.6, z: -0.41, mom: 14.6, price: 26.30 }, MU: { rsi: 32.2, z: -1.90, mom: 2.7, price: 323.45 } },
  { ts: "Mar 31 17:01", NVDA: { rsi: 44.4, z: -0.87, mom: 22.4, price: 173.13 }, INTC: { rsi: 46.7, z: -0.91, mom: 33.6, price: 43.47 }, XOM: { rsi: 75.1, z: 1.66, mom: 79.0, price: 170.87 }, ZIM: { rsi: 52.7, z: -0.39, mom: 15.0, price: 26.32 }, MU: { rsi: 34.0, z: -1.79, mom: 3.0, price: 329.08 } },
  { ts: "Mar 31 18:10", NVDA: { rsi: 44.2, z: -0.90, mom: 21.5, price: 172.92 }, INTC: { rsi: 47.2, z: -0.78, mom: 36.2, price: 43.70 }, XOM: { rsi: 67.8, z: 1.31, mom: 68.9, price: 167.86 }, ZIM: { rsi: 52.7, z: -0.40, mom: 15.0, price: 26.31 }, MU: { rsi: 33.1, z: -1.85, mom: 2.7, price: 325.99 } },
  { ts: "Mar 31 19:32", NVDA: { rsi: 45.3, z: -0.75, mom: 23.9, price: 173.91 }, INTC: { rsi: 48.3, z: -0.51, mom: 42.2, price: 44.13 }, XOM: { rsi: 69.8, z: 1.42, mom: 72.1, price: 168.77 }, ZIM: { rsi: 53.4, z: -0.28, mom: 16.6, price: 26.40 }, MU: { rsi: 36.1, z: -1.65, mom: 4.7, price: 336.13 } },
  { ts: "Apr 09 00:48", NVDA: { rsi: 54.1, z: 0.84, mom: 45.4, price: 181.64 }, INTC: { rsi: 71.4, z: 2.94, mom: 97.0, price: 58.20 }, XOM: { rsi: 44.6, z: -1.16, mom: 16.7, price: 154.70 }, ZIM: { rsi: 53.7, z: 0.61, mom: 14.6, price: 26.43 }, MU: { rsi: 53.9, z: 0.19, mom: 33.7, price: 403.83 } },
];

const GEO_TRAJECTORY = [
  { ts: "Mar 31 15:57", semis: "escalating", iran: "escalating", semisScore: 75, iranScore: 80 },
  { ts: "Mar 31 16:34", semis: "escalating", iran: "escalating", semisScore: 78, iranScore: 82 },
  { ts: "Mar 31 17:01", semis: "escalating", iran: "escalating", semisScore: 80, iranScore: 85 },
  { ts: "Mar 31 18:10", semis: "stable", iran: "escalating", semisScore: 65, iranScore: 78 },
  { ts: "Mar 31 19:32", semis: "stable", iran: "stable", semisScore: 60, iranScore: 65 },
  { ts: "Apr 09 00:48", semis: "de-escalating", iran: "de-escalating", semisScore: 35, iranScore: 30 },
];

const SOURCE_GROWTH = [
  { ts: "Mar 29", sources: 25 },
  { ts: "Mar 30", sources: 26 },
  { ts: "Mar 31 08:00", sources: 37 },
  { ts: "Mar 31 12:00", sources: 48 },
  { ts: "Mar 31 16:00", sources: 58 },
  { ts: "Mar 31 19:00", sources: 145 },
  { ts: "Mar 31 21:00", sources: 160 },
  { ts: "Apr 01", sources: 150 },
  { ts: "Apr 02", sources: 19 },
  { ts: "Apr 04", sources: 26 },
];

// Hypothetical performance: if BUY signals had been executed with $1000 starting capital
const PERFORMANCE = [
  { symbol: "ZIM", entry: 26.22, exit: 26.43, returnPct: 0.8, hypothetical: 8.01, theme: "iran", outcome: "small-win" },
  { symbol: "NVDA (opt)", entry: 170.96, exit: 181.64, returnPct: 6.2, hypothetical: 62.45, theme: "semiconductors", outcome: "win" },
  { symbol: "XOM", entry: 171.0, exit: 154.70, returnPct: -9.5, hypothetical: -95.32, theme: "iran", outcome: "loss" },
  { symbol: "NVDA (eq)", entry: 173.07, exit: 181.64, returnPct: 4.9, hypothetical: 49.51, theme: "semiconductors", outcome: "win" },
];

const MISSED_SIGNALS = [
  { symbol: "INTC", priceAtSignal: 42.61, priceAfter: 58.20, returnPct: 36.6, note: "Agent was dormant Apr 1-8" },
  { symbol: "MU", priceAtSignal: 319.19, priceAfter: 403.83, returnPct: 26.5, note: "Agent was dormant Apr 1-8" },
];

// ═══════════════════════════════════════════════════════════════════════
// DERIVED DATA
// ═══════════════════════════════════════════════════════════════════════

const buyDecisions = DECISIONS.filter(d => d.action === "BUY");
const holdDecisions = DECISIONS.filter(d => d.action === "HOLD");

const rsiTimeline = QUANT_SNAPSHOTS.map(s => ({
  ts: s.ts,
  NVDA: s.NVDA.rsi, INTC: s.INTC.rsi, XOM: s.XOM.rsi, MU: s.MU.rsi,
}));

const zTimeline = QUANT_SNAPSHOTS.map(s => ({
  ts: s.ts,
  NVDA: s.NVDA.z, INTC: s.INTC.z, XOM: s.XOM.z, MU: s.MU.z,
}));

const priceTimeline = QUANT_SNAPSHOTS.map(s => ({
  ts: s.ts,
  NVDA: s.NVDA.price, INTC: s.INTC.price, XOM: s.XOM.price, MU: s.MU.price,
}));

const totalHypothetical = PERFORMANCE.reduce((sum, p) => sum + p.hypothetical, 0);
const hitRate = PERFORMANCE.filter(p => p.returnPct > 0).length / PERFORMANCE.length * 100;

// ═══════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

const PANELS = [
  { id: "timeline", label: "Decision Timeline" },
  { id: "quant", label: "Quant Signals" },
  { id: "geo", label: "Geo Trajectory" },
  { id: "performance", label: "Performance" },
] as const;

type PanelId = (typeof PANELS)[number]["id"];

const TICKER_COLORS: Record<string, string> = {
  NVDA: "#22d3ee",
  INTC: "#a78bfa",
  XOM: "#f97316",
  ZIM: "#34d399",
  MU: "#f472b6",
  USO: "#fbbf24",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="font-mono text-2xl text-neutral-100">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-1">{label}</div>
      {sub && <div className="text-[11px] text-neutral-600 mt-1">{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h2 className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">{title}</h2>
      <p className="text-neutral-500 text-[13px]">{description}</p>
    </div>
  );
}

// ── Decision Timeline Panel ──────────────────────────────────────────

function TimelinePanel() {
  const [showAllDecisions, setShowAllDecisions] = useState(false);
  const displayed = showAllDecisions ? DECISIONS : DECISIONS.filter(d => d.action === "BUY" || d.cycle === "EOD_REVIEW" || d.ts.includes("Apr"));

  return (
    <div>
      <SectionHeader
        title="Decision Timeline"
        description="Every decision the agent made during the audit period. BUY signals include the full reasoning chain from the specialist pipeline."
      />

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Total decisions" value={DECISIONS.length} />
        <StatCard label="BUY signals" value={buyDecisions.length} />
        <StatCard label="Themes tracked" value={2} sub="Semiconductors, Iran/Oil" />
        <StatCard label="Dormant days" value={7} sub="Apr 1 – Apr 8" />
      </div>

      {/* Decision breakdown bar */}
      <div className="mb-8">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-600 mb-3">Decisions by action</h3>
        <ResponsiveContainer width="100%" height={50}>
          <BarChart layout="vertical" data={[{ buys: buyDecisions.length, holds: holdDecisions.length }]}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" hide />
            <Bar dataKey="buys" stackId="a" fill="#10b981" radius={[4, 0, 0, 4]} />
            <Bar dataKey="holds" stackId="a" fill="#374151" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <span className="text-[11px] text-emerald-500">● BUY ({buyDecisions.length})</span>
          <span className="text-[11px] text-neutral-600">● HOLD ({holdDecisions.length})</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3 mb-6">
        {displayed.map((d, i) => (
          <div
            key={i}
            className={`border rounded-lg p-4 transition-colors ${
              d.action === "BUY"
                ? "border-emerald-900/60 bg-emerald-950/20"
                : "border-neutral-800/50 bg-neutral-900/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                d.action === "BUY" ? "bg-emerald-900/50 text-emerald-400" : "bg-neutral-800 text-neutral-500"
              }`}>
                {d.action}
              </span>
              <span className="font-mono text-[11px] text-neutral-500">{d.ts}</span>
              {d.symbol && <span className="font-mono text-[11px] text-neutral-300">{d.symbol}</span>}
              {d.price && <span className="font-mono text-[11px] text-neutral-500">${d.price}</span>}
              <span className={`ml-auto font-mono text-[10px] uppercase ${
                d.confidence === "MEDIUM" ? "text-amber-500" : "text-neutral-600"
              }`}>
                {d.confidence}
              </span>
            </div>
            <p className="text-neutral-400 text-[12px] leading-relaxed">{d.reasoning}</p>
            {d.theme !== "none" && (
              <span className="inline-block mt-2 text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded">
                {d.theme}
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAllDecisions(!showAllDecisions)}
        className="font-mono text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors"
      >
        {showAllDecisions ? "Show key decisions only ↑" : `Show all ${DECISIONS.length} decisions ↓`}
      </button>
    </div>
  );
}

// ── Quant Signals Panel ──────────────────────────────────────────────

function QuantPanel() {
  const [metric, setMetric] = useState<"rsi" | "zscore" | "price">("rsi");

  const data = metric === "rsi" ? rsiTimeline : metric === "zscore" ? zTimeline : priceTimeline;
  const tickers = ["NVDA", "INTC", "XOM", "MU"] as const;

  return (
    <div>
      <SectionHeader
        title="Quantitative Signals"
        description="Real-time technical indicators tracked by the ConfluenceScorer across the audit period. These feed the quantitative brain of the dual-fusion decision engine."
      />

      {/* Metric selector */}
      <div className="flex gap-2 mb-8">
        {[
          { id: "rsi" as const, label: "RSI" },
          { id: "zscore" as const, label: "Z-Score" },
          { id: "price" as const, label: "Price" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMetric(m.id)}
            className={`font-mono text-[11px] px-3 py-1.5 rounded transition-colors ${
              metric === m.id
                ? "bg-neutral-800 text-neutral-200"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Main chart */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4 mb-8">
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="ts" tick={{ fill: "#525252", fontSize: 10 }} />
            <YAxis tick={{ fill: "#525252", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "8px", fontSize: 12 }}
              labelStyle={{ color: "#a3a3a3" }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {metric === "rsi" && <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Overbought", fill: "#ef4444", fontSize: 10 }} />}
            {metric === "rsi" && <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "Oversold", fill: "#22c55e", fontSize: 10 }} />}
            {metric === "zscore" && <ReferenceLine y={0} stroke="#525252" strokeDasharray="3 3" />}
            {tickers.map((t) => (
              <Line key={t} type="monotone" dataKey={t} stroke={TICKER_COLORS[t]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Radar: final snapshot */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">INTC Final Snapshot</h3>
          <p className="text-[11px] text-neutral-600 mb-3">The missed opportunity — RSI 71.4, momentum 97th percentile</p>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={[
              { metric: "RSI", value: 71.4 },
              { metric: "Momentum", value: 97.0 },
              { metric: "Z-Score", value: Math.min((2.94 + 3) / 6 * 100, 100) },
              { metric: "IV Rank", value: 52.5 },
            ]}>
              <PolarGrid stroke="#404040" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: "#737373", fontSize: 10 }} />
              <PolarRadiusAxis tick={false} domain={[0, 100]} />
              <Radar dataKey="value" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4">
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">RAG Source Volume</h3>
          <p className="text-[11px] text-neutral-600 mb-3">ChromaDB documents ingested per observation window</p>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={SOURCE_GROWTH}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="ts" tick={{ fill: "#525252", fontSize: 9 }} />
              <YAxis tick={{ fill: "#525252", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "8px", fontSize: 12 }} />
              <Area type="monotone" dataKey="sources" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ── Geo Trajectory Panel ─────────────────────────────────────────────

const TRAJECTORY_LABEL: Record<string, { text: string; color: string }> = {
  escalating: { text: "ESCALATING", color: "text-red-400" },
  stable: { text: "STABLE", color: "text-amber-400" },
  "de-escalating": { text: "DE-ESCALATING", color: "text-emerald-400" },
};

function GeoPanel() {
  return (
    <div>
      <SectionHeader
        title="Geopolitical Trajectory"
        description="The GeoSynthesizer maintains a persistent situation model across two macro themes, updated every 4 hours. Trajectory shifts directly influence BUY/SELL decisions."
      />

      {/* Current status cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { theme: "Semiconductors", subtitle: "Taiwan Strait · Supply Chain · Export Controls", data: GEO_TRAJECTORY[GEO_TRAJECTORY.length - 1], scoreKey: "semisScore" as const, trajKey: "semis" as const },
          { theme: "Iran / Oil", subtitle: "Strait of Hormuz · Red Sea · IRGC · Sanctions", data: GEO_TRAJECTORY[GEO_TRAJECTORY.length - 1], scoreKey: "iranScore" as const, trajKey: "iran" as const },
        ].map((t) => {
          const traj = TRAJECTORY_LABEL[t.data[t.trajKey]];
          return (
            <div key={t.theme} className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-5">
              <h3 className="text-neutral-200 text-[14px] mb-1">{t.theme}</h3>
              <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-600 mb-4">{t.subtitle}</p>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-xs font-bold ${traj.color}`}>{traj.text}</span>
                <span className="font-mono text-xs text-neutral-500">Score: {t.data[t.scoreKey]}/100</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trajectory over time */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4 mb-8">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-4">Escalation Score Over Time</h3>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={GEO_TRAJECTORY}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="ts" tick={{ fill: "#525252", fontSize: 10 }} />
            <YAxis domain={[0, 100]} tick={{ fill: "#525252", fontSize: 10 }} />
            <Tooltip contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "8px", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "High risk", fill: "#ef4444", fontSize: 10 }} />
            <ReferenceLine y={40} stroke="#22c55e" strokeDasharray="3 3" label={{ value: "Low risk", fill: "#22c55e", fontSize: 10 }} />
            <Area type="monotone" dataKey="semisScore" name="Semiconductors" fill="#22d3ee" fillOpacity={0.1} stroke="#22d3ee" strokeWidth={2} />
            <Area type="monotone" dataKey="iranScore" name="Iran/Oil" fill="#f97316" fillOpacity={0.1} stroke="#f97316" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Trajectory change log */}
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Trajectory Shifts</h3>
      <div className="space-y-2">
        {GEO_TRAJECTORY.map((g, i) => {
          if (i === 0) return null;
          const prev = GEO_TRAJECTORY[i - 1];
          const semisChanged = g.semis !== prev.semis;
          const iranChanged = g.iran !== prev.iran;
          if (!semisChanged && !iranChanged) return null;
          return (
            <div key={i} className="border border-neutral-800 rounded-lg p-3 bg-neutral-900/30">
              <span className="font-mono text-[11px] text-neutral-500">{g.ts}</span>
              {semisChanged && (
                <p className="text-[12px] text-neutral-400 mt-1">
                  Semiconductors: <span className={TRAJECTORY_LABEL[prev.semis].color}>{prev.semis}</span>
                  {" → "}
                  <span className={TRAJECTORY_LABEL[g.semis].color}>{g.semis}</span>
                </p>
              )}
              {iranChanged && (
                <p className="text-[12px] text-neutral-400 mt-1">
                  Iran/Oil: <span className={TRAJECTORY_LABEL[prev.iran].color}>{prev.iran}</span>
                  {" → "}
                  <span className={TRAJECTORY_LABEL[g.iran].color}>{g.iran}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Performance Panel ────────────────────────────────────────────────

function PerformancePanel() {
  return (
    <div>
      <SectionHeader
        title="Performance Tracking"
        description="Hypothetical returns based on a $1,000 starting allocation. BUY signals were identified but not executed due to a pipeline issue — these are backtested returns."
      />

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard
          label="Hypothetical P&L"
          value={`${totalHypothetical >= 0 ? "+" : ""}$${totalHypothetical.toFixed(0)}`}
          sub="On $1,000 capital"
        />
        <StatCard
          label="Hit rate"
          value={`${hitRate.toFixed(0)}%`}
          sub={`${PERFORMANCE.filter(p => p.returnPct > 0).length}/${PERFORMANCE.length} trades`}
        />
        <StatCard
          label="Best signal"
          value="NVDA +6.2%"
          sub="Options position"
        />
        <StatCard
          label="Worst signal"
          value="XOM -9.5%"
          sub="Narrative overrode quant"
        />
      </div>

      {/* Return chart */}
      <div className="bg-neutral-900/40 border border-neutral-800 rounded-lg p-4 mb-8">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-4">Return by Signal</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={PERFORMANCE}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
            <XAxis dataKey="symbol" tick={{ fill: "#a3a3a3", fontSize: 11 }} />
            <YAxis tick={{ fill: "#525252", fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "8px", fontSize: 12 }}
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "Return"]}
            />
            <ReferenceLine y={0} stroke="#525252" />
            <Bar dataKey="returnPct" radius={[4, 4, 0, 0]}>
              {PERFORMANCE.map((entry, i) => (
                <Cell key={i} fill={entry.returnPct >= 0 ? "#10b981" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Missed opportunities */}
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Missed Opportunities (Agent Dormant)</h3>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {MISSED_SIGNALS.map((m) => (
          <div key={m.symbol} className="bg-amber-950/20 border border-amber-900/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-neutral-200">{m.symbol}</span>
              <span className="font-mono text-sm text-amber-400">+{m.returnPct}%</span>
            </div>
            <div className="flex justify-between text-[11px] text-neutral-500 mb-1">
              <span>${m.priceAtSignal.toFixed(2)}</span>
              <span>→</span>
              <span>${m.priceAfter.toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-neutral-600 mt-2">{m.note}</p>
          </div>
        ))}
      </div>

      {/* Trade detail table */}
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-neutral-500 mb-3">Signal Detail</h3>
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-neutral-900/80 text-neutral-500 font-mono text-[10px] uppercase tracking-wider">
              <th className="text-left p-3">Symbol</th>
              <th className="text-right p-3">Entry</th>
              <th className="text-right p-3">Exit</th>
              <th className="text-right p-3">Return</th>
              <th className="text-right p-3">P&L ($250/ea)</th>
              <th className="text-left p-3">Theme</th>
            </tr>
          </thead>
          <tbody>
            {PERFORMANCE.map((p) => (
              <tr key={p.symbol} className="border-t border-neutral-800/50">
                <td className="p-3 text-neutral-200 font-mono">{p.symbol}</td>
                <td className="p-3 text-right text-neutral-400">${p.entry.toFixed(2)}</td>
                <td className="p-3 text-right text-neutral-400">${p.exit.toFixed(2)}</td>
                <td className={`p-3 text-right font-mono ${p.returnPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {p.returnPct >= 0 ? "+" : ""}{p.returnPct.toFixed(1)}%
                </td>
                <td className={`p-3 text-right font-mono ${p.hypothetical >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {p.hypothetical >= 0 ? "+" : ""}${p.hypothetical.toFixed(2)}
                </td>
                <td className="p-3">
                  <span className="text-[10px] bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded">{p.theme}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════

export default function MeridianPage() {
  const [activePanel, setActivePanel] = useState<PanelId>("timeline");

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="border-b border-neutral-900 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <a href="/" className="font-mono text-xs text-neutral-600 hover:text-neutral-400 transition-colors">← Back</a>
              <h1 className="text-xl font-medium mt-1">MERIDIAN</h1>
              <p className="font-mono text-[11px] text-neutral-500 mt-0.5">Autonomous Trading Agent · Decision Intelligence</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-600">Audit Period</div>
              <div className="font-mono text-[13px] text-neutral-400">Mar 29 – Apr 9, 2026</div>
            </div>
          </div>

          {/* Panel tabs */}
          <div className="flex gap-1">
            {PANELS.map((panel) => (
              <button
                key={panel.id}
                onClick={() => setActivePanel(panel.id)}
                className={`font-mono text-[11px] px-4 py-2 rounded-t transition-colors ${
                  activePanel === panel.id
                    ? "bg-neutral-900 text-neutral-200 border border-neutral-800 border-b-neutral-900"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {panel.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {activePanel === "timeline" && <TimelinePanel />}
        {activePanel === "quant" && <QuantPanel />}
        {activePanel === "geo" && <GeoPanel />}
        {activePanel === "performance" && <PerformancePanel />}

        {/* Footer note */}
        <div className="mt-16 pt-6 border-t border-neutral-900">
          <p className="font-mono text-[10px] text-neutral-700 uppercase tracking-widest text-center">
            Data sourced from MERIDIAN logs · Curated snapshots + live feed (when connected)
          </p>
        </div>
      </main>
    </div>
  );
}

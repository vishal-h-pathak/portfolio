"use client";

// ─────────────────────────────────────────────────────────────────────────────
// 1. IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// 2. STYLE INJECTION — CSS custom properties + keyframe animations
// ─────────────────────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
  :root {
    --mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace;
    --sans: Inter, system-ui, -apple-system, sans-serif;
  }
  @keyframes meridian-pulse-ring {
    0%   { opacity: 0.8; transform: scale(1); }
    100% { opacity: 0;   transform: scale(2.4); }
  }
  .meridian-pulse-ring {
    animation: meridian-pulse-ring 1.8s ease-out infinite;
  }
  @keyframes meridian-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .meridian-fade-in {
    animation: meridian-fade-in 0.22s ease forwards;
  }
  .meridian-stream-row:hover {
    background: rgba(255,255,255,0.025) !important;
  }
`;

function StyleInjector() {
  return (
    <style
      dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. COLOR TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C: Record<string, string> = {
  bg: '#0a0a0a',
  surface: 'rgba(255,255,255,0.025)',
  surfaceHi: 'rgba(255,255,255,0.045)',
  border: 'rgba(255,255,255,0.07)',
  borderHi: 'rgba(255,255,255,0.12)',
  text1: '#f4f4f5',
  text2: '#a1a1aa',
  text3: '#71717a',
  text4: '#52525b',
  emerald: '#10b981',
  emeraldDim: 'rgba(16,185,129,0.18)',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.18)',
  amber: '#f59e0b',
  cyan: '#22d3ee',
  purple: '#a78bfa',
  orange: '#f97316',
  green: '#34d399',
  pink: '#f472b6',
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. SYMBOL / ACTION COLOR MAPS
// ─────────────────────────────────────────────────────────────────────────────
const SYM_COLOR: Record<string, string> = {
  NVDA: C.cyan, INTC: C.purple, MU: C.pink, AMD: '#fb7185',
  TSM: '#2dd4bf', XOM: C.orange, CVX: '#facc15', ZIM: C.green,
};
const ACTION_COLOR: Record<string, string> = {
  BUY: C.emerald, SELL: C.red, HOLD: C.amber,
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. DATA GENERATION
// ─────────────────────────────────────────────────────────────────────────────
function generateMeridianData() {
  const symbols = ['NVDA', 'INTC', 'XOM', 'ZIM', 'MU', 'AMD', 'TSM', 'CVX'];
  const themes = ['semiconductors', 'iran-oil', 'shipping', 'memory-cycle', 'ai-capex', 'energy-security'];
  const reasonings: Record<string, string[]> = {
    BUY: [
      'Piotroski F-Score 7/9 with strong DCF margin of safety. Quant confluence hits 0.72 across momentum + fundamentals.',
      'RAG pulled 14 sources on fab expansion; narrative brain flags supply tightening Q3. IV rank favorable.',
      'Oversold RSI (28.4) meets volume expansion. Options structure implies 1.8x upside vs downside.',
      'Earnings beat + raised guide. Brain agreement: narrative confirms quant momentum signal.',
      'Geopolitical tailwind. Shipping rates breaking resistance on 3-month basis. Theme conviction HIGH.',
    ],
    SELL: [
      'RSI 74 + MA cross bearish. Quant confluence 0.31. Narrative brain neutral but quant overrides.',
      'Theme exhaustion detected. Flow data shows institutional distribution over 5 sessions.',
      'IV crush post-earnings + weakening price action. Exit before theta decay accelerates.',
      'Fundamentals degraded (F-Score 3/9). Margin compression confirmed across peers.',
    ],
    HOLD: [
      'Signals conflict: narrative bullish, quant neutral. Awaiting confluence above 0.60.',
      'Position sized. Re-evaluate on next earnings catalyst or 5% move.',
      'IV rank too low for options overlay. Maintain core equity exposure.',
    ],
  };

  const decisions: any[] = [];
  const startTs = new Date('2026-04-05T09:30:00');
  let portfolio = 100000;
  const portfolioSeries: { t: number; v: number }[] = [{ t: startTs.getTime(), v: portfolio }];

  for (let i = 0; i < 48; i++) {
    const t = new Date(startTs.getTime() + i * 3600_000 * 6 + Math.random() * 3600_000 * 2);
    const sym = symbols[Math.floor(Math.random() * symbols.length)];
    const actionRoll = Math.random();
    const action = actionRoll < 0.45 ? 'BUY' : actionRoll < 0.78 ? 'SELL' : 'HOLD';
    const confRoll = Math.random();
    const confidence = confRoll < 0.25 ? 'HIGH' : confRoll < 0.72 ? 'MEDIUM' : 'LOW';
    const qs = 0.35 + Math.random() * 0.55;
    const grade = qs > 0.75 ? 'A' : qs > 0.6 ? 'B' : qs > 0.45 ? 'C' : 'D';
    const basePrices: Record<string, number> = { NVDA: 920, INTC: 23, XOM: 118, ZIM: 18, MU: 112, AMD: 178, TSM: 168, CVX: 162 };
    const price = basePrices[sym] * (1 + (Math.random() - 0.5) * 0.08);
    const ret = action === 'HOLD' ? 0 : (action === 'BUY' ? 1 : -1) * (Math.random() * 0.06 - 0.015) * (confidence === 'HIGH' ? 1.4 : confidence === 'LOW' ? 0.5 : 1);
    portfolio = portfolio * (1 + ret * 0.15);
    portfolioSeries.push({ t: t.getTime(), v: portfolio });

    const rowReasonings = reasonings[action];
    decisions.push({
      id: 'd' + i,
      ts: t.toISOString(),
      ts_label: t.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }),
      action, symbol: sym,
      instrument: Math.random() > 0.7 ? 'option' : 'equity',
      qty: Math.round(50 + Math.random() * 400),
      price: +price.toFixed(2),
      confidence, theme: themes[Math.floor(Math.random() * themes.length)],
      cycle: Math.random() > 0.8 ? 'FAST' : 'STANDARD',
      reasoning: rowReasonings[Math.floor(Math.random() * rowReasonings.length)],
      quant_score: +qs.toFixed(2), quant_grade: grade,
      component_scores: {
        rsi: +(Math.random() * 0.6 + 0.3).toFixed(2),
        volume: +(Math.random() * 0.6 + 0.3).toFixed(2),
        ma_cross: +(Math.random() * 0.6 + 0.3).toFixed(2),
        iv_rank: +(Math.random() * 0.6 + 0.3).toFixed(2),
        momentum: +(Math.random() * 0.6 + 0.3).toFixed(2),
        options_structure: +(Math.random() * 0.6 + 0.3).toFixed(2),
        price_action: +(Math.random() * 0.6 + 0.3).toFixed(2),
        fundamentals: +(Math.random() * 0.6 + 0.3).toFixed(2),
      },
      brain_agreement: ['both_agree', 'quant_override', 'narrative_override', 'conflict'][Math.floor(Math.random() * 4)],
      executed: Math.random() > 0.15,
      mode: 'paper', portfolio_value: +portfolio.toFixed(2),
      geo_focus: Math.random() > 0.5 ? 'semiconductor supply chain' : 'iran strait tension',
      sentiment: ['cautiously bullish', 'bearish', 'neutral', 'bullish', 'cautiously bearish'][Math.floor(Math.random() * 5)],
      return: +ret.toFixed(4),
    });
  }

  decisions.sort((a: any, b: any) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  const quantSeries: any[] = [];
  for (let d = 0; d < 30; d++) {
    const row: any = { day: d };
    ['NVDA', 'INTC', 'MU', 'AMD'].forEach((s, i) => {
      row[s] = 50 + Math.sin(d * 0.3 + i) * 18 + Math.random() * 8 - 4;
    });
    quantSeries.push(row);
  }

  const geoSeries: any[] = [];
  for (let d = 0; d < 30; d++) {
    geoSeries.push({
      day: d,
      semi: Math.min(100, 30 + d * 1.4 + Math.sin(d * 0.4) * 8 + Math.random() * 6),
      iran: Math.min(100, 45 + Math.cos(d * 0.25) * 15 + d * 0.3 + Math.random() * 5),
    });
  }

  const shifts = [
    { ts: 'Apr 14 08:12', from: 'monitoring', to: 'escalating', theme: 'iran-oil', delta: +18 },
    { ts: 'Apr 11 14:30', from: 'escalating', to: 'peak', theme: 'semiconductors', delta: +12 },
    { ts: 'Apr 08 06:45', from: 'de-escalating', to: 'monitoring', theme: 'shipping', delta: -9 },
    { ts: 'Apr 06 11:20', from: 'dormant', to: 'monitoring', theme: 'memory-cycle', delta: +7 },
  ];

  const ragSeries: any[] = [];
  for (let d = 0; d < 24; d++) {
    ragSeries.push({
      hour: d,
      news: Math.round(12 + Math.random() * 30),
      filings: Math.round(2 + Math.random() * 8),
      social: Math.round(20 + Math.random() * 60),
    });
  }

  const tickers = ['NVDA', 'INTC', 'MU', 'AMD', 'TSM', 'XOM', 'CVX', 'ZIM'];
  const heatmap = tickers.map((tk: string) => ({
    ticker: tk,
    days: Array.from({ length: 14 }, (_, i) => {
      const r = Math.random();
      const action = r < 0.3 ? null : r < 0.55 ? 'BUY' : r < 0.85 ? 'SELL' : 'HOLD';
      return { day: i, action, conf: action ? 0.3 + Math.random() * 0.65 : 0 };
    }),
  }));

  const brainFlow = {
    quant: { bull: 28, bear: 14, neutral: 6 },
    narrative: { bull: 22, bear: 18, neutral: 8 },
    outcomes: { both_bull: 19, both_bear: 11, quant_override: 9, narrative_override: 7, conflict: 2 },
  };

  const calibration = decisions
    .filter((d: any) => d.action !== 'HOLD')
    .map((d: any) => ({
      symbol: d.symbol, confidence: d.confidence,
      quant_score: d.quant_score, return: d.return * 100, action: d.action,
    }));

  const returnsBySignal = decisions
    .filter((d: any) => d.action !== 'HOLD' && d.executed)
    .slice(0, 18)
    .map((d: any) => ({
      label: d.symbol + ' ' + d.ts_label.split(' ').slice(0, 2).join(''),
      symbol: d.symbol,
      ret: +(d.return * 100).toFixed(2),
      action: d.action,
    }));

  return {
    decisions,
    portfolioSeries,
    quantSeries,
    geoSeries,
    shifts,
    ragSeries,
    heatmap,
    tickers,
    brainFlow,
    calibration,
    returnsBySignal,
    stats: {
      total: decisions.length,
      buys: decisions.filter((d: any) => d.action === 'BUY').length,
      sells: decisions.filter((d: any) => d.action === 'SELL').length,
      holds: decisions.filter((d: any) => d.action === 'HOLD').length,
      portfolio,
      startPortfolio: 100000,
      hitRate: 0.614,
      best: { sym: 'NVDA', ret: 4.82 },
      worst: { sym: 'INTC', ret: -2.14 },
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. LIVE DATA HOOK
// ─────────────────────────────────────────────────────────────────────────────
type LiveDecision = {
  ts: string;
  action: string;
  symbol: string | null;
  instrument?: string | null;
  qty?: number | null;
  price?: number | null;
  confidence: string;
  theme: string;
  cycle: string;
  reasoning: string;
  quant_score?: number | null;
  quant_grade?: string | null;
  component_scores?: Record<string, number> | null;
  brain_agreement?: string | null;
  executed?: boolean;
  mode?: string;
  portfolio_value?: number | null;
  geo_focus?: string | null;
  sentiment?: string | null;
  return?: number;
  id?: string;
  ts_label?: string;
};

type LiveData = {
  decisions: LiveDecision[];
  summary: { total: number; buys: number; sells: number; holds: number; latest: string | null };
  fetched_at: string;
};

function useLiveDecisions() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/meridian?limit=200")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.decisions && data.decisions.length > 0) {
          setLive(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { live, loading, isLive: !!live };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. AUTOWIDTH UTILITY
// ─────────────────────────────────────────────────────────────────────────────
function AutoWidth({ children }: { children: (width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && w > 0) setWidth(w);
    });
    ro.observe(ref.current);
    const initial = ref.current.getBoundingClientRect().width;
    if (initial > 0) setWidth(initial);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%' }}>
      {children(width)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. SVG CHART PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function Sparkline({ data, color = C.emerald, width = 80, height = 24, fill = true, strokeWidth = 1.2 }: any) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d: any) => typeof d === 'number' ? d : d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v: number, i: number) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y];
  });
  const d = pts.map((p: number[], i: number) => (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
  const last = pts[pts.length - 1];
  const id = 'sg' + Math.random().toString(36).slice(2, 8);
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.28" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={d + ` L ${width} ${height} L 0 ${height} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

function AreaChart({ series, width = 600, height = 220, padding = { l: 40, r: 12, t: 14, b: 24 }, yFmt = (v: number) => v.toFixed(0), xLabels, gridLines = true }: any) {
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  if (!series || !series.length) return null;
  const flatVals = series.flatMap((s: any) => s.data.map((d: any) => d.v));
  const yMin = Math.min(...flatVals);
  const yMax = Math.max(...flatVals);
  const yPad = (yMax - yMin) * 0.08 || 1;
  const y0 = yMin - yPad, y1 = yMax + yPad;
  const n = series[0].data.length;
  const x = (i: number) => padding.l + (i / (n - 1)) * (width - padding.l - padding.r);
  const y = (v: number) => padding.t + (1 - (v - y0) / (y1 - y0)) * (height - padding.t - padding.b);
  const gridCount = 4;
  const grid = Array.from({ length: gridCount + 1 }, (_: any, i: number) => y0 + (i / gridCount) * (y1 - y0));

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const idx = Math.round(((px - padding.l) / (width - padding.l - padding.r)) * (n - 1));
    if (idx >= 0 && idx < n) setHover(idx);
  }

  return (
    <svg ref={svgRef} width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}
         style={{ display: 'block', userSelect: 'none' }}>
      <defs>
        {series.map((s: any, i: number) => (
          <linearGradient key={i} id={'g-' + s.key + '-' + i} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={s.color} stopOpacity={s.fillOpacity ?? 0.22} />
            <stop offset="1" stopColor={s.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {gridLines && grid.map((gv: number, i: number) => (
        <g key={i}>
          <line x1={padding.l} x2={width - padding.r} y1={y(gv)} y2={y(gv)} stroke={C.border} strokeDasharray="2 3" />
          <text x={padding.l - 6} y={y(gv) + 3} fill={C.text4} fontSize="9" fontFamily="var(--mono)" textAnchor="end">{yFmt(gv)}</text>
        </g>
      ))}
      {series.map((s: any, si: number) => {
        const dLine = s.data.map((d: any, i: number) => (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(d.v)).join(' ');
        const dArea = dLine + ` L ${x(n - 1)} ${height - padding.b} L ${x(0)} ${height - padding.b} Z`;
        return (
          <g key={s.key}>
            {(s.fill ?? true) && <path d={dArea} fill={`url(#g-${s.key}-${si})`} />}
            <path d={dLine} fill="none" stroke={s.color} strokeWidth={s.strokeWidth ?? 1.4} strokeLinejoin="round" />
          </g>
        );
      })}
      {xLabels && xLabels.map((lbl: string, i: number) => {
        if (i % Math.ceil(xLabels.length / 6) !== 0) return null;
        return <text key={i} x={x(i)} y={height - 8} fill={C.text4} fontSize="9" fontFamily="var(--mono)" textAnchor="middle">{lbl}</text>;
      })}
      {hover != null && (
        <g>
          <line x1={x(hover)} x2={x(hover)} y1={padding.t} y2={height - padding.b} stroke={C.borderHi} strokeDasharray="2 2" />
          {series.map((s: any) => (
            <circle key={s.key} cx={x(hover)} cy={y(s.data[hover].v)} r="3" fill={s.color}
                    style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />
          ))}
        </g>
      )}
    </svg>
  );
}

function Radar({ scores, size = 220, color = C.cyan, labels = true }: any) {
  const keys = Object.keys(scores);
  if (!keys.length) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 30;
  const angleFor = (i: number) => -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
  const pts = keys.map((k: string, i: number) => {
    const a = angleFor(i);
    const v = scores[k];
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v];
  });
  const axisPts = keys.map((_: string, i: number) => {
    const a = angleFor(i);
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });
  const path = pts.map((p: number[], i: number) => (i === 0 ? 'M' : 'L') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ') + ' Z';
  const avg = (pts.reduce((s: number, _: number[], i: number) => s + scores[keys[i]], 0) / keys.length * 100).toFixed(0);
  return (
    <svg width={size} height={size} style={{ display: 'block', overflow: 'visible' }}>
      {[0.25, 0.5, 0.75, 1].map((f: number) => (
        <polygon key={f} points={axisPts.map((p: number[]) => `${cx + (p[0] - cx) * f},${cy + (p[1] - cy) * f}`).join(' ')}
                 fill="none" stroke={C.border} strokeWidth="0.8" />
      ))}
      {axisPts.map((p: number[], i: number) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke={C.border} strokeWidth="0.8" />
      ))}
      <path d={path} fill={color} fillOpacity="0.18" stroke={color} strokeWidth="1.4"
            style={{ filter: `drop-shadow(0 0 6px ${color}77)` }} />
      {pts.map((p: number[], i: number) => <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} />)}
      {labels && keys.map((k: string, i: number) => {
        const a = angleFor(i);
        const lx = cx + Math.cos(a) * (r + 14);
        const ly = cy + Math.sin(a) * (r + 14);
        return (
          <text key={k} x={lx} y={ly} fill={C.text3} fontSize="8.5" fontFamily="var(--mono)"
                textAnchor={Math.abs(Math.cos(a)) < 0.2 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end'}
                dominantBaseline="middle" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {k.replace('_', ' ')}
          </text>
        );
      })}
      <text x={cx} y={cy - 2} fill={C.text2} fontSize="18" fontFamily="var(--mono)" textAnchor="middle" fontWeight="600">{avg}</text>
      <text x={cx} y={cy + 12} fill={C.text4} fontSize="8" fontFamily="var(--mono)" textAnchor="middle"
            style={{ letterSpacing: '0.12em' }}>CONFLUENCE</text>
    </svg>
  );
}

function PortfolioCurve({ data, width = 760, height = 200, color = C.emerald }: any) {
  if (!data || data.length < 2) return null;
  const vals = data.map((d: any) => d.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pad = { l: 50, r: 12, t: 10, b: 22 };
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / range) * (height - pad.t - pad.b);
  const d = data.map((p: any, i: number) => (i === 0 ? 'M' : 'L') + x(i) + ' ' + y(p.v)).join(' ');
  const area = d + ` L ${x(data.length - 1)} ${height - pad.b} L ${x(0)} ${height - pad.b} Z`;
  const last = [x(data.length - 1), y(data[data.length - 1].v)];
  const gridV = [min, min + range * 0.33, min + range * 0.67, max];
  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="pfg-main" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridV.map((v: number, i: number) => (
        <g key={i}>
          <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={C.border} strokeDasharray="2 3" />
          <text x={pad.l - 8} y={y(v) + 3} fill={C.text4} fontSize="9" fontFamily="var(--mono)" textAnchor="end">${(v / 1000).toFixed(1)}k</text>
        </g>
      ))}
      <path d={area} fill="url(#pfg-main)" />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      <circle cx={last[0]} cy={last[1]} r="8" fill="none" stroke={color} strokeOpacity="0.4">
        <animate attributeName="r" values="4;12" dur="2s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Heatmap({ data, cellSize = 22, gap = 3 }: any) {
  const days = data[0]?.days.length || 14;
  const actionCol = (a: string | null, conf: number) => {
    if (!a) return 'rgba(255,255,255,0.03)';
    const base = a === 'BUY' ? '16,185,129' : a === 'SELL' ? '239,68,68' : '245,158,11';
    return `rgba(${base},${0.2 + conf * 0.7})`;
  };
  return (
    <div style={{ display: 'inline-block' }}>
      <div style={{ display: 'flex', gap, marginBottom: 6, paddingLeft: 44 }}>
        {Array.from({ length: days }).map((_: any, i: number) => (
          <div key={i} style={{ width: cellSize, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 8.5, color: C.text4 }}>
            {(i + 5).toString().padStart(2, '0')}
          </div>
        ))}
      </div>
      {data.map((row: any) => (
        <div key={row.ticker} style={{ display: 'flex', alignItems: 'center', gap, marginBottom: gap }}>
          <div style={{ width: 40, fontFamily: 'var(--mono)', fontSize: 10.5, color: C.text2, letterSpacing: '0.08em' }}>{row.ticker}</div>
          {row.days.map((d: any, i: number) => (
            <div key={i}
                 title={d.action ? `${row.ticker} ${d.action} conf ${d.conf.toFixed(2)}` : `${row.ticker} — no action`}
                 style={{
                   width: cellSize, height: cellSize, background: actionCol(d.action, d.conf),
                   borderRadius: 2, border: `1px solid ${d.action ? 'rgba(255,255,255,0.08)' : C.border}`,
                   boxShadow: d.action && d.conf > 0.75 ? `inset 0 0 8px ${ACTION_COLOR[d.action]}66` : 'none',
                   transition: 'transform 0.15s', cursor: 'default',
                 }}
                 onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)'; }}
                 onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CalibrationScatter({ data, width = 480, height = 300 }: any) {
  const pad = { l: 40, r: 12, t: 14, b: 30 };
  const xFor: Record<string, number> = { LOW: 0.25, MEDIUM: 0.55, HIGH: 0.85 };
  const maxY = 8, minY = -8;
  const x = (c: string) => pad.l + xFor[c] * (width - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - minY) / (maxY - minY)) * (height - pad.t - pad.b);
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {[-6, -3, 0, 3, 6].map((v: number) => (
        <g key={v}>
          <line x1={pad.l} x2={width - pad.r} y1={y(v)} y2={y(v)} stroke={v === 0 ? C.borderHi : C.border} strokeDasharray={v === 0 ? '0' : '2 3'} />
          <text x={pad.l - 6} y={y(v) + 3} fill={C.text4} fontSize="9" fontFamily="var(--mono)" textAnchor="end">{v > 0 ? '+' : ''}{v}%</text>
        </g>
      ))}
      {['LOW', 'MEDIUM', 'HIGH'].map((c: string) => (
        <g key={c}>
          <line x1={x(c)} x2={x(c)} y1={pad.t} y2={height - pad.b} stroke={C.border} strokeDasharray="2 3" />
          <text x={x(c)} y={height - 10} fill={C.text3} fontSize="9" fontFamily="var(--mono)" textAnchor="middle" style={{ letterSpacing: '0.14em' }}>{c}</text>
        </g>
      ))}
      {data.map((d: any, i: number) => {
        const jx = ((i * 17 + 7) % 40) - 20; // deterministic jitter
        const col = d.return >= 0 ? C.emerald : C.red;
        return (
          <circle key={i} cx={x(d.confidence) + jx} cy={y(Math.max(minY, Math.min(maxY, d.return)))} r={3 + d.quant_score * 3}
                  fill={col} fillOpacity="0.45" stroke={col} strokeWidth="0.8"
                  style={{ filter: `drop-shadow(0 0 3px ${col}88)` }}>
            <title>{d.symbol} {d.action} — {d.return.toFixed(2)}% · quant {d.quant_score}</title>
          </circle>
        );
      })}
    </svg>
  );
}

function BrainFlow({ flow, width = 440, height = 240 }: any) {
  const cols = [
    { x: 40, items: [
      { key: 'q_bull', label: 'QUANT · BULL', v: flow.quant.bull, color: C.emerald },
      { key: 'q_bear', label: 'QUANT · BEAR', v: flow.quant.bear, color: C.red },
      { key: 'q_neu',  label: 'QUANT · NEU',  v: flow.quant.neutral, color: C.amber },
    ]},
    { x: width / 2, items: [
      { key: 'n_bull', label: 'NARR · BULL', v: flow.narrative.bull, color: C.emerald },
      { key: 'n_bear', label: 'NARR · BEAR', v: flow.narrative.bear, color: C.red },
      { key: 'n_neu',  label: 'NARR · NEU',  v: flow.narrative.neutral, color: C.amber },
    ]},
    { x: width - 40, items: [
      { key: 'both_bull', label: 'AGREE BULL', v: flow.outcomes.both_bull, color: C.emerald },
      { key: 'both_bear', label: 'AGREE BEAR', v: flow.outcomes.both_bear, color: C.red },
      { key: 'q_over',    label: 'Q OVERRIDE', v: flow.outcomes.quant_override, color: C.cyan },
      { key: 'n_over',    label: 'N OVERRIDE', v: flow.outcomes.narrative_override, color: C.purple },
      { key: 'conflict',  label: 'CONFLICT',   v: flow.outcomes.conflict, color: C.text3 },
    ]},
  ];
  const colHeight = height - 40;
  function layoutCol(col: any) {
    const total = col.items.reduce((s: number, it: any) => s + it.v, 0);
    let yc = 20;
    return col.items.map((it: any) => {
      const h = (it.v / total) * (colHeight - (col.items.length - 1) * 6);
      const node = { ...it, x: col.x, y: yc, h };
      yc += h + 6;
      return node;
    });
  }
  const nodes = cols.map(layoutCol);

  function flowPath(a: any, b: any) {
    const x1 = a.x + 22, y1 = a.y + a.h / 2;
    const x2 = b.x - 22, y2 = b.y + b.h / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }
  const leftRight = (lNodes: any[], rNodes: any[]) => {
    const pairs: any[] = [];
    lNodes.forEach((l: any) => rNodes.forEach((r: any) => {
      const match = l.color === r.color ? 1 : 0.25;
      pairs.push({ l, r, w: match * (l.v * r.v) / 100 });
    }));
    return pairs;
  };
  const pairs1 = leftRight(nodes[0], nodes[1]);
  const pairs2 = leftRight(nodes[1], nodes[2]);

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      {[...pairs1, ...pairs2].map((p: any, i: number) => (
        <path key={i} d={flowPath(p.l, p.r)} fill="none" stroke={p.l.color}
              strokeOpacity={0.18 + Math.min(0.3, p.w * 0.003)} strokeWidth={Math.max(0.6, p.w * 0.15)} />
      ))}
      {nodes.flat().map((n: any, i: number) => (
        <g key={i}>
          <rect x={n.x - 22} y={n.y} width={44} height={n.h} rx={2} fill={n.color} fillOpacity="0.6"
                stroke={n.color} strokeWidth="0.6" style={{ filter: `drop-shadow(0 0 4px ${n.color}66)` }} />
          <text x={n.x + 26} y={n.y + n.h / 2 + 3} fill={C.text3} fontSize="8.5" fontFamily="var(--mono)"
                style={{ letterSpacing: '0.08em' }}>{n.label} <tspan fill={n.color}>{n.v}</tspan></text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ data, width = 600, height = 180 }: any) {
  const pad = { l: 30, r: 10, t: 10, b: 42 };
  const vals = data.map((d: any) => d.ret);
  const maxV = Math.max(5, ...vals.map((v: number) => Math.abs(v)));
  const barW = (width - pad.l - pad.r) / data.length - 3;
  const zero = pad.t + (height - pad.t - pad.b) / 2;
  const scale = (v: number) => (v / maxV) * ((height - pad.t - pad.b) / 2);
  return (
    <svg width={width} height={height}>
      <line x1={pad.l} x2={width - pad.r} y1={zero} y2={zero} stroke={C.borderHi} strokeDasharray="2 3" />
      {[maxV, maxV / 2, -maxV / 2, -maxV].map((v: number) => (
        <g key={v}>
          <line x1={pad.l} x2={width - pad.r} y1={zero - scale(v)} y2={zero - scale(v)} stroke={C.border} strokeDasharray="1 3" />
          <text x={pad.l - 4} y={zero - scale(v) + 3} fill={C.text4} fontSize="8.5" fontFamily="var(--mono)" textAnchor="end">{v > 0 ? '+' : ''}{v.toFixed(1)}%</text>
        </g>
      ))}
      {data.map((d: any, i: number) => {
        const bx = pad.l + i * (barW + 3);
        const h = Math.abs(scale(d.ret));
        const by = d.ret >= 0 ? zero - h : zero;
        const col = d.ret >= 0 ? C.emerald : C.red;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={h} fill={col} fillOpacity="0.55" stroke={col} strokeWidth="0.6"
                  style={{ filter: `drop-shadow(0 0 4px ${col}55)` }}>
              <title>{d.label} {d.ret > 0 ? '+' : ''}{d.ret}%</title>
            </rect>
            <text x={bx + barW / 2} y={height - 24} fill={C.text4} fontSize="8" fontFamily="var(--mono)" textAnchor="middle">{d.symbol}</text>
          </g>
        );
      })}
    </svg>
  );
}

function StackBar({ parts, height = 6, showLabels = true }: any) {
  const total = parts.reduce((s: number, p: any) => s + p.v, 0);
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', width: '100%', height, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
        {parts.map((p: any, i: number) => (
          <div key={i} style={{ width: `${(p.v / total) * 100}%`, background: p.color, boxShadow: `0 0 8px ${p.color}55 inset` }} />
        ))}
      </div>
      {showLabels && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: C.text3, letterSpacing: '0.1em' }}>
          {parts.map((p: any, i: number) => (
            <span key={i}>
              <span style={{ color: p.color }}>■</span> {p.label.toUpperCase()} <span style={{ color: C.text2 }}>{p.v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

function ActionBadge({ action, size = 'sm' }: any) {
  const color = ACTION_COLOR[action] || C.text3;
  const dim = action === 'BUY' ? C.emeraldDim : action === 'SELL' ? C.redDim : 'rgba(245,158,11,0.18)';
  const px = size === 'lg' ? '6px 10px' : '2px 7px';
  const fz = size === 'lg' ? 11 : 9.5;
  return (
    <span style={{
      fontFamily: 'var(--mono)', fontSize: fz, fontWeight: 600, letterSpacing: '0.12em',
      color, background: dim, padding: px, borderRadius: 3,
      border: `1px solid ${color}33`, display: 'inline-block',
    }}>{action}</span>
  );
}

function ConfidenceDots({ level }: any) {
  const filled = level === 'HIGH' ? 3 : level === 'MEDIUM' ? 2 : 1;
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[0, 1, 2].map((i: number) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: '50%',
          background: i < filled ? (level === 'HIGH' ? C.emerald : level === 'MEDIUM' ? C.amber : C.text4) : 'rgba(255,255,255,0.08)',
          boxShadow: i < filled ? `0 0 6px ${level === 'HIGH' ? C.emerald : level === 'MEDIUM' ? C.amber : 'transparent'}` : 'none',
        }} />
      ))}
    </span>
  );
}

function LivePulse({ color = C.emerald, size = 7 }: any) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%', background: color,
        boxShadow: `0 0 8px ${color}`,
      }} />
      <span className="meridian-pulse-ring" style={{
        position: 'absolute', inset: -3, borderRadius: '50%', border: `1px solid ${color}`,
      }} />
    </span>
  );
}

function Card({ title, meta, right, children, noPad }: any) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, background: C.surface, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: C.text1, letterSpacing: '0.22em', fontWeight: 500 }}>{title}</span>
          {meta && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: C.text4, letterSpacing: '0.16em' }}>{meta}</span>}
        </div>
        {right}
      </div>
      <div style={{ padding: noPad ? 0 : 18 }}>{children}</div>
    </div>
  );
}

function DataChip({ label, val, color = C.text1 }: any) {
  return (
    <div style={{ padding: '7px 9px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 2 }}>
      <div style={{ fontSize: 8.5, color: C.text4, letterSpacing: '0.16em', fontFamily: 'var(--mono)' }}>{label}</div>
      <div style={{ fontSize: 10.5, color, letterSpacing: '0.04em', marginTop: 2, fontFamily: 'var(--mono)' }}>{val}</div>
    </div>
  );
}

function LegendDot({ color, label, v }: any) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, letterSpacing: '0.1em', fontFamily: 'var(--mono)', fontSize: 10.5 }}>
      <span style={{ width: 8, height: 8, background: color, borderRadius: 1, boxShadow: `0 0 4px ${color}` }} />
      <span style={{ color: C.text3 }}>{label}</span>
      {v !== '' && v !== undefined && <span style={{ color: C.text1 }}>{v}</span>}
    </span>
  );
}

function HeroStat({ label, val, sub, subColor }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: C.text4, letterSpacing: '0.22em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 24, color: C.text1, fontWeight: 500, letterSpacing: '0.02em' }}>{val}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: subColor, letterSpacing: '0.1em' }}>{sub}</div>
    </div>
  );
}

function ThemeStat({ label, val, delta, state, color }: any) {
  return (
    <div style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 2, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: C.text4, letterSpacing: '0.18em' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 22, color, fontWeight: 500 }}>{val}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: C.red }}>{delta}</span>
      </div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: C.text3, letterSpacing: '0.16em', marginTop: 3 }}>{state}</div>
    </div>
  );
}

function Wordmark() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="24" height="24" viewBox="0 0 24 24">
        <defs>
          <linearGradient id="mg-wm" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={C.emerald} />
            <stop offset="1" stopColor={C.cyan} />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="none" stroke="url(#mg-wm)" strokeWidth="1.2" />
        <path d="M 2 12 Q 12 5, 22 12" fill="none" stroke="url(#mg-wm)" strokeWidth="0.8" />
        <path d="M 2 12 Q 12 19, 22 12" fill="none" stroke="url(#mg-wm)" strokeWidth="0.8" />
        <line x1="12" y1="2" x2="12" y2="22" stroke={C.emerald} strokeWidth="0.6" strokeOpacity="0.5" />
        <circle cx="12" cy="12" r="2" fill={C.emerald} style={{ filter: `drop-shadow(0 0 5px ${C.emerald})` }} />
      </svg>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 500, letterSpacing: '0.28em', color: C.text1 }}>MERIDIAN</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. V2 COMPONENTS — ANALYST WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────

function LiveTab({ D, selected, setSelected }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Card title="PORTFOLIO VALUE" meta="14D">
          <AutoWidth>{(w: number) => <PortfolioCurve data={D.portfolioSeries} width={w} height={220} />}</AutoWidth>
        </Card>

        <Card title="DECISION STREAM" meta={`${D.decisions.length} EVENTS`} noPad>
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {D.decisions.slice(0, 18).map((d: any) => (
              <div key={d.id} onClick={() => setSelected(d)}
                   className="meridian-stream-row"
                   style={{
                     display: 'grid', gridTemplateColumns: '110px 58px 62px 1fr auto', gap: 14, alignItems: 'center',
                     padding: '14px 18px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
                     background: selected?.id === d.id ? 'linear-gradient(90deg, rgba(34,211,238,0.08), transparent)' : 'transparent',
                     borderLeft: selected?.id === d.id ? `2px solid ${C.cyan}` : '2px solid transparent',
                     transition: 'background 0.15s',
                   }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: C.text3, letterSpacing: '0.08em' }}>{d.ts_label}</span>
                <ActionBadge action={d.action} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13, color: SYM_COLOR[d.symbol] || C.text1, fontWeight: 600, letterSpacing: '0.04em' }}>{d.symbol}</span>
                <span style={{ fontSize: 12.5, color: C.text2, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' } as any}>{d.reasoning}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--mono)', fontSize: 10.5, color: C.text3 }}>
                  <ConfidenceDots level={d.confidence} />
                  <span style={{ color: d.quant_grade === 'A' ? C.emerald : d.quant_grade === 'B' ? C.cyan : d.quant_grade === 'C' ? C.amber : C.red, fontWeight: 600 }}>{d.quant_grade}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20 }}>
        <Card title="CONFLUENCE RADAR" meta={selected?.symbol}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Radar scores={selected?.component_scores || {}} size={260} color={SYM_COLOR[selected?.symbol] || C.cyan} />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'space-around', fontFamily: 'var(--mono)', fontSize: 10, color: C.text3, letterSpacing: '0.12em' }}>
            <span><span style={{ color: C.text4 }}>ACTION</span> <ActionBadge action={selected?.action} /></span>
            <span><span style={{ color: C.text4 }}>GRADE</span> <span style={{ color: C.text1 }}>{selected?.quant_grade}</span></span>
            <span><span style={{ color: C.text4 }}>EXEC</span> <span style={{ color: selected?.executed ? C.emerald : C.text3 }}>{selected?.executed ? 'YES' : 'NO'}</span></span>
          </div>
        </Card>

        <Card title="REASONING" meta={selected?.ts_label}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: C.text2, paddingLeft: 12, borderLeft: `2px solid ${SYM_COLOR[selected?.symbol] || C.cyan}` }}>
            {selected?.reasoning}
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontFamily: 'var(--mono)', fontSize: 10 }}>
            <DataChip label="THEME" val={selected?.theme} color={C.cyan} />
            <DataChip label="BRAIN" val={selected?.brain_agreement?.replace(/_/g, ' ')} />
            <DataChip label="SENTIMENT" val={selected?.sentiment} />
            <DataChip label="CYCLE" val={selected?.cycle} color={selected?.cycle === 'FAST' ? C.amber : C.text1} />
          </div>
        </Card>
      </div>
    </div>
  );
}

function IntelligenceTab({ D }: any) {
  const [metric, setMetric] = useState('RSI');
  const recentHigh = D.decisions.filter((d: any) => d.confidence === 'HIGH').slice(0, 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <Card title="QUANT SIGNAL · MULTI-TICKER" meta={`${metric} · 30D`} right={
          <div style={{ display: 'flex', gap: 4 }}>
            {['RSI', 'Z-SCORE', 'PRICE'].map((m: string) => (
              <button key={m} onClick={() => setMetric(m)}
                      style={{ background: metric === m ? 'rgba(34,211,238,0.14)' : 'transparent', color: metric === m ? C.cyan : C.text3, border: `1px solid ${metric === m ? C.cyan + '55' : C.border}`, fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: '0.14em', padding: '3px 8px', borderRadius: 2, cursor: 'pointer' }}>{m}</button>
            ))}
          </div>
        }>
          <AutoWidth>{(w: number) => (
            <AreaChart width={w} height={240} xLabels={D.quantSeries.map((d: any) => 'D' + d.day)} series={['NVDA', 'INTC', 'MU', 'AMD'].map((s: string) => ({
              key: s, color: SYM_COLOR[s], data: D.quantSeries.map((d: any) => ({ v: d[s] })), fillOpacity: 0.1,
            }))} />
          )}</AutoWidth>
          <div style={{ display: 'flex', gap: 18, marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '0.1em' }}>
            {['NVDA', 'INTC', 'MU', 'AMD'].map((s: string) => (
              <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 2, background: SYM_COLOR[s], boxShadow: `0 0 4px ${SYM_COLOR[s]}` }} />
                <span style={{ color: C.text2 }}>{s}</span>
              </span>
            ))}
            <span style={{ marginLeft: 'auto', color: C.text4 }}>OVERBOUGHT 70 · OVERSOLD 30</span>
          </div>
        </Card>

        <Card title="BRAIN AGREEMENT" meta="QUANT ↔ NARRATIVE">
          <AutoWidth>{(w: number) => <BrainFlow flow={D.brainFlow} width={w} height={240} />}</AutoWidth>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="THEME TRAJECTORY" meta="GEO ESCALATION · 30D">
          <AutoWidth>{(w: number) => (
            <AreaChart width={w} height={200} xLabels={D.geoSeries.map((d: any) => 'D' + d.day)}
                       series={[
                         { key: 'semi', color: C.cyan, data: D.geoSeries.map((d: any) => ({ v: d.semi })) },
                         { key: 'iran', color: C.orange, data: D.geoSeries.map((d: any) => ({ v: d.iran })) },
                       ]} />
          )}</AutoWidth>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
            <ThemeStat label="SEMICONDUCTORS" val="88" delta="+12" state="ESCALATING" color={C.cyan} />
            <ThemeStat label="IRAN · OIL" val="73" delta="+18" state="PEAK" color={C.orange} />
          </div>
        </Card>

        <Card title="RAG SOURCE VOLUME" meta="LAST 24H">
          <AutoWidth>{(w: number) => (
            <AreaChart width={w} height={200} xLabels={D.ragSeries.map((d: any) => d.hour + 'h')}
                       series={[
                         { key: 'social',  color: C.purple, data: D.ragSeries.map((d: any) => ({ v: d.social })) },
                         { key: 'news',    color: C.cyan,   data: D.ragSeries.map((d: any) => ({ v: d.news })) },
                         { key: 'filings', color: C.amber,  data: D.ragSeries.map((d: any) => ({ v: d.filings })) },
                       ]} />
          )}</AutoWidth>
          <div style={{ display: 'flex', gap: 18, marginTop: 12, fontFamily: 'var(--mono)', fontSize: 10.5 }}>
            <LegendDot color={C.purple} label="SOCIAL"  v={D.ragSeries.reduce((s: number, r: any) => s + r.social, 0)} />
            <LegendDot color={C.cyan}   label="NEWS"    v={D.ragSeries.reduce((s: number, r: any) => s + r.news, 0)} />
            <LegendDot color={C.amber}  label="FILINGS" v={D.ragSeries.reduce((s: number, r: any) => s + r.filings, 0)} />
          </div>
        </Card>
      </div>

      <Card title="HIGH-CONVICTION DECISIONS" meta="MEDIUM+ CONFIDENCE · GRADE A/B">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {recentHigh.map((d: any) => (
            <div key={d.id} style={{ border: `1px solid ${C.border}`, borderRadius: 3, padding: 14, background: C.surface, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: SYM_COLOR[d.symbol], fontWeight: 600, letterSpacing: '0.04em' }}>{d.symbol}</span>
                <ActionBadge action={d.action} />
              </div>
              <Radar scores={d.component_scores} size={160} color={SYM_COLOR[d.symbol] || C.cyan} labels={false} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: C.text4, letterSpacing: '0.14em', display: 'flex', justifyContent: 'space-between' }}>
                <span>{d.ts_label}</span>
                <span style={{ color: C.cyan }}>{d.theme}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function PerformanceTab({ D }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="CONFIDENCE CALIBRATION" meta="PREDICTED vs REALIZED">
          <AutoWidth>{(w: number) => <CalibrationScatter data={D.calibration} width={w} height={300} />}</AutoWidth>
          <div style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: C.text4, letterSpacing: '0.1em', textAlign: 'center' }}>
            bubble size = quant score · green = gain · red = loss
          </div>
        </Card>

        <Card title="RETURNS BY SIGNAL" meta="EXECUTED · LAST 18">
          <AutoWidth>{(w: number) => <BarChart data={D.returnsBySignal} width={w} height={300} />}</AutoWidth>
        </Card>
      </div>

      <Card title="ACTION HEATMAP" meta="TICKER × DAY · COLORED BY ACTION/CONFIDENCE">
        <div style={{ overflowX: 'auto' }}>
          <Heatmap data={D.heatmap} cellSize={28} gap={3} />
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 14, fontFamily: 'var(--mono)', fontSize: 10, color: C.text4, letterSpacing: '0.12em' }}>
          <LegendDot color={C.emerald} label="BUY" v="" />
          <LegendDot color={C.red} label="SELL" v="" />
          <LegendDot color={C.amber} label="HOLD" v="" />
          <span style={{ marginLeft: 'auto' }}>opacity ≈ confidence</span>
        </div>
      </Card>

      <Card title="DETAIL LEDGER" meta={`${D.decisions.filter((d: any) => d.executed).length} EXECUTED`} noPad>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--mono)', fontSize: 11 }}>
            <thead>
              <tr style={{ color: C.text4, letterSpacing: '0.14em', fontSize: 9.5, textAlign: 'left' }}>
                {['TIME', 'SYMBOL', 'ACTION', 'QTY', 'PRICE', 'QUANT', 'CONF', 'RETURN', 'P&L', 'BRAIN'].map((h: string) => (
                  <th key={h} style={{ padding: '10px 16px', fontWeight: 500, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {D.decisions.filter((d: any) => d.executed).slice(0, 20).map((d: any) => (
                <tr key={d.id}>
                  <td style={{ padding: '9px 16px', color: C.text3, borderBottom: `1px solid ${C.border}` }}>{d.ts_label}</td>
                  <td style={{ padding: '9px 16px', color: SYM_COLOR[d.symbol], fontWeight: 600, borderBottom: `1px solid ${C.border}` }}>{d.symbol}</td>
                  <td style={{ padding: '9px 16px', borderBottom: `1px solid ${C.border}` }}><ActionBadge action={d.action} /></td>
                  <td style={{ padding: '9px 16px', color: C.text2, borderBottom: `1px solid ${C.border}` }}>{d.qty}</td>
                  <td style={{ padding: '9px 16px', color: C.text1, borderBottom: `1px solid ${C.border}` }}>${d.price.toFixed(2)}</td>
                  <td style={{ padding: '9px 16px', color: C.text2, borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: d.quant_grade === 'A' ? C.emerald : d.quant_grade === 'B' ? C.cyan : d.quant_grade === 'C' ? C.amber : C.red, fontWeight: 600 }}>{d.quant_grade}</span>
                    <span style={{ color: C.text4, margin: '0 6px' }}>{d.quant_score}</span>
                  </td>
                  <td style={{ padding: '9px 16px', borderBottom: `1px solid ${C.border}` }}><ConfidenceDots level={d.confidence} /></td>
                  <td style={{ padding: '9px 16px', borderBottom: `1px solid ${C.border}`, color: d.return >= 0 ? C.emerald : C.red }}>{d.return >= 0 ? '+' : ''}{(d.return * 100).toFixed(2)}%</td>
                  <td style={{ padding: '9px 16px', borderBottom: `1px solid ${C.border}`, color: d.return >= 0 ? C.emerald : C.red }}>{d.return >= 0 ? '+' : ''}${(d.return * d.qty * d.price).toFixed(0)}</td>
                  <td style={{ padding: '9px 16px', color: C.text3, fontSize: 9.5, letterSpacing: '0.08em', borderBottom: `1px solid ${C.border}` }}>{d.brain_agreement.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AnalystWorkspace({ D, isLive }: any) {
  const [tab, setTab] = useState('live');
  const [selected, setSelected] = useState(D.decisions[0]);
  const pnl = D.stats.portfolio - D.stats.startPortfolio;
  const pnlPct = pnl / D.stats.startPortfolio * 100;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text1, fontFamily: 'var(--sans)' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle at 20% 0%, rgba(16,185,129,0.06), transparent 40%), radial-gradient(circle at 80% 100%, rgba(34,211,238,0.04), transparent 40%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1440, margin: '0 auto', padding: '28px 32px' }}>
        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, paddingBottom: 24, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Wordmark />
              {isLive && (
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', padding: '3px 8px', border: `1px solid ${C.emerald}44`, background: C.emeraldDim, borderRadius: 2, fontFamily: 'var(--mono)', fontSize: 9.5, color: C.emerald, letterSpacing: '0.2em' }}>
                  <LivePulse size={5} /> LIVE
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: C.text3, letterSpacing: '0.14em' }}>
              AUTONOMOUS TRADING AGENT · PAPER · CYCLE STANDARD · UPTIME <span style={{ color: C.text1 }}>14d 02:41</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <HeroStat label="PORTFOLIO" val={`$${(D.stats.portfolio / 1000).toFixed(2)}k`} sub={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% · 14D`} subColor={pnl >= 0 ? C.emerald : C.red} />
            <HeroStat
              label="LAST DECISION"
              val={<span><ActionBadge action={D.decisions[0].action} /> <span style={{ color: SYM_COLOR[D.decisions[0].symbol] || C.text1, fontWeight: 500 }}>{D.decisions[0].symbol}</span></span>}
              sub={D.decisions[0].ts_label}
              subColor={C.text3}
            />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20, borderBottom: `1px solid ${C.border}` }}>
          {[
            { k: 'live', l: 'LIVE STREAM', s: 'Decisions & portfolio' },
            { k: 'intel', l: 'INTELLIGENCE', s: 'Signals · brains · themes' },
            { k: 'perf', l: 'PERFORMANCE', s: 'Calibration & returns' },
          ].map((t: any) => (
            <button key={t.k} onClick={() => setTab(t.k)}
                    style={{
                      background: 'transparent', border: 'none', padding: '14px 22px 14px 0',
                      marginRight: 28, color: tab === t.k ? C.text1 : C.text3, cursor: 'pointer',
                      textAlign: 'left', position: 'relative',
                    }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.22em', fontWeight: 500 }}>{t.l}</div>
              <div style={{ fontSize: 11, color: C.text4, marginTop: 4, letterSpacing: '0.04em' }}>{t.s}</div>
              {tab === t.k && <div style={{ position: 'absolute', bottom: -1, left: 0, right: 28, height: 1, background: C.emerald, boxShadow: `0 0 8px ${C.emerald}` }} />}
            </button>
          ))}
        </div>

        <div key={tab} className="meridian-fade-in" style={{ paddingTop: 28 }}>
          {tab === 'live' && <LiveTab D={D} selected={selected} setSelected={setSelected} />}
          {tab === 'intel' && <IntelligenceTab D={D} />}
          {tab === 'perf' && <PerformanceTab D={D} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. V3 COMPONENTS — NARRATIVE SCROLL
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ num, title }: any) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'var(--mono)', fontSize: 10, color: C.text4, letterSpacing: '0.24em' }}>
      <span style={{ color: C.emerald }}>§ {num}</span>
      <span style={{ width: 40, height: 1, background: C.border, display: 'inline-block' }} />
      <span>{title}</span>
    </div>
  );
}

function Section3({ num, title, sub, children }: any) {
  return (
    <div style={{ padding: '40px 0', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ marginBottom: 24 }}>
        <SectionLabel num={num} title={title} />
        {sub && <div style={{ fontSize: 13, color: C.text3, marginTop: 8, letterSpacing: '0.02em' }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function BigStat({ label, val, sub, subColor, valColor = C.text1, spark, compact }: any) {
  return (
    <div style={{ padding: compact ? 12 : 16, border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: C.text4, letterSpacing: '0.2em' }}>{label}</div>
      <div style={{ fontFamily: 'var(--mono)', fontSize: compact ? 18 : 26, color: valColor, fontWeight: 500, marginTop: 4 }}>{val}</div>
      {sub && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: subColor, letterSpacing: '0.1em', marginTop: 2 }}>{sub}</div>}
      {spark && <div style={{ marginTop: 8 }}><Sparkline data={spark} color={C.emerald} width={180} height={28} /></div>}
    </div>
  );
}

function BrainRow({ label, v, total, color }: any) {
  const pct = v / total * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10.5, color: C.text2, letterSpacing: '0.08em', marginBottom: 4 }}>
        <span>{label}</span>
        <span><span style={{ color }}>{v}</span> <span style={{ color: C.text4 }}>/ {total} · {pct.toFixed(0)}%</span></span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, boxShadow: `0 0 6px ${color}`, borderRadius: 1 }} />
      </div>
    </div>
  );
}

function NarrativeScroll({ D, isLive }: any) {
  const [selected, setSelected] = useState(D.decisions[0]);
  const pnl = D.stats.portfolio - D.stats.startPortfolio;
  const pnlPct = pnl / D.stats.startPortfolio * 100;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text1, fontFamily: 'var(--sans)' }}>
      {/* Ambient glow */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(circle at 20% 0%, rgba(16,185,129,0.06), transparent 40%), radial-gradient(circle at 80% 100%, rgba(34,211,238,0.04), transparent 40%)' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 32px 80px' }}>
        {/* Masthead */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: `2px solid ${C.text1}` }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: C.text4, letterSpacing: '0.3em', marginBottom: 6 }}>VISHALPATHAK.COM · AUTONOMOUS SYSTEMS</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 34, letterSpacing: '0.28em', fontWeight: 500 }}>MERIDIAN</div>
            <div style={{ fontSize: 13, color: C.text3, marginTop: 4, letterSpacing: '0.04em' }}>Autonomous trading agent · decision log & performance report</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 10.5, color: C.emerald, letterSpacing: '0.2em' }}>
              <LivePulse size={6} /> {isLive ? 'LIVE · PAPER' : 'SYNTHETIC · PAPER'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: C.text3, marginTop: 6, letterSpacing: '0.1em' }}>ISSUE 042 · APR 19 2026</div>
          </div>
        </div>

        {/* Above-fold summary */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32, padding: '32px 0', borderBottom: `1px solid ${C.border}` }}>
          <div>
            <SectionLabel num="01" title="FOURTEEN DAYS IN" />
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 400, letterSpacing: '0.02em', lineHeight: 1.25, marginTop: 10, color: C.text1 }}>
              Agent is <span style={{ color: C.emerald, textShadow: `0 0 12px ${C.emerald}66` }}>{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</span> over open of $100,000 across {D.stats.total} decisions in {D.stats.buys + D.stats.sells} positions, hit rate {(D.stats.hitRate * 100).toFixed(1)}%.
            </h2>
            <p style={{ fontSize: 13.5, color: C.text3, lineHeight: 1.65, marginTop: 14, maxWidth: 640 }}>
              The quant brain and the narrative brain agree on the direction of the next 24-hour move ~62% of the time. When they diverge, the agent defers to whichever one has the stronger supporting chain-of-evidence, logged below alongside every trade.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <BigStat label="PORTFOLIO" val={`$${(D.stats.portfolio / 1000).toFixed(2)}k`} sub={`${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`} subColor={pnl >= 0 ? C.emerald : C.red} spark={D.portfolioSeries.map((p: any) => p.v)} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <BigStat label="HIT RATE" val={`${(D.stats.hitRate * 100).toFixed(1)}%`} compact />
              <BigStat label="DECISIONS" val={D.stats.total} compact />
              <BigStat label="BEST" val={`+${D.stats.best.ret}%`} sub={D.stats.best.sym} subColor={C.emerald} valColor={C.emerald} compact />
              <BigStat label="WORST" val={`${D.stats.worst.ret}%`} sub={D.stats.worst.sym} subColor={C.red} valColor={C.red} compact />
            </div>
          </div>
        </div>

        {/* Section 02 — Portfolio Curve */}
        <Section3 num="02" title="PORTFOLIO CURVE" sub="$100k → real-time · cycle: standard, 6h">
          <AutoWidth>{(w: number) => <PortfolioCurve data={D.portfolioSeries} width={w} height={260} />}</AutoWidth>
        </Section3>

        {/* Section 03 — Decision Dispatch */}
        <Section3 num="03" title="DECISION DISPATCH" sub={`${D.decisions.length} events · click any row to inspect`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 32, alignItems: 'flex-start' }}>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface, maxHeight: 420, overflowY: 'auto' }}>
              {D.decisions.slice(0, 14).map((d: any) => (
                <div key={d.id} onClick={() => setSelected(d)}
                     style={{
                       display: 'grid', gridTemplateColumns: '90px 54px 56px 1fr auto', gap: 10, alignItems: 'center',
                       padding: '11px 16px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
                       background: selected?.id === d.id ? 'rgba(34,211,238,0.06)' : 'transparent',
                     }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: C.text3, letterSpacing: '0.08em' }}>{d.ts_label}</span>
                  <ActionBadge action={d.action} />
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: SYM_COLOR[d.symbol], fontWeight: 600 }}>{d.symbol}</span>
                  <span style={{ fontSize: 12, color: C.text2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{d.reasoning}</span>
                  <ConfidenceDots level={d.confidence} />
                </div>
              ))}
            </div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 2, background: C.surface, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 18, color: SYM_COLOR[selected?.symbol], fontWeight: 600, letterSpacing: '0.04em' }}>{selected?.symbol}</span>
                <ActionBadge action={selected?.action} size="lg" />
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: C.text4, letterSpacing: '0.12em', marginTop: 4 }}>
                {selected?.ts_label} · {selected?.instrument?.toUpperCase()} · QTY {selected?.qty} @ ${selected?.price?.toFixed(2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                <Radar scores={selected?.component_scores || {}} size={220} color={SYM_COLOR[selected?.symbol] || C.cyan} />
              </div>
              <div style={{ fontSize: 12.5, lineHeight: 1.6, color: C.text2, paddingLeft: 10, borderLeft: `2px solid ${SYM_COLOR[selected?.symbol] || C.cyan}` }}>
                {selected?.reasoning}
              </div>
            </div>
          </div>
        </Section3>

        {/* Section 04 — Two Brains */}
        <Section3 num="04" title="TWO BRAINS, ONE AGENT" sub="Quant & narrative models, mediation outcomes">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <AutoWidth>{(w: number) => <BrainFlow flow={D.brainFlow} width={w} height={260} />}</AutoWidth>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <BrainRow label="Both agree" v={D.brainFlow.outcomes.both_bull + D.brainFlow.outcomes.both_bear} total={48} color={C.emerald} />
              <BrainRow label="Quant override" v={D.brainFlow.outcomes.quant_override} total={48} color={C.cyan} />
              <BrainRow label="Narrative override" v={D.brainFlow.outcomes.narrative_override} total={48} color={C.purple} />
              <BrainRow label="Unresolved conflict" v={D.brainFlow.outcomes.conflict} total={48} color={C.text3} />
              <p style={{ fontSize: 12.5, lineHeight: 1.65, color: C.text3, marginTop: 10 }}>
                When the brains align, execution is automatic. On override, the agent annotates which evidence chain won. Unresolved conflicts escalate to HOLD — the agent can stand down.
              </p>
            </div>
          </div>
        </Section3>

        {/* Section 05 — Geo Trajectory */}
        <Section3 num="05" title="GEO TRAJECTORY" sub="Escalation scores for active themes, 30-day">
          <AutoWidth>{(w: number) => (
            <AreaChart width={w} height={220} xLabels={D.geoSeries.map((d: any) => 'D' + d.day)}
                       series={[
                         { key: 'semi', color: C.cyan,   data: D.geoSeries.map((d: any) => ({ v: d.semi })) },
                         { key: 'iran', color: C.orange, data: D.geoSeries.map((d: any) => ({ v: d.iran })) },
                       ]} />
          )}</AutoWidth>
          <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
            {D.shifts.map((s: any, i: number) => (
              <div key={i} style={{ flex: 1, borderLeft: `2px solid ${s.delta > 0 ? C.red : C.emerald}`, padding: '4px 12px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: C.text4, letterSpacing: '0.14em' }}>{s.ts}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: C.text1, marginTop: 3 }}><span style={{ color: C.text4 }}>{s.from}</span> → <span>{s.to}</span></div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: s.delta > 0 ? C.red : C.emerald, marginTop: 3, letterSpacing: '0.1em' }}>{s.theme.toUpperCase()} {s.delta > 0 ? '+' : ''}{s.delta}</div>
              </div>
            ))}
          </div>
        </Section3>

        {/* Section 06 — Heatmap */}
        <Section3 num="06" title="ACTION HEATMAP" sub="Ticker × day · colored by action, saturation by confidence">
          <div style={{ overflowX: 'auto' }}>
            <Heatmap data={D.heatmap} cellSize={28} gap={3} />
          </div>
        </Section3>

        {/* Section 07 — Calibration */}
        <Section3 num="07" title="CALIBRATION" sub="Confidence vs realized return per executed decision">
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
            <AutoWidth>{(w: number) => <CalibrationScatter data={D.calibration} width={w} height={320} />}</AutoWidth>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: C.text3 }}>
              <p>HIGH-confidence decisions cluster in the positive half (64% realize gains ≥ +1%). MEDIUM-confidence is noisier; the agent treats it as a sizing signal. LOW-confidence only fires when theme risk is elevated.</p>
              <p style={{ marginTop: 14 }}>Bubble radius = quant score. A well-calibrated agent should have larger green bubbles drift upward as confidence grows.</p>
            </div>
          </div>
        </Section3>

        {/* Colophon */}
        <div style={{ paddingTop: 40, marginTop: 40, borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: C.text4, letterSpacing: '0.16em' }}>
          <span>MERIDIAN · AUTONOMOUS · PAPER MODE</span>
          <span>SUPABASE · NEXT.JS 14 · REACT 19</span>
          <span>UPDATED {new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. MAIN PAGE — view switcher
// ─────────────────────────────────────────────────────────────────────────────

export default function MeridianPage() {
  const [view, setView] = useState<'v2' | 'v3'>('v2');
  const { live, loading, isLive } = useLiveDecisions();

  // Generate synthetic data once; merge live decisions if available
  const D = useMemo(() => {
    const base = generateMeridianData();
    if (!live || !live.decisions || live.decisions.length === 0) return base;

    // Normalise live decisions to match synthetic shape
    const liveDecisions = live.decisions.map((ld: LiveDecision, i: number) => {
      const sym = ld.symbol || 'NVDA';
      const tsDate = new Date(ld.ts);
      const ts_label = tsDate.toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
      return {
        id: 'live-' + i,
        ts: ld.ts,
        ts_label,
        action: ld.action,
        symbol: sym,
        instrument: ld.instrument || 'equity',
        qty: ld.qty || 100,
        price: ld.price || 100,
        confidence: ld.confidence,
        theme: ld.theme || 'general',
        cycle: ld.cycle || 'STANDARD',
        reasoning: ld.reasoning,
        quant_score: ld.quant_score ?? 0.5,
        quant_grade: ld.quant_grade ?? 'B',
        component_scores: ld.component_scores ?? base.decisions[0]?.component_scores ?? {},
        brain_agreement: ld.brain_agreement ?? 'both_agree',
        executed: ld.executed ?? false,
        mode: ld.mode ?? 'paper',
        portfolio_value: ld.portfolio_value ?? base.stats.portfolio,
        geo_focus: ld.geo_focus ?? '',
        sentiment: ld.sentiment ?? 'neutral',
        return: ld.return ?? 0,
      };
    });

    // Rebuild portfolio series from live if available
    const portfolioSeries = liveDecisions
      .filter((d: any) => d.portfolio_value)
      .map((d: any) => ({ t: new Date(d.ts).getTime(), v: d.portfolio_value }))
      .sort((a: any, b: any) => a.t - b.t);

    const merged = { ...base, decisions: liveDecisions };
    if (portfolioSeries.length >= 2) merged.portfolioSeries = portfolioSeries;

    const liveStats = live.summary;
    merged.stats = {
      ...base.stats,
      total: liveStats.total,
      buys: liveStats.buys,
      sells: liveStats.sells,
      holds: liveStats.holds,
    };

    return merged;
  }, [live]);

  // View switcher bar style
  const switcherBtnStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'var(--mono)',
    fontSize: 10.5,
    letterSpacing: '0.2em',
    fontWeight: active ? 600 : 400,
    color: active ? C.text1 : C.text3,
    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
    border: `1px solid ${active ? C.borderHi : C.border}`,
    padding: '7px 18px',
    borderRadius: 2,
    cursor: 'pointer',
    transition: 'all 0.15s',
    outline: 'none',
  });

  return (
    <>
      <StyleInjector />

      {/* Sticky view switcher */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${C.bg}ee`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 32px',
      }}>
        <a href="/"
           style={{ fontFamily: 'var(--mono)', fontSize: 10, color: C.text4, letterSpacing: '0.14em', textDecoration: 'none', marginRight: 8 }}>
          ← BACK
        </a>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <button style={switcherBtnStyle(view === 'v2')} onClick={() => setView('v2')}>
          ANALYST WORKSPACE
        </button>
        <button style={switcherBtnStyle(view === 'v3')} onClick={() => setView('v3')}>
          NARRATIVE SCROLL
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {loading && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: C.text4, letterSpacing: '0.14em' }}>CONNECTING…</span>
          )}
          {isLive && !loading && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontFamily: 'var(--mono)', fontSize: 9.5, color: C.emerald, letterSpacing: '0.18em' }}>
              <LivePulse size={5} /> SUPABASE LIVE
            </span>
          )}
          {!isLive && !loading && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9.5, color: C.text4, letterSpacing: '0.14em' }}>SYNTHETIC DATA</span>
          )}
        </div>
      </div>

      {/* View render */}
      <div key={view} className="meridian-fade-in">
        {view === 'v2' && <AnalystWorkspace D={D} isLive={isLive} />}
        {view === 'v3' && <NarrativeScroll D={D} isLive={isLive} />}
      </div>
    </>
  );
}

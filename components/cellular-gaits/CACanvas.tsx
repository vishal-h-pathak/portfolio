"use client";

import { useEffect, useRef } from "react";

export type CACanvasProps = {
  // Per-tick CA state. Shape [n_cells][n_channels] — flat, not nested by row.
  // For an 8×8×4 NCA: frame is [64][4]; index `cell = row * cols + col`.
  frame: number[][] | null;
  grid: [number, number]; // [rows, cols], typically [8, 8]
  channels: number; // typically 4
  motorCells: [number, number][]; // [42][2] of [row, col]
  size?: number; // total square px (default 256)
};

const CHANNEL_LABELS = ["ch0 · motor", "ch1", "ch2", "ch3"];

// Simple diverging colormap centered at 0.
// v expected in roughly [-1, 1]; clamped here. Returns "rgb(r,g,b)".
function divergingRdBu(v: number): string {
  const t = Math.max(-1, Math.min(1, v));
  // Endpoints chosen to read as "blue → near-white → red" against the dark page.
  // Negative -> cool blue, positive -> warm red, zero -> faint ink.
  if (t >= 0) {
    const r = Math.round(232 + (239 - 232) * t); // ink → red
    const g = Math.round(230 + (68 - 230) * t);
    const b = Math.round(223 + (68 - 223) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const a = -t;
    const r = Math.round(232 + (96 - 232) * a);
    const g = Math.round(230 + (165 - 230) * a);
    const b = Math.round(223 + (250 - 223) * a);
    return `rgb(${r},${g},${b})`;
  }
}

export function CACanvas({
  frame,
  grid,
  channels,
  motorCells,
  size = 256,
}: CACanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const [rows, cols] = grid;
    const nChan = Math.min(channels, 4); // cap at 4 — 2×2 layout
    const gap = 4;
    const subSize = (size - gap) / 2; // each of the 4 sub-heatmaps
    const cellW = subSize / cols;
    const cellH = subSize / rows;

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#0B0B0C"; // var(--bg)
    ctx.fillRect(0, 0, size, size);

    for (let ci = 0; ci < nChan; ci++) {
      const subX = (ci % 2) * (subSize + gap);
      const subY = Math.floor(ci / 2) * (subSize + gap);

      // Cells
      if (frame) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const cellIdx = r * cols + c;
            const cell = frame[cellIdx];
            const v = cell?.[ci] ?? 0;
            ctx.fillStyle = divergingRdBu(v);
            ctx.fillRect(
              subX + c * cellW,
              subY + r * cellH,
              cellW + 0.5, // overdraw 0.5px to avoid hairline gaps from rounding
              cellH + 0.5,
            );
          }
        }
      } else {
        // No frame yet — fill subgrid with mid-ink so layout is visible.
        ctx.fillStyle = "#5C594E";
        ctx.fillRect(subX, subY, subSize, subSize);
      }

      // Motor-cell highlights — subtle amber border on each tagged cell
      ctx.strokeStyle = "rgba(232, 155, 61, 0.55)"; // var(--amber) at ~55%
      ctx.lineWidth = 1;
      for (const [r, c] of motorCells) {
        if (r >= rows || c >= cols) continue;
        ctx.strokeRect(
          subX + c * cellW + 0.5,
          subY + r * cellH + 0.5,
          cellW - 1,
          cellH - 1,
        );
      }

      // Subgrid border
      ctx.strokeStyle = "rgba(232, 230, 223, 0.18)"; // ink at low alpha
      ctx.lineWidth = 1;
      ctx.strokeRect(subX + 0.5, subY + 0.5, subSize - 1, subSize - 1);

      // Channel label (top-left of each subgrid)
      ctx.fillStyle = "rgba(232, 230, 223, 0.85)";
      ctx.font =
        "9.5px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textBaseline = "top";
      ctx.fillText(CHANNEL_LABELS[ci] ?? `ch${ci}`, subX + 4, subY + 4);
    }
  }, [frame, grid, channels, motorCells, size]);

  return (
    <canvas
      ref={canvasRef}
      className="cg-ca-canvas"
      aria-label="Cellular automaton state, 4 channels on an 8×8 grid; motor cells highlighted with amber borders"
      role="img"
    />
  );
}

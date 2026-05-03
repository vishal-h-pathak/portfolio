"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CACanvas } from "./CACanvas";

type CaStatesMeta = {
  run_id: string;
  n_ticks: number;
  grid: [number, number];
  channels: number;
  control_dt_s: number; // seconds per CA tick (= 1/tickRate)
  motor_cells: [number, number][];
  // tick_rate is not currently emitted by render.py; if it ever appears, prefer it.
  tick_rate?: number;
};

type CaStates = {
  meta: CaStatesMeta;
  frames: number[][][]; // [n_ticks][n_cells][n_channels]
};

export type CAPlayerProps = {
  videoSrc: string;
  jsonSrc: string;
};

export function CAPlayer({ videoSrc, jsonSrc }: CAPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [data, setData] = useState<CaStates | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tickRate, setTickRate] = useState<number | null>(null);

  // Load JSON once on mount.
  useEffect(() => {
    let cancelled = false;
    fetch(jsonSrc)
      .then((r) => {
        if (!r.ok) throw new Error(`fetch failed: ${r.status}`);
        return r.json();
      })
      .then((d: CaStates) => {
        if (cancelled) return;
        setData(d);
        // Prefer explicit tick_rate; otherwise derive from control_dt_s.
        // (frames.length / video.duration is a defensive fallback computed in
        // the metadata handler below, in case both fields are missing.)
        if (typeof d.meta.tick_rate === "number" && d.meta.tick_rate > 0) {
          setTickRate(d.meta.tick_rate);
        } else if (
          typeof d.meta.control_dt_s === "number" &&
          d.meta.control_dt_s > 0
        ) {
          setTickRate(1 / d.meta.control_dt_s);
        }
      })
      .catch((e) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, [jsonSrc]);

  // Sync tick to video time.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !data) return;

    const onTimeUpdate = () => {
      const rate = tickRate ?? data.frames.length / (video.duration || 1);
      const next = Math.max(
        0,
        Math.min(data.frames.length - 1, Math.floor(video.currentTime * rate)),
      );
      setTick((prev) => (prev === next ? prev : next));
    };
    const onLoadedMeta = () => {
      // Defensive fallback: if neither meta.tick_rate nor meta.control_dt_s
      // were present, infer the rate from frame count and video duration once
      // the video knows its own duration.
      if (tickRate == null && video.duration > 0) {
        setTickRate(data.frames.length / video.duration);
      }
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("loadedmetadata", onLoadedMeta);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("loadedmetadata", onLoadedMeta);
    };
  }, [data, tickRate]);

  const frame = useMemo(
    () => (data ? data.frames[tick] ?? null : null),
    [data, tick],
  );

  return (
    <div className="cg-player">
      <div className="cg-player-video">
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          playsInline
          preload="metadata"
        />
        <div className="cg-player-cap">
          best individual · 3.0 s rollout · 250 Hz control
        </div>
      </div>
      <div className="cg-player-canvas">
        {error ? (
          <div className="cg-player-err">
            could not load CA state: <span>{error}</span>
          </div>
        ) : (
          <CACanvas
            frame={frame}
            grid={data?.meta.grid ?? [8, 8]}
            channels={data?.meta.channels ?? 4}
            motorCells={data?.meta.motor_cells ?? []}
          />
        )}
        <div className="cg-player-cap">
          tick {tick.toString().padStart(3, "0")} / {data?.meta.n_ticks ?? "—"}
          {data && (
            <>
              {" · "}
              {data.meta.motor_cells.length} motor cells
            </>
          )}
        </div>
      </div>
    </div>
  );
}

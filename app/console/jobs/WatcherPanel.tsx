"use client";

import { useCallback, useEffect, useState } from "react";
import { Btn } from "./components/Button";
import { Modal, ModalTitle } from "./components/Modal";
import { Pill } from "../components/Pill";
import { SkeletonRows } from "./components/Skeleton";
import { useToast } from "./components/Toast";
import { requestJSON } from "./lib/api";
import { relativeTime } from "./lib/format";

/**
 * WatcherPanel — "Active watcher" toggle (feat/dual-machine-watcher).
 *
 * The submit watcher runs on two machines at once (MacBook + Windows PC); only
 * the one named in watcher_config.active_watcher_id claims prefilling jobs. This
 * panel shows each known machine (from watcher_heartbeats) with a live/stale
 * dot, highlights the active one, and switches it on one click.
 *
 * Reads/writes:
 *   GET  /api/console/dashboard/watchers  → { active_watcher_id, heartbeats }
 *   POST /api/console/dashboard/watchers  { watcher_id }
 *
 * Liveness: stale = no heartbeat in ~2× the poll interval (watchers heartbeat
 * every WATCH_POLL_INTERVAL_SECONDS, default 15s → 30s stale window). Switching
 * to a stale machine asks for confirmation first, so the user doesn't toggle to
 * a dead machine and wonder why nothing opens.
 */

type Heartbeat = {
  watcher_id: string;
  last_seen: string | null;
  state: "active" | "dormant" | null;
};

type WatchersResponse = {
  active_watcher_id: string | null;
  heartbeats: Heartbeat[];
};

// Mirrors job-pipeline config WATCH_POLL_INTERVAL_SECONDS (default 15s). Stale
// after ~2× that with headroom for clock skew + request latency.
const STALE_AFTER_MS = 40_000;
const POLL_MS = 10_000;

function isStale(hb: Heartbeat): boolean {
  if (!hb.last_seen) return true;
  const t = new Date(hb.last_seen).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t > STALE_AFTER_MS;
}

export default function WatcherPanel() {
  const { push } = useToast();
  const [data, setData] = useState<WatchersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);
  const [confirmStale, setConfirmStale] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await requestJSON<WatchersResponse>(
        "GET",
        "/api/console/dashboard/watchers",
      );
      setData(res);
    } catch {
      // Transient — keep the last good view; the next poll retries.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  const doSetActive = useCallback(
    async (watcherId: string) => {
      setSwitching(watcherId);
      // Optimistic: reflect the new active immediately, converge on next poll.
      setData((d) => (d ? { ...d, active_watcher_id: watcherId } : d));
      try {
        await requestJSON("POST", "/api/console/dashboard/watchers", {
          watcher_id: watcherId,
        });
        push("ok", `Active watcher → ${watcherId}`);
        load();
      } catch (e) {
        push("error", e instanceof Error ? e.message : "Failed to switch");
        load(); // re-sync truth
      } finally {
        setSwitching(null);
      }
    },
    [load, push],
  );

  const setActive = useCallback(
    (watcherId: string, stale: boolean) => {
      if (watcherId === data?.active_watcher_id) return;
      if (stale) {
        setConfirmStale(watcherId);
        return;
      }
      void doSetActive(watcherId);
    },
    [data?.active_watcher_id, doSetActive],
  );

  const heartbeats = data?.heartbeats ?? [];
  const active = data?.active_watcher_id ?? null;

  return (
    <section className="mb-6 border border-rule bg-bg-raised p-3.5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-meta uppercase tracking-kicker text-ink-faint">
          Active watcher
        </h2>
        <span className="font-mono text-meta uppercase tracking-btn text-ink-faint">
          {active ? (
            <>
              claiming: <span className="text-green">{active}</span>
            </>
          ) : (
            <span className="text-amber">none active — all dormant</span>
          )}
        </span>
      </div>

      {loading && heartbeats.length === 0 ? (
        <SkeletonRows rows={2} rowClassName="h-9" />
      ) : heartbeats.length === 0 ? (
        <p className="text-label text-ink-faint">
          No watcher has checked in yet. Start a watcher on a machine
          (`jobpipe-submit --watch`) — once it heartbeats it appears here.
        </p>
      ) : (
        <ul className="divide-y divide-rule-soft text-xs">
          {heartbeats.map((hb) => {
            const stale = isStale(hb);
            const isActive = hb.watcher_id === active;
            const seen = relativeTime(hb.last_seen) ?? "never";
            return (
              <li
                key={hb.watcher_id}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden
                    title={stale ? "stale" : "live"}
                    className={
                      "inline-block h-2 w-2 shrink-0 rounded-full " +
                      (stale ? "bg-ink-faint" : "bg-green animate-pulse")
                    }
                  />
                  <span className="truncate font-mono text-ui text-ink">
                    {hb.watcher_id}
                  </span>
                  {isActive && <Pill tone="live">active</Pill>}
                  {stale && <Pill tone="attention">stale</Pill>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular-nums text-label text-ink-faint">
                    {seen}
                  </span>
                  {isActive ? (
                    <span className="font-mono text-meta uppercase tracking-btn text-ink-faint">
                      claiming
                    </span>
                  ) : (
                    <Btn
                      variant="secondary"
                      size="sm"
                      pending={switching === hb.watcher_id}
                      onClick={() => setActive(hb.watcher_id, stale)}
                    >
                      Make active
                    </Btn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirmStale && (
        <Modal
          label="Confirm switch to stale watcher"
          onClose={() => setConfirmStale(null)}
        >
          <ModalTitle>Switch to stale watcher</ModalTitle>
          <p className="mb-4 text-xs leading-relaxed text-ink-dim">
            <span className="text-ink">{confirmStale}</span> hasn&apos;t
            checked in recently — its watcher may not be running. Make it
            the active machine anyway?
          </p>
          <div className="flex items-center justify-end gap-2">
            <Btn variant="ghost" onClick={() => setConfirmStale(null)}>
              cancel
            </Btn>
            <Btn
              variant="approve"
              onClick={() => {
                const id = confirmStale;
                setConfirmStale(null);
                if (id) void doSetActive(id);
              }}
            >
              make active
            </Btn>
          </div>
        </Modal>
      )}
    </section>
  );
}

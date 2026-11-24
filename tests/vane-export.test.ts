import { describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { interpretRow, validateVaneBundle } from "@/app/lib/vane-export";
import { assessStaleness, sessionsBetween, currentSession } from "@/app/lib/vane-sessions";
import { makeBundle } from "./fixtures/vane-bundle";

vi.spyOn(console, "error").mockImplementation(() => {});

const NOW = new Date("2026-11-25T23:00:00Z"); // Wed 18:00 ET

function mutate(fn: (b: Record<string, any>) => void) {
  const b = makeBundle() as Record<string, any>;
  fn(b);
  return validateVaneBundle(b);
}

describe("validateVaneBundle", () => {
  it("accepts a conforming v1 bundle", () => {
    expect(validateVaneBundle(makeBundle()).ok).toBe(true);
  });
  it("rejects non-objects", () => {
    for (const v of [null, undefined, 3, "x", []]) expect(validateVaneBundle(v).ok).toBe(false);
  });
  it("rejects an unsupported schema_version outright", () => {
    for (const v of [2, 0, "1", undefined]) {
      const r = mutate((b) => (b.schema_version = v));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]).toMatch(/schema_version/);
    }
  });
  it("rejects wrong system", () => expect(mutate((b) => (b.system = "other")).ok).toBe(false));
  it("rejects a missing required key", () => {
    const r = mutate((b) => delete b.trades);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/trades/);
  });
  it("rejects an unexpected top-level key", () => expect(mutate((b) => (b.extra = 1)).ok).toBe(false));
  it("rejects non-finite / wrong-typed numbers", () => {
    expect(mutate((b) => (b.summary.equity = "251250")).ok).toBe(false);
    expect(mutate((b) => (b.summary.total_return = NaN)).ok).toBe(false);
    expect(mutate((b) => (b.cash = null)).ok).toBe(false);
  });
  it("rejects bad enums and dates", () => {
    expect(mutate((b) => (b.evidence_label = "proven")).ok).toBe(false);
    expect(mutate((b) => (b.summary.regime = "sideways")).ok).toBe(false);
    expect(mutate((b) => (b.as_of_session = "11/25/2026")).ok).toBe(false);
    expect(mutate((b) => (b.trades[0].side = "hold")).ok).toBe(false);
  });
  it("rejects an empty equity curve and a curve not starting at day0", () => {
    expect(mutate((b) => (b.equity_curve = [])).ok).toBe(false);
    expect(mutate((b) => (b.equity_curve[0].session = "2026-11-23")).ok).toBe(false);
  });
  it("rejects contradictory evidence labels", () => {
    expect(mutate((b) => (b.research.evidence_label = "backtested-oos-pass")).ok).toBe(false);
  });
  it("rejects more than 200 trades", () => {
    expect(mutate((b) => (b.trades = Array.from({ length: 201 }, () => b.trades[0]))).ok).toBe(false);
  });
  it("allows null filled_at / fill_price for unfilled orders", () => {
    expect(validateVaneBundle(makeBundle()).ok).toBe(true); // fixture trade[1] is unfilled
  });
});

describe("interpretRow (production path from row payload to result)", () => {
  it("ok for a good row", () => {
    const r = interpretRow(makeBundle(), NOW);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.staleness.stale).toBe(false);
  });
  it("explicit error for a v2 row, with details, never ok", () => {
    const b = makeBundle();
    b.schema_version = 2;
    const r = interpretRow(b, NOW);
    expect(r.status).toBe("error");
    if (r.status === "error") {
      expect(r.kind).toBe("validation");
      expect(r.details?.[0]).toMatch(/schema_version/);
    }
  });
  it("explicit error for garbage", () => expect(interpretRow("nope", NOW).status).toBe("error"));
});

describe("staleness", () => {
  it("counts trading sessions, skipping weekends and holidays", () => {
    expect(sessionsBetween("2026-11-24", "2026-11-25")).toBe(1);
    expect(sessionsBetween("2026-11-25", "2026-11-27")).toBe(1); // Thanksgiving 11-26 closed
    expect(sessionsBetween("2026-11-20", "2026-11-23")).toBe(1); // Fri -> Mon
    expect(sessionsBetween("2026-11-25", "2026-11-25")).toBe(0);
  });
  it("current session on a weekend is the prior Friday", () => {
    expect(currentSession("2026-11-28")).toBe("2026-11-27");
    expect(currentSession("2026-11-26")).toBe("2026-11-25");
  });
  it("2 sessions behind is fresh, 3 is stale", () => {
    // now = Fri 2026-12-04 ET
    const now = new Date("2026-12-04T18:00:00Z");
    expect(assessStaleness("2026-12-02", now)).toMatchObject({ sessionsBehind: 2, stale: false });
    expect(assessStaleness("2026-12-01", now)).toMatchObject({ sessionsBehind: 3, stale: true });
  });
  it("stale flows through interpretRow", () => {
    const r = interpretRow(makeBundle(), new Date("2026-12-10T18:00:00Z"));
    expect(r.status === "ok" && r.staleness.stale).toBe(true);
  });
});

describe("no sample data in the app", () => {
  it("app/, components/, lib/ never import test fixtures or ship a sample bundle", () => {
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d)) {
        if (e === "node_modules" || e === ".next") continue;
        const p = join(d, e);
        if (statSync(p).isDirectory()) walk(p);
        else if ([".ts", ".tsx", ".json"].includes(extname(p))) {
          const s = readFileSync(p, "utf8");
          if (/fixtures\/vane|vane-dev-fixture|site-export\.sample/.test(s)) hits.push(p);
        }
      }
    };
    for (const d of ["app", "components", "lib", "content"]) walk(d);
    expect(hits).toEqual([]);
  });
});

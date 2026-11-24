import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { interpretRow } from "@/app/lib/vane-export";
import { VaneView } from "@/components/vane/VaneView";
import { makeBundle } from "./fixtures/vane-bundle";

vi.spyOn(console, "error").mockImplementation(() => {});
const html = (r: Parameters<typeof VaneView>[0]["result"]) => renderToStaticMarkup(<VaneView result={r} />);

describe("VaneView", () => {
  it("renders the explicit no-data state for an empty result", () => {
    const h = html({ status: "empty" });
    expect(h).toContain('data-vane-state="empty"');
    expect(h).toContain("No data yet");
    expect(h).not.toContain("vane-tiles");
  });
  it("renders an error state for a schema mismatch, with no figures", () => {
    const b = makeBundle();
    b.schema_version = 3;
    const h = html(interpretRow(b, new Date("2026-03-13T18:00:00Z")));
    expect(h).toContain('data-vane-state="error"');
    expect(h).toContain("schema_version");
    expect(h).not.toContain("vane-tiles");
    expect(h).not.toContain("251,250");
  });
  it("renders every section from a valid fixture, fresh, with nulls as dashes", () => {
    const b = makeBundle();
    b.trades[0].floor_trade = true;
    b.positions[0].avg_entry = null;
    b.positions[0].entered_session = null;
    b.trades[0].filled_at = null;
    b.trades[0].fill_price = null;
    const h = html(interpretRow(b, new Date("2026-03-13T18:00:00Z")));
    expect(h).toContain('data-vane-state="live"');
    for (const s of ["Equity curve vs SPY", "Positions by tranche", "Tranche 0", "Tranche 1", "Tranche 2",
      "Weekly activity requirement", "Trade log", "FLOOR TRADE", "The strategy, in plain language",
      "Research verdict", "EVIDENCE: unproven", "6<span> / 3</span>", "9<span> / 3</span>", "<td>—</td>"]) {
      expect(h).toContain(s);
    }
    expect(h).not.toContain("Stale data");
    expect(h).not.toContain("NaN");
    expect(h).not.toContain("null");
  });
  it("renders untracked positions (tranche -1) under an Untracked group, after the tranches", () => {
    const b = makeBundle();
    b.positions[0].tranche = -1;
    const h = html(interpretRow(b, new Date("2026-03-13T18:00:00Z")));
    expect(h).toContain("Untracked");
    expect(h.indexOf("Untracked")).toBeGreaterThan(h.indexOf("Tranche 2"));
    expect(h).not.toContain("Tranche -1");
    expect(h).toContain("Held at the broker but not opened by VANE — flagged for review.");
  });
  it("shows the stale warning when the export is >2 sessions old", () => {
    const h = html(interpretRow(makeBundle(), new Date("2026-03-20T18:00:00Z")));
    expect(h).toContain('data-vane-state="live-stale"');
    expect(h).toContain("Stale data");
  });

  it("never renders a retired name, even when the rejected value is echoed in error details", () => {
    const name = ["mer", "idian"].join("");
    const b = makeBundle();
    b.system = `${name}-x`; // rejected value would be echoed by the validator
    b[`${name}_key`] = 1; // and as an unexpected key
    const out = interpretRow(b, new Date("2026-03-13T18:00:00Z"));
    expect(out.status).toBe("error");
    const h = html(out);
    expect(h).toContain('data-vane-state="error"');
    expect(h.toLowerCase()).not.toContain(name);
    expect(h).toContain("[retired name]");
  });
});

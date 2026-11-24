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
    const h = html(interpretRow(b, new Date("2026-11-25T23:00:00Z")));
    expect(h).toContain('data-vane-state="error"');
    expect(h).toContain("schema_version");
    expect(h).not.toContain("vane-tiles");
    expect(h).not.toContain("251,250");
  });
  it("renders every section from a valid fixture, fresh", () => {
    const h = html(interpretRow(makeBundle(), new Date("2026-11-25T23:00:00Z")));
    expect(h).toContain('data-vane-state="live"');
    for (const s of ["Equity curve vs SPY", "Positions by tranche", "Tranche 0", "Tranche 1", "Weekly activity requirement",
      "Trade log", "FLOOR TRADE", "The strategy, in plain language", "Research verdict", "EVIDENCE: unproven", "4</span>"]) {
      expect(h).toContain(s);
    }
    expect(h).toContain("4<span> / 3</span>");
    expect(h).not.toContain("Stale data");
  });
  it("shows the stale warning when the export is >2 sessions old", () => {
    const h = html(interpretRow(makeBundle(), new Date("2026-12-10T18:00:00Z")));
    expect(h).toContain('data-vane-state="live-stale"');
    expect(h).toContain("Stale data");
  });
});

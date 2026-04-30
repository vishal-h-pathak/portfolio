/**
 * // legend — explicit mapping of the two-tone color system.
 * Per README: "This block is doing real semantic work — it's the legend the
 * rest of the page is using. Keep it."
 */
export function Legend() {
  return (
    <div className="rail-block" style={{ marginBottom: 0 }}>
      <h3>// legend</h3>
      <div className="rail-row">
        <span>
          <span className="accent-g">●</span> green
        </span>
        <span className="v">research / live</span>
      </div>
      <div className="rail-row">
        <span>
          <span className="accent-a">●</span> amber
        </span>
        <span className="v">bench / build</span>
      </div>
    </div>
  );
}

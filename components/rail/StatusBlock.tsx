/**
 * // status — left-column rail block.
 * Label (dim) / value (ink) rows — green for live, amber for shipped.
 * The pipeline row appears only when jobpipe telemetry is available.
 */
export function StatusBlock({
  applicationsOut,
}: {
  applicationsOut?: number;
}) {
  return (
    <div className="rail-block">
      <h3>
        // status <span className="small">live</span>
      </h3>
      <Row label="day-job" value="GTRI · research" />
      <Row label="bench live" value="2 / 4" valueClass="live" />
      <Row label="shipped" value="1 / 4" valueClass="amber" />
      <Row label="WIP" value="1 / 4" />
      {typeof applicationsOut === "number" && (
        <Row
          label="pipeline"
          value={`${applicationsOut} out`}
          valueClass="live"
        />
      )}
      <Row label="tz" value="EDT (UTC-4)" />
      <Row label="base" value="Atlanta, GA" />
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: "live" | "amber";
}) {
  return (
    <div className="rail-row">
      <span>{label}</span>
      <span className={`v${valueClass ? ` ${valueClass}` : ""}`}>{value}</span>
    </div>
  );
}

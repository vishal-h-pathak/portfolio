export const usd = (n: number, digits = 0) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const pct = (frac: number, digits = 2) => {
  const v = frac * 100;
  const s = Math.abs(v).toFixed(digits);
  return `${v > 0 ? "+" : v < 0 ? "-" : ""}${s}%`;
};

/** Class for sign coloring: green up, red down, neutral at zero. */
export const tone = (n: number) => (n > 0 ? "vane-pos" : n < 0 ? "vane-neg" : "");

export const fmtTs = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(d) + " ET"
  );
};

export const num = (n: number, digits = 2) => n.toLocaleString("en-US", { maximumFractionDigits: digits });

import "../_internal.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="internal-surface">{children}</div>;
}

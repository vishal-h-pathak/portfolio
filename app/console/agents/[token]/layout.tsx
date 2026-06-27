import "../../../_internal.css";

export default function AgentTokenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="internal-surface">{children}</div>;
}

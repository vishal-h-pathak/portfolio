export default function Loading() {
  return (
    <div className="loading-screen" role="status" aria-label="Loading">
      <span className="pulse-dot" aria-hidden="true" />
      <span>RETRIEVING ENTRY&hellip;</span>
    </div>
  );
}

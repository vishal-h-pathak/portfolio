import Link from "next/link";

export default function NotFound() {
  return (
    <main className="nf">
      <div className="nf-inner">
        <div className="eyebrow dim">§ 404 &nbsp;·&nbsp; MISSING ENTRY</div>
        <h1 className="nf-title">This page isn&rsquo;t in the notebook.</h1>
        <p className="nf-body">
          Either the entry was never written, or it was torn out during a
          rewrite. The index is intact —{" "}
          <Link className="nf-link" href="/">
            return to ENTRY 042
          </Link>
          .
        </p>
        <div className="nf-meta">FILED UNDER · lost pages · no data lost</div>
      </div>
    </main>
  );
}

/**
 * Always-visible console entry for the public footer.
 *
 * A discreet, understated door to the gated tools at /console. Middleware
 * redirects an unauthenticated /console hit to /console/login, so a
 * logged-out click lands on the login wall and a signed-in click goes
 * straight in — the link's visibility is no longer auth-gated (the auth
 * gate itself is unchanged). Reuses the footer's existing
 * `.footer-appendix` treatment so it reads as discreet.
 */
export function ConsoleLink() {
  return (
    <span className="footer-appendix">
      <a href="/console">console ↗</a>
    </span>
  );
}

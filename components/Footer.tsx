import { ConsoleLink } from "./ConsoleLink";

export function Footer() {
  return (
    <footer>
      <span>VISHAL PATHAK · ATLANTA, GA · 2026</span>
      {/* Auth-aware console entry — renders only for the signed-in owner
          (see ConsoleLink). Visitors see nothing here. The old public
          APPENDIX links to /meridian + /dashboard were removed; that
          machinery now lives behind the gated /console. */}
      <ConsoleLink />
      <span>END OF ENTRY 042</span>
    </footer>
  );
}

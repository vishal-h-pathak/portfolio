import { btnClass } from "../components/btnClass";

/**
 * /console/login — the console gate. Same chrome as the rest of the
 * console (dark, mono, hairlines); no nav since nothing behind the
 * gate should leak (ConsoleNav hides itself on this route). Server
 * component — the form posts to the login route and middleware handles
 * the redirect. Uses btnClass directly (not the "use client" Btn
 * component) so this stays a server component.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="internal-surface flex min-h-screen items-center justify-center px-4">
      <form
        method="POST"
        action="/api/console/login"
        className="flex w-full max-w-xs flex-col gap-3 border border-rule bg-bg-raised p-6"
      >
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-kicker text-ink-faint">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-green" />
          Console — restricted
        </div>
        <h1 className="font-serif text-xl tracking-tight text-ink">Console</h1>
        <label htmlFor="dashboard-password" className="sr-only">
          Password
        </label>
        <input
          id="dashboard-password"
          type="password"
          name="password"
          placeholder="password"
          autoFocus
          className="border border-rule bg-bg px-3 py-2 font-mono text-xs text-ink placeholder:text-ink-faint focus:border-amber focus:outline-none"
        />
        <button type="submit" className={btnClass("primary", "md")}>
          sign in
        </button>
        {error ? (
          <p className="m-0 text-xs text-red">Incorrect password.</p>
        ) : null}
      </form>
    </main>
  );
}

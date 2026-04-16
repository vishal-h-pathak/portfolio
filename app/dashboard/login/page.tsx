export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams?.error;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        method="POST"
        action="/api/dashboard-login"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 280 }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Dashboard</h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: 4 }}
        />
        <button
          type="submit"
          style={{
            padding: "0.5rem",
            background: "#111",
            color: "#fff",
            border: 0,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Sign in
        </button>
        {error ? <p style={{ color: "#b00", margin: 0, fontSize: 14 }}>Incorrect password.</p> : null}
      </form>
    </main>
  );
}

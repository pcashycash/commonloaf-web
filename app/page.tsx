export default function Home() {
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "64px 20px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 0.4 }}>
          The Common Loaf
        </div>

        <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: 0 }}>
          Shared meals. Stronger relationships.
        </h1>

        <p style={{ fontSize: 18, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>
          The Common Loaf helps people discover and reserve seats at
          home-hosted dinners — like OpenTable, but for dinner parties.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
          <a
            href="mailto:hello@thecommonloaf.com"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.15)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Contact
          </a>

          <a
            href="#"
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.06)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Join the waitlist (coming soon)
          </a>
        </div>

        <div style={{ marginTop: 28, fontSize: 13, opacity: 0.65 }}>
          Built in Chicago. Powered by community.
        </div>
      </div>
    </main>
  );
}

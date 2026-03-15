"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            backgroundColor: "#fafafa",
          }}
        >
          <div style={{ maxWidth: "400px", textAlign: "center" }}>
            <p
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "12px",
              }}
            >
              Something went wrong
            </p>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#111",
                marginBottom: "8px",
              }}
            >
              An unexpected error occurred
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: "#666",
                marginBottom: "24px",
                lineHeight: 1.5,
              }}
            >
              We&apos;re sorry about that. Please try refreshing the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: 500,
                backgroundColor: "#111",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            {error.digest && (
              <p
                style={{
                  fontSize: "12px",
                  color: "#aaa",
                  marginTop: "16px",
                  fontFamily: "monospace",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("TourFlow critical application error", error);
  }, [error]);

  const diagnostic = error.digest
    ? `Diagnostic ID: ${error.digest}`
    : error.message || "No diagnostic details were provided.";

  return (
    <html lang="en">
      <head><title>TourFlow Recovery</title></head>
      <body>
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fafc; color: #111827; font-family: ui-sans-serif, system-ui, sans-serif; }
          .tf-shell { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
          .tf-card { width: min(100%, 560px); padding: 32px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; box-shadow: 0 24px 60px rgba(15, 23, 42, .15); }
          .tf-mark { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: rgba(27, 113, 103, .12); color: #1B7167; font-size: 24px; font-weight: 900; }
          .tf-kicker { margin: 20px 0 0; color: #1B7167; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
          h1 { margin: 8px 0 0; font-size: 26px; line-height: 1.2; }
          .tf-copy { margin: 12px 0 0; color: #64748b; font-size: 14px; line-height: 1.6; }
          .tf-diagnostic { margin-top: 20px; padding: 12px 14px; overflow-wrap: anywhere; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; color: #64748b; font: 12px ui-monospace, SFMono-Regular, Consolas, monospace; }
          .tf-actions { display: flex; gap: 12px; margin-top: 24px; }
          .tf-actions button, .tf-actions a { flex: 1; border-radius: 12px; padding: 11px 16px; text-align: center; font: 700 14px ui-sans-serif, system-ui, sans-serif; cursor: pointer; text-decoration: none; }
          .tf-primary { border: 1px solid #1B7167; background: #1B7167; color: #fff; }
          .tf-secondary { border: 1px solid #d1d5db; background: transparent; color: inherit; }
          @media (prefers-color-scheme: dark) {
            body { background: #030712; color: #fff; }
            .tf-card { border-color: rgba(255,255,255,.1); background: #0B0F19; box-shadow: 0 24px 60px rgba(0,0,0,.55); }
            .tf-copy, .tf-diagnostic { color: #9ca3af; }
            .tf-diagnostic { border-color: rgba(255,255,255,.1); background: #030712; }
            .tf-secondary { border-color: rgba(255,255,255,.15); }
          }
          @media (max-width: 540px) { .tf-card { padding: 24px; } .tf-actions { flex-direction: column; } }
        `}</style>
        <main className="tf-shell">
          <section className="tf-card">
            <div className="tf-mark" aria-hidden="true">!</div>
            <p className="tf-kicker">Application recovery</p>
            <h1>TourFlow could not finish loading.</h1>
            <p className="tf-copy">A critical interface error occurred. Your stored business records were not changed.</p>
            <div className="tf-diagnostic">{diagnostic}</div>
            <div className="tf-actions">
              <button type="button" className="tf-primary" onClick={reset}>Try Again</button>
              <a className="tf-secondary" href="/dashboard">Return to Dashboard</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-bg-surface border border-border flex items-center justify-center">
          <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
          </svg>
        </div>
        <h1 className="text-[24px] font-bold text-text-primary tracking-tight mb-2">
          You&apos;re offline
        </h1>
        <p className="text-[15px] text-text-secondary mb-6">
          Check your internet connection and try again. Pages you&apos;ve visited before may still be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center h-10 px-6 rounded-lg bg-primary text-white text-[14px] font-medium hover:bg-primary/90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

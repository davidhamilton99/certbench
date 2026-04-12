"use client";

import { useState } from "react";
import Link from "next/link";

export function MobileMenuButton({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 -mr-2 text-text-secondary hover:text-text-primary"
        aria-label={open ? "Close menu" : "Open menu"}
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 bg-bg-surface border-b border-border shadow-sm z-50">
          <nav className="max-w-5xl mx-auto px-6 py-3 flex flex-col gap-1">
            <Link
              href="/pricing"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-[15px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-page rounded-md transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/help"
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-[15px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-page rounded-md transition-colors"
            >
              Help
            </Link>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="px-3 py-2.5 text-[15px] font-medium text-primary hover:bg-info-bg rounded-md transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-[15px] font-medium text-text-secondary hover:text-text-primary hover:bg-bg-page rounded-md transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="mt-1 px-3 py-2.5 text-[15px] font-medium text-center text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}

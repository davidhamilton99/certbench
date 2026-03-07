"use client";

import { useState, ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

interface Enrollment {
  certification_id: string;
  certifications: {
    slug: string;
    name: string;
    exam_code: string;
  };
}

interface WorkspaceShellProps {
  children: ReactNode;
  displayName: string;
  enrollments: Enrollment[];
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Study Materials",
    href: "/study-materials",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    label: "Community",
    href: "/community",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
];

export function WorkspaceShell({
  children,
  displayName,
  enrollments,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeCertSlug =
    searchParams.get("cert") || enrollments[0]?.certifications.slug || "";

  return (
    <div className="min-h-screen bg-bg-page">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-bg-surface border-b border-border px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-text-secondary hover:text-text-primary"
          aria-label="Open sidebar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <span className="text-[15px] font-semibold text-text-primary">
          CertBench
        </span>
        <div className="w-9" />
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64
          bg-bg-surface border-r border-border
          flex flex-col
          transition-transform duration-200
          lg:translate-x-0 lg:z-20
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="h-14 px-5 flex items-center border-b border-border">
          <Link
            href="/dashboard"
            className="text-[18px] font-bold text-text-primary tracking-tight"
          >
            CertBench
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-1 text-text-muted hover:text-text-primary"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cert Tabs */}
        {enrollments.length > 0 && (
          <div className="px-3 pt-4 pb-2">
            <p className="px-2 text-[12px] font-medium text-text-muted uppercase tracking-wider mb-2">
              Certifications
            </p>
            <div className="flex flex-col gap-1">
              {enrollments.map((enrollment) => {
                const cert = enrollment.certifications;
                const isActive = cert.slug === activeCertSlug;
                return (
                  <Link
                    key={enrollment.certification_id}
                    href={`/dashboard?cert=${cert.slug}`}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      px-3 py-2 rounded-md text-[13px] font-medium
                      transition-colors duration-150
                      ${
                        isActive
                          ? "bg-blue-50 text-primary"
                          : "text-text-secondary hover:bg-bg-page hover:text-text-primary"
                      }
                    `}
                  >
                    <span className="block truncate">{cert.name}</span>
                    <span className="block text-[11px] mt-0.5 opacity-70">
                      {cert.exam_code}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 pt-2">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={
                    item.href === "/dashboard" && activeCertSlug
                      ? `${item.href}?cert=${activeCertSlug}`
                      : item.href
                  }
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-md
                    text-[14px] font-medium
                    transition-colors duration-150
                    ${
                      isActive
                        ? "bg-bg-page text-text-primary"
                        : "text-text-secondary hover:bg-bg-page hover:text-text-primary"
                    }
                  `}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User footer */}
        <div className="border-t border-border px-3 py-3">
          <Link
            href="/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-[14px] text-text-secondary hover:bg-bg-page hover:text-text-primary transition-colors duration-150"
          >
            <div className="w-7 h-7 rounded-full bg-border flex items-center justify-center text-[12px] font-semibold text-text-secondary">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{displayName}</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8 lg:px-12 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}

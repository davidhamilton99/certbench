export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-block">
            <h1 className="text-[24px] font-bold text-text-primary tracking-tight">
              CertBench
            </h1>
          </a>
        </div>
        <div className="bg-bg-surface border border-border rounded-lg p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

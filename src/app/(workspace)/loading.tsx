export default function WorkspaceLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center">
        <div className="inline-block h-6 w-6 border-2 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-[14px] text-text-muted mt-3">Loading…</p>
      </div>
    </div>
  );
}

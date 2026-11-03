export function DemoHeader({ tag, path, title, children }: { tag: string; path: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center gap-4">
        <span className="rounded-full bg-accent px-4 py-1 text-sm font-bold uppercase tracking-[.16em] text-ink">{tag}</span>
        <span className="font-mono text-muted">{path}</span>
      </div>
      <h1 className="font-display text-5xl font-extrabold leading-tight">{title}</h1>
      {children && <div className="mt-3 max-w-4xl text-lg text-muted">{children}</div>}
    </div>
  );
}

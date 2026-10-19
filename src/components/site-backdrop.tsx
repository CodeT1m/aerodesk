export function SiteBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      <div className="site-grid absolute inset-0 opacity-40" />
      <div className="absolute -right-24 -top-32 size-[32rem] rounded-full bg-cyan-400/10 blur-3xl" />
    </div>
  );
}

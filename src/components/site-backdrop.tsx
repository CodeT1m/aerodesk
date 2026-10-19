export function SiteBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-background" />
      <div className="aurora aurora-one" />
      <div className="aurora aurora-two" />
      <div className="aurora aurora-three" />
      <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-sky-400/50 to-transparent" />
    </div>
  );
}

export function PageIntro({
  kicker,
  title,
  description,
}: {
  kicker?: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="grid gap-3 border-b border-border/80 pb-6 duration-700 animate-in fade-in slide-in-from-left-4">
      {kicker ? (
        <p className="eyebrow flex items-center gap-2 text-primary">
          <span className="size-1.5 rounded-full bg-current shadow-[0_0_10px_currentColor]" aria-hidden="true" />{kicker}
        </p>
      ) : null}
      <h1 className="display-type max-w-4xl text-5xl font-semibold text-balance sm:text-6xl md:text-7xl">
        {title}
      </h1>
      {description ? <p className="max-w-2xl text-base leading-7 text-muted-foreground text-pretty">{description}</p> : null}
    </section>
  );
}

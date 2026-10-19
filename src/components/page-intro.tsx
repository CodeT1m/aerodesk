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
    <section className="grid gap-3 duration-700 animate-in fade-in slide-in-from-left-4">
      {kicker ? (
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-600 dark:text-sky-300">
          {kicker}
        </p>
      ) : null}
      <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-5xl">
        {title}
      </h1>
      {description ? <p className="max-w-2xl text-muted-foreground text-pretty">{description}</p> : null}
    </section>
  );
}

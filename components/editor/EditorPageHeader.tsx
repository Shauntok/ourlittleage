type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  meta?: string;
  warning?: string;
};

export default function EditorPageHeader({
  eyebrow,
  title,
  subtitle,
  meta,
  warning,
}: Props) {
  return (
    <header className="mb-6 rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl md:mb-10 md:rounded-[2.4rem] md:p-8">
      <p className="text-xs tracking-[0.4em] text-white/25">
        {eyebrow}
      </p>

      <h1 className="mt-5 text-4xl font-light tracking-tight md:mt-6 md:text-6xl">
        {title}
      </h1>

      {meta && (
        <p className="mt-5 text-sm text-white/35">
          {meta}
        </p>
      )}

      {subtitle && (
        <p className="mt-8 max-w-md text-sm leading-8 text-white/35">
          {subtitle}
        </p>
      )}

      {warning && (
        <div className="mt-6 max-w-xl rounded-[1.5rem] border border-yellow-500/15 bg-yellow-500/[0.06] p-5 text-sm leading-7 text-yellow-100/70">
          {warning}
        </div>
      )}
    </header>
  );
}
export function SectionHeader({
  title,
  subtitle,
  number,
}: {
  title: string;
  subtitle?: string;
  number: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="font-mono text-xs text-muted-foreground/50 shrink-0">
        {number}
      </span>
      <div className="h-px flex-1 bg-border" />
      <div className="text-right">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

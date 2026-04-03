interface Props {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export function ChartCard({ title, subtitle, children, className }: Props) {
  return (
    <div
      className={`card-glow rounded-lg border border-border bg-card p-4 sm:p-5 ${className ?? ""}`}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

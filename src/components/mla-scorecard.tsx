interface ScorecardProps {
  participation: { attended: number; total: number };
  loyalty: { withParty: number; total: number };
  activity: {
    debates: number;
    questions: number;
    votes: number;
    avgDebates: number;
    avgQuestions: number;
    avgVotes: number;
    rank: number;
    totalMlas: number;
  };
  sentiment: { avg: number; count: number } | null;
  partyColor: string;
}

function RingGauge({
  value,
  max,
  color,
  size = 64,
  strokeWidth = 5,
  children,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="oklch(1 0 0 / 6%)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function CompareBar({
  value,
  avg,
  label,
  color,
}: {
  value: number;
  avg: number;
  label: string;
  color: string;
}) {
  const max = Math.max(value, avg) * 1.2 || 1;
  const valuePct = (value / max) * 100;
  const avgPct = (avg / max) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-xs tabular-nums text-foreground">
          {value}
          <span className="text-muted-foreground"> / {avg} avg</span>
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-[oklch(1_0_0/4%)]">
        {/* Average marker */}
        <div
          className="absolute top-[-1px] h-[calc(100%+2px)] w-px bg-muted-foreground/50"
          style={{ left: `${avgPct}%` }}
        />
        {/* Value bar */}
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${valuePct}%`,
            backgroundColor: color,
            opacity: value >= avg ? 0.8 : 0.5,
          }}
        />
      </div>
    </div>
  );
}

export function MlaScorecard({
  participation,
  loyalty,
  activity,
  sentiment,
  partyColor,
}: ScorecardProps) {
  const participationPct =
    participation.total > 0
      ? Math.round((participation.attended / participation.total) * 100)
      : 0;
  const loyaltyPct =
    loyalty.total > 0
      ? Math.round((loyalty.withParty / loyalty.total) * 100)
      : 0;

  const rankPct = activity.totalMlas > 0
    ? Math.round(((activity.totalMlas - activity.rank + 1) / activity.totalMlas) * 100)
    : 0;

  const sentimentLabel =
    sentiment && sentiment.count > 0
      ? sentiment.avg > 0.15
        ? "Positive"
        : sentiment.avg < -0.15
          ? "Negative"
          : "Neutral"
      : "No data";

  const sentimentColor =
    sentiment && sentiment.count > 0
      ? sentiment.avg > 0.15
        ? "#34d399"
        : sentiment.avg < -0.15
          ? "#f87171"
          : "oklch(0.62 0.01 80)"
      : "oklch(0.4 0.01 80)";

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Top rule — gold accent line */}
      <div
        className="h-0.5"
        style={{ background: `linear-gradient(90deg, ${partyColor}, transparent)` }}
      />

      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
            Performance Scorecard
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          {/* Participation */}
          <div className="flex flex-col items-center text-center">
            <RingGauge
              value={participation.attended}
              max={participation.total}
              color="oklch(0.82 0.12 75)"
            >
              <span className="font-mono text-base font-bold text-foreground leading-none">
                {participationPct}%
              </span>
            </RingGauge>
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Participation
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {participation.attended}/{participation.total} votes
            </span>
          </div>

          {/* Party Loyalty */}
          <div className="flex flex-col items-center text-center">
            <RingGauge
              value={loyalty.withParty}
              max={loyalty.total}
              color={partyColor}
            >
              <span className="font-mono text-base font-bold text-foreground leading-none">
                {loyaltyPct}%
              </span>
            </RingGauge>
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Party Loyalty
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {loyalty.withParty}/{loyalty.total} aligned
            </span>
          </div>

          {/* Activity Rank */}
          <div className="flex flex-col items-center text-center">
            <RingGauge
              value={activity.totalMlas - activity.rank + 1}
              max={activity.totalMlas}
              color={rankPct >= 75 ? "#34d399" : rankPct >= 40 ? "oklch(0.82 0.12 75)" : "oklch(0.5 0.01 80)"}
            >
              <span className="font-mono text-sm font-bold text-foreground leading-none">
                #{activity.rank}
              </span>
            </RingGauge>
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Activity Rank
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              Top {100 - rankPct}% of MLAs
            </span>
          </div>

          {/* News Sentiment */}
          <div className="flex flex-col items-center text-center">
            <RingGauge
              value={sentiment && sentiment.count > 0 ? Math.abs(sentiment.avg) : 0}
              max={1}
              color={sentimentColor}
            >
              <span
                className="font-mono text-xs font-bold leading-none"
                style={{ color: sentimentColor }}
              >
                {sentiment && sentiment.count > 0
                  ? (sentiment.avg > 0 ? "+" : "") + sentiment.avg.toFixed(2)
                  : "—"}
              </span>
            </RingGauge>
            <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Media Tone
            </span>
            <span className="text-[10px] text-muted-foreground/60">
              {sentimentLabel} · {sentiment?.count ?? 0} quotes
            </span>
          </div>
        </div>

        {/* Activity comparison bars */}
        <div className="mt-5 pt-4 border-t border-border space-y-3">
          <CompareBar
            value={activity.debates}
            avg={activity.avgDebates}
            label="Debates"
            color="oklch(0.82 0.12 75)"
          />
          <CompareBar
            value={activity.questions}
            avg={activity.avgQuestions}
            label="Questions"
            color="oklch(0.82 0.12 75)"
          />
          <CompareBar
            value={activity.votes}
            avg={activity.avgVotes}
            label="Votes"
            color="oklch(0.82 0.12 75)"
          />
        </div>
      </div>
    </div>
  );
}

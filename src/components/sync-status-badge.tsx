import { Badge } from "@/components/ui/badge";
import { createServiceClient } from "@/lib/supabase/server";

export async function SyncStatusBadge() {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("sync_log")
    .select("source, status, completed_at")
    .order("completed_at", { ascending: false })
    .limit(1);

  const latest = data?.[0];
  if (!latest) return null;

  const timeAgo = latest.completed_at
    ? formatTimeAgo(new Date(latest.completed_at))
    : "never";

  return (
    <Badge
      variant="secondary"
      className={
        latest.status === "success"
          ? "bg-green-900/30 text-green-400"
          : "bg-red-900/30 text-red-400"
      }
    >
      Last sync: {timeAgo}
    </Badge>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NewsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">News Feed</h1>
      <p className="mt-2 text-muted-foreground">
        NI politics news with MLA quote extraction and sentiment analysis.
      </p>
      <div className="mt-8 rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium mb-2">Coming Soon</p>
        <p>
          This page will aggregate NI politics news from BBC NI, Belfast
          Telegraph, Irish News, and Newsletter. Articles will be tagged to
          specific MLAs based on extracted quotes, with sentiment scoring via
          Claude Haiku.
        </p>
      </div>
    </div>
  );
}

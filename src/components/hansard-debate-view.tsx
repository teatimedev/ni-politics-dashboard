import type { HansardContribution, Member } from "@/lib/types";
import { HansardContributionCard } from "./hansard-contribution-card";

interface HansardDebateViewProps {
  contributions: HansardContribution[];
  membersMap: Map<string, Pick<Member, "person_id" | "name" | "party" | "photo_url">>;
}

export function HansardDebateView({
  contributions,
  membersMap,
}: HansardDebateViewProps) {
  // Group contributions by debate_title to show section headers
  const sections: {
    title: string | null;
    items: HansardContribution[];
  }[] = [];

  let currentTitle: string | null = null;
  let currentItems: HansardContribution[] = [];

  for (const c of contributions) {
    if (c.debate_title !== currentTitle) {
      if (currentItems.length > 0) {
        sections.push({ title: currentTitle, items: currentItems });
      }
      currentTitle = c.debate_title;
      currentItems = [c];
    } else {
      currentItems.push(c);
    }
  }
  if (currentItems.length > 0) {
    sections.push({ title: currentTitle, items: currentItems });
  }

  if (sections.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No Hansard contributions found.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map((section, si) => (
        <div key={si}>
          {section.title && (
            <h3 className="mb-4 text-lg font-semibold text-foreground/80 border-b border-border pb-2">
              {section.title}
            </h3>
          )}
          <div className="space-y-3">
            {section.items.map((contribution) => (
              <HansardContributionCard
                key={contribution.id}
                contribution={contribution}
                member={membersMap.get(contribution.person_id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

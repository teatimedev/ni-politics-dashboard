import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { Member } from "@/lib/types";
import {
  getPartyColourClass,
  getPartyShortName,
} from "@/lib/party-colours";

interface MlaCardProps {
  member: Member;
}

export function MlaCard({ member }: MlaCardProps) {
  return (
    <Link href={`/mla/${member.person_id}`}>
      <Card className="flex items-center gap-4 border-border bg-card p-4 transition-colors hover:bg-muted">
        {member.photo_url ? (
          <img
            src={member.photo_url}
            alt={member.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
            {member.first_name?.[0]}
            {member.last_name?.[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{member.name}</p>
          <p className="text-sm text-muted-foreground truncate">
            {member.constituency}
          </p>
        </div>
        <Badge
          variant="secondary"
          className={`${getPartyColourClass(member.party)} text-white text-xs`}
        >
          {getPartyShortName(member.party)}
        </Badge>
      </Card>
    </Link>
  );
}

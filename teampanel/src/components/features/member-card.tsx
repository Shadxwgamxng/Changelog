import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AIRSOFT_ROLE_LABELS } from "@/lib/labels";
import { fmtDate } from "@/lib/dates";
import type { MemberView } from "@/server/queries/members";
import { RoleBadge } from "./badges";

export function MemberCard({ member }: { member: MemberView }) {
  const display = member.callsign || member.firstName;
  return (
    <Link href={`/team/${member.id}`} className="group block focus-visible:rounded-lg">
      <Card tactical className="h-full p-4 transition-colors group-hover:border-accent-600/60">
        <div className="flex items-center gap-4">
          <Avatar src={member.avatarUrl} name={display} size="lg" />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold uppercase tracking-wide group-hover:text-accent-300">{display}</h3>
            <p className="truncate text-sm text-muted">
              {member.firstName} {member.lastName}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RoleBadge role={member.role} />
          <Badge tone="accent">{AIRSOFT_ROLE_LABELS[member.airsoftRole]}</Badge>
          {!member.active && <Badge tone="danger">Inaktiv</Badge>}
        </div>
        <p className="mt-3 text-xs text-subtle">Mitglied seit {fmtDate(member.joinedAt).slice(6)}</p>
      </Card>
    </Link>
  );
}

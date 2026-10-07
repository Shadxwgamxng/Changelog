"use server";
import { redirect } from "next/navigation";
import { action, checked, str } from "@/server/action";
import * as M from "@/server/services/messages";
import { badRequest } from "@/server/errors";

export const sendMessageAction = action(async (ctx, f) => {
  const kind = str(f, "kind");
  let audience: unknown;
  if (kind === "USERS") audience = { kind, userIds: f.getAll("userIds[]").map(String) };
  else if (kind === "UNIT") audience = { kind, unitId: str(f, "unitId"), includeSubunits: checked(f, "includeSubunits") };
  else if (kind === "GROUP") audience = { kind, unitId: str(f, "unitId"), groupName: str(f, "groupName") };
  else if (kind === "SHIFT") audience = { kind, shiftId: str(f, "shiftId") };
  else if (kind === "LEADERS") audience = { kind, unitId: str(f, "unitId") };
  else throw badRequest("Bitte einen Empfängerkreis wählen.");
  await M.sendMessage(ctx, { subject: str(f, "subject"), body: str(f, "body"), audience });
  redirect("/messages?tab=gesendet");
});
export const announceAction = action(async (ctx, f) => { await M.createAnnouncement(ctx, { unitId: str(f, "unitId"), title: str(f, "title"), body: str(f, "body"), important: checked(f, "important"), pinned: checked(f, "pinned"), expiresAt: str(f, "expiresAt") || null }); return "Bekanntmachung veröffentlicht."; });
export const deleteAnnouncementAction = action(async (ctx, f) => { await M.deleteAnnouncement(ctx, str(f, "id")); return "Gelöscht."; });

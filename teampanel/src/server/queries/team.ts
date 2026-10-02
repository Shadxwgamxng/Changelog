import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";

export const getTeamSettings = cache(async () => {
  return db.teamSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
});

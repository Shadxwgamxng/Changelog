import { prisma } from "@/lib/prisma";
import { cache } from "react";

export const getSiteSettings = cache(async () => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  return prisma.siteSettings.create({ data: { id: 1 } });
});

import { prisma } from "@/lib/prisma";
import { MediaLibrary } from "@/components/admin/MediaLibrary";

export const metadata = { title: "Medienbibliothek" };

export default async function AdminMediaPage() {
  const media = await prisma.media.findMany({
    orderBy: { createdAt: "desc" },
    include: { uploader: { select: { name: true } } },
  });

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Medienbibliothek</h1>
      <MediaLibrary media={media} />
    </div>
  );
}

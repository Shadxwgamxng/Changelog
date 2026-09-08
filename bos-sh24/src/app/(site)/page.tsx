import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Flame, TrendingUp, ArrowRight, Mail } from "lucide-react";
import {
  getFeaturedPost,
  getLatestPosts,
  getMostReadPosts,
  getUpcomingEvents,
  getCategories,
} from "@/lib/queries";
import { PostCard } from "@/components/site/PostCard";
import { EventCard } from "@/components/site/EventCard";
import { formatDateTime } from "@/lib/utils";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getSiteSettings } from "@/lib/settings";

export const revalidate = 30;

export default async function HomePage() {
  const [featured, latest, mostRead, events, categories, settings] = await Promise.all([
    getFeaturedPost(),
    getLatestPosts(9),
    getMostReadPosts(5),
    getUpcomingEvents(4),
    getCategories(),
    getSiteSettings(),
  ]);

  const restLatest = latest.filter((p) => p.slug !== featured?.slug);

  return (
    <div>
      {/* HERO */}
      {featured && (
        <section className="border-b border-ink-200 bg-gradient-to-b from-ink-50 to-white dark:border-ink-800 dark:from-ink-900 dark:to-ink-950">
          <div className="container-page grid gap-8 py-10 lg:grid-cols-5 lg:py-14">
            <Link
              href={`/beitraege/${featured.slug}`}
              className="group relative col-span-3 block aspect-[16/10] overflow-hidden rounded-2xl bg-ink-200 dark:bg-ink-800 lg:aspect-auto"
            >
              {featured.coverImageUrl && (
                <Image
                  src={featured.coverImageUrl}
                  alt={featured.coverImageAlt ?? featured.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                {featured.category && (
                  <Badge color="accent" className="mb-3">{featured.category.name}</Badge>
                )}
                <h1 className="font-display text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
                  {featured.title}
                </h1>
                <p className="mt-2 hidden max-w-2xl text-sm text-white/80 sm:block">{featured.excerpt}</p>
              </div>
            </Link>

            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-600">
                <Flame className="h-4 w-4" /> Im Fokus
              </div>
              {restLatest.slice(0, 3).map((post) => (
                <Link
                  key={post.slug}
                  href={`/beitraege/${post.slug}`}
                  className="flex gap-3 rounded-xl border border-ink-200 bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft dark:border-ink-800 dark:bg-ink-900"
                >
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                    {post.coverImageUrl && (
                      <Image src={post.coverImageUrl} alt={post.title} fill sizes="80px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600">{post.category?.name}</p>
                    <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-ink-900 dark:text-white">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                      {post.publishedAt && formatDateTime(post.publishedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* NEUESTE BEITRÄGE + VERANSTALTUNGEN */}
      <section className="container-page py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Neueste Beiträge</h2>
              <Link href="/beitraege" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                Alle Beiträge <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {restLatest.slice(0, 6).map((post, i) => (
                <PostCard key={post.slug} post={post} priority={i === 0} />
              ))}
            </div>
          </div>

          <aside>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">Veranstaltungen</h2>
              <Link href="/veranstaltungen" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                Alle <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-3">
              {events.length > 0 ? (
                events.map((event) => <EventCard key={event.id} event={event} />)
              ) : (
                <p className="rounded-xl border border-dashed border-ink-300 p-4 text-sm text-ink-500 dark:border-ink-700">
                  Aktuell sind keine Veranstaltungen geplant.
                </p>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900 dark:bg-brand-950/40">
              <div className="mb-2 flex items-center gap-2 text-brand-700 dark:text-brand-300">
                <Mail className="h-4 w-4" />
                <h3 className="font-display text-sm font-bold">Presseanfrage?</h3>
              </div>
              <p className="mb-3 text-xs text-ink-600 dark:text-ink-300">
                Du hast eine Meldung, ein Bildmaterial oder eine Presseanfrage für uns?
              </p>
              <LinkButton href="/kontakt" size="sm" className="w-full">Jetzt Kontakt aufnehmen</LinkButton>
            </div>
          </aside>
        </div>
      </section>

      {/* MEISTGELESEN */}
      <section className="border-y border-ink-200 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-900/40 lg:py-16">
        <div className="container-page">
          <div className="mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent-500" />
            <h2 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">Meistgelesene Beiträge</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {mostRead.map((post, i) => (
              <Link
                key={post.slug}
                href={`/beitraege/${post.slug}`}
                className="group rounded-xl border border-ink-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 dark:border-ink-800 dark:bg-ink-900"
              >
                <span className="font-display text-3xl font-extrabold text-ink-200 dark:text-ink-700">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-2 line-clamp-3 font-display text-sm font-bold leading-snug text-ink-900 group-hover:text-brand-600 dark:text-white">
                  {post.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TOP-THEMEN */}
      <section className="container-page py-12 lg:py-16">
        <h2 className="mb-6 font-display text-2xl font-extrabold text-ink-900 dark:text-white">Top-Themen</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/kategorie/${cat.slug}`}
              className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-medium text-ink-700 shadow-card transition hover:border-brand-400 hover:text-brand-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200"
            >
              {cat.name} <span className="text-ink-400">({cat._count.posts})</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ÜBER BOS_SH24 */}
      <section className="border-t border-ink-200 bg-ink-900 py-14 text-white dark:border-ink-800 lg:py-20">
        <div className="container-page grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-400">Über {settings.siteName}</p>
            <h2 className="font-display text-3xl font-extrabold leading-tight">
              Unabhängige Berichterstattung aus dem Bereich Blaulicht &amp; BOS
            </h2>
            <p className="mt-4 max-w-xl text-ink-300">{settings.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href="/ueber-uns" variant="primary">Mehr über uns</LinkButton>
              <LinkButton href="/kontakt" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                Presseanfrage stellen
              </LinkButton>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Veröffentlichte Beiträge", value: "500+" },
              { label: "Einsatzberichte", value: "1.200+" },
              { label: "Aktive Redakteure", value: "12" },
              { label: "Jahre im Einsatz", value: "8" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="font-display text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-ink-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAKT CTA */}
      <section className="container-page py-14 text-center lg:py-16">
        <CalendarDays className="mx-auto mb-4 h-8 w-8 text-brand-600" />
        <h2 className="font-display text-2xl font-extrabold text-ink-900 dark:text-white">
          Presseanfrage oder Hinweis für die Redaktion?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-ink-600 dark:text-ink-400">
          Melde dich jederzeit über unser Kontaktformular – wir melden uns zeitnah zurück.
        </p>
        <LinkButton href="/kontakt" size="lg" className="mt-6">Zum Kontaktformular</LinkButton>
      </section>
    </div>
  );
}

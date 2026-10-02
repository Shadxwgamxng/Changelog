import { cn } from "./cn";

const sizes = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-16 w-16 text-xl", xl: "h-28 w-28 text-3xl" };

export function Avatar({ src, name, size = "md", className }: { src?: string | null; name: string; size?: keyof typeof sizes; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-elevated font-display font-medium tracking-wide text-accent-300",
        sizes[size],
        className,
      )}
      aria-label={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span aria-hidden>{initials || "?"}</span>
      )}
    </span>
  );
}
